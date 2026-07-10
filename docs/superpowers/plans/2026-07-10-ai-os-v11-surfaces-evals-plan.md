# AI-OS v11 Surfaces and Evals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the constitution, local reference, skill, docs, examples, issue templates, and eval oracles on one authority/trigger contract.

**Architecture:** Root AGENTS remains the project behavior authority. The skill is a thin activation/loading adapter. `docs/artifacts.md` is the canonical schema copied to the installed local reference, while static tests compare exact cross-surface matrices and machine-checkable eval headings.

**Tech Stack:** Markdown, YAML frontmatter subset, Node `node:test` contract tests.

## Global Constraints

- Distributed AGENTS remains at or below 150 lines.
- Skill must not duplicate constitution rules.
- Every downstream relative reference resolves after install.
- STATE is navigation only; lane.toml/MISSION/DESIGN/tasks are committed truth.
- Release plan is triggered by release intent or G2 release preparation.
- No live model harness is shipped.

---

## File Map

- `framework/.agents/templates/root/AGENTS.md`: compact behavior constitution.
- `framework/skills/ai-os-delivery/SKILL.md`: thin adapter.
- `docs/artifacts.md`: canonical artifact/tier/trigger/authority schema.
- `docs/interop.md`: lane selection and bounded worker handoff.
- `README.md`, `PROJECT_PURPOSE.md`, `CONTRIBUTING.md`: accurate product boundaries.
- `examples/*.md`: canonical scenario narratives.
- `evals/*.md`: machine-checkable behavior oracles.
- `.github/PULL_REQUEST_TEMPLATE.md`, issue templates: current feedback vocabulary.
- `test/contracts.test.js`, `test/evals.test.js`: drift gates.

### Task 1: Make the distributed constitution self-consistent and locally resolvable

**Files:**
- Modify: `framework/.agents/templates/root/AGENTS.md`
- Modify: `docs/artifacts.md`
- Create: `test/contract-fixtures.js`
- Create: `test/contracts.test.js`
- Create: `test/link-integrity.test.js`

**Interfaces:**
- Produces exact trigger matrix keys `risk-register.md`, `release-plan.md`,
  `verification-matrix.yaml`, `specs/`, `design-pack/`, `evals/`.
- Produces exact authority order `AGENTS > lane.toml > MISSION > DESIGN > tasks > STATE`.
- `test/contract-fixtures.js` exports `TRIGGERS`, `AUTHORITY`,
  `readRepo(relativePath)`, and `parseMarkdownRows(content, heading)`; later
  example tests import these values rather than importing a test module.
  `AUTHORITY` is the frozen array `["AGENTS.md", "lane.toml", "MISSION.md",
  "DESIGN.md", "tasks.yaml", "STATE.md"]`; `parseMarkdownRows` returns a Map
  from the first two cells of the one Markdown table under the exact heading and
  rejects duplicate/empty keys.

- [ ] **Step 1: Write failing contract tests**

```js
const { TRIGGERS, readRepo, parseMarkdownRows } = require("./contract-fixtures");

// test/contract-fixtures.js owns this exact value:
const TRIGGER_CONTRACT = Object.freeze({
  "risk-register.md": "G2/high-risk",
  "release-plan.md": "release-intent-or-G2-release",
  "verification-matrix.yaml": "stable-failure-or-G2-guard",
  "specs/": "split-local-contracts",
  "design-pack/": "reverse-spec-parity",
  "evals/": "root-cause-observed-three-times",
});

test("distributed constitution resolves schema locally", () => {
  const agents = readRepo("framework/.agents/templates/root/AGENTS.md");
  assert.match(agents, /\.ai-os\/reference\/artifacts\.md/);
  assert.doesNotMatch(agents, /docs\/artifacts\.md|docs\/maintainers\.md/);
});

test("constitution separates task priority from governance", () => {
  const agents = readRepo("framework/.agents/templates/root/AGENTS.md");
  assert.match(agents, /G0.*G1.*G2/s);
  assert.doesNotMatch(agents, /治理档位（`P0` \/ `P1` \/ `P2`）/);
});
```

Parse the on-demand rows from AGENTS and docs with `parseMarkdownRows`, compare
the same artifact names/triggers to `TRIGGERS`, and assert
`TRIGGERS` deeply equals `TRIGGER_CONTRACT` shown above.

