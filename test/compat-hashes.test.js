"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  InstallPlannerError,
  loadCompatHashes,
  normalizeV10Candidate,
} = require("../bin/installer");

const REPO_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "framework/.agents/compat/v10-template-hashes.json",
);
const TAGS = Object.freeze([
  "v10.0.0",
  "v10.1.0",
  "v10.1.1",
  "v10.1.2",
  "v10.3.1",
  "v10.5.0",
  "v10.5.1",
]);
const LOCAL_DOCTOR_TAGS = new Set(["v10.3.1", "v10.5.0", "v10.5.1"]);
const TAG_COMMITS = Object.freeze({
  "v10.0.0": "58c526bd7050c8fe01691d58da4dd51f509bccac",
  "v10.1.0": "c1d371918b8d122e41d0d4bc05cefb000f70aeaf",
  "v10.1.1": "ea3daac3d765b3f63fdc4647b0e11cf559d1e693",
  "v10.1.2": "a909c8741f66854ee9b0c8c18a5a794cd608fbfb",
  "v10.3.1": "1c6f0ab9c841c0016bf0f1f4890abbf3c599bf4d",
  "v10.5.0": "b9ec2485a22e6ae2ccaebee117f409619ccbd705",
  "v10.5.1": "8c6e2b710fcafd709a69a79f99b823b3ed66c23e",
});
const BASELINE_PATH = ".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}";

const TEMPLATE_DESTINATIONS = Object.freeze({
  "AGENTS.md": "AGENTS.md",
  ".ai-os/MISSION.md": "framework/.agents/templates/shared-root/MISSION.md",
  ".ai-os/memory.md": "framework/.agents/templates/shared-root/memory.md",
  ".ai-os/lanes/default/lane.toml": "framework/.agents/templates/lane/lane.toml",
  ".ai-os/lanes/default/MISSION.md": "framework/.agents/templates/lane/MISSION.md",
  ".ai-os/lanes/default/DESIGN.md": "framework/.agents/templates/lane/DESIGN.md",
  ".ai-os/lanes/default/STATE.md": "framework/.agents/templates/lane/STATE.md",
  ".ai-os/lanes/default/tasks.yaml": "framework/.agents/templates/lane/tasks.yaml",
  ".ai-os/lanes/default/risk-register.md": "framework/.agents/templates/lane/risk-register.md",
  ".ai-os/lanes/default/release-plan.md": "framework/.agents/templates/lane/release-plan.md",
  ".ai-os/lanes/default/verification-matrix.yaml": "framework/.agents/templates/lane/verification-matrix.yaml",
  ".ai-os/lanes/default/specs/bugfix.spec.md": "framework/.agents/templates/lane/specs/bugfix.spec.md",
  ".ai-os/lanes/default/specs/example.spec.md": "framework/.agents/templates/lane/specs/example.spec.md",
  ".ai-os/lanes/default/design-pack/parity-map.md": "framework/.agents/templates/lane/design-pack/parity-map.md",
  ".ai-os/lanes/default/evals/eval-example.md": "framework/.agents/templates/lane/evals/eval-example.md",
  "CLAUDE.md": "framework/.agents/templates/ide-pointers/CLAUDE.md",
  "GEMINI.md": "framework/.agents/templates/ide-pointers/GEMINI.md",
  [BASELINE_PATH]: "framework/.agents/templates/lane/baseline-log/BL-template.md",
});

