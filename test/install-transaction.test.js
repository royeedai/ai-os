"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const installer = require("../bin/installer");
const fixtures = require("./fixtures");
const {
  assert,
  test,
  afterEach,
  cleanup,
  tmpDir,
} = require("./helpers");
const {
  FILE_SPECS,
  OWNERSHIP,
  sha256,
} = require("../bin/doctor-shared");

const BOOTSTRAP = Object.freeze({
  id: "BL-20260710-030000-transaction-unconfirmed",
  file: "BL-20260710-030000-transaction-unconfirmed.md",
  date: "2026-07-10T03:00:00.000Z",
});
const EXECUTABLE_SPEC = Object.freeze({
  path: ".ai-os/bin/create-ai-os.js",
  type: "file",
  ownership: OWNERSHIP.FRAMEWORK,
  mode: 0o755,
  source: "bin/create-ai-os.js",
  generated: false,
});
const temporaryRoots = new Set();
let installedProbeTarget = null;

afterEach(() => {
  cleanup(...temporaryRoots);
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.realpathSync.native(tmpDir());
  temporaryRoots.add(root);
  return root;
}

function installOptions(overrides = {}) {
  return {
    force: false,
    teamConfig: true,
    ideFiles: true,
    bootstrap: BOOTSTRAP,
    ...overrides,
  };
}

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  assert.fail("expected callback to throw");
}

function transactionArtifacts(target) {
  return [...fixtures.snapshotTree(target).keys()].filter((relativePath) => {
    const name = path.posix.basename(relativePath);
    return name === ".ai-os-install.lock"
      || name.includes(".ai-os-install-stage-")
      || name.includes(".ai-os-install-backup-");
  });
}

function writeTargetFile(target, relativePath, content, mode) {
  const destination = path.join(target, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, { mode });
  return destination;
}

for (const api of [
  "executeInstallPlan",
  "createDefaultFsOps",
  "installProject",
  "InstallConflictError",
  "InstallFilesystemError",
]) {
  test(`${api} is exported by the installer module`, () => {
    assert.equal(typeof installer[api], "function");
  });
}

test("installedFixture is exported by the fixture module", () => {
  assert.equal(typeof fixtures.installedFixture, "function");
});

test("plans expose immutable execution metadata for missing and existing targets", () => {
  const root = temporaryRoot();
  const missingTarget = path.join(root, "missing-target");
  const missingPlan = installer.buildInstallPlan(
    missingTarget,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );

  assert.equal(Object.isFrozen(missingPlan), true);
  assert.equal(missingPlan.baselineId, BOOTSTRAP.id);
  assert.equal(missingPlan.layoutVersion, "11");
  assert.equal(missingPlan.targetExisted, false);
  assert.deepEqual(Object.keys(missingPlan).sort(), [
    "baselineId",
    "conflicts",
    "layoutVersion",
    "operations",
    "targetDir",
    "targetExisted",
  ]);
  assert.throws(() => {
    missingPlan.targetExisted = true;
  }, TypeError);

  const existingTarget = path.join(root, "existing-target");
  fs.mkdirSync(existingTarget);
  const existingPlan = installer.buildInstallPlan(
    existingTarget,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  assert.equal(existingPlan.targetExisted, true);
});

test("InstallConflictError snapshots conflicts into a stable per-path summary", () => {
  const source = [
    { relativePath: "z.txt", reason: "last reason" },
    { relativePath: "a.txt", reason: "first reason" },
  ];
  const error = new installer.InstallConflictError(source);

  source[0].reason = "mutated";
  source.push({ relativePath: "later.txt", reason: "later" });
  assert.equal(error.name, "InstallConflictError");
  assert.equal(error.code, "ERR_INSTALL_CONFLICT");
  assert.equal(Object.isFrozen(error.conflicts), true);
  assert.ok(error.conflicts.every(Object.isFrozen));
  assert.deepEqual(error.conflicts, [
    { relativePath: "a.txt", reason: "first reason" },
    { relativePath: "z.txt", reason: "last reason" },
  ]);
  assert.equal(
    error.message,
    "install conflict: a.txt: first reason; z.txt: last reason",
  );
});

test("conflicts fail before every transaction write", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, "AGENTS.md"), "FOREIGN CONSTITUTION\n");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [FILE_SPECS["AGENTS.md"]] }),
  );
  const before = fixtures.snapshotTree(target);
  let filesystemCalls = 0;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      mkdir() {
        filesystemCalls += 1;
      },
      open() {
        filesystemCalls += 1;
      },
      rename() {
        filesystemCalls += 1;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallConflictError);
  assert.equal(error.code, "ERR_INSTALL_CONFLICT");
  assert.match(error.message, /AGENTS[.]md: .*manual merge/i);
  assert.equal(filesystemCalls, 0);
  assert.deepEqual(fixtures.snapshotTree(target), before);
});

