"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = "framework/.agents/templates/root/AGENTS.md";

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("distributed constitution has stable markers, version, and a small token footprint", () => {
  const version = read("VERSION").trim();
  const content = read(TEMPLATE);
  const lines = content.replace(/\n$/u, "").split("\n");

  assert.equal(version, "11.0.0");
  assert.equal(lines[0], "<!-- AI-OS:BEGIN -->");
  assert.equal(lines.at(-1), "<!-- AI-OS:END -->");
  assert.equal(lines[1], `<!-- AI-OS:VERSION ${version} -->`);
  assert.equal(content.match(/<!-- AI-OS:BEGIN -->/gu)?.length, 1);
  assert.equal(content.match(/<!-- AI-OS:END -->/gu)?.length, 1);
  assert.equal(content.match(/<!-- AI-OS:VERSION /gu)?.length, 1);
  assert.ok(Buffer.byteLength(content) <= 2_000, "constitution stays at or below 2 KB");
  assert.ok(lines.length <= 40, `constitution stays at or below 40 lines (got ${lines.length})`);
});

test("distributed constitution captures the lightweight delivery contract", () => {
  const content = read(TEMPLATE);

  for (const [name, pattern] of [
    ["user goal", /用户的真实目标/],
    ["repository facts", /仓库事实.*代码.*测试.*配置/s],
    ["direct low-risk execution", /清晰且低风险时，直接/],
    ["native agent capabilities", /原生的 plan、debug、TDD 与 memory 能力/],
    ["no generated process artifacts", /不因本宪法自动生成流程文件/],
    ["key design confirmation", /关键设计、接口、状态流转、权限和异常路径未确认前/],
    ["risk boundary", /不可逆、高风险或可能越界时确认/],
    ["native verification", /项目已有的原生命令与质量门验证/],
    ["truthful delivery status", /代码状态、数据状态、运行状态/],
    ["existing truth sources", /项目既有的权威真理源/],
  ]) {
    assert.match(content, pattern, name);
  }
});

test("maintainer documentation surface stays intentionally small", () => {
  const docs = fs.readdirSync(path.join(ROOT, "docs"), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(docs, ["maintainers.md"]);
  for (const relativePath of [
    "AGENTS.md",
    "README.md",
    "PROJECT_PURPOSE.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "CHANGELOG-archive.md",
    "docs/maintainers.md",
    TEMPLATE,
  ]) {
    assert.ok(fs.statSync(path.join(ROOT, relativePath)).isFile(), `${relativePath} exists`);
  }

  const maintainerRules = read("AGENTS.md");
  assert.match(maintainerRules, /本仓库是 AI-OS 的安装器、模板和文档源码仓库/);
  assert.match(maintainerRules, /v11 只维护 `AGENTS\.md` 的 AI-OS managed block/);
  assert.match(maintainerRules, /不得自动删除、迁移或猜测合并项目事实/);
});
