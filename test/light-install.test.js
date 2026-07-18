"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BEGIN_MARKER,
  END_MARKER,
  LOCK_NAME,
  MAX_AGENTS_BYTES,
  InstallFilesystemError,
  installProject,
  mergeManagedBlock,
} = require("../bin/installer");

const roots = new Set();
const repoRoot = path.resolve(__dirname, "..");

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-light-"));
  roots.add(root);
  return root;
}

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

function withInterruptedAgentWrite(run) {
  const originalOpen = fs.openSync;
  const originalWrite = fs.writeFileSync;
  let stagedFd;
  let interrupted = false;
  fs.openSync = (file, ...args) => {
    const fd = originalOpen(file, ...args);
    if (typeof file === "string" && path.basename(file).startsWith(".AGENTS.md.ai-os-")) {
      stagedFd = fd;
    }
    return fd;
  };
  fs.writeFileSync = (file, data, ...args) => {
    const basename = typeof file === "string" ? path.basename(file) : "";
    const isAgentWrite = file === stagedFd
      || basename === "AGENTS.md"
      || basename.startsWith(".AGENTS.md.ai-os-");
    if (isAgentWrite && !interrupted) {
      interrupted = true;
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      originalWrite(file, bytes.subarray(0, Math.min(8, bytes.length)), ...args);
      const error = new Error("simulated interrupted write");
      error.code = "EIO";
      throw error;
    }
    return originalWrite(file, data, ...args);
  };
  try {
    run();
  } finally {
    fs.openSync = originalOpen;
    fs.writeFileSync = originalWrite;
  }
  assert.equal(interrupted, true, "test interrupted an AGENTS.md write");
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.clear();
});

test("fresh install creates only the lightweight AGENTS.md managed block", () => {
  const target = path.join(temporaryRoot(), "project");

  const result = installProject(target);

  assert.deepEqual(result, {
    action: "created",
    targetDir: fs.realpathSync.native(target),
  });
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);

  const installed = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  const distributed = fs.readFileSync(
    path.join(repoRoot, "framework/.agents/templates/root/AGENTS.md"),
    "utf8",
  );
  assert.equal(installed, distributed);
  assert.equal(BEGIN_MARKER, "<!-- AI-OS:BEGIN -->");
  assert.equal(END_MARKER, "<!-- AI-OS:END -->");
  assert.ok(installed.startsWith(`${BEGIN_MARKER}\n`));
  assert.ok(installed.endsWith(`${END_MARKER}\n`));
  assert.ok(Buffer.byteLength(installed) <= 2_000, "managed block stays below 2 KB");
});

test("managed block input and packaged template fail closed", () => {
  assert.throws(() => mergeManagedBlock("not bytes"), /must be a Buffer/);

  const templatePath = path.join(repoRoot, "framework/.agents/templates/root/AGENTS.md");
  const originalRead = fs.readFileSync;
  fs.readFileSync = (file, ...args) => path.resolve(String(file)) === templatePath
    ? "malformed template\n"
    : originalRead(file, ...args);
  try {
    assert.throws(() => mergeManagedBlock(Buffer.alloc(0)), /packaged AGENTS.md block is malformed/i);
  } finally {
    fs.readFileSync = originalRead;
  }
});

test("filesystem failures retain their cause and do not replace the target", () => {
  const root = temporaryRoot();
  const parentFile = path.join(root, "parent-file");
  fs.writeFileSync(parentFile, "sentinel\n");

  assert.throws(
    () => installProject(path.join(parentFile, "project")),
    (error) => error instanceof InstallFilesystemError
      && error.code === "ERR_INSTALL_FILESYSTEM"
      && error.cause?.code === "ENOTDIR",
  );
  assert.equal(fs.readFileSync(parentFile, "utf8"), "sentinel\n");
});

test("unexpected metadata errors are wrapped before any project write", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const originalLstat = fs.lstatSync;
  fs.lstatSync = (file, ...args) => {
    if (path.basename(String(file)) === ".ai-os") throw codedError("denied", "EACCES");
    return originalLstat(file, ...args);
  };
  try {
    assert.throws(
      () => installProject(target),
      (error) => error instanceof InstallFilesystemError && error.cause?.code === "EACCES",
    );
  } finally {
    fs.lstatSync = originalLstat;
  }
  assert.deepEqual(fs.readdirSync(target), []);
});

