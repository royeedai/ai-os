"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  "framework/.agents/templates/root/AGENTS.md",
);
const BEGIN_MARKER = "<!-- AI-OS:BEGIN -->";
const END_MARKER = "<!-- AI-OS:END -->";
const LOCK_NAME = ".create-ai-os.lock";
const MAX_AGENTS_BYTES = 1024 * 1024;

class InstallConflictError extends Error {
  constructor(message) {
    super(`install conflict: ${message}`);
    this.name = "InstallConflictError";
    this.code = "ERR_INSTALL_CONFLICT";
  }
}

class InstallFilesystemError extends Error {
  constructor(message, cause) {
    super(`install filesystem: ${message}`, { cause });
    this.name = "InstallFilesystemError";
    this.code = "ERR_INSTALL_FILESYSTEM";
  }
}

function readManagedBlock() {
  const content = fs.readFileSync(TEMPLATE_PATH, "utf8");
  if (
    !content.startsWith(`${BEGIN_MARKER}\n`)
    || !content.endsWith(`${END_MARKER}\n`)
  ) {
    throw new InstallConflictError("packaged AGENTS.md block is malformed");
  }
  return content;
}

function lstatIfExists(absolute) {
  try {
    return fs.lstatSync(absolute);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function markerLine(text, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = [...text.matchAll(new RegExp(`^${escaped}(?:\\r\\n|\\n|$)`, "gmu"))];
  return matches.map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

function countLiteral(text, value) {
  let count = 0;
  let cursor = 0;
  while (true) {
    const index = text.indexOf(value, cursor);
    if (index < 0) return count;
    count += 1;
    cursor = index + value.length;
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function unlinkOwned(filePath, identity, label) {
  let stat;
  try {
    stat = fs.lstatSync(filePath, { bigint: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
  if (!sameIdentity(stat, identity) || stat.isSymbolicLink()) {
    throw new InstallConflictError(`${label} was replaced by another process`);
  }
  fs.unlinkSync(filePath);
  return true;
}

function decodeAgents(bytes) {
  const hasBom = bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  const body = hasBom ? bytes.subarray(3) : bytes;
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch (error) {
    throw new InstallConflictError(`AGENTS.md must be valid UTF-8: ${error.message}`);
  }
  if (text.includes("\0")) throw new InstallConflictError("AGENTS.md contains a NUL byte");
  if (text.replace(/\r\n/gu, "").includes("\r")) {
    throw new InstallConflictError("AGENTS.md contains an isolated carriage return");
  }
  return { bom: hasBom ? bytes.subarray(0, 3) : Buffer.alloc(0), text };
}

function withEol(block, eol) {
  return block.replace(/\n/gu, eol);
}

function mergeManagedBlock(existingBytes, managedBlock = readManagedBlock()) {
  if (!Buffer.isBuffer(existingBytes)) {
    throw new TypeError("existingBytes must be a Buffer");
  }
  const { bom, text } = decodeAgents(existingBytes);
  const beginCount = countLiteral(text, BEGIN_MARKER);
  const endCount = countLiteral(text, END_MARKER);
  const beginLines = markerLine(text, BEGIN_MARKER);
  const endLines = markerLine(text, END_MARKER);
  let merged;

  if (beginCount === 0 && endCount === 0) {
    if (/<!--\s*AI-OS:(?:BEGIN|END)\b/iu.test(text)) {
      throw new InstallConflictError("AGENTS.md contains a marker-like AI-OS line");
    }
    const firstEol = text.match(/\r\n|\n/u)?.[0] || "\n";
    const separator = text.length === 0
      ? ""
      : text.endsWith("\n")
        ? firstEol
        : `${firstEol}${firstEol}`;
    merged = `${text}${separator}${withEol(managedBlock, firstEol)}`;
  } else {
    if (
      beginCount !== 1
      || endCount !== 1
      || beginLines.length !== 1
      || endLines.length !== 1
      || beginLines[0].start >= endLines[0].start
    ) {
      throw new InstallConflictError("AGENTS.md has malformed or duplicate AI-OS markers");
    }
    const blockText = text.slice(beginLines[0].start, endLines[0].end);
    const blockEols = new Set([...blockText.matchAll(/\r\n|\n/gu)].map((match) => match[0]));
    if (blockEols.size > 1) {
      throw new InstallConflictError("AGENTS.md managed block mixes line endings");
    }
    const firstEol = blockText.match(/\r\n|\n/u)?.[0] || text.match(/\r\n|\n/u)?.[0] || "\n";
    merged = text.slice(0, beginLines[0].start)
      + withEol(managedBlock, firstEol)
      + text.slice(endLines[0].end);
  }

  return Buffer.concat([bom, Buffer.from(merged, "utf8")]);
}

function acquireLock(target) {
  const lockPath = path.join(target, LOCK_NAME);
  const nonce = `${process.pid}:${crypto.randomBytes(16).toString("hex")}\n`;
  let fd;
  let identity;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(
      lockPath,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | noFollow,
      0o600,
    );
    identity = fs.fstatSync(fd, { bigint: true });
    fs.writeFileSync(fd, nonce, "utf8");
    fs.fsyncSync(fd);
    return { fd, identity, lockPath, nonce };
  } catch (error) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // Preserve the acquisition failure.
      }
      try {
        const stat = fs.lstatSync(lockPath, { bigint: true });
        if (
          identity
          && stat.dev === identity.dev
          && stat.ino === identity.ino
          && stat.isFile()
          && !stat.isSymbolicLink()
        ) {
          fs.unlinkSync(lockPath);
        }
      } catch {
        // Preserve the acquisition failure.
      }
    }
    if (error && error.code === "EEXIST") {
      throw new InstallConflictError("another create-ai-os installation holds the lock");
    }
    throw error;
  }
}

function releaseLock(lock) {
  if (!lock) return;
  let closeError = null;
  try {
    fs.closeSync(lock.fd);
  } catch (error) {
    closeError = error;
  }
  let stat;
  try {
    stat = fs.lstatSync(lock.lockPath, { bigint: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new InstallConflictError("installation lock disappeared before cleanup");
    }
    throw new InstallFilesystemError("could not inspect the installation lock", error);
  }
  if (
    !sameIdentity(stat, lock.identity)
    || !stat.isFile()
    || stat.isSymbolicLink()
  ) {
    throw new InstallConflictError("installation lock was replaced by another process");
  }
  let content;
  try {
    content = fs.readFileSync(lock.lockPath, "utf8");
  } catch (error) {
    throw new InstallFilesystemError("could not read the installation lock", error);
  }
  if (content !== lock.nonce) {
    throw new InstallConflictError("installation lock content changed during installation");
  }
  try {
    fs.unlinkSync(lock.lockPath);
  } catch (error) {
    throw new InstallFilesystemError("could not remove the installation lock", error);
  }
  if (closeError) {
    throw new InstallFilesystemError("could not close the installation lock", closeError);
  }
}

function stageAgents(agentsPath, content, mode) {
  const stagePath = path.join(
    path.dirname(agentsPath),
    `.AGENTS.md.ai-os-stage-${process.pid}-${crypto.randomBytes(8).toString("hex")}.tmp`,
  );
  let fd;
  let identity;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(
      stagePath,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | noFollow,
      0o600,
    );
    identity = fs.fstatSync(fd, { bigint: true });
    fs.writeFileSync(fd, content);
    if (process.platform !== "win32") fs.fchmodSync(fd, mode & 0o777);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    return { identity, path: stagePath };
  } catch (error) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // Continue to identity-checked cleanup.
      }
    }
    if (identity) {
      try {
        unlinkOwned(stagePath, identity, "staged AGENTS.md");
      } catch (cleanupError) {
        throw new InstallFilesystemError(
          `could not clean a staged AGENTS.md after ${error.message}`,
          cleanupError,
        );
      }
    }
    throw error;
  }
}

function cleanupStage(stage, failure) {
  if (!stage) return failure;
  try {
    unlinkOwned(stage.path, stage.identity, "staged AGENTS.md");
    return failure;
  } catch (cleanupError) {
    return new InstallFilesystemError(
      `could not clean a staged AGENTS.md after ${failure.message}`,
      cleanupError,
    );
  }
}

function createAgentsAtomic(agentsPath, content, mode) {
  const stage = stageAgents(agentsPath, content, mode);
  try {
    fs.linkSync(stage.path, agentsPath);
  } catch (error) {
    const failure = error && error.code === "EEXIST"
      ? new InstallConflictError("AGENTS.md appeared during installation; retry after reviewing it")
      : error;
    throw cleanupStage(stage, failure);
  }
  if (!unlinkOwned(stage.path, stage.identity, "staged AGENTS.md")) {
    throw new InstallConflictError("staged AGENTS.md disappeared after publication");
  }
}

function restoreBackup(backup, agentsPath) {
  try {
    fs.linkSync(backup.path, agentsPath);
  } catch (error) {
    if (error && error.code === "EEXIST") return false;
    throw error;
  }
  if (!unlinkOwned(backup.path, backup.identity, "AGENTS.md backup")) {
    throw new InstallConflictError("AGENTS.md backup disappeared during restoration");
  }
  return true;
}

function replaceAgentsAtomic(agentsPath, content, mode, expected) {
  let stage = stageAgents(agentsPath, content, mode);
  const backupPath = path.join(
    path.dirname(agentsPath),
    `.AGENTS.md.ai-os-backup-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  let backup = null;
  let published = false;
  try {
    const beforeClaim = fs.lstatSync(agentsPath, { bigint: true });
    fs.renameSync(agentsPath, backupPath);
    backup = { identity: beforeClaim, path: backupPath };
    const backupStat = fs.lstatSync(backupPath, { bigint: true });
    backup.identity = backupStat;
    if (backupStat.isSymbolicLink() || !backupStat.isFile()) {
      throw new InstallConflictError("AGENTS.md changed type during installation");
    }
    if (!sameIdentity(backupStat, beforeClaim)) {
      throw new InstallConflictError("AGENTS.md identity changed during installation");
    }
    if (!fs.readFileSync(backupPath).equals(expected)) {
      throw new InstallConflictError("AGENTS.md changed during installation");
    }
    try {
      fs.linkSync(stage.path, agentsPath);
    } catch (error) {
      if (error && error.code === "EEXIST") {
        throw new InstallConflictError("a concurrent AGENTS.md edit occupied the destination");
      }
      throw error;
    }
    published = true;
    if (!unlinkOwned(stage.path, stage.identity, "staged AGENTS.md")) {
      throw new InstallConflictError("staged AGENTS.md disappeared after publication");
    }
    stage = null;
    if (!fs.readFileSync(backupPath).equals(expected)) {
      throw new InstallConflictError("AGENTS.md changed through an open handle during installation");
    }
    if (!unlinkOwned(backup.path, backup.identity, "AGENTS.md backup")) {
      throw new InstallConflictError("AGENTS.md backup disappeared before cleanup");
    }
    backup = null;
  } catch (error) {
    let failure = cleanupStage(stage, error);
    if (backup && !published) {
      try {
        if (restoreBackup(backup, agentsPath)) backup = null;
      } catch (restoreError) {
        failure = new InstallFilesystemError(
          `could not restore AGENTS.md after ${failure.message}`,
          restoreError,
        );
      }
    }
    if (backup) {
      const preserved = path.basename(backup.path);
      const detail = failure.message.replace(/^install (?:conflict|filesystem): /u, "");
      if (failure instanceof InstallConflictError) {
        throw new InstallConflictError(`${detail}; prior content preserved at ${preserved}`);
      }
      throw new InstallFilesystemError(
        `${detail}; prior content preserved at ${preserved}`,
        failure,
      );
    }
    throw failure;
  }
}

function installProject(targetDir) {
  const requested = path.resolve(targetDir);
  let createdTarget = false;
  let completed = false;
  let lock = null;
  let result = null;
  let failure = null;
  try {
    if (!fs.existsSync(requested)) {
      fs.mkdirSync(requested, { recursive: true });
      createdTarget = true;
    }
    const targetStat = fs.lstatSync(requested);
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
      throw new InstallConflictError("target must be a real directory");
    }
    const target = fs.realpathSync.native(requested);
    if (lstatIfExists(path.join(target, ".ai-os"))) {
      throw new InstallConflictError(
        "legacy .ai-os detected; consolidate its durable facts before installing v11",
      );
    }
    lock = acquireLock(target);
    if (lstatIfExists(path.join(target, ".ai-os"))) {
      throw new InstallConflictError(
        "legacy .ai-os detected; consolidate its durable facts before installing v11",
      );
    }
    const agentsPath = path.join(target, "AGENTS.md");
    const agentsStat = lstatIfExists(agentsPath);
    const managedBlock = readManagedBlock();
    if (agentsStat) {
      if (agentsStat.isSymbolicLink() || !agentsStat.isFile()) {
        throw new InstallConflictError("AGENTS.md must be a regular file, not a link or directory");
      }
      if (agentsStat.size > MAX_AGENTS_BYTES) {
        throw new InstallConflictError("AGENTS.md is too large; the safety limit is 1 MiB");
      }
      const existing = fs.readFileSync(agentsPath);
      const merged = mergeManagedBlock(existing, managedBlock);
      if (merged.length > MAX_AGENTS_BYTES) {
        throw new InstallConflictError("installed AGENTS.md would be too large; the limit is 1 MiB");
      }
      if (existing.equals(merged)) {
        result = Object.freeze({ action: "unchanged", targetDir: target });
      } else {
        replaceAgentsAtomic(agentsPath, merged, agentsStat.mode & 0o777, existing);
        result = Object.freeze({ action: "updated", targetDir: target });
      }
    } else {
      createAgentsAtomic(agentsPath, managedBlock, 0o644);
      result = Object.freeze({ action: "created", targetDir: target });
    }
    completed = true;
  } catch (error) {
    failure = error instanceof InstallConflictError || error instanceof InstallFilesystemError
      ? error
      : new InstallFilesystemError(error.message, error);
  }

  try {
    releaseLock(lock);
  } catch (error) {
    failure = failure
      ? new InstallFilesystemError(
        `${failure.message}; additionally, ${error.message}`,
        error,
      )
      : error;
  }
  if (createdTarget && !completed) {
    try {
      fs.rmdirSync(requested);
    } catch {
      // Keep a non-empty or concurrently replaced directory intact.
    }
  }
  if (failure) throw failure;
  return result;
}

module.exports = Object.freeze({
  BEGIN_MARKER,
  END_MARKER,
  LOCK_NAME,
  MAX_AGENTS_BYTES,
  InstallConflictError,
  InstallFilesystemError,
  mergeManagedBlock,
  installProject,
});