for (const scenario of [
  {
    label: "missing session file",
    relativePath: ".ai-os/lanes/default/STATE.md",
    initial: "USER SESSION STATE\n",
    mutate(destination) {
      fs.unlinkSync(destination);
    },
  },
  {
    label: "changed project file",
    relativePath: ".ai-os/MISSION.md",
    initial: "USER PROJECT MISSION\n",
    mutate(destination) {
      fs.writeFileSync(destination, "CHANGED PROJECT MISSION\n", { mode: 0o640 });
    },
  },
]) {
  test(`preserve preflight rejects a ${scenario.label} before staging`, () => {
    const target = path.join(temporaryRoot(), "target");
    const destination = writeTargetFile(
      target,
      scenario.relativePath,
      scenario.initial,
      0o600,
    );
    const createdRelativePath = ".ai-os/bin/VERSION";
    const createdDestination = path.join(target, ...createdRelativePath.split("/"));
    const plan = installer.buildInstallPlan(target, installOptions({
      fileSpecs: [
        FILE_SPECS[scenario.relativePath],
        FILE_SPECS[createdRelativePath],
      ],
    }));
    assert.equal(
      plan.operations.find((operation) => operation.relativePath === scenario.relativePath).action,
      "preserve",
    );
    assert.equal(
      plan.operations.find((operation) => operation.relativePath === createdRelativePath).action,
      "create",
    );

    scenario.mutate(destination);
    const afterMutation = fixtures.snapshotTree(target);
    const error = captureError(() => installer.executeInstallPlan(plan));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "revalidate preserve");
    assert.equal(error.relativePath, scenario.relativePath);
    assert.equal(fs.existsSync(createdDestination), false);
    assert.deepEqual(fixtures.snapshotTree(target), afterMutation);
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

test("final preserve validation rolls back committed creates", () => {
  const target = path.join(temporaryRoot(), "target");
  const preservedRelativePath = ".ai-os/MISSION.md";
  const preservedDestination = writeTargetFile(
    target,
    preservedRelativePath,
    "USER PROJECT MISSION\n",
    0o600,
  );
  const createdRelativePath = ".ai-os/bin/VERSION";
  const createdDestination = path.join(target, ...createdRelativePath.split("/"));
  const plan = installer.buildInstallPlan(target, installOptions({
    fileSpecs: [
      FILE_SPECS[preservedRelativePath],
      FILE_SPECS[createdRelativePath],
    ],
  }));
  const defaults = installer.createDefaultFsOps();
  let mutationApplied = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        const result = defaults.link(from, to);
        if (!mutationApplied && to === createdDestination) {
          mutationApplied = true;
          fs.writeFileSync(preservedDestination, "MUTATED AFTER COMMIT\n", { mode: 0o640 });
        }
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "revalidate preserve");
  assert.equal(error.relativePath, preservedRelativePath);
  assert.equal(mutationApplied, true);
  assert.equal(fs.readFileSync(preservedDestination, "utf8"), "MUTATED AFTER COMMIT\n");
  assert.equal(fs.lstatSync(preservedDestination).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(createdDestination), false);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("target creation failures carry stable filesystem context", () => {
  const target = path.join(temporaryRoot(), "target");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const cause = Object.assign(new Error("injected target mkdir failure"), {
    code: "EACCES",
  });

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      mkdir() {
        throw cause;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.name, "InstallFilesystemError");
  assert.equal(error.code, "ERR_INSTALL_FILESYSTEM");
  assert.equal(error.phase, "create target");
  assert.equal(error.relativePath, null);
  assert.equal(error.cause, cause);
  assert.equal(Object.isFrozen(error.cleanupErrors), true);
  assert.deepEqual(error.cleanupErrors, []);
  assert.match(error.message, /create target: injected target mkdir failure/);
  assert.equal(fs.existsSync(target), false);
});

test("createDefaultFsOps returns fresh synchronous filesystem wrappers", () => {
  const first = installer.createDefaultFsOps();
  const second = installer.createDefaultFsOps();
  const required = [
    "lstat",
    "fstat",
    "readFile",
    "open",
    "write",
    "fsync",
    "fchmod",
    "close",
    "mkdir",
    "link",
    "rename",
    "unlink",
    "rmdir",
    "readdir",
  ];
  assert.notEqual(first, second);
  for (const operation of required) assert.equal(typeof first[operation], "function", operation);

  const root = temporaryRoot();
  const directory = path.join(root, "ops");
  const source = path.join(directory, "source.txt");
  const destination = path.join(directory, "destination.txt");
  first.mkdir(directory, { mode: 0o755 });
  const fd = first.open(
    source,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    0o600,
  );
  first.write(fd, Buffer.from("SYNC WRAPPERS\n"), 0, 14, null);
  first.fsync(fd);
  first.fchmod(fd, 0o640);
  assert.equal(first.fstat(fd).isFile(), true);
  first.close(fd);
  assert.equal(first.lstat(source).isFile(), true);
  assert.equal(first.readFile(source, "utf8"), "SYNC WRAPPERS\n");
  first.link(source, destination);
  assert.equal(first.readFile(destination, "utf8"), "SYNC WRAPPERS\n");
  first.unlink(destination);
  first.rename(source, destination);
  assert.deepEqual(first.readdir(directory), ["destination.txt"]);
  first.unlink(destination);
  first.rmdir(directory);
  assert.equal(fs.existsSync(directory), false);
});

test("an existing exclusive lock is rejected after exactly one open", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const lockPath = path.join(target, ".ai-os-install.lock");
  const heldLock = fs.openSync(
    lockPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    0o600,
  );
  fs.closeSync(heldLock);
  const before = fixtures.snapshotTree(target);
  const defaults = installer.createDefaultFsOps();
  const opens = [];

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        opens.push({ file, flags, mode });
        return defaults.open(file, flags, mode);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "acquire lock");
  assert.equal(error.relativePath, null);
  assert.equal(error.cause.code, "EEXIST");
  assert.match(error.message, /installation already in progress/i);
  assert.deepEqual(opens, [{
    file: lockPath,
    flags: fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | (fs.constants.O_NOFOLLOW || 0),
    mode: 0o600,
  }]);
  assert.deepEqual(fixtures.snapshotTree(target), before);
});

test("a real lock-holder process excludes a contender and releases the installation", {
  timeout: 15_000,
}, async () => {
  const root = temporaryRoot();
  const target = path.join(root, "target");
  const resume = path.join(root, "resume-holder");
  fs.mkdirSync(target);
  const installerPath = path.join(__dirname, "..", "bin", "installer.js");
  const holderSource = String.raw`
    const fs = require("node:fs");
    const path = require("node:path");
    const installer = require(process.argv[1]);
    const target = process.argv[2];
    const resume = process.argv[3];
    const defaults = installer.createDefaultFsOps();
    installer.installProject(target, {
      fileSpecs: [],
      fsOps: {
        open(file, flags, mode) {
          const fd = defaults.open(file, flags, mode);
          if (file === path.join(target, ".ai-os-install.lock")) {
            process.stdout.write("LOCKED\n");
            while (!fs.existsSync(resume)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
          }
          return fd;
        },
      },
    });
    process.stdout.write("DONE\n");
  `;
  const contenderSource = String.raw`
    const installer = require(process.argv[1]);
    try {
      installer.installProject(process.argv[2], { fileSpecs: [] });
      process.stdout.write("UNEXPECTED SUCCESS\n");
    } catch (error) {
      process.stderr.write(error.message + "\n");
      process.exitCode = 23;
    }
  `;
  const holder = spawn(process.execPath, [
    "-e",
    holderSource,
    installerPath,
    target,
    resume,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let holderStdout = "";
  let holderStderr = "";
  holder.stdout.setEncoding("utf8");
  holder.stderr.setEncoding("utf8");
  holder.stdout.on("data", (chunk) => {
    holderStdout += chunk;
  });
  holder.stderr.on("data", (chunk) => {
    holderStderr += chunk;
  });
  const holderExit = new Promise((resolve) => {
    holder.once("close", (status, signal) => resolve({ status, signal }));
  });
  const holderLocked = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("holder did not acquire lock")), 5_000);
    const inspect = () => {
      if (!holderStdout.includes("LOCKED\n")) return;
      clearTimeout(timeout);
      resolve();
    };
    holder.stdout.on("data", inspect);
    holder.once("close", (status) => {
      if (!holderStdout.includes("LOCKED\n")) {
        clearTimeout(timeout);
        reject(new Error(`holder exited before lock (status=${status}): ${holderStderr}`));
      }
    });
  });

  let outcome;
  try {
    await holderLocked;
    assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), true);
    const contender = spawnSync(process.execPath, [
      "-e",
      contenderSource,
      installerPath,
      target,
    ], { encoding: "utf8", timeout: 5_000 });
    assert.equal(contender.status, 23, contender.stderr);
    assert.match(contender.stderr, /installation already in progress/i);
    assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), true);
  } finally {
    fs.writeFileSync(resume, "resume\n");
    outcome = await holderExit;
  }

  assert.deepEqual(outcome, { status: 0, signal: null }, holderStderr);
  assert.match(holderStdout, /DONE/);
  assert.deepEqual(transactionArtifacts(target), []);
  const result = installer.installProject(target, installOptions({ fileSpecs: [] }));
  assert.deepEqual(result, {
    created: 0,
    replaced: 0,
    preserved: 0,
    warnings: [],
    baselineId: BOOTSTRAP.id,
    layoutVersion: "11",
  });
  assert.deepEqual(transactionArtifacts(target), []);
});

test("fresh creates use same-directory exclusive durable staging and return stable counts", () => {
  const target = path.join(temporaryRoot(), "target");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const descriptors = new Map();
  const calls = [];
  const fsOps = {
    open(file, flags, mode) {
      const fd = defaults.open(file, flags, mode);
      descriptors.set(fd, file);
      calls.push({ operation: "open", file, flags, mode });
      return fd;
    },
    write(fd, buffer, offset, length, position) {
      calls.push({ operation: "write", file: descriptors.get(fd), length });
      return defaults.write(fd, buffer, offset, length, position);
    },
    fsync(fd) {
      calls.push({ operation: "fsync", file: descriptors.get(fd) });
      return defaults.fsync(fd);
    },
    fchmod(fd, mode) {
      calls.push({ operation: "fchmod", file: descriptors.get(fd), mode });
      return defaults.fchmod(fd, mode);
    },
    close(fd) {
      const file = descriptors.get(fd);
      calls.push({ operation: "close", file });
      const result = defaults.close(fd);
      descriptors.delete(fd);
      return result;
    },
    link(from, to) {
      calls.push({ operation: "link", file: from, to });
      return defaults.link(from, to);
    },
    rename(from, to) {
      calls.push({ operation: "rename", file: from, to });
      return defaults.rename(from, to);
    },
    unlink(file) {
      calls.push({ operation: "unlink", file });
      return defaults.unlink(file);
    },
  };

  const result = installer.executeInstallPlan(plan, { fsOps });
  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  const stageOpen = calls.find((call) => (
    call.operation === "open" && call.file !== path.join(target, ".ai-os-install.lock")
  ));
  assert.ok(stageOpen);
  assert.equal(path.dirname(stageOpen.file), path.dirname(destination));
  assert.match(path.basename(stageOpen.file), /[.]ai-os-install-stage-/);
  assert.equal(stageOpen.flags & fs.constants.O_CREAT, fs.constants.O_CREAT);
  assert.equal(stageOpen.flags & fs.constants.O_EXCL, fs.constants.O_EXCL);
  if (fs.constants.O_NOFOLLOW) {
    assert.equal(stageOpen.flags & fs.constants.O_NOFOLLOW, fs.constants.O_NOFOLLOW);
  }
  assert.equal(stageOpen.mode, 0o600);

  const stageCalls = calls
    .filter((call) => call.file === stageOpen.file)
    .map((call) => call.operation);
  assert.deepEqual(stageCalls, ["open", "write", "fsync", "fchmod", "close", "link", "unlink"]);
  assert.equal(calls.find((call) => call.operation === "fchmod").mode, 0o755);
  assert.equal(calls.find((call) => call.operation === "link").to, destination);
  assert.deepEqual(fs.readFileSync(destination), fs.readFileSync(path.join(__dirname, "..", "bin", "create-ai-os.js")));
  assert.equal(fs.lstatSync(destination).mode & 0o777, 0o755);
  assert.equal(fs.existsSync(path.join(target, ".ai-os", "bin")), true);
  assert.deepEqual(transactionArtifacts(target), []);

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.warnings), true);
  assert.deepEqual(Object.keys(result).sort(), [
    "baselineId",
    "created",
    "layoutVersion",
    "preserved",
    "replaced",
    "warnings",
  ]);
  assert.deepEqual(result, {
    created: 1,
    replaced: 0,
    preserved: 0,
    warnings: [],
    baselineId: BOOTSTRAP.id,
    layoutVersion: "11",
  });
  for (const count of [result.created, result.replaced, result.preserved]) {
    assert.equal(typeof count, "number");
  }
});