test("install appends the managed block while preserving existing project rules", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  const original = "# Project rules\n\nKeep this project-specific rule.\n";
  fs.writeFileSync(agentsPath, original, { mode: 0o640 });

  const result = installProject(target);

  assert.equal(result.action, "updated");
  const installed = fs.readFileSync(agentsPath, "utf8");
  assert.ok(installed.startsWith(`${original}\n${BEGIN_MARKER}\n`));
  assert.ok(installed.endsWith(`${END_MARKER}\n`));
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(agentsPath).mode & 0o777, 0o640);
  }
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("install applies deterministic POSIX modes even under a restrictive umask", {
  skip: process.platform === "win32",
}, () => {
  const root = temporaryRoot();
  const existing = path.join(root, "existing");
  const fresh = path.join(root, "fresh");
  fs.mkdirSync(existing);
  const existingAgents = path.join(existing, "AGENTS.md");
  fs.writeFileSync(existingAgents, "# Existing\n");
  fs.chmodSync(existingAgents, 0o640);
  const previousUmask = process.umask(0o077);
  try {
    installProject(existing);
    installProject(fresh);
  } finally {
    process.umask(previousUmask);
  }

  assert.equal(fs.statSync(existingAgents).mode & 0o777, 0o640);
  assert.equal(fs.statSync(path.join(fresh, "AGENTS.md")).mode & 0o777, 0o644);
});

test("install replaces one managed block and preserves surrounding CRLF bytes", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  const before = "# Project rules\r\n\r\n";
  const after = "\r\n## Local appendix\r\nKeep me.\r\n";
  fs.writeFileSync(
    agentsPath,
    `${before}${BEGIN_MARKER}\r\nold managed content\r\n${END_MARKER}${after}`,
  );

  const result = installProject(target);

  assert.equal(result.action, "updated");
  const installed = fs.readFileSync(agentsPath, "utf8");
  assert.ok(installed.startsWith(`${before}${BEGIN_MARKER}\r\n`));
  assert.ok(installed.endsWith(`${END_MARKER}${after}`));
  assert.ok(installed.includes("<!-- AI-OS:VERSION 11.0.0 -->\r\n"));
  assert.ok(!installed.includes("old managed content"));
  assert.doesNotMatch(installed, /(^|[^\r])\n/u, "updated block follows CRLF style");
});

test("reinstall is byte-for-byte idempotent and leaves mtime unchanged", async () => {
  const target = path.join(temporaryRoot(), "project");
  installProject(target);
  const agentsPath = path.join(target, "AGENTS.md");
  const before = fs.readFileSync(agentsPath);
  const beforeStat = fs.statSync(agentsPath, { bigint: true });

  await new Promise((resolve) => setTimeout(resolve, 5));
  const result = installProject(target);

  assert.equal(result.action, "unchanged");
  assert.deepEqual(fs.readFileSync(agentsPath), before);
  assert.equal(fs.statSync(agentsPath, { bigint: true }).mtimeNs, beforeStat.mtimeNs);
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("append preserves UTF-8 BOM and adopts CRLF without rewriting the prefix", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  const original = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from("# Windows rules\r\nKeep me.\r\n", "utf8"),
  ]);
  fs.writeFileSync(agentsPath, original);

  installProject(target);

  const installed = fs.readFileSync(agentsPath);
  assert.deepEqual(installed.subarray(0, original.length), original);
  const text = installed.subarray(3).toString("utf8");
  assert.ok(text.includes(`\r\n\r\n${BEGIN_MARKER}\r\n`));
  assert.doesNotMatch(text, /(^|[^\r])\n/u);
});

for (const [name, bytes] of [
  ["orphan begin marker", Buffer.from(`${BEGIN_MARKER}\nmissing end\n`)],
  ["orphan end marker", Buffer.from(`missing begin\n${END_MARKER}\n`)],
  ["reversed markers", Buffer.from(`${END_MARKER}\n${BEGIN_MARKER}\n`)],
  ["duplicate blocks", Buffer.from(`${BEGIN_MARKER}\na\n${END_MARKER}\n${BEGIN_MARKER}\nb\n${END_MARKER}\n`)],
  ["marker-like line", Buffer.from("<!-- AI-OS:BEGIN old -->\n")],
  ["isolated carriage return", Buffer.from("first\rsecond\n")],
  ["mixed block line endings", Buffer.from(`${BEGIN_MARKER}\r\nold\n${END_MARKER}\r\n`)],
  ["NUL byte", Buffer.from("before\0after\n")],
  ["invalid UTF-8", Buffer.from([0xc3, 0x28])],
]) {
  test(`install rejects ${name} without changing AGENTS.md`, () => {
    const target = path.join(temporaryRoot(), "project");
    fs.mkdirSync(target);
    const agentsPath = path.join(target, "AGENTS.md");
    fs.writeFileSync(agentsPath, bytes);

    assert.throws(() => installProject(target), /install conflict/i);
    assert.deepEqual(fs.readFileSync(agentsPath), bytes);
    assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
  });
}

