const fs = require("node:fs");
const path = require("node:path");
const { test, assert, repoRoot } = require("./helpers");

const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("development and released versions are distinct truthful values", () => {
  assert.equal(read("VERSION").trim(), "11.0.0");
  assert.equal(read("RELEASED_VERSION").trim(), "10.5.1");
  assert.match(read("CHANGELOG.md"), /^## 11\.0\.0 \(Unreleased\)/m);
});

test("public install commands use the last real release", () => {
  const released = read("RELEASED_VERSION").trim();
  const pin = `github:royeedai/ai-os#v${released}`;
  for (const file of ["README.md", "docs/getting-started.md", "docs/cli.md",
    "examples/greenfield-guided-product.md", "examples/brownfield-change-journey.md",
    "CHANGELOG.md"]) {
    assert.doesNotMatch(read(file), /#v11\.0\.0/);
    assert.ok(read(file).includes(pin), `${file} pins ${pin}`);
  }
  const bareRegistryInvocation = new RegExp(`${["npx", "create-ai-os"].join(" ")}(?:\\s|$)`);
  for (const file of ["README.md", "docs/getting-started.md", "docs/cli.md",
    "examples/greenfield-guided-product.md", "examples/brownfield-change-journey.md",
    "examples/debug-bounded-fix.md", "CHANGELOG.md"]) {
    assert.doesNotMatch(read(file), bareRegistryInvocation);
    assert.doesNotMatch(read(file), /install \. --force/);
  }
});

test("unreleased v11 changelog describes the implemented contract", () => {
  const changelog = read("CHANGELOG.md");
  for (const required of [
    "layout schema 升为 **v11**",
    "`tasks.yaml` schema 升为 **version 5**",
    "`delivery_ready`",
    "v10 → v11",
    "`npm run test:coverage`",
  ]) {
    assert.ok(changelog.includes(required), required);
  }
  for (const stale of [
    "layout schema 升为 **v10**",
    "`tasks.yaml` 模板精简（version 4）",
    "doctor 收敛为结构检查 + 两个语义警告",
  ]) {
    assert.ok(!changelog.includes(stale), stale);
  }
});

test("registry publication is explicitly disabled", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, ">=22.13.0");
});