test("commit preflight re-lstats the target, every parent, destination, and staged file", () => {
  const target = path.join(temporaryRoot(), "target");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const descriptors = new Map();
  const preflightLstats = [];
  const preflightReads = [];
  let stagedFile = null;
  let stagingComplete = false;

  const result = installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        if (file.includes(".ai-os-install-stage-")) stagedFile = file;
        return fd;
      },
      close(fd) {
        const file = descriptors.get(fd);
        const closed = defaults.close(fd);
        descriptors.delete(fd);
        if (file === stagedFile) stagingComplete = true;
        return closed;
      },
      lstat(file) {
        if (stagingComplete) preflightLstats.push(file);
        return defaults.lstat(file);
      },
      readFile(file, options) {
        if (stagingComplete) preflightReads.push(file);
        return defaults.readFile(file, options);
      },
    },
  });

  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  for (const expected of [
    target,
    path.join(target, ".ai-os"),
    path.join(target, ".ai-os", "bin"),
    destination,
    stagedFile,
  ]) {
    assert.ok(preflightLstats.includes(expected), `preflight lstat: ${expected}`);
  }
  assert.ok(preflightReads.includes(stagedFile));
  assert.equal(result.created, 1);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("each record is revalidated immediately before its commit mutation", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(target, installOptions({
    fileSpecs: [
      EXECUTABLE_SPEC,
      FILE_SPECS[".ai-os/reference/artifacts.md"],
    ],
  }));
  const defaults = installer.createDefaultFsOps();
  const firstDestination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  const secondDestination = path.join(target, ".ai-os", "reference", "artifacts.md");
  let mutationApplied = false;

  function mutateAfterFirstCommit(from, to, operation) {
    const result = operation();
    if (
      !mutationApplied
      && from.includes(".ai-os-install-stage-")
      && to === firstDestination
    ) {
      mutationApplied = true;
      fs.writeFileSync(secondDestination, "FOREIGN SECOND DESTINATION\n", { mode: 0o640 });
    }
    return result;
  }

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        return mutateAfterFirstCommit(from, to, () => defaults.link(from, to));
      },
      rename(from, to) {
        return mutateAfterFirstCommit(from, to, () => defaults.rename(from, to));
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "revalidate commit");
  assert.equal(error.relativePath, ".ai-os/reference/artifacts.md");
  assert.equal(mutationApplied, true);
  assert.equal(fs.existsSync(firstDestination), false);
  assert.equal(fs.readFileSync(secondDestination, "utf8"), "FOREIGN SECOND DESTINATION\n");
  assert.equal(fs.lstatSync(secondDestination).mode & 0o777, 0o640);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("a create destination race is rejected without replacing the foreign file", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  let raceApplied = false;

  function raceBeforeCreate(from, to, operation) {
    if (
      !raceApplied
      && from.includes(".ai-os-install-stage-")
      && to === destination
    ) {
      raceApplied = true;
      fs.writeFileSync(destination, "FOREIGN CREATE RACE\n", { mode: 0o640 });
    }
    return operation();
  }

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        return raceBeforeCreate(from, to, () => defaults.link(from, to));
      },
      rename(from, to) {
        return raceBeforeCreate(from, to, () => defaults.rename(from, to));
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit create");
  assert.equal(error.cause.code, "EEXIST");
  assert.equal(raceApplied, true);
  assert.equal(fs.readFileSync(destination, "utf8"), "FOREIGN CREATE RACE\n");
  assert.equal(fs.lstatSync(destination).mode & 0o777, 0o640);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("create EEXIST preserves a destination prelinked to the staged inode", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  let collisionIdentity = null;
  let collisionCreated = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        if (
          !collisionCreated
          && from.includes(".ai-os-install-stage-")
          && to === destination
        ) {
          defaults.link(from, to);
          collisionIdentity = fs.lstatSync(to);
          collisionCreated = true;
        }
        return defaults.link(from, to);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit create");
  assert.equal(error.cause.code, "EEXIST");
  assert.equal(collisionCreated, true);
  const preserved = fs.lstatSync(destination);
  assert.equal(preserved.dev, collisionIdentity.dev);
  assert.equal(preserved.ino, collisionIdentity.ino);
  assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
  assert.equal(preserved.mode & 0o777, plan.operations[0].mode);
  assert.deepEqual(transactionArtifacts(target), []);
});