Create `test/link-integrity.test.js`: fresh-install a project, extract every
backticked local path from installed AGENTS/CLAUDE/GEMINI plus the source skill,
resolve `{laneId}` to `default`, and assert every required target is a regular
installed file/directory. It also asserts `.ai-os/reference/artifacts.md` equals
repository `docs/artifacts.md` and no installed surface points into repository
`docs/` or maintainer-only paths.

- [ ] **Step 2: Verify current references and tiers fail**

```bash
node --test test/contracts.test.js test/link-integrity.test.js
```

Expected: FAIL on `docs/artifacts.md`, P-governance, and release-plan trigger.

- [ ] **Step 3: Rewrite compact governance paragraphs**

Update AGENTS to:

- link `.ai-os/reference/artifacts.md`;
- define G0/G1/G2 without duplicating task priority;
- define STATE as rebuildable navigation;
- require structured human approval/evidence for G2;
- distinguish release intent from high-risk trigger;
- permit already-authorized low-risk fixes while retaining design/high-risk stops;
- keep ordinary read-only analysis outside artifact writes while high-risk actions override the superficial task form.

- [ ] **Step 4: Verify line and contract limits**

```bash
node -e 'const fs=require("fs");const s=fs.readFileSync("framework/.agents/templates/root/AGENTS.md","utf8");const n=s.split(/\r?\n/).length;if(n>150)throw new Error(`AGENTS lines=${n}`);console.log(`AGENTS lines=${n}`)'
node --test test/contracts.test.js test/link-integrity.test.js
```

