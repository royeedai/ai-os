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
  const projectsRoot = fs.realpathSync.native(tmpDir());
  const safeProjectDir = path.join(projectsRoot, "safe project with 空格");
  const cliProjectDir = path.join(projectsRoot, "legacy CLI project with 空格");

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

    const packagedRoot = path.join(consumerDir, "node_modules", "create-ai-os");
    const packagedInstaller = require(path.join(packagedRoot, "bin", "installer.js"));
    const safeResult = packagedInstaller.installProject(safeProjectDir, {
      clock: () => new Date("2026-07-10T23:45:01.234Z"),
    });
    const safeBaselineId = "BL-20260710-234501-bootstrap-unconfirmed";
    const safeBaselineFile = `${safeBaselineId}.md`;
    assert.equal(safeResult.baselineId, safeBaselineId);
    assert.equal(safeResult.layoutVersion, "11");
    assert.equal(
      fs.readFileSync(path.join(safeProjectDir, ".ai-os", "framework.toml"), "utf8"),
      [
        "# AI-OS framework metadata",
        'schema_version = "11"',
        'layout_version = "11"',
        'layout_mode = "shared-root-default-lane"',
        'default_lane = "default"',
        'framework_version = "11.0.0"',
        "",
      ].join("\n"),
      "tarball installer emits stable metadata without timestamps",
    );
    assert.deepEqual(
      fs.readFileSync(path.join(safeProjectDir, ".ai-os", "reference", "artifacts.md")),
      fs.readFileSync(path.join(packagedRoot, "docs", "artifacts.md")),
      "tarball installer copies its packaged reference bytes",
    );
    const safeRecords = fs.readdirSync(path.join(
      safeProjectDir,
      ".ai-os",
      "lanes",
      "default",
      "baseline-log",
    ));
    assert.deepEqual(safeRecords, [safeBaselineFile]);
    const safeBaseline = fs.readFileSync(path.join(
      safeProjectDir,
      ".ai-os",
      "lanes",
      "default",
      "baseline-log",
      safeBaselineFile,
    ), "utf8");
    assert.match(safeBaseline, /^- \*\*Status\*\*: unconfirmed$/m);
    assert.doesNotMatch(safeBaseline, /Confirmed At/i);

    const installed = spawnSync(process.execPath, [cli, "install", cliProjectDir], { encoding: "utf8" });
    assert.equal(installed.status, 0, installed.stderr);
    assert.ok(fs.existsSync(path.join(cliProjectDir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(cliProjectDir, ".ai-os/lanes/default/lane.toml")));

    const doctor = spawnSync(process.execPath, [
      path.join(cliProjectDir, ".ai-os/bin/ai-os-doctor.js"), cliProjectDir, "--json",
    ], { encoding: "utf8" });
    assert.equal(doctor.status, 0, doctor.stderr);
    assert.equal(JSON.parse(doctor.stdout).ok, true);
  } finally {
    cleanup(packDir, consumerDir, projectsRoot);
  }
});
