const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  test,
  assert,
  repoRoot,
  tmpDir,
  cleanup,
} = require("./helpers");

test("package: tarball contains and installs the complete distribution", () => {
  const packDir = tmpDir();
  const consumerDir = tmpDir();
  const projectDir = path.join(tmpDir(), "project with 空格");

  try {
    const pack = spawnSync("npm", ["pack", "--json", "--pack-destination", packDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(pack.status, 0, pack.stderr);

    const packResult = JSON.parse(pack.stdout);
    assert.equal(packResult.length, 1);
    const tarball = path.join(packDir, packResult[0].filename);
    const packedFiles = packResult[0].files;
    const files = packedFiles.map((entry) => entry.path);

    const required = [
      "README.md",
      "VERSION",
      "docs/artifacts.md",
      "framework/.agents/templates/root/AGENTS.md",
      "bin/create-ai-os.js",
      "bin/ai-os-doctor.js",
    ];
    for (const name of required) assert.ok(files.includes(name), `package contains ${name}`);
    assert.ok(!files.includes("AGENTS.md"), "repo maintainer guard is not distributed");
    assert.ok(!files.includes("RELEASED_VERSION"), "repository release metadata is not distributed");
    assert.ok(!files.some((name) => name.startsWith("docs/superpowers/")), "maintainer plans are not distributed");

    const cliEntry = packedFiles.find((entry) => entry.path === "bin/create-ai-os.js");
    assert.equal(cliEntry.mode & 0o111, 0o111, "packaged CLI is executable");

    const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(listed.status, 0, listed.stderr);
    const expectedFiles = listed.stdout.split("\n").filter((name) => (
      name.startsWith("bin/")
      || name.startsWith("framework/")
      || /^docs\/[^/]+[.]md$/.test(name)
      || ["LICENSE", "README.md", "VERSION"].includes(name)
    ));
    expectedFiles.push("package.json");
    assert.deepEqual(files.sort(), expectedFiles.sort(), "package contains exactly the allowlisted files");

    const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
      cwd: consumerDir,
      encoding: "utf8",
    });
    assert.equal(install.status, 0, install.stderr);

    const cli = path.join(consumerDir, "node_modules", "create-ai-os", "bin", "create-ai-os.js");
    const version = spawnSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), "11.0.0");

    const installed = spawnSync(process.execPath, [cli, "install", projectDir], { encoding: "utf8" });
    assert.equal(installed.status, 0, installed.stderr);
    assert.ok(fs.existsSync(path.join(projectDir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(projectDir, ".ai-os/lanes/default/lane.toml")));

    const doctor = spawnSync(process.execPath, [
      path.join(projectDir, ".ai-os/bin/ai-os-doctor.js"), projectDir, "--json",
    ], { encoding: "utf8" });
    assert.equal(doctor.status, 0, doctor.stderr);
    assert.equal(JSON.parse(doctor.stdout).ok, true);
  } finally {
    cleanup(packDir, consumerDir, path.dirname(projectDir));
  }
});
