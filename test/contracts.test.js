"use strict";

const { test, assert } = require("./helpers");
const {
  AUTHORITY,
  SURFACE_RULES,
  TRIGGERS,
  parseMarkdownRows,
  readRepo,
} = require("./contract-fixtures");

const TRIGGER_CONTRACT = Object.freeze({
  "risk-register.md": "G2/high-risk",
  "release-plan.md": "release-intent-or-G2-release",
  "verification-matrix.yaml": "stable-failure-or-G2-guard",
  "specs/": "split-local-contracts",
  "design-pack/": "reverse-spec-parity",
  "evals/": "root-cause-observed-three-times",
});

test("trigger fixture is the approved exact contract", () => {
  assert.deepEqual(TRIGGERS, TRIGGER_CONTRACT);
  assert.deepEqual(AUTHORITY, [
    "AGENTS.md", "lane.toml", "MISSION.md", "DESIGN.md", "tasks.yaml", "STATE.md",
  ]);
});

test("distributed constitution resolves schema locally and separates governance tiers", () => {
  const agents = readRepo("framework/.agents/templates/root/AGENTS.md");
  assert.match(agents, /[.]ai-os\/reference\/artifacts[.]md/u);
  assert.doesNotMatch(agents, /docs\/artifacts[.]md|docs\/maintainers[.]md/u);
  assert.match(agents, /G0.*G1.*G2/su);
  assert.doesNotMatch(agents, /治理档位（`P0` \/ `P1` \/ `P2`）/u);
  assert.match(agents, new RegExp(AUTHORITY.join(" > ").replaceAll(".", "[.]"), "u"));
});

test("constitution and artifact reference expose one trigger matrix", () => {
  for (const relativePath of [
    "framework/.agents/templates/root/AGENTS.md",
    "docs/artifacts.md",
  ]) {
    const rows = parseMarkdownRows(readRepo(relativePath), "## 按需工件触发矩阵");
    assert.deepEqual(Object.fromEntries(rows), TRIGGERS, relativePath);
  }
});

test("official skill is a thin lane-selection and loading adapter", () => {
  const skill = readRepo("framework/skills/ai-os-delivery/SKILL.md");
  assert.match(skill, /read.*local `AGENTS[.]md`/iu);
  assert.match(skill, /\{laneId\}/u);
  assert.match(skill, /L1.*L2.*L3/su);
  assert.doesNotMatch(skill, /## Five core requirements|## Absolute prohibitions|## High-risk escalation/u);
  assert.ok(skill.split(/\r?\n/u).length <= 70);
});

test("all delivery surfaces select lanes dynamically and keep STATE non-authoritative", () => {
  for (const [relativePath, rules] of Object.entries(SURFACE_RULES)) {
    const content = readRepo(relativePath);
    for (const token of rules.required) {
      assert.ok(content.includes(token), `${relativePath} requires ${token}`);
    }
    for (const token of rules.forbidden) {
      assert.equal(content.includes(token), false, `${relativePath} forbids ${token}`);
    }
  }
});

test("handoff tuple has one owner and is not duplicated across surfaces", () => {
  const tuple = "task_id,lane_id,baseline_id,change_ref,evidence_refs,blockers";
  const interop = readRepo("docs/interop.md");
  assert.equal(interop.split(tuple).length - 1, 1);
  for (const relativePath of Object.keys(SURFACE_RULES)) {
    if (relativePath === "docs/interop.md") continue;
    assert.equal(readRepo(relativePath).includes(tuple), false, relativePath);
  }
});