test("legacy .ai-os stops installation without modifying legacy data", () => {
  const target = path.join(temporaryRoot(), "project");
  const legacy = path.join(target, ".ai-os");
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, "MISSION.md"), "legacy truth\n");
  const before = fs.readFileSync(path.join(legacy, "MISSION.md"));
  const originalOpen = fs.openSync;
  let openedInstallLock = false;
  fs.openSync = (file, ...args) => {
    if (path.basename(String(file)) === LOCK_NAME) openedInstallLock = true;
    return originalOpen(file, ...args);
  };

  try {
    assert.throws(() => installProject(target), /legacy [. ]ai-os|legacy \.ai-os/i);
  } finally {
    fs.openSync = originalOpen;
  }
  assert.equal(openedInstallLock, false, "legacy projects are rejected before a lock write");
  assert.deepEqual(fs.readFileSync(path.join(legacy, "MISSION.md")), before);
  assert.deepEqual(fs.readdirSync(target), [".ai-os"]);
});

test("a concurrent AGENTS.md edit wins instead of being overwritten", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  fs.writeFileSync(agentsPath, "# Original rules\n");
  const originalOpen = fs.openSync;
  const originalWrite = fs.writeFileSync;
  let stagedFd;
  fs.openSync = (file, ...args) => {
    const fd = originalOpen(file, ...args);
    if (typeof file === "string" && path.basename(file).includes("ai-os-stage")) stagedFd = fd;
    return fd;
  };
  fs.writeFileSync = (file, ...args) => {
    const result = originalWrite(file, ...args);
    if (file === stagedFd) {
      originalWrite(agentsPath, "# Concurrent edit\n");
    }
    return result;
  };

  try {
    assert.throws(() => installProject(target), /changed during installation/i);
  } finally {
    fs.openSync = originalOpen;
    fs.writeFileSync = originalWrite;
  }
  assert.equal(fs.readFileSync(agentsPath, "utf8"), "# Concurrent edit\n");
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("a post-validation concurrent edit is preserved with the claimed original", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  fs.writeFileSync(agentsPath, "# Original rules\n");
  const originalRename = fs.renameSync;
  const originalLink = fs.linkSync;
  let injected = false;
  const inject = (source, destination) => {
    if (
      !injected
      && path.basename(String(destination)) === "AGENTS.md"
      && path.basename(String(source)).startsWith(".AGENTS.md.ai-os-")
    ) {
      injected = true;
      fs.writeFileSync(agentsPath, "# Late concurrent edit\n");
    }
  };
  fs.renameSync = (source, destination) => {
    inject(source, destination);
    return originalRename(source, destination);
  };
  fs.linkSync = (source, destination) => {
    inject(source, destination);
    return originalLink(source, destination);
  };

  try {
    assert.throws(() => installProject(target), /concurrent|changed|backup/i);
  } finally {
    fs.renameSync = originalRename;
    fs.linkSync = originalLink;
  }
  assert.equal(injected, true);
  assert.equal(fs.readFileSync(agentsPath, "utf8"), "# Late concurrent edit\n");
  const backups = fs.readdirSync(target).filter((name) => name.includes("backup"));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(target, backups[0]), "utf8"), "# Original rules\n");
});

test("interrupted writes leave neither staged nor truncated AGENTS.md files", () => {
  const root = temporaryRoot();
  const existing = path.join(root, "existing");
  fs.mkdirSync(existing);
  const existingAgents = path.join(existing, "AGENTS.md");
  fs.writeFileSync(existingAgents, "# Original rules\n");
  withInterruptedAgentWrite(() => {
    assert.throws(() => installProject(existing), /filesystem|interrupted write/i);
  });
  assert.equal(fs.readFileSync(existingAgents, "utf8"), "# Original rules\n");
  assert.deepEqual(fs.readdirSync(existing), ["AGENTS.md"]);

  const fresh = path.join(root, "fresh");
  withInterruptedAgentWrite(() => {
    assert.throws(() => installProject(fresh), /filesystem|interrupted write/i);
  });
  assert.equal(fs.existsSync(fresh), false);
});