function gitShow(tag, relativePath) {
  return execFileSync("git", ["show", `${tag}:${relativePath}`], {
    cwd: REPO_ROOT,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function installedFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        assert.equal(entry.isFile(), true, `real v10 install emitted only files: ${absolute}`);
        files.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  }
  visit(root);
  return files.sort();
}

function extractContext(target) {
  const metadata = fs.readFileSync(path.join(target, ".ai-os/framework.toml"), "utf8");
  const value = (name) => {
    const matches = [...metadata.matchAll(new RegExp(`^${name} = "([^"]+)"$`, "gm"))];
    assert.equal(matches.length, 1, `${name} is unique in real v10 metadata`);
    return matches[0][1];
  };
  const lane = fs.readFileSync(path.join(target, ".ai-os/lanes/default/lane.toml"), "utf8");
  const baselineId = lane.match(/^baseline_id = "([^"]+)"$/m)?.[1];
  assert.ok(baselineId);
  const baselineFile = `${baselineId}.md`;
  const record = fs.readFileSync(
    path.join(target, ".ai-os/lanes/default/baseline-log", baselineFile),
    "utf8",
  );
  const baselineDate = record.match(/^- \*\*Confirmed At\*\*: ([^\r\n]+)$/m)?.[1];
  assert.ok(baselineDate);
  return {
    baselineId,
    baselineFile,
    baselineDate,
    frameworkVersion: value("framework_version"),
    installedAt: value("installed_at"),
    updatedAt: value("updated_at"),
  };
}