for (const unsafePoint of ["target", ".ai-os/bin"]) {
  test(`commit preflight rejects an unsafe ${unsafePoint} directory mutation`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "target");
    fs.mkdirSync(path.join(target, ".ai-os", "bin"), { recursive: true });
    const plan = installer.buildInstallPlan(
      target,
      installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
    );
    const defaults = installer.createDefaultFsOps();
    const unsafeFile = path.join(root, "unsafe-file");
    const unsafeLink = path.join(root, "unsafe-link");
    fs.writeFileSync(unsafeFile, "UNSAFE\n");
    fs.symlinkSync(unsafeFile, unsafeLink);
    const unsafeStat = unsafePoint === ".ai-os"
      ? fs.lstatSync(unsafeFile)
      : fs.lstatSync(unsafeLink);
    const checkedPath = unsafePoint === "target"
      ? target
      : path.join(target, ...unsafePoint.split("/"));
    const descriptors = new Map();
    let stagingComplete = false;
    let mutationReturned = false;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        open(file, flags, mode) {
          const fd = defaults.open(file, flags, mode);
          descriptors.set(fd, file);
          return fd;
        },
        close(fd) {
          const file = descriptors.get(fd);
          const result = defaults.close(fd);
          descriptors.delete(fd);
          if (file.includes(".ai-os-install-stage-")) stagingComplete = true;
          return result;
        },
        lstat(file) {
          if (stagingComplete && file === checkedPath && !mutationReturned) {
            mutationReturned = true;
            return unsafeStat;
          }
          return defaults.lstat(file);
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "revalidate commit");
    assert.equal(error.relativePath, EXECUTABLE_SPEC.path);
    assert.equal(mutationReturned, true);
    assert.equal(fs.existsSync(path.join(target, ".ai-os", "bin", "create-ai-os.js")), false);
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

for (const destinationKind of ["file", "symlink", "directory"]) {
  test(`commit preflight preserves a foreign ${destinationKind} that appears at a create destination`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "target");
    const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
    const outside = path.join(root, "outside.txt");
    fs.writeFileSync(outside, "OUTSIDE SENTINEL\n");
    const plan = installer.buildInstallPlan(
      target,
      installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
    );
    const defaults = installer.createDefaultFsOps();
    const descriptors = new Map();
    let mutationApplied = false;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        open(file, flags, mode) {
          const fd = defaults.open(file, flags, mode);
          descriptors.set(fd, file);
          return fd;
        },
        close(fd) {
          const file = descriptors.get(fd);
          const result = defaults.close(fd);
          descriptors.delete(fd);
          if (file.includes(".ai-os-install-stage-") && !mutationApplied) {
            mutationApplied = true;
            if (destinationKind === "file") fs.writeFileSync(destination, "FOREIGN FILE\n");
            else if (destinationKind === "symlink") fs.symlinkSync(outside, destination);
            else fs.mkdirSync(destination);
          }
          return result;
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "revalidate commit");
    assert.equal(mutationApplied, true);
    const stat = fs.lstatSync(destination);
    if (destinationKind === "file") assert.equal(fs.readFileSync(destination, "utf8"), "FOREIGN FILE\n");
    else if (destinationKind === "symlink") assert.equal(stat.isSymbolicLink(), true);
    else assert.equal(stat.isDirectory(), true);
    assert.equal(fs.readFileSync(outside, "utf8"), "OUTSIDE SENTINEL\n");
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

test("commit preflight rejects changed replacement bytes without overwriting the mutation", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/VERSION";
  const destination = writeTargetFile(target, relativePath, "ORIGINAL VERSION\n", 0o600);
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [FILE_SPECS[relativePath]],
  }));
  const defaults = installer.createDefaultFsOps();
  const descriptors = new Map();
  let mutationApplied = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        return fd;
      },
      close(fd) {
        const file = descriptors.get(fd);
        const result = defaults.close(fd);
        descriptors.delete(fd);
        if (file.includes(".ai-os-install-stage-") && !mutationApplied) {
          mutationApplied = true;
          fs.writeFileSync(destination, "CONCURRENT MUTATION\n");
          fs.chmodSync(destination, 0o640);
        }
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "revalidate commit");
  assert.match(error.message, /destination bytes changed/i);
  assert.equal(fs.readFileSync(destination, "utf8"), "CONCURRENT MUTATION\n");
  assert.equal(fs.lstatSync(destination).mode & 0o777, 0o640);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("commit preflight rejects a staged-file symlink without touching its target", () => {
  const root = temporaryRoot();
  const target = path.join(root, "target");
  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "OUTSIDE SENTINEL\n");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const descriptors = new Map();
  let mutationApplied = false;
  let stagedPath = null;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        return fd;
      },
      close(fd) {
        const file = descriptors.get(fd);
        const result = defaults.close(fd);
        descriptors.delete(fd);
        if (file.includes(".ai-os-install-stage-") && !mutationApplied) {
          mutationApplied = true;
          stagedPath = file;
          fs.unlinkSync(file);
          fs.symlinkSync(outside, file);
        }
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "revalidate commit");
  assert.match(error.message, /staged file is not a regular file/i);
  assert.equal(fs.existsSync(destination), false);
  assert.equal(fs.readFileSync(outside, "utf8"), "OUTSIDE SENTINEL\n");
  assert.equal(fs.lstatSync(stagedPath).isSymbolicLink(), true);
  assert.deepEqual(transactionArtifacts(target), [
    path.relative(target, stagedPath).split(path.sep).join("/"),
  ]);
});

test("commit preflight preserves obsolete bytes changed after lock acquisition", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/obsolete.js";
  const destination = writeTargetFile(target, relativePath, "PRISTINE OBSOLETE\n", 0o700);
  const plan = installer.buildInstallPlan(target, installOptions({
    fileSpecs: [],
    obsoleteFrameworkHashes: {
      [relativePath]: [sha256("PRISTINE OBSOLETE\n")],
    },
  }));
  const defaults = installer.createDefaultFsOps();
  let mutationApplied = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        if (file === path.join(target, ".ai-os-install.lock")) {
          mutationApplied = true;
          fs.writeFileSync(destination, "CONCURRENT OBSOLETE MUTATION\n");
          fs.chmodSync(destination, 0o640);
        }
        return fd;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "revalidate commit");
  assert.equal(mutationApplied, true);
  assert.equal(fs.readFileSync(destination, "utf8"), "CONCURRENT OBSOLETE MUTATION\n");
  assert.equal(fs.lstatSync(destination).mode & 0o777, 0o640);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("a failed create commit removes recorded parents, staged files, lock, and target", () => {
  const root = temporaryRoot();
  const target = path.join(root, "new-parent", "target");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({
      fileSpecs: [
        EXECUTABLE_SPEC,
        FILE_SPECS[".ai-os/reference/artifacts.md"],
      ],
    }),
  );
  const defaults = installer.createDefaultFsOps();
  const removedDirectories = [];
  const cause = new Error("injected create link failure");
  let links = 0;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        links += 1;
        if (links === 2) throw cause;
        return defaults.link(from, to);
      },
      rmdir(directory) {
        removedDirectories.push(directory);
        return defaults.rmdir(directory);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit create");
  assert.equal(error.relativePath, ".ai-os/reference/artifacts.md");
  assert.equal(error.cause, cause);
  assert.deepEqual(removedDirectories, [
    path.join(target, ".ai-os", "reference"),
    path.join(target, ".ai-os", "bin"),
    path.join(target, ".ai-os"),
    target,
    path.join(root, "new-parent"),
  ]);
  assert.equal(fs.existsSync(path.join(root, "new-parent")), false);
  assert.deepEqual(transactionArtifacts(root), []);
});

for (const operation of ["open", "write", "fsync", "fchmod", "close"]) {
  test(`a ${operation} staging failure preserves its cause through cleanup retry`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "new-parent", "target");
    const before = fixtures.snapshotTree(root);
    const plan = installer.buildInstallPlan(
      target,
      installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
    );
    const defaults = installer.createDefaultFsOps();
    const descriptors = new Map();
    const primaryCause = new Error(`injected stage ${operation} failure`);
    const cleanupCause = Object.assign(new Error("injected directory cleanup failure"), {
      code: "EACCES",
    });
    let stageFailureInjected = false;
    let cleanupFailureInjected = false;

    const fsOps = {
      open(file, flags, mode) {
        if (
          operation === "open"
          && file.includes(".ai-os-install-stage-")
          && !stageFailureInjected
        ) {
          stageFailureInjected = true;
          throw primaryCause;
        }
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        return fd;
      },
      write(fd, buffer, offset, length, position) {
        if (
          operation === "write"
          && descriptors.get(fd).includes(".ai-os-install-stage-")
          && !stageFailureInjected
        ) {
          stageFailureInjected = true;
          throw primaryCause;
        }
        return defaults.write(fd, buffer, offset, length, position);
      },
      fsync(fd) {
        if (
          operation === "fsync"
          && descriptors.get(fd).includes(".ai-os-install-stage-")
          && !stageFailureInjected
        ) {
          stageFailureInjected = true;
          throw primaryCause;
        }
        return defaults.fsync(fd);
      },
      fchmod(fd, mode) {
        if (
          operation === "fchmod"
          && descriptors.get(fd).includes(".ai-os-install-stage-")
          && !stageFailureInjected
        ) {
          stageFailureInjected = true;
          throw primaryCause;
        }
        return defaults.fchmod(fd, mode);
      },
      close(fd) {
        const file = descriptors.get(fd);
        if (
          operation === "close"
          && file.includes(".ai-os-install-stage-")
          && !stageFailureInjected
        ) {
          stageFailureInjected = true;
          throw primaryCause;
        }
        const result = defaults.close(fd);
        descriptors.delete(fd);
        return result;
      },
      rmdir(directory) {
        if (!cleanupFailureInjected) {
          cleanupFailureInjected = true;
          throw cleanupCause;
        }
        return defaults.rmdir(directory);
      },
    };

    const error = captureError(() => installer.executeInstallPlan(plan, { fsOps }));

    assert.equal(stageFailureInjected, true);
    assert.equal(cleanupFailureInjected, true);
    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, operation === "close" ? "close staged file" : "stage content");
    assert.equal(error.cause, primaryCause);
    assert.ok(error.cleanupErrors.some((item) => item.cause === cleanupCause));
    assert.deepEqual(fixtures.snapshotTree(root), before);
    assert.deepEqual(transactionArtifacts(root), []);
  });
}