Expected: line count at most 150; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/.agents/templates/root/AGENTS.md docs/artifacts.md test/contract-fixtures.js test/contracts.test.js test/link-integrity.test.js
git commit -m "docs: converge distributed governance contract"
```

### Task 2: Reduce the official skill to a thin lane adapter

**Files:**
- Modify: `framework/skills/ai-os-delivery/SKILL.md`
- Modify: `test/contracts.test.js`

**Interfaces:**
- Skill keeps frontmatter plus activation, `{laneId}` selection, L1/L2/L3 loading, and local-AGENTS delegation.
- Skill body target is at most 70 lines.

- [ ] **Step 1: Add thin-adapter failure tests**

```js
test("skill delegates behavior to local constitution", () => {
  const skill = readRepo("framework/skills/ai-os-delivery/SKILL.md");
  assert.match(skill, /read.*local `AGENTS\.md`/i);
  assert.match(skill, /\{laneId\}/);
  assert.doesNotMatch(skill, /## Five core requirements|## Absolute prohibitions|## High-risk escalation/);
  assert.ok(skill.split(/\r?\n/).length <= 70);
});
```

- [ ] **Step 2: Run and verify duplication failure**

```bash
node --test test/contracts.test.js
```

Expected: FAIL because the current skill duplicates the constitution and hardcodes default.

- [ ] **Step 3: Replace the skill body**

Keep:

1. applicability: AGENTS + `.ai-os` + delivery-affecting work;
2. Activation Gate before lane reads;
3. lane selection from explicit request/task/baseline, one question on ambiguity;
4. L1 STATE/lane.toml, then phase-specific L2/L3;
5. re-read on baseline change, compaction, handoff, or phase change;
6. follow local AGENTS and local reference; no duplicated behavior rules.

- [ ] **Step 4: Run skill/spec tests**

```bash
node --test test/contracts.test.js test/docs.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/skills/ai-os-delivery/SKILL.md test/contracts.test.js
git commit -m "refactor: make delivery skill a thin adapter"
```

### Task 3: Align authority, multi-lane, handoff, and memory documentation

**Files:**
- Modify: `docs/interop.md`
- Modify: `docs/getting-started.md`
- Modify: `README.md`
- Modify: `PROJECT_PURPOSE.md`
- Modify: `CONTRIBUTING.md`
- Modify: `framework/.agents/templates/ide-pointers/CLAUDE.md`
- Modify: `framework/.agents/templates/ide-pointers/GEMINI.md`
- Modify: `test/contracts.test.js`
- Modify: `test/docs.test.js`

**Interfaces:**
- Defines handoff tuple `task_id,lane_id,baseline_id,change_ref,evidence_refs,blockers`.
- Defines STATE conflict behavior and active-lane selection.
- `test/contract-fixtures.js` exports a `SURFACE_RULES` object whose explicit
  keys are `README.md`, `PROJECT_PURPOSE.md`, `CONTRIBUTING.md`,
  `docs/interop.md`, `docs/getting-started.md`, both IDE pointers, root AGENTS,
  and the skill; each value lists required and forbidden exact tokens.

- [ ] **Step 1: Write cross-surface authority tests**

Iterate `SURFACE_RULES` so every enumerated surface says STATE is
navigation/rebuildable, not highest truth; no multi-lane text hardcodes default;
the exact handoff tuple occurs once in interop and is referenced, not duplicated,
elsewhere. The Node support prerequisite remains owned by the CI subplan and is
not edited here.

- [ ] **Step 2: Verify current STATE/default wording fails**

```bash
node --test test/contracts.test.js test/docs.test.js
```

Expected: FAIL on `STATE priority highest`, default-only skill/pointers, and union merge wording.

- [ ] **Step 3: Update documentation and pointers**

Document a coordinating writer and bounded worker response without adding scheduling. Remove volatile model-version names from timeless product claims; place any dated ecosystem observation in a clearly dated note.

- [ ] **Step 4: Run docs/contract tests**

```bash
node --test test/contracts.test.js test/docs.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md PROJECT_PURPOSE.md CONTRIBUTING.md docs/interop.md docs/getting-started.md framework/.agents/templates/ide-pointers/CLAUDE.md framework/.agents/templates/ide-pointers/GEMINI.md test/contract-fixtures.js test/contracts.test.js test/docs.test.js
git commit -m "docs: define authority and lane handoff"
```

### Task 4: Correct all narrative examples

**Files:**
- Modify: `examples/greenfield-guided-product.md`
- Modify: `examples/brownfield-change-journey.md`
- Modify: `examples/debug-bounded-fix.md`
- Create: `test/examples.test.js`

**Interfaces:**
- Examples consume the canonical trigger/authority constants directly from
  `test/contract-fixtures.js`; test modules never import one another.

- [ ] **Step 1: Write exact narrative regression tests**

```js
test("greenfield example does not invent payment scope or misuse CR", () => {
  const example = readRepo("examples/greenfield-guided-product.md");
  assert.doesNotMatch(example, /Stripe|webhook/);
  assert.doesNotMatch(example, /CR-.*initial-alignment/);
  assert.match(example, /release-plan.*release intent/i);
});

test("bug fix authorization is consistent", () => {
  const example = readRepo("examples/debug-bounded-fix.md");
  assert.match(example, /explicit fix request.*continue/i);
  assert.match(example, /stop.*high-risk|design trade-off|scope expansion/i);
});
```

- [ ] **Step 2: Verify current example failures**

```bash
node --test test/examples.test.js
```

Expected: FAIL on Stripe, initial CR, and unconditional confirmation wording.

- [ ] **Step 3: Rewrite only inconsistent steps**

Preserve scenario intent while removing invented scope. Initial alignment produces an unconfirmed bootstrap then a confirmed BL, not a CR. Release plan appears only when the user asks to ship. Explicit bounded fixes continue without ritual reauthorization unless design/high-risk/scope conditions trigger a stop.

- [ ] **Step 4: Run example and contract tests**

```bash
node --test test/examples.test.js test/contracts.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add examples test/examples.test.js
git commit -m "docs: make examples obey governance"
```

### Task 5: Convert all evals into behavior oracles

**Files:**
- Modify: `evals/README.md`
- Modify: all `evals/*.md` except README
- Create: `test/evals.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Every eval frontmatter includes `oracle_version: 1`, `framework_version: "11.0.0"`, existing provenance/taxonomy fields.
- Every eval has exact headings `Input`, `Expected decisions`, `Forbidden actions`, `Required artifact deltas`, `Minimum evidence`, `Framework change targets`.
- Section items use parseable prefixes: `DECISION:`, `FORBID:`, `DELTA:`,
  `EVIDENCE:`, and `TARGET:`; `DELTA: none — reason` is the only empty-delta
  form.

- [ ] **Step 1: Write an oracle parser and failing inventory test**

In `test/evals.test.js`, parse frontmatter scalars and headings for every non-README Markdown file:

```js
const REQUIRED_FIELDS = ["oracle_version", "framework_version", "trigger_source",
  "first_baseline_id", "risk_source", "failure_mode", "harm", "artifact_gate"];
const REQUIRED_HEADINGS = ["Input", "Expected decisions", "Forbidden actions",
  "Required artifact deltas", "Minimum evidence", "Framework change targets"];

assert.equal(evalFiles.length, 11);
for (const file of evalFiles) {
  const parsed = parseEval(file);
  for (const field of REQUIRED_FIELDS) {
    assert.ok(Object.hasOwn(parsed.frontmatter, field), `${file}: ${field}`);
    assert.notEqual(String(parsed.frontmatter[field]).trim(), "", `${file}: nonempty ${field}`);
  }
  assert.equal(parsed.frontmatter.oracle_version, 1);
  assert.equal(parsed.frontmatter.framework_version, "11.0.0");
  for (const heading of REQUIRED_HEADINGS) {
    assert.equal(parsed.headingCounts.get(heading), 1, `${file}: unique ${heading}`);
    assert.notEqual(parsed.sections.get(heading).trim(), "", `${file}: nonempty ${heading}`);
  }
  assertItems(parsed.sections.get("Expected decisions"), "DECISION:");
  assertItems(parsed.sections.get("Forbidden actions"), "FORBID:");
  assertItems(parsed.sections.get("Required artifact deltas"), "DELTA:");
  assertItems(parsed.sections.get("Minimum evidence"), "EVIDENCE:");
  assertItems(parsed.sections.get("Framework change targets"), "TARGET:");
}
```

`parseEval` rejects duplicate/unknown frontmatter keys, invalid enum values,
duplicate/unknown headings, empty sections, and malformed prefixed list items.
Contract tests parse trigger/authority statements inside all 11 oracles and
compare them with `TRIGGERS`/`AUTHORITY`; they do not accept mere heading
presence as behavioral proof.

- [ ] **Step 2: Verify all current narrative evals fail**

```bash
node --test test/evals.test.js
```

Expected: FAIL on missing oracle fields/headings.

- [ ] **Step 3: Convert the 11 cases**

For each existing failure mode, retain its facts and rewrite its five semantic sections into the six exact oracle headings. Forbidden actions are concrete agent actions; required deltas are file/action pairs; minimum evidence never requires an optional artifact unless its trigger is present.

Specific corrections:

- release truth uses release-plan only for release intent;
- feature-visible does not require `specs/` unless design split is triggered;
- debug-overreach accepts an explicit bounded fix authorization;
- inferred-as-fact requires observed/inferred/unknown evidence state;
- high-risk cases require structured human approval.

Add named semantic assertions for each correction above, including the exact
eval filename and its required/forbidden/delta/evidence item. This prevents a
generic nonempty sentence from satisfying the intended behavior.

- [ ] **Step 4: Correct eval inventory truth**

Update README and CHANGELOG to state 11 evals, not 10. Document manual model-matrix recording as maintainer-only and non-telemetry.

- [ ] **Step 5: Run eval and contract suites**

```bash
node --test test/evals.test.js test/contracts.test.js test/examples.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add evals CHANGELOG.md test/evals.test.js
git commit -m "test: turn governance evals into oracles"
```

### Task 6: Repair maintainer feedback surfaces

**Files:**
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `.github/ISSUE_TEMPLATE/preventable-modification.md`
- Modify: `docs/maintainers.md`
- Modify: `test/docs.test.js`

**Interfaces:**
- PRs reference GitHub issue/eval/failure-mode IDs, not removed PL/PG ledgers.
- Release checklist includes test, coverage, lint, diff-check, pack smoke, every-version tag, and remote readback.
- Release checklist also requires version/lock/changelog/tag agreement, verified
  release commit/tag trust, GitHub Release exact-tag linkage, checksums/package
  contents, and a pinned-ref installation smoke before documentation advances.

- [ ] **Step 1: Write stale-surface tests**

Assert no PL/PG ledger references, framework-feedback label is named
consistently, patch releases require tags, and the checklist contains every
required command plus all seven release-gate claims from design section 16.

- [ ] **Step 2: Verify current stale references fail**

```bash
node --test test/docs.test.js
```

Expected: FAIL on PL/PG wording and minor/major-only tag rule.

- [ ] **Step 3: Update templates and maintainer guide**

Use `Issue / eval / failure-mode reference` and add explicit code/data/runtime closeout fields. Keep external label creation in the completion plan, not a local-file claim.

- [ ] **Step 4: Run docs tests**

```bash
node --test test/docs.test.js
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/ISSUE_TEMPLATE/preventable-modification.md docs/maintainers.md test/docs.test.js
git commit -m "docs: repair maintainer feedback contract"
```