function realV10Install(tag) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `ai-os-${tag}-`));
  const archive = path.join(root, "tag.tar");
  const source = path.join(root, "source");
  const target = path.join(root, "target");
  fs.mkdirSync(source);
  const peeled = execFileSync("git", ["rev-parse", `${tag}^{}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
  assert.equal(peeled, TAG_COMMITS[tag], `${tag} peeled commit is pinned`);
  execFileSync("git", ["archive", "--format=tar", "-o", archive, peeled], {
    cwd: REPO_ROOT,
  });
  execFileSync("tar", ["-xf", archive, "-C", source]);
  const version = fs.readFileSync(path.join(source, "VERSION"), "utf8").trim();
  const packageJson = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
  assert.equal(version, tag.slice(1));
  assert.equal(packageJson.version, version);
  assert.deepEqual(packageJson.files, [
    "bin",
    "framework",
    "AGENTS.md",
    "LICENSE",
    "README.md",
    "VERSION",
  ]);
  execFileSync(process.execPath, [path.join(source, "bin/create-ai-os.js"), target], {
    cwd: source,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { root, target };
}

function deriveCompatObject() {
  const union = new Map();
  const add = (relativePath, bytes) => {
    if (!union.has(relativePath)) union.set(relativePath, new Set());
    union.get(relativePath).add(sha256(bytes));
  };

  for (const tag of TAGS) {
    const fixture = realV10Install(tag);
    try {
      const context = extractContext(fixture.target);
      const paths = installedFiles(fixture.target);
      const expectedPaths = [
        ...Object.keys(TEMPLATE_DESTINATIONS).map((relativePath) => (
          relativePath === BASELINE_PATH
            ? `.ai-os/lanes/default/baseline-log/${context.baselineFile}`
            : relativePath
        )),
        ".ai-os/framework.toml",
        ".ai-os/managed-files.tsv",
        ".gitignore",
        ".gitattributes",
        ...(LOCAL_DOCTOR_TAGS.has(tag) ? [
          ".ai-os/bin/ai-os-doctor.js",
          ".ai-os/bin/shared.js",
          ".ai-os/bin/VERSION",
        ] : []),
      ].sort();
      assert.deepEqual(paths, expectedPaths, `${tag} exact installed destination set`);
      assert.equal(paths.includes(".ai-os/bin/shared.js"), LOCAL_DOCTOR_TAGS.has(tag));
      for (const actualPath of paths) {
        const manifestPath = actualPath
          === `.ai-os/lanes/default/baseline-log/${context.baselineFile}`
          ? BASELINE_PATH
          : actualPath;
        const bytes = fs.readFileSync(path.join(fixture.target, ...actualPath.split("/")));
        add(manifestPath, normalizeV10Candidate(actualPath, bytes, context));
      }
      for (const [destination, source] of Object.entries(TEMPLATE_DESTINATIONS)) {
        const actualPath = destination === BASELINE_PATH
          ? `.ai-os/lanes/default/baseline-log/${context.baselineFile}`
          : destination;
        const normalized = normalizeV10Candidate(
          actualPath,
          fs.readFileSync(path.join(fixture.target, ...actualPath.split("/"))),
          context,
        );
        assert.deepEqual(normalized, gitShow(tag, source), `${tag} ${destination}`);
      }
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }

  return Object.fromEntries([...union.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([relativePath, hashes]) => [relativePath, [...hashes].sort()]));
}

test("v10 compatibility manifest is the exact deterministic union of real installs", () => {
  const derived = deriveCompatObject();
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const committed = JSON.parse(raw);

  assert.equal(Object.keys(derived).length, 25);
  assert.equal(Object.values(derived).reduce((sum, hashes) => sum + hashes.length, 0), 50);
  assert.deepEqual(committed, derived);
  assert.equal(raw, `${JSON.stringify(derived, null, 2)}\n`);
});

test("loadCompatHashes returns fresh Maps of Sets", () => {
  const first = loadCompatHashes();
  const second = loadCompatHashes();

  assert.ok(first instanceof Map);
  assert.equal(first.size, 25);
  assert.notEqual(first, second);
  first.get("AGENTS.md").clear();
  assert.ok(second.get("AGENTS.md").size > 0);
  assert.ok(loadCompatHashes().get("AGENTS.md").size > 0);
});

const VALID_MANIFEST = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

function changedManifest(change) {
  const candidate = JSON.parse(JSON.stringify(VALID_MANIFEST));
  change(candidate);
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

for (const [label, contents] of [
  ["non-object root", "[]\n"],
  ["missing path", changedManifest((value) => { delete value["CLAUDE.md"]; })],
  ["extra path", changedManifest((value) => { value["EXTRA.md"] = ["a".repeat(64)]; })],
  ["unsafe path", changedManifest((value) => {
    value["../outside"] = value["AGENTS.md"];
    delete value["AGENTS.md"];
  })],
  ["case-alias path", changedManifest((value) => {
    value["agents.md"] = value["AGENTS.md"];
    delete value["AGENTS.md"];
  })],
  ["non-array hashes", changedManifest((value) => { value["AGENTS.md"] = "a".repeat(64); })],
  ["empty hashes", changedManifest((value) => { value["AGENTS.md"] = []; })],
  ["missing accepted hash", changedManifest((value) => { value["AGENTS.md"].pop(); })],
  ["uppercase hash", changedManifest((value) => { value["AGENTS.md"][0] = "A".repeat(64); })],
  ["short hash", changedManifest((value) => { value["AGENTS.md"][0] = "a".repeat(63); })],
  ["non-hex hash", changedManifest((value) => { value["AGENTS.md"][0] = "g".repeat(64); })],
  ["duplicate hash", changedManifest((value) => { value["AGENTS.md"][1] = value["AGENTS.md"][0]; })],
  ["unsorted hashes", changedManifest((value) => { value["AGENTS.md"].reverse(); })],
  ["non-canonical whitespace", JSON.stringify(VALID_MANIFEST)],
  ["duplicate key", fs.readFileSync(MANIFEST_PATH, "utf8").replace(
    /\n}\n$/,
    `,\n  "AGENTS.md": [\n    "${"a".repeat(64)}"\n  ]\n}\n`,
  )],
]) {
  test(`loadCompatHashes rejects ${label}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-compat-"));
    const candidate = path.join(root, "manifest.json");
    try {
      fs.writeFileSync(candidate, contents);
      assert.throws(
        () => loadCompatHashes(candidate),
        (error) => error instanceof InstallPlannerError && error.code === "ERR_INSTALL_PLANNER",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("loadCompatHashes rejects directory and linked manifest paths", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-compat-path-"));
  try {
    const real = path.join(root, "real.json");
    const link = path.join(root, "link.json");
    const parentLink = path.join(root, "linked-parent");
    fs.writeFileSync(real, fs.readFileSync(MANIFEST_PATH));
    try {
      fs.symlinkSync(real, link, "file");
      fs.symlinkSync(root, parentLink, "dir");
    } catch (error) {
      if (["EPERM", "EACCES"].includes(error.code)) {
        context.skip("symlink creation is unavailable on this platform");
        return;
      }
      throw error;
    }
    for (const candidate of [root, link, path.join(parentLink, "real.json")]) {
      assert.throws(
        () => loadCompatHashes(candidate),
        (error) => error instanceof InstallPlannerError && error.code === "ERR_INSTALL_PLANNER",
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