test("AGENTS.md symlink is rejected without touching its target", () => {
  const root = temporaryRoot();
  const target = path.join(root, "project");
  const outside = path.join(root, "outside.md");
  fs.mkdirSync(target);
  fs.writeFileSync(outside, "sentinel\n");
  fs.symlinkSync(outside, path.join(target, "AGENTS.md"));

  assert.throws(() => installProject(target), /regular file|link/i);
  assert.equal(fs.readFileSync(outside, "utf8"), "sentinel\n");
  assert.equal(fs.readlinkSync(path.join(target, "AGENTS.md")), outside);
});

test("target directory symlink is rejected", () => {
  const root = temporaryRoot();
  const actual = path.join(root, "actual");
  const target = path.join(root, "linked");
  fs.mkdirSync(actual);
  fs.symlinkSync(actual, target, "dir");

  assert.throws(() => installProject(target), /real directory/i);
  assert.deepEqual(fs.readdirSync(actual), []);
});

test("a foreign install lock is preserved and blocks every write", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const lockPath = path.join(target, ".create-ai-os.lock");
  fs.writeFileSync(lockPath, "foreign lock\n");

  assert.throws(() => installProject(target), /lock|locked/i);
  assert.equal(fs.readFileSync(lockPath, "utf8"), "foreign lock\n");
  assert.deepEqual(fs.readdirSync(target), [".create-ai-os.lock"]);
});

test("failure to remove an owned lock is surfaced after the install", () => {
  const target = path.join(temporaryRoot(), "project");
  const originalUnlink = fs.unlinkSync;
  fs.unlinkSync = (file) => {
    if (path.basename(String(file)) === LOCK_NAME) {
      const error = new Error("simulated lock cleanup failure");
      error.code = "EACCES";
      throw error;
    }
    return originalUnlink(file);
  };
  try {
    assert.throws(() => installProject(target), /lock|filesystem|cleanup/i);
  } finally {
    fs.unlinkSync = originalUnlink;
  }
  assert.deepEqual(fs.readdirSync(target).sort(), [LOCK_NAME, "AGENTS.md"]);
});

for (const releaseFault of [
  "missing",
  "inspect",
  "replaced",
  "read",
  "content",
  "close",
]) {
  test(`lock release fails closed when its ${releaseFault} state is unsafe`, () => {
    const target = path.join(temporaryRoot(), `project-${releaseFault}`);
    fs.mkdirSync(target);
    const originalClose = fs.closeSync;
    const originalLstat = fs.lstatSync;
    const originalOpen = fs.openSync;
    const originalRead = fs.readFileSync;
    const originalRename = fs.renameSync;
    const originalUnlink = fs.unlinkSync;
    const originalWrite = fs.writeFileSync;
    let lockFd;
    fs.openSync = (file, ...args) => {
      const fd = originalOpen(file, ...args);
      if (path.basename(String(file)) === LOCK_NAME) lockFd = fd;
      return fd;
    };
    fs.closeSync = (fd) => {
      if (releaseFault === "close" && fd === lockFd) {
        originalClose(fd);
        throw codedError("close failed", "EIO");
      }
      return originalClose(fd);
    };
    fs.lstatSync = (file, ...args) => {
      if (path.basename(String(file)) !== LOCK_NAME) return originalLstat(file, ...args);
      if (releaseFault === "missing") {
        originalUnlink(file);
        throw codedError("missing", "ENOENT");
      }
      if (releaseFault === "inspect") throw codedError("inspect failed", "EACCES");
      if (releaseFault === "replaced") {
        originalRename(file, `${file}.replaced`);
        originalWrite(file, "foreign lock\n");
      }
      return originalLstat(file, ...args);
    };
    fs.readFileSync = (file, ...args) => {
      if (path.basename(String(file)) === LOCK_NAME) {
        if (releaseFault === "read") throw codedError("read failed", "EACCES");
        if (releaseFault === "content") return "foreign lock\n";
      }
      return originalRead(file, ...args);
    };

    try {
      assert.throws(() => installProject(target), /lock|filesystem|conflict/i);
    } finally {
      fs.closeSync = originalClose;
      fs.lstatSync = originalLstat;
      fs.openSync = originalOpen;
      fs.readFileSync = originalRead;
      fs.renameSync = originalRename;
      fs.unlinkSync = originalUnlink;
      fs.writeFileSync = originalWrite;
    }
    assert.ok(fs.existsSync(path.join(target, "AGENTS.md")));
  });
}

