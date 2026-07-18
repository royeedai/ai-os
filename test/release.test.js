"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("development and released versions remain distinct truthful values", () => {
  const manifest = JSON.parse(read("package.json"));

  assert.equal(read("VERSION").trim(), "11.0.0");
  assert.equal(read("RELEASED_VERSION").trim(), "10.5.1");
  assert.equal(manifest.version, "11.0.0");
  assert.equal(manifest.private, true);
});

test("README pins public installs to v10.5.1 while v11 is unreleased", () => {
  const readme = read("README.md");
  const releasedPin = "github:royeedai/ai-os#v10.5.1";

  assert.ok((readme.match(new RegExp(releasedPin, "gu")) || []).length >= 2);
  assert.doesNotMatch(readme, /github:royeedai\/ai-os#v11\.0\.0/u);
  assert.match(readme, /v11 尚未发布/);
  assert.match(readme, /只创建或刷新[\s\S]*`AI-OS:BEGIN` \/ `AI-OS:END` block/);
});

test("unreleased v11 changelog describes the implemented breaking contract", () => {
  const changelog = read("CHANGELOG.md");

  assert.match(changelog, /^## 11\.0\.0 \(Unreleased\)$/mu);
  assert.match(changelog, /只安装 `AGENTS\.md` managed block/);
  assert.match(changelog, /保留 `AGENTS\.md` 的 block 外内容/);
  assert.match(changelog, /`\.ai-os\/` 及 lane、baseline、tasks、memory、STATE 等默认工件/);
  assert.match(changelog, /doctor、安装后 runtime、IDE pointer、adapter、skill wrapper/);
  assert.match(changelog, /`v10\.5\.1` 仍是已发布版本；`v11\.0\.0` 未发布/);
  assert.match(changelog, /绝不自动合并、移动或删除/);
});
