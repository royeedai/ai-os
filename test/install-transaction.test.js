"use strict";

const fs = require("node:fs");
const path = require("node:path");
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
    "readFile",
    "open",
    "write",
    "fsync",
    "fchmod",
    "close",
    "mkdir",
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
  first.close(fd);
  assert.equal(first.lstat(source).isFile(), true);
  assert.equal(first.readFile(source, "utf8"), "SYNC WRAPPERS\n");
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
  assert.deepEqual(stageCalls, ["open", "write", "fsync", "fchmod", "close", "rename"]);
  assert.equal(calls.find((call) => call.operation === "fchmod").mode, 0o755);
  assert.equal(calls.find((call) => call.operation === "rename").to, destination);
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
  const cause = new Error("injected create rename failure");
  let renames = 0;

  const error = captureError(() => installer.executeInstallPlan(plan, {
    fsOps: {
      rename(from, to) {
        renames += 1;
        if (renames === 2) throw cause;
        return defaults.rename(from, to);
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

test("replace and remove operations fail closed until rollback support lands", () => {
  const root = temporaryRoot();
  const replaceTarget = path.join(root, "replace-target");
  const replaceDestination = path.join(replaceTarget, ".ai-os", "bin", "VERSION");
  fs.mkdirSync(path.dirname(replaceDestination), { recursive: true });
  fs.writeFileSync(replaceDestination, "CUSTOM VERSION\n");
  const replacePlan = installer.buildInstallPlan(
    replaceTarget,
    installOptions({ force: true, fileSpecs: [FILE_SPECS[".ai-os/bin/VERSION"]] }),
  );

  const removeTarget = path.join(root, "remove-target");
  const removeDestination = path.join(removeTarget, ".ai-os", "bin", "obsolete.js");
  fs.mkdirSync(path.dirname(removeDestination), { recursive: true });
  fs.writeFileSync(removeDestination, "PRISTINE OBSOLETE\n");
  const removePlan = installer.buildInstallPlan(removeTarget, installOptions({
    fileSpecs: [],
    obsoleteFrameworkHashes: {
      ".ai-os/bin/obsolete.js": [sha256("PRISTINE OBSOLETE\n")],
    },
  }));

  for (const [plan, target, expectedPath] of [
    [replacePlan, replaceTarget, ".ai-os/bin/VERSION"],
    [removePlan, removeTarget, ".ai-os/bin/obsolete.js"],
  ]) {
    const before = fixtures.snapshotTree(target);
    const error = captureError(() => installer.executeInstallPlan(plan));
    assert.ok(error instanceof installer.InstallFilesystemError);
    assert.equal(error.phase, "unsupported action");
    assert.equal(error.relativePath, expectedPath);
    assert.match(error.message, /transaction support is deferred/i);
    assert.deepEqual(fixtures.snapshotTree(target), before);
    assert.deepEqual(transactionArtifacts(target), []);
  }
});

test("installedFixture returns an absolute project installed through installProject", {
  concurrency: false,
}, () => {
  const defaults = installer.createDefaultFsOps();
  let committed = 0;
  installedProbeTarget = fixtures.installedFixture(installOptions({
    fsOps: {
      rename(from, to) {
        committed += 1;
        return defaults.rename(from, to);
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
