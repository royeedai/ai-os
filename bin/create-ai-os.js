#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const FRAMEWORK_VERSION = fs.readFileSync(path.join(PACKAGE_ROOT, "VERSION"), "utf8").trim();
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")
);

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os [target-dir] [--target <dir>] [--with-project-files] [--force-framework]

Options:
  --target <dir>        Target project directory. Defaults to the first positional arg or the current directory.
  --with-project-files  Create missing project-local files such as project-charter.md, tasks.yaml, acceptance.yaml, release-plan.md, memory.md, specs/, evals/
  --force-framework     Overwrite existing framework-managed files: agent.md and .agents/
  -h, --help            Show this help message
`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileWithMode(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, fs.statSync(src).mode);
}

function listFilesRecursively(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        results.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

function copyFramework(targetDir) {
  const managedRoots = ["agent.md", ".agents"];

  for (const rootRel of managedRoots) {
    const srcRoot = path.join(PACKAGE_ROOT, rootRel);
    const dstRoot = path.join(targetDir, rootRel);

    if (fs.statSync(srcRoot).isFile()) {
      copyFileWithMode(srcRoot, dstRoot);
      process.stdout.write(`copied: ${rootRel}\n`);
      continue;
    }

    const files = listFilesRecursively(srcRoot);
    for (const srcFile of files) {
      const relativePath = path.relative(PACKAGE_ROOT, srcFile);
      const dstFile = path.join(targetDir, relativePath);
      copyFileWithMode(srcFile, dstFile);
      process.stdout.write(`copied: ${relativePath}\n`);
    }
  }
}

function copyTemplateIfMissing(targetDir, src, dst) {
  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst)) {
    process.stdout.write(`keep existing project file: ${path.relative(targetDir, dst)}\n`);
    return;
  }

  copyFileWithMode(src, dst);
  process.stdout.write(`created project file: ${path.relative(targetDir, dst)}\n`);
}

function createProjectFiles(targetDir) {
  ensureDir(path.join(targetDir, "specs"));
  ensureDir(path.join(targetDir, "evals"));
  ensureDir(path.join(targetDir, ".ai-os-project"));

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/project-planner/references/project-charter-template.md"
    ),
    path.join(targetDir, "project-charter.md")
  );

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/project-planner/references/risk-register-template.md"
    ),
    path.join(targetDir, "risk-register.md")
  );

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/task-orchestrator/references/tasks-template.yaml"
    ),
    path.join(targetDir, "tasks.yaml")
  );

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/acceptance-gate/references/acceptance-template.yaml"
    ),
    path.join(targetDir, "acceptance.yaml")
  );

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/release-manager/references/release-plan-template.md"
    ),
    path.join(targetDir, "release-plan.md")
  );

  copyTemplateIfMissing(
    targetDir,
    path.join(
      PACKAGE_ROOT,
      ".agents/skills/memory-manager/references/memory-template.md"
    ),
    path.join(targetDir, "memory.md")
  );
}

function writeMetadata(targetDir) {
  const metadataDir = path.join(targetDir, ".ai-os-project");
  const metadataFile = path.join(metadataDir, "framework.toml");

  ensureDir(metadataDir);
  fs.writeFileSync(
    metadataFile,
    [
      'mode = "npx-git"',
      `framework_version = "${FRAMEWORK_VERSION}"`,
      `package_name = "${PACKAGE_JSON.name}"`,
      `package_version = "${PACKAGE_JSON.version}"`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function removeManagedPaths(targetDir) {
  for (const relPath of ["agent.md", ".agents"]) {
    const absolutePath = path.join(targetDir, relPath);
    let exists = false;
    try {
      fs.lstatSync(absolutePath);
      exists = true;
    } catch (_error) {
      exists = false;
    }

    if (!exists) {
      continue;
    }
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
let targetArg = "";
let withProjectFiles = false;
let forceFramework = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }

  if (arg === "--with-project-files") {
    withProjectFiles = true;
    continue;
  }

  if (arg === "--force-framework") {
    forceFramework = true;
    continue;
  }

  if (arg === "--target") {
    if (i + 1 >= args.length) {
      fail("--target requires a value");
    }
    targetArg = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }

  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }

  targetArg = arg;
}

const TARGET_DIR = path.resolve(targetArg || ".");
ensureDir(TARGET_DIR);

if (!forceFramework) {
  const existingFrameworkPaths = ["agent.md", ".agents"]
    .map((relPath) => path.join(TARGET_DIR, relPath))
    .filter((absolutePath) => fs.existsSync(absolutePath));

  if (existingFrameworkPaths.length > 0) {
    fail(
      [
        "target project already contains framework-managed paths:",
        ...existingFrameworkPaths.map((absolutePath) => `- ${absolutePath}`),
        "rerun with --force-framework to overwrite them"
      ].join("\n")
    );
  }
} else {
  removeManagedPaths(TARGET_DIR);
}

process.stdout.write(`Initializing AI-OS ${FRAMEWORK_VERSION} into ${TARGET_DIR}\n`);

copyFramework(TARGET_DIR);

if (withProjectFiles) {
  createProjectFiles(TARGET_DIR);
}

writeMetadata(TARGET_DIR);

process.stdout.write(`
Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${TARGET_DIR}

Next steps:
1. Open ${path.join(TARGET_DIR, "project-charter.md")} if you created project-local files.
2. Start with the /new-project workflow for a new project.
3. Commit the generated framework and project state files into the target repository.
`);