test("a staged-file open collision is preserved because the transaction never owned it", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  let collisionPath = null;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        if (file.includes(".ai-os-install-stage-") && collisionPath === null) {
          collisionPath = file;
          fs.writeFileSync(file, "FOREIGN STAGE COLLISION\n", { mode: 0o640 });
        }
        return defaults.open(file, flags, mode);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "stage content");
  assert.equal(error.cause.code, "EEXIST");
  assert.equal(fs.readFileSync(collisionPath, "utf8"), "FOREIGN STAGE COLLISION\n");
  assert.equal(fs.lstatSync(collisionPath).mode & 0o777, 0o640);
  assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), false);
});

test("a foreign file replacing an unlinked stage path is never removed by cleanup retry", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const cause = new Error("injected stage unlink post-side-effect failure");
  let replacedPath = null;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      unlink(file) {
        if (file.includes(".ai-os-install-stage-") && replacedPath === null) {
          replacedPath = file;
          defaults.unlink(file);
          fs.writeFileSync(file, "FOREIGN AFTER STAGE UNLINK\n", { mode: 0o640 });
          throw cause;
        }
        return defaults.unlink(file);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit create");
  assert.equal(error.cause, cause);
  assert.equal(fs.readFileSync(replacedPath, "utf8"), "FOREIGN AFTER STAGE UNLINK\n");
  assert.equal(fs.lstatSync(replacedPath).mode & 0o777, 0o640);
  assert.equal(fs.existsSync(path.join(target, ".ai-os", "bin", "create-ai-os.js")), false);
  assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), false);
});

test("backup cleanup preserves a foreign file that replaces the owned backup path", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/VERSION";
  const destination = writeTargetFile(target, relativePath, "ORIGINAL VERSION\n", 0o600);
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [FILE_SPECS[relativePath]],
  }));
  const defaults = installer.createDefaultFsOps();
  const cause = new Error("injected backup unlink post-side-effect failure");
  let backupPath = null;
  let replaced = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        if (from === destination && to.includes(".ai-os-install-backup-")) backupPath = to;
        return defaults.link(from, to);
      },
      rename(from, to) {
        if (from === destination && to.includes(".ai-os-install-backup-")) backupPath = to;
        return defaults.rename(from, to);
      },
      unlink(file) {
        if (file === backupPath && !replaced) {
          replaced = true;
          defaults.unlink(file);
          fs.writeFileSync(file, "FOREIGN AFTER BACKUP UNLINK\n", { mode: 0o640 });
          throw cause;
        }
        return defaults.unlink(file);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.cause, cause);
  assert.equal(replaced, true);
  assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
  assert.equal(fs.readFileSync(backupPath, "utf8"), "FOREIGN AFTER BACKUP UNLINK\n");
  assert.equal(fs.lstatSync(backupPath).mode & 0o777, 0o640);
  assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), false);
});

test("lock release preserves a foreign lock path substituted after descriptor close", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(target, installOptions({ fileSpecs: [] }));
  const defaults = installer.createDefaultFsOps();
  const lockPath = path.join(target, ".ai-os-install.lock");
  const descriptors = new Map();
  let substituted = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        return fd;
      },
      close(fd) {
        const file = descriptors.get(fd);
        const result = defaults.close(fd);
        descriptors.delete(fd);
        if (file === lockPath && !substituted) {
          substituted = true;
          fs.unlinkSync(lockPath);
          fs.writeFileSync(lockPath, "FOREIGN LOCK\n", { mode: 0o640 });
        }
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(substituted, true);
  assert.match(error.message, /lock/i);
  assert.equal(fs.readFileSync(lockPath, "utf8"), "FOREIGN LOCK\n");
  assert.equal(fs.lstatSync(lockPath).mode & 0o777, 0o640);
});

test("a one-shot lock fstat failure closes and removes the partial lock before retry", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(target, installOptions({ fileSpecs: [] }));
  const defaults = installer.createDefaultFsOps();
  const lockPath = path.join(target, ".ai-os-install.lock");
  const cause = Object.assign(new Error("injected one-shot lock fstat failure"), {
    code: "EIO",
  });
  let lockFd = null;
  let injected = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        if (file === lockPath) lockFd = fd;
        return fd;
      },
      fstat(fd) {
        if (fd === lockFd && !injected) {
          injected = true;
          throw cause;
        }
        return defaults.fstat(fd);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "acquire lock");
  assert.equal(error.cause, cause);
  assert.equal(injected, true);
  assert.throws(() => defaults.fstat(lockFd), { code: "EBADF" });
  assert.equal(fs.existsSync(lockPath), false);

  const retry = installer.executeInstallPlan(plan);
  assert.equal(retry.created, 0);
  assert.equal(fs.existsSync(lockPath), false);
});

test("a partial lock without descriptor identity preserves a foreign close substitution", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(target, installOptions({ fileSpecs: [] }));
  const defaults = installer.createDefaultFsOps();
  const lockPath = path.join(target, ".ai-os-install.lock");
  const cause = Object.assign(new Error("injected persistent lock fstat failure"), {
    code: "EIO",
  });
  let lockFd = null;
  let substituted = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        if (file === lockPath) lockFd = fd;
        return fd;
      },
      fstat(fd) {
        if (fd === lockFd) throw cause;
        return defaults.fstat(fd);
      },
      close(fd) {
        const result = defaults.close(fd);
        if (fd === lockFd && !substituted) {
          substituted = true;
          fs.unlinkSync(lockPath);
          fs.writeFileSync(lockPath, "FOREIGN PARTIAL LOCK\n", { mode: 0o640 });
        }
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "acquire lock");
  assert.equal(error.cause, cause);
  assert.equal(substituted, true);
  assert.ok(error.cleanupErrors.some((item) => /lock/i.test(item.message)));
  assert.equal(fs.readFileSync(lockPath, "utf8"), "FOREIGN PARTIAL LOCK\n");
  assert.equal(fs.lstatSync(lockPath).mode & 0o777, 0o640);
});

test("a target created by the transaction is retained when a concurrent file makes it nonempty", () => {
  const root = temporaryRoot();
  const target = path.join(root, "target");
  const sentinel = path.join(target, "concurrent.txt");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const cause = new Error("injected stage open failure after concurrent target write");

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        if (file.includes(".ai-os-install-stage-")) {
          fs.writeFileSync(sentinel, "CONCURRENT OWNER\n", { mode: 0o640 });
          throw cause;
        }
        return fs.openSync(file, flags, mode);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.cause, cause);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "CONCURRENT OWNER\n");
  assert.equal(fs.lstatSync(sentinel).mode & 0o777, 0o640);
  assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), false);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("cleanup never removes an empty target whose directory identity is no longer owned", () => {
  const root = temporaryRoot();
  const target = path.join(root, "target");
  const foreignDirectory = path.join(root, "foreign-directory");
  fs.mkdirSync(foreignDirectory);
  const foreignStat = fs.lstatSync(foreignDirectory);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const cause = new Error("injected stage open failure before ownership cleanup");
  let stagingFailed = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        if (file.includes(".ai-os-install-stage-")) {
          stagingFailed = true;
          throw cause;
        }
        return defaults.open(file, flags, mode);
      },
      lstat(file) {
        if (stagingFailed && file === target) return foreignStat;
        return defaults.lstat(file);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.cause, cause);
  assert.match(
    error.cleanupErrors.map((item) => item.message).join("\n"),
    /directory is no longer owned by this transaction/i,
  );
  assert.equal(fs.lstatSync(target).isDirectory(), true);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.deepEqual(transactionArtifacts(target), []);
});