test("a concurrent first AGENTS.md is never overwritten", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  const originalLink = fs.linkSync;
  let injected = false;
  fs.linkSync = (source, destination) => {
    if (!injected && path.basename(String(destination)) === "AGENTS.md") {
      injected = true;
      fs.writeFileSync(agentsPath, "# Concurrent first file\n");
    }
    return originalLink(source, destination);
  };
  try {
    assert.throws(() => installProject(target), /appeared during installation/i);
  } finally {
    fs.linkSync = originalLink;
  }
  assert.equal(fs.readFileSync(agentsPath, "utf8"), "# Concurrent first file\n");
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("a staged-file cleanup failure is surfaced with the artifact preserved", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const originalLink = fs.linkSync;
  const originalUnlink = fs.unlinkSync;
  let injected = false;
  fs.linkSync = (source, destination) => {
    if (!injected && path.basename(String(destination)) === "AGENTS.md") {
      injected = true;
      fs.writeFileSync(destination, "# Concurrent first file\n");
    }
    return originalLink(source, destination);
  };
  fs.unlinkSync = (file) => {
    if (path.basename(String(file)).includes("ai-os-stage")) {
      throw codedError("stage cleanup denied", "EACCES");
    }
    return originalUnlink(file);
  };
  try {
    assert.throws(() => installProject(target), /could not clean a staged AGENTS\.md/i);
  } finally {
    fs.linkSync = originalLink;
    fs.unlinkSync = originalUnlink;
  }
  assert.equal(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), "# Concurrent first file\n");
  assert.equal(fs.readdirSync(target).filter((name) => name.includes("ai-os-stage")).length, 1);
});

test("a vanished stage after publication is reported without losing AGENTS.md", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const originalLink = fs.linkSync;
  const originalUnlink = fs.unlinkSync;
  fs.linkSync = (source, destination) => {
    const result = originalLink(source, destination);
    if (path.basename(String(source)).includes("ai-os-stage")) originalUnlink(source);
    return result;
  };
  try {
    assert.throws(() => installProject(target), /staged AGENTS\.md disappeared/i);
  } finally {
    fs.linkSync = originalLink;
  }
  assert.ok(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8").includes(BEGIN_MARKER));
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("AGENTS.md directory and non-directory targets fail closed", () => {
  const root = temporaryRoot();
  const target = path.join(root, "project");
  fs.mkdirSync(path.join(target, "AGENTS.md"), { recursive: true });
  assert.throws(() => installProject(target), /regular file/i);
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);

  const fileTarget = path.join(root, "not-a-directory");
  fs.writeFileSync(fileTarget, "sentinel\n");
  assert.throws(() => installProject(fileTarget), /real directory/i);
  assert.equal(fs.readFileSync(fileTarget, "utf8"), "sentinel\n");
});

test("oversized AGENTS.md is rejected before allocating a replacement", () => {
  const target = path.join(temporaryRoot(), "project");
  fs.mkdirSync(target);
  const agentsPath = path.join(target, "AGENTS.md");
  fs.writeFileSync(agentsPath, Buffer.alloc(1_048_577, 0x61));

  assert.throws(() => installProject(target), /too large|size/i);
  assert.equal(fs.statSync(agentsPath).size, 1_048_577);
  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
});

test("the installed result respects the size limit and remains reinstallable", () => {
  const root = temporaryRoot();
  const blockLength = fs.readFileSync(
    path.join(repoRoot, "framework/.agents/templates/root/AGENTS.md"),
  ).length;
  const prefixLength = MAX_AGENTS_BYTES - blockLength - 2;

  const allowed = path.join(root, "allowed");
  fs.mkdirSync(allowed);
  fs.writeFileSync(path.join(allowed, "AGENTS.md"), Buffer.alloc(prefixLength, 0x61));
  assert.equal(installProject(allowed).action, "updated");
  assert.equal(fs.statSync(path.join(allowed, "AGENTS.md")).size, MAX_AGENTS_BYTES);
  assert.equal(installProject(allowed).action, "unchanged");

  const rejected = path.join(root, "rejected");
  fs.mkdirSync(rejected);
  const agentsPath = path.join(rejected, "AGENTS.md");
  const original = Buffer.alloc(prefixLength + 1, 0x61);
  fs.writeFileSync(agentsPath, original);
  assert.throws(() => installProject(rejected), /too large|size/i);
  assert.deepEqual(fs.readFileSync(agentsPath), original);
});