for (const failure of ["backup-1", "install-1", "install-2"]) {
  test(`${failure} replacement commit failure restores byte-identical originals`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "target");
    const paths = [
      [".ai-os/bin/VERSION", "ORIGINAL VERSION\n", 0o600],
      [".ai-os/bin/ai-os-doctor.js", "ORIGINAL DOCTOR\n", 0o700],
    ];
    for (const [relativePath, content, mode] of paths) {
      writeTargetFile(target, relativePath, content, mode);
    }
    const plan = installer.buildInstallPlan(target, installOptions({
      force: true,
      fileSpecs: [
        FILE_SPECS[".ai-os/bin/VERSION"],
        FILE_SPECS[".ai-os/bin/ai-os-doctor.js"],
      ],
    }));
    assert.deepEqual(plan.operations.map(({ action }) => action), [
      "replace-framework",
      "replace-framework",
    ]);
    const before = fixtures.snapshotTree(target);
    const defaults = installer.createDefaultFsOps();
    const primaryCause = new Error(`injected ${failure} rename failure`);
    const cleanupCause = Object.assign(new Error("injected staged cleanup failure"), {
      code: "EACCES",
    });
    let backups = 0;
    let installs = 0;
    let cleanupFailureInjected = false;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        link(from, to) {
          if (to.includes(".ai-os-install-backup-")) {
            backups += 1;
            if (failure === `backup-${backups}`) throw primaryCause;
          }
          return defaults.link(from, to);
        },
        rename(from, to) {
          if (from.includes(".ai-os-install-stage-")) {
            installs += 1;
            if (failure === `install-${installs}`) throw primaryCause;
          }
          return defaults.rename(from, to);
        },
        unlink(file) {
          if (file.includes(".ai-os-install-stage-") && !cleanupFailureInjected) {
            cleanupFailureInjected = true;
            throw cleanupCause;
          }
          return defaults.unlink(file);
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, failure.startsWith("backup") ? "commit backup" : "commit replacement");
    assert.equal(error.cause, primaryCause);
    assert.equal(cleanupFailureInjected, true);
    assert.ok(error.cleanupErrors.some((item) => item.cause === cleanupCause));
    assert.deepEqual(fixtures.snapshotTree(target), before);
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

for (const boundary of [
  "create-install-after-link",
  "replace-install-after-rename",
  "remove-backup-after-link",
]) {
  test(`${boundary} rollback handles an error reported after the atomic side effect`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "target");
    fs.mkdirSync(target);
    let plan;
    if (boundary.startsWith("create")) {
      plan = installer.buildInstallPlan(
        target,
        installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
      );
    } else if (boundary.startsWith("replace")) {
      writeTargetFile(target, ".ai-os/bin/VERSION", "ORIGINAL VERSION\n", 0o600);
      plan = installer.buildInstallPlan(target, installOptions({
        force: true,
        fileSpecs: [FILE_SPECS[".ai-os/bin/VERSION"]],
      }));
    } else {
      writeTargetFile(target, ".ai-os/bin/obsolete.js", "ORIGINAL OBSOLETE\n", 0o700);
      plan = installer.buildInstallPlan(target, installOptions({
        fileSpecs: [],
        obsoleteFrameworkHashes: {
          ".ai-os/bin/obsolete.js": [sha256("ORIGINAL OBSOLETE\n")],
        },
      }));
    }
    const before = fixtures.snapshotTree(target);
    const defaults = installer.createDefaultFsOps();
    const cause = new Error(`injected ${boundary} failure`);
    const calls = [];
    let injected = false;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        link(from, to) {
          calls.push(["link", from, to]);
          const isBackup = to.includes(".ai-os-install-backup-");
          const isCreate = from.includes(".ai-os-install-stage-") && !isBackup;
          const shouldFail = boundary.startsWith("create")
            ? isCreate
            : boundary.startsWith("remove") && isBackup;
          const result = defaults.link(from, to);
          if (shouldFail && !injected) {
            injected = true;
            throw cause;
          }
          return result;
        },
        rename(from, to) {
          calls.push(["rename", from, to]);
          const isInstall = from.includes(".ai-os-install-stage-");
          const shouldFail = boundary.startsWith("replace") && isInstall;
          const result = defaults.rename(from, to);
          if (shouldFail && !injected) {
            injected = true;
            throw cause;
          }
          return result;
        },
        unlink(file) {
          calls.push(["unlink", file]);
          return defaults.unlink(file);
        },
      },
    }));

    assert.equal(injected, true);
    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.cause, cause);
    assert.deepEqual(fixtures.snapshotTree(target), before);
    assert.deepEqual(transactionArtifacts(target), []);
    if (boundary === "replace-install-after-rename") {
      const destination = path.join(target, ".ai-os", "bin", "VERSION");
      const rollbackUnlink = calls.findIndex(([operation, file]) => (
        operation === "unlink" && file === destination
      ));
      const restoreLink = calls.findIndex(([operation, from, to]) => (
        operation === "link"
        && from.includes(".ai-os-install-backup-")
        && to === destination
      ));
      assert.ok(rollbackUnlink >= 0);
      assert.ok(restoreLink > rollbackUnlink);
    }
  });
}

test("a failed create link never removes a foreign destination it did not create", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const destination = path.join(target, ".ai-os", "bin", "create-ai-os.js");
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const cause = new Error("injected create link failure with foreign destination");

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        if (from.includes(".ai-os-install-stage-")) {
          fs.writeFileSync(to, "FOREIGN DESTINATION\n", { mode: 0o640 });
          throw cause;
        }
        return defaults.link(from, to);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit create");
  assert.equal(error.cause, cause);
  assert.match(
    error.cleanupErrors.map((item) => item.message).join("\n"),
    /no longer owned by this transaction/i,
  );
  assert.equal(fs.readFileSync(destination, "utf8"), "FOREIGN DESTINATION\n");
  assert.equal(fs.lstatSync(destination).mode & 0o777, 0o640);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("a one-shot rollback restore failure is reported without replacing the commit cause", () => {
  const target = path.join(temporaryRoot(), "target");
  for (const [relativePath, content, mode] of [
    [".ai-os/bin/VERSION", "ORIGINAL VERSION\n", 0o600],
    [".ai-os/bin/ai-os-doctor.js", "ORIGINAL DOCTOR\n", 0o700],
  ]) {
    writeTargetFile(target, relativePath, content, mode);
  }
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [
      FILE_SPECS[".ai-os/bin/VERSION"],
      FILE_SPECS[".ai-os/bin/ai-os-doctor.js"],
    ],
  }));
  const before = fixtures.snapshotTree(target);
  const defaults = installer.createDefaultFsOps();
  const primaryCause = new Error("injected second replacement install failure");
  const restoreCause = new Error("injected first rollback restore failure");
  let installs = 0;
  let restoreFailureInjected = false;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        if (
          from.includes(".ai-os-install-backup-")
          && !restoreFailureInjected
        ) {
          restoreFailureInjected = true;
          throw restoreCause;
        }
        return defaults.link(from, to);
      },
      rename(from, to) {
        if (from.includes(".ai-os-install-stage-")) {
          installs += 1;
          if (installs === 2) throw primaryCause;
        }
        return defaults.rename(from, to);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit replacement");
  assert.equal(error.cause, primaryCause);
  assert.equal(restoreFailureInjected, true);
  assert.ok(error.cleanupErrors.some((item) => item.cause === restoreCause));
  assert.deepEqual(fixtures.snapshotTree(target), before);
  assert.deepEqual(transactionArtifacts(target), []);
});

for (const releaseOperation of ["close", "unlink"]) {
  test(`a one-shot lock ${releaseOperation} failure preserves the primary error and releases ownership`, () => {
    const target = path.join(temporaryRoot(), "target");
    fs.mkdirSync(target);
    const plan = installer.buildInstallPlan(
      target,
      installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
    );
    const defaults = installer.createDefaultFsOps();
    const descriptors = new Map();
    const primaryCause = new Error("injected stage write failure");
    const releaseCause = Object.assign(new Error(`injected lock ${releaseOperation} failure`), {
      code: "EACCES",
    });
    let stageFailureInjected = false;
    let releaseFailureInjected = false;
    let closeAttempts = 0;
    let unlinkAttempts = 0;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        open(file, flags, mode) {
          const fd = defaults.open(file, flags, mode);
          descriptors.set(fd, file);
          return fd;
        },
        write(fd, buffer, offset, length, position) {
          if (
            descriptors.get(fd).includes(".ai-os-install-stage-")
            && !stageFailureInjected
          ) {
            stageFailureInjected = true;
            throw primaryCause;
          }
          return defaults.write(fd, buffer, offset, length, position);
        },
        close(fd) {
          const file = descriptors.get(fd);
          if (file === path.join(target, ".ai-os-install.lock")) {
            closeAttempts += 1;
            if (releaseOperation === "close" && !releaseFailureInjected) {
              releaseFailureInjected = true;
              throw releaseCause;
            }
          }
          const result = defaults.close(fd);
          descriptors.delete(fd);
          return result;
        },
        unlink(file) {
          if (file === path.join(target, ".ai-os-install.lock")) {
            unlinkAttempts += 1;
            if (releaseOperation === "unlink" && !releaseFailureInjected) {
              releaseFailureInjected = true;
              throw releaseCause;
            }
          }
          return defaults.unlink(file);
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "stage content");
    assert.equal(error.cause, primaryCause);
    assert.equal(releaseFailureInjected, true);
    assert.ok(error.cleanupErrors.some((item) => item.cause === releaseCause));
    if (releaseOperation === "close") assert.equal(closeAttempts, 2);
    else assert.equal(unlinkAttempts, 2);
    assert.deepEqual(transactionArtifacts(target), []);

    const result = installer.executeInstallPlan(plan);
    assert.equal(result.created, 1);
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

test("cleanup errors can be appended twice without replacing the original cause", () => {
  const target = path.join(temporaryRoot(), "target");
  fs.mkdirSync(target);
  const plan = installer.buildInstallPlan(
    target,
    installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
  );
  const defaults = installer.createDefaultFsOps();
  const descriptors = new Map();
  const primaryCause = new Error("injected primary staged write failure");
  const firstCleanupCause = new Error("injected first staged close failure");
  const secondCleanupCause = new Error("injected second staged close failure");
  let writeFailed = false;
  let stageCloseAttempts = 0;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      open(file, flags, mode) {
        const fd = defaults.open(file, flags, mode);
        descriptors.set(fd, file);
        return fd;
      },
      write(fd, buffer, offset, length, position) {
        if (
          descriptors.get(fd).includes(".ai-os-install-stage-")
          && !writeFailed
        ) {
          writeFailed = true;
          throw primaryCause;
        }
        return defaults.write(fd, buffer, offset, length, position);
      },
      close(fd) {
        const file = descriptors.get(fd);
        if (file.includes(".ai-os-install-stage-") && stageCloseAttempts < 2) {
          stageCloseAttempts += 1;
          throw stageCloseAttempts === 1 ? firstCleanupCause : secondCleanupCause;
        }
        const result = defaults.close(fd);
        descriptors.delete(fd);
        return result;
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "stage content");
  assert.equal(error.cause, primaryCause);
  assert.ok(error.cleanupErrors.some((item) => item.cause === firstCleanupCause));
  assert.ok(error.cleanupErrors.some((item) => item.cause === secondCleanupCause));
  assert.equal(
    Object.getOwnPropertyDescriptor(error, "cleanupErrors").configurable,
    true,
  );
  assert.deepEqual(transactionArtifacts(target), []);
});

test("installProject composes planning and execution while counting preserves", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/lanes/default/STATE.md";
  const destination = path.join(target, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, "USER SESSION STATE\n");
  const before = fixtures.snapshotTree(target);
  const defaults = installer.createDefaultFsOps();
  let lockOpens = 0;

  const result = installer.installProject(target, installOptions({
    fileSpecs: [FILE_SPECS[relativePath]],
    fsOps: {
      open(file, flags, mode) {
        lockOpens += 1;
        return defaults.open(file, flags, mode);
      },
    },
  }));

  assert.equal(lockOpens, 1);
  assert.deepEqual(result, {
    created: 0,
    replaced: 0,
    preserved: 1,
    warnings: [],
    baselineId: BOOTSTRAP.id,
    layoutVersion: "11",
  });
  assert.deepEqual(fixtures.snapshotTree(target), before);
  assert.deepEqual(transactionArtifacts(target), []);
});

test("replacement and removal actions commit through same-directory random backups", () => {
  const root = temporaryRoot();
  const cases = [
    {
      action: "replace-framework",
      relativePath: ".ai-os/bin/VERSION",
      oldContent: "CUSTOM VERSION\n",
      mode: 0o600,
      options: { force: true, fileSpecs: [FILE_SPECS[".ai-os/bin/VERSION"]] },
    },
    {
      action: "replace-pristine-project",
      relativePath: "AGENTS.md",
      oldContent: "PRISTINE PROJECT\n",
      mode: 0o640,
      options: {
        fileSpecs: [FILE_SPECS["AGENTS.md"]],
        compatibleHashes: { "AGENTS.md": [sha256("PRISTINE PROJECT\n")] },
      },
    },
    {
      action: "remove-framework",
      relativePath: ".ai-os/bin/obsolete.js",
      oldContent: "PRISTINE OBSOLETE\n",
      mode: 0o700,
      options: {
        fileSpecs: [],
        obsoleteFrameworkHashes: {
          ".ai-os/bin/obsolete.js": [sha256("PRISTINE OBSOLETE\n")],
        },
      },
    },
  ];

  for (const item of cases) {
    const target = path.join(root, item.action);
    const destination = path.join(target, ...item.relativePath.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, item.oldContent, { mode: item.mode });
    const plan = installer.buildInstallPlan(target, installOptions(item.options));
    assert.equal(plan.operations.length, 1);
    assert.equal(plan.operations[0].action, item.action);
    const defaults = installer.createDefaultFsOps();
    const links = [];
    const renames = [];
    const unlinks = [];

    const result = installer.executeInstallPlan(plan, {
      fsOps: {
        link(from, to) {
          links.push([from, to]);
          return defaults.link(from, to);
        },
        rename(from, to) {
          renames.push([from, to]);
          return defaults.rename(from, to);
        },
        unlink(file) {
          unlinks.push(file);
          return defaults.unlink(file);
        },
      },
    });

    assert.equal(links.length, 1);
    const backup = links[0][1];
    assert.equal(links[0][0], destination);
    assert.equal(path.dirname(backup), path.dirname(destination));
    assert.match(
      path.basename(backup),
      new RegExp(`^[.]${path.basename(destination).replaceAll(".", "[.]")}[.]ai-os-install-backup-${process.pid}-[a-f0-9]{24}$`),
    );
    if (item.action === "remove-framework") {
      assert.equal(renames.length, 0);
      assert.ok(unlinks.indexOf(destination) < unlinks.indexOf(backup));
      assert.equal(fs.existsSync(destination), false);
    } else {
      assert.equal(renames.length, 1);
      assert.equal(renames[0][1], destination);
      assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
      assert.equal(fs.lstatSync(destination).mode & 0o777, plan.operations[0].mode);
    }
    assert.deepEqual(result, {
      created: 0,
      replaced: 1,
      preserved: 0,
      warnings: [],
      baselineId: BOOTSTRAP.id,
      layoutVersion: "11",
    });
    assert.deepEqual(transactionArtifacts(target), []);
  }
});

for (const collisionKind of ["file", "symlink"]) {
  test(`a foreign ${collisionKind} backup collision is preserved while a new name is reserved`, () => {
    const root = temporaryRoot();
    const target = path.join(root, "target");
    const relativePath = ".ai-os/bin/VERSION";
    const destination = writeTargetFile(target, relativePath, "ORIGINAL VERSION\n", 0o600);
    const outside = path.join(root, "outside.txt");
    fs.writeFileSync(outside, "OUTSIDE SENTINEL\n");
    const plan = installer.buildInstallPlan(target, installOptions({
      force: true,
      fileSpecs: [FILE_SPECS[relativePath]],
    }));
    const defaults = installer.createDefaultFsOps();
    const backupAttempts = [];
    let collisionPath = null;

    const result = installer.executeInstallPlan(plan, {
      fsOps: {
        link(from, to) {
          if (from === destination && to.includes(".ai-os-install-backup-")) {
            backupAttempts.push(to);
            if (collisionPath === null) {
              collisionPath = to;
              if (collisionKind === "file") {
                fs.writeFileSync(to, "FOREIGN BACKUP COLLISION\n", { mode: 0o640 });
              } else {
                fs.symlinkSync(outside, to);
              }
            }
          }
          return defaults.link(from, to);
        },
      },
    });

    assert.equal(result.replaced, 1);
    assert.ok(backupAttempts.length >= 2);
    assert.notEqual(backupAttempts[0], backupAttempts[1]);
    const collisionStat = fs.lstatSync(collisionPath);
    if (collisionKind === "file") {
      assert.equal(fs.readFileSync(collisionPath, "utf8"), "FOREIGN BACKUP COLLISION\n");
      assert.equal(collisionStat.mode & 0o777, 0o640);
    } else {
      assert.equal(collisionStat.isSymbolicLink(), true);
      assert.equal(fs.readFileSync(outside, "utf8"), "OUTSIDE SENTINEL\n");
    }
    assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
    assert.deepEqual(
      transactionArtifacts(target).filter((item) => path.join(target, ...item.split("/")) !== collisionPath),
      [],
    );
  });
}

test("backup EEXIST preserves a destination hardlink collision and reserves a new name", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/VERSION";
  const original = "ORIGINAL VERSION\n";
  const destination = writeTargetFile(target, relativePath, original, 0o600);
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [FILE_SPECS[relativePath]],
  }));
  const defaults = installer.createDefaultFsOps();
  const backupAttempts = [];
  let collisionPath = null;
  let collisionIdentity = null;

  const result = installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        if (from === destination && to.includes(".ai-os-install-backup-")) {
          backupAttempts.push(to);
          if (collisionPath === null) {
            defaults.link(from, to);
            collisionPath = to;
            collisionIdentity = fs.lstatSync(to);
          }
        }
        return defaults.link(from, to);
      },
    },
  });

  assert.equal(result.replaced, 1);
  assert.ok(backupAttempts.length >= 2);
  assert.notEqual(backupAttempts[0], backupAttempts[1]);
  const preserved = fs.lstatSync(collisionPath);
  assert.equal(preserved.dev, collisionIdentity.dev);
  assert.equal(preserved.ino, collisionIdentity.ino);
  assert.equal(fs.readFileSync(collisionPath, "utf8"), original);
  assert.equal(preserved.mode & 0o777, 0o600);
  assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
  assert.deepEqual(
    transactionArtifacts(target).filter((item) => (
      path.join(target, ...item.split("/")) !== collisionPath
    )),
    [],
  );
});

for (const action of ["replace", "remove"]) {
  test(`${action} revalidates the destination again after reserving its backup`, () => {
    const target = path.join(temporaryRoot(), "target");
    const relativePath = action === "replace"
      ? ".ai-os/bin/VERSION"
      : ".ai-os/bin/obsolete.js";
    const original = action === "replace" ? "ORIGINAL VERSION\n" : "ORIGINAL OBSOLETE\n";
    const destination = writeTargetFile(target, relativePath, original, 0o600);
    const plan = installer.buildInstallPlan(target, installOptions(action === "replace" ? {
      force: true,
      fileSpecs: [FILE_SPECS[relativePath]],
    } : {
      fileSpecs: [],
      obsoleteFrameworkHashes: { [relativePath]: [sha256(original)] },
    }));
    const defaults = installer.createDefaultFsOps();
    let backupPath = null;
    let mutationApplied = false;

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        link(from, to) {
          const result = defaults.link(from, to);
          if (from === destination && to.includes(".ai-os-install-backup-")) {
            backupPath = to;
            fs.unlinkSync(destination);
            fs.writeFileSync(destination, "FOREIGN AFTER BACKUP\n", { mode: 0o640 });
            mutationApplied = true;
          }
          return result;
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "revalidate commit");
    assert.equal(mutationApplied, true);
    assert.equal(fs.readFileSync(destination, "utf8"), "FOREIGN AFTER BACKUP\n");
    assert.equal(fs.lstatSync(destination).mode & 0o777, 0o640);
    assert.equal(fs.readFileSync(backupPath, "utf8"), original);
    assert.match(
      error.cleanupErrors.map((item) => item.message).join("\n"),
      /restore|foreign/i,
    );
  });
}

test("rollback reports restore failure when the backup is missing and destination is foreign", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/VERSION";
  const destination = writeTargetFile(target, relativePath, "ORIGINAL VERSION\n", 0o600);
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [FILE_SPECS[relativePath]],
  }));
  const defaults = installer.createDefaultFsOps();
  const primaryCause = new Error("injected replacement failure after losing backup");
  let backupPath = null;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      link(from, to) {
        const result = defaults.link(from, to);
        if (from === destination && to.includes(".ai-os-install-backup-")) backupPath = to;
        return result;
      },
      rename(from, to) {
        if (from.includes(".ai-os-install-stage-") && to === destination) {
          fs.unlinkSync(backupPath);
          fs.unlinkSync(destination);
          fs.writeFileSync(destination, "FOREIGN WITHOUT BACKUP\n", { mode: 0o640 });
          throw primaryCause;
        }
        return defaults.rename(from, to);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "commit replacement");
  assert.equal(error.cause, primaryCause);
  assert.equal(fs.readFileSync(destination, "utf8"), "FOREIGN WITHOUT BACKUP\n");
  assert.match(
    error.cleanupErrors.map((item) => item.message).join("\n"),
    /could not be restored.*foreign/i,
  );
});

test("a one-shot successful-commit backup cleanup failure is reported and leaves no artifact", () => {
  const target = path.join(temporaryRoot(), "target");
  const relativePath = ".ai-os/bin/VERSION";
  const destination = writeTargetFile(target, relativePath, "ORIGINAL VERSION\n", 0o600);
  const plan = installer.buildInstallPlan(target, installOptions({
    force: true,
    fileSpecs: [FILE_SPECS[relativePath]],
  }));
  const defaults = installer.createDefaultFsOps();
  const cleanupCause = Object.assign(new Error("injected backup cleanup failure"), {
    code: "EACCES",
  });
  let failureInjected = false;
  let backupUnlinks = 0;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      unlink(file) {
        if (file.includes(".ai-os-install-backup-")) {
          backupUnlinks += 1;
          if (!failureInjected) {
            failureInjected = true;
            throw cleanupCause;
          }
        }
        return defaults.unlink(file);
      },
    },
  }));

  assert.ok(error instanceof installer.InstallFilesystemError);
  assert.equal(error.phase, "cleanup backup file");
  assert.equal(error.cause, cleanupCause);
  assert.equal(backupUnlinks, 2);
  assert.deepEqual(fs.readFileSync(destination), plan.operations[0].content);
  assert.equal(fs.lstatSync(destination).mode & 0o777, plan.operations[0].mode);
  assert.deepEqual(transactionArtifacts(target), []);
});

for (const code of ["EEXIST", "EACCES"]) {
  test(`a failed mkdir with ${code} never owns or removes a concurrently created target`, () => {
    const target = path.join(temporaryRoot(), `target-${code.toLowerCase()}`);
    const plan = installer.buildInstallPlan(
      target,
      installOptions({ fileSpecs: [EXECUTABLE_SPEC] }),
    );
    const defaults = installer.createDefaultFsOps();
    const cause = Object.assign(new Error(`injected ${code} target mkdir failure`), { code });

    const error = captureError(() => installer.executeInstallPlan(plan, {
      fsOps: {
        mkdir(directory, options) {
          defaults.mkdir(directory, options);
          throw cause;
        },
      },
    }));

    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "create target");
    assert.equal(error.cause, cause);
    assert.equal(fs.lstatSync(target).isDirectory(), true);
    assert.deepEqual(fs.readdirSync(target), []);
    assert.deepEqual(transactionArtifacts(target), []);
  });
}

test("installedFixture returns an absolute project installed through installProject", {
  concurrency: false,
}, () => {
  const defaults = installer.createDefaultFsOps();
  let committed = 0;
  installedProbeTarget = fixtures.installedFixture(installOptions({
    fsOps: {
      link(from, to) {
        committed += 1;
        return defaults.link(from, to);
      },
    },
  }));

  assert.equal(path.isAbsolute(installedProbeTarget), true);
  assert.equal(fs.existsSync(path.join(installedProbeTarget, ".ai-os", "bin", "ai-os-doctor.js")), true);
  assert.equal(fs.existsSync(path.join(installedProbeTarget, "AGENTS.md")), true);
  assert.equal(fs.existsSync(path.join(
    installedProbeTarget,
    ".ai-os",
    "lanes",
    "default",
    "baseline-log",
    BOOTSTRAP.file,
  )), true);
  assert.ok(committed > 1);
});

test("installedFixture participates in the fixture module's automatic cleanup", {
  concurrency: false,
}, () => {
  assert.equal(typeof installedProbeTarget, "string");
  assert.equal(fs.existsSync(installedProbeTarget), false);
  installedProbeTarget = null;
});
