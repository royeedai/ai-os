#!/usr/bin/env node

/**
 * Doctor tests: checks canonical layout health and legacy drift detection.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runInstall,
  runDoctor,
  tmpDir,
  cleanup,
  section,
} = require("./helpers");

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

section("doctor: clean install returns 0");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir]);
  assert(result.status === 0, "doctor exits 0 on clean install");
  assert(result.stdout.includes("All checks passed"), "doctor reports all checks passed");
  assert(result.stdout.includes("shared-root-default-lane"), "doctor reports canonical layout mode");
  cleanup(dir);
}

section("doctor: non-AI-OS dir returns 2");

{
  const dir = tmpDir();
  const result = runDoctor([dir]);
  assert(result.status === 2, "doctor exits 2 when no .ai-os/");
  assert(result.stderr.includes("Not an AI-OS project"), "doctor reports not-an-ai-os-project");
  cleanup(dir);
}

section("doctor: missing lane MISSION.md returns 1");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"));
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when lane core file missing");
  assert(result.stdout.includes("E020") || result.stderr.includes("E020"), "doctor reports E020");
  assert(result.stdout.includes("lanes/default/MISSION.md") || result.stderr.includes("lanes/default/MISSION.md"), "doctor names the missing lane mission");
  cleanup(dir);
}

section("doctor: missing lane STATE.md is info (not error)");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "STATE.md"));
  const result = runDoctor([dir]);
  assert(result.status === 0, "doctor exits 0 when only lane STATE.md missing");
  assert(result.stdout.includes("I020"), "doctor reports session-local info");
  cleanup(dir);
}

section("doctor: --json output includes layout metadata");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir, "--json"]);
  assert(result.status === 0, "doctor --json exits 0");
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  assert(parsed !== null, "--json output is valid JSON");
  assert(parsed && parsed.ok === true, "JSON ok=true on clean install");
  assert(parsed && parsed.version === "9.7.1", "JSON reports version 9.7.1");
  assert(parsed && parsed.layout_version === "9", "JSON reports layout_version=9");
  assert(parsed && parsed.layout_mode === "shared-root-default-lane", "JSON reports canonical layout mode");
  cleanup(dir);
}

section("doctor: --strict treats warnings as errors");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
  const normal = runDoctor([dir]);
  assert(normal.status === 0, "doctor without --strict exits 0 on warning");
  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 1, "doctor --strict exits 1 on warning");
  cleanup(dir);
}

section("doctor: schema_version mismatch is an error");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tomlPath = path.join(dir, ".ai-os", "framework.toml");
  const toml = fs.readFileSync(tomlPath, "utf8").replace('schema_version = "9"', 'schema_version = "8"');
  fs.writeFileSync(tomlPath, toml);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when schema_version != 9");
  assert(result.stdout.includes("E002"), "doctor reports E002 on wrong schema");
  cleanup(dir);
}

section("doctor: root-only legacy layout is unhealthy");

{
  const dir = tmpDir();
  write(dir, ".ai-os/MISSION.md", "# legacy mission\n");
  write(dir, ".ai-os/DESIGN.md", "# legacy design\n");
  write(dir, ".ai-os/memory.md", "# memory\n");
  write(dir, ".ai-os/framework.toml", 'schema_version = "9"\nlayout_version = "9"\nlayout_mode = "root-only-legacy"\nframework_version = "8.0.0"\n');
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 for root-only legacy layout");
  assert(result.stdout.includes("E060"), "doctor reports root-only legacy error");
  cleanup(dir);
}

section("doctor: hybrid drift is unhealthy");

{
  const dir = tmpDir();
  runInstall([dir]);
  write(dir, ".ai-os/DESIGN.md", "# rogue root design\n");
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 for hybrid drift");
  assert(result.stdout.includes("E061"), "doctor reports hybrid drift error");
  cleanup(dir);
}

section("doctor: W070 fires when MISSION baseline_id has no record");

{
  const dir = tmpDir();
  runInstall([dir]);
  const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
  let mission = fs.readFileSync(missionPath, "utf8");
  mission = mission.replace(/BL-\d{8}-\d{6}-initial-baseline/, "CR-20260430-000000-orphan");
  fs.writeFileSync(missionPath, mission);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w070 = parsed.semantic_warnings.find((it) => it.code === "W070");
  assert(!!w070, "doctor surfaces W070 for orphan baseline reference");
  assert(parsed.semantic_warnings.length >= 1, "semantic_warnings field populated");
  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 1, "doctor --strict treats W070 as failure");
  cleanup(dir);
}

section("doctor: W071 fires when a task has no owner");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
  const corrupt = `tasks:\n  - id: TASK-AI-099\n    title: "missing owner"\n    status: todo\n`;
  fs.writeFileSync(tasksPath, corrupt);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w071 = parsed.semantic_warnings.find((it) => it.code === "W071");
  assert(!!w071, "doctor surfaces W071 for owner-less task");
  assert(w071 && w071.message.includes("TASK-AI-099"), "W071 names the offending task id");
  cleanup(dir);
}

section("doctor: W072 fires when any DESIGN AC is not referenced in verification-matrix");

{
  const dir = tmpDir();
  runInstall([dir]);
  const designPath = path.join(dir, ".ai-os", "lanes", "default", "DESIGN.md");
  let design = fs.readFileSync(designPath, "utf8");
  design = design.replace(
    /\| \[页面名\] \| \[目标\] \| \[关键元素\] \| \[关键操作\] \| yes \/ no \| pending \|/,
    "| Settings page | persist locale | locale dropdown | save click | yes | confirmed |",
  );
  design = design.replace(
    /\| AC-001 \| REQ-001 \| \[验收描述\] \| 自动化 \/ 手动 \/ 运行时观察 \| \[证据文件\] \|/,
    "| AC-001 | REQ-001 | locale survives reload | automated | evidence/locale.spec |\n| AC-002 | REQ-002 | locale rejects invalid option | automated | evidence/locale.spec |",
  );
  fs.writeFileSync(designPath, design);
  const matrixPath = path.join(dir, ".ai-os", "lanes", "default", "verification-matrix.yaml");
  let matrix = fs.readFileSync(matrixPath, "utf8");
  matrix += `\n  - id: FM-002\n    scenario: "locale broken on reload"\n    expected: "AC-001 holds"\n    guard: "evidence/locale.spec"\n`;
  fs.writeFileSync(matrixPath, matrix);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w072 = parsed.semantic_warnings.find((it) => it.code === "W072");
  assert(!!w072, "doctor surfaces W072 when any AC is not referenced in matrix");
  assert(w072 && w072.message.includes("AC-002"), "W072 cites missing AC-002");
  matrix = fs.readFileSync(matrixPath, "utf8");
  matrix += `\n  - id: FM-003\n    scenario: "locale accepts invalid option"\n    expected: "AC-002 holds"\n    guard: "evidence/locale.spec"\n`;
  fs.writeFileSync(matrixPath, matrix);
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w072After = parsedAfter.semantic_warnings.find((it) => it.code === "W072");
  assert(!w072After, "W072 clears once verification-matrix references every AC id");
  cleanup(dir);
}

section("doctor: W073 fires when CR baseline record lacks delta fields");

{
  const dir = tmpDir();
  runInstall([dir]);
  write(dir, ".ai-os/lanes/default/baseline-log/CR-20260502-000000-missing-delta.md", "# CR missing delta\n\n## Current behavior\n\n- old\n");
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w073 = parsed.semantic_warnings.find((it) => it.code === "W073");
  assert(!!w073, "doctor surfaces W073 for incomplete CR delta");
  assert(w073 && w073.message.includes("Proposed delta"), "W073 names missing delta section");
  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 1, "doctor --strict treats W073 as failure");
  cleanup(dir);
}

section("doctor: W074 fires when high-risk lane lacks populated risk artifacts");

{
  const dir = tmpDir();
  runInstall([dir]);
  const laneTomlPath = path.join(dir, ".ai-os", "lanes", "default", "lane.toml");
  let laneToml = fs.readFileSync(laneTomlPath, "utf8");
  laneToml = laneToml.replace('risk_tier = "medium"', 'risk_tier = "high"');
  fs.writeFileSync(laneTomlPath, laneToml);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w074 = parsed.semantic_warnings.find((it) => it.code === "W074");
  assert(!!w074, "doctor surfaces W074 for high-risk placeholder artifacts");
  assert(w074 && w074.message.includes("risk-register.md"), "W074 names missing risk register");
  assert(w074 && w074.message.includes("release-plan.md"), "W074 names missing release plan");

  write(dir, ".ai-os/lanes/default/risk-register.md", "# 风险登记\n\n| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |\n|---|---|---|---|---|---|---|\n| R-001 | state transition risk | user data | submit | backup | logs | approved |\n");
  write(dir, ".ai-os/lanes/default/release-plan.md", "# 发布计划\n\n## 发布策略\n\n- **策略**：manual\n\n## 回滚条件\n\n- verification fails\n\n## 回滚步骤\n\n1. revert release\n");
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w074After = parsedAfter.semantic_warnings.find((it) => it.code === "W074");
  assert(!w074After, "W074 clears after risk and release artifacts are populated");
  cleanup(dir);
}

section("doctor: W075 fires when URL evidence row has no confidence");

{
  const dir = tmpDir();
  runInstall([dir]);
  const parityPath = path.join(dir, ".ai-os", "lanes", "default", "design-pack", "parity-map.md");
  let parity = fs.readFileSync(parityPath, "utf8");
  parity = parity.replace(
    "| SRC-001 | url / screenshot / DOM / Network / docs | [URL or file] | [ISO timestamp] | 1440 / 768 / 390, public / logged-in | [artifact path] | observed / inferred / unknown |",
    "| SRC-999 | screenshot | https://example.test | 2026-05-02T00:00:00Z | 1440 public | evidence/home.png | missing |",
  );
  fs.writeFileSync(parityPath, parity);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w075 = parsed.semantic_warnings.find((it) => it.code === "W075");
  assert(!!w075, "doctor surfaces W075 for URL evidence without confidence");
  assert(w075 && w075.message.includes("SRC-999"), "W075 names the offending evidence row");
  cleanup(dir);
}

section("doctor: W076 fires when task handoff evidence loop is incomplete");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
  const corrupt = `tasks:
  - id: TASK-AI-200
    title: "missing loop fields"
    status: todo
    owner: AI
  - id: TASK-AI-201
    title: "handoff without context"
    status: in_progress
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    handoff_to: "Cursor"
  - id: TASK-AI-202
    title: "done without evidence"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
`;
  fs.writeFileSync(tasksPath, corrupt);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w076 = parsed.semantic_warnings.find((it) => it.code === "W076");
  assert(!!w076, "doctor surfaces W076 for incomplete task evidence loops");
  assert(w076 && w076.message.includes("TASK-AI-200: acceptance_refs"), "W076 names missing acceptance_refs");
  assert(w076 && w076.message.includes("TASK-AI-201: context_refs"), "W076 names missing context_refs");
  assert(w076 && w076.message.includes("TASK-AI-201: expected_return"), "W076 names missing expected_return");
  assert(w076 && w076.message.includes("TASK-AI-202: evidence_produced"), "W076 names done task without evidence");

  const repaired = `tasks:
  - id: TASK-AI-200
    title: "loop complete"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    handoff_to: "Cursor"
    context_refs:
      - ".ai-os/lanes/default/MISSION.md"
    expected_return:
      - "test log"
    evidence_produced:
      - "test/doctor.test.js"
`;
  fs.writeFileSync(tasksPath, repaired);
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w076After = parsedAfter.semantic_warnings.find((it) => it.code === "W076");
  assert(!w076After, "W076 clears once task loop fields are complete");
  cleanup(dir);
}

section("doctor: W077 fires when task fact-state review is incomplete");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
  const corrupt = `tasks:
  - id: TASK-AI-300
    title: "in progress without fact state"
    status: in_progress
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
  - id: TASK-AI-301
    title: "done with unresolved inference"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:
      - "test/doctor.test.js"
    fact_state_review:
      observed:
        - "test reproduced"
      confirmed: []
      inferred:
        - "assumed API shape"
      unknown: []
  - id: TASK-AI-302
    title: "done with unresolved unknown"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:
      - "test/doctor.test.js"
    fact_state_review:
      observed:
        - "lint passed"
      confirmed: []
      inferred: []
      unknown:
        - "runtime status not checked"
`;
  fs.writeFileSync(tasksPath, corrupt);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w077 = parsed.semantic_warnings.find((it) => it.code === "W077");
  assert(!!w077, "doctor surfaces W077 for incomplete fact-state review");
  assert(w077 && w077.message.includes("TASK-AI-300: fact_state_review observed/confirmed"), "W077 names missing observed/confirmed fact state");
  assert(w077 && w077.message.includes("TASK-AI-301: fact_state_review inferred"), "W077 names unresolved inferred state");
  assert(w077 && w077.message.includes("TASK-AI-302: fact_state_review unknown"), "W077 names unresolved unknown state");

  const repaired = `tasks:
  - id: TASK-AI-300
    title: "fact state complete"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:
      - "test/doctor.test.js"
    fact_state_review:
      observed:
        - "test/doctor.test.js reproduced and verified the guard"
      confirmed:
        - "AGENTS.md requires unknowns not to be presented as facts"
      inferred: []
      unknown: []
`;
  fs.writeFileSync(tasksPath, repaired);
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w077After = parsedAfter.semantic_warnings.find((it) => it.code === "W077");
  assert(!w077After, "W077 clears once fact states are observed/confirmed and unresolved states are empty");
  cleanup(dir);
}

section("doctor: W078 fires when long-horizon agent review is incomplete");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
  const corrupt = `tasks:
  - id: TASK-AI-400
    title: "cloud task missing refs and scope"
    status: in_progress
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    expected_return:
      - "diff and test log"
    fact_state_review:
      observed:
        - "delegation request inspected"
      confirmed: []
      inferred: []
      unknown: []
    agent_run_review:
      execution_surface: "cloud_background"
  - id: TASK-AI-401
    title: "closed without return review"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    expected_return:
      - "diff and test log"
    evidence_produced:
      - "npm test"
    fact_state_review:
      observed:
        - "diff returned"
      confirmed: []
      inferred: []
      unknown: []
    agent_run_review:
      execution_surface: "external_pr_agent"
      run_refs:
        - "pr: https://example.test/pull/1"
      write_scope:
        owned:
          - "bin/ai-os-doctor.js"
        out_of_scope:
          - "README.md"
  - id: TASK-AI-402
    title: "verified with unresolved returned risk"
    status: verified
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    expected_return:
      - "diff and test log"
    evidence_produced:
      - "npm test"
    fact_state_review:
      observed:
        - "review packet inspected"
      confirmed: []
      inferred: []
      unknown: []
    agent_run_review:
      execution_surface: "cloud_background"
      run_refs:
        - "branch: codex/w078"
      write_scope:
        owned:
          - "test/doctor.test.js"
      return_packet:
        summary: "diff returned"
        changed_files:
          - "test/doctor.test.js"
        tests:
          - "npm test"
        unresolved_risks:
          - "branch drift not checked"
        follow_up_needed: []
      human_review_status: "accepted"
`;
  fs.writeFileSync(tasksPath, corrupt);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w078 = parsed.semantic_warnings.find((it) => it.code === "W078");
  assert(!!w078, "doctor surfaces W078 for incomplete long-horizon agent reviews");
  assert(w078 && w078.message.includes("TASK-AI-400: agent_run_review.run_refs"), "W078 names missing run refs");
  assert(w078 && w078.message.includes("TASK-AI-400: agent_run_review.write_scope"), "W078 names missing write scope");
  assert(w078 && w078.message.includes("TASK-AI-401: agent_run_review.return_packet"), "W078 names missing return packet");
  assert(w078 && w078.message.includes("TASK-AI-401: agent_run_review.human_review_status"), "W078 names missing human review");
  assert(w078 && w078.message.includes("TASK-AI-402: agent_run_review.return_packet.unresolved_risks"), "W078 names unresolved returned risks");

  const localForeground = `tasks:
  - id: TASK-AI-403
    title: "local foreground task does not need long-horizon review"
    status: done
    owner: AI
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:
      - "npm test"
    fact_state_review:
      observed:
        - "test passed"
      confirmed: []
      inferred: []
      unknown: []
    agent_run_review:
      execution_surface: "local_foreground"
`;
  fs.writeFileSync(tasksPath, localForeground);
  const localAfter = runDoctor([dir, "--json"]);
  const localParsed = JSON.parse(localAfter.stdout);
  const localW078 = localParsed.semantic_warnings.find((it) => it.code === "W078");
  assert(!localW078, "W078 does not fire for clean local foreground work");

  const repaired = `tasks:
  - id: TASK-AI-404
    title: "background task has complete return review"
    status: verified
    owner: AI
    acceptance_refs:
      - "AC-001"
    handoff_to: "GitHub Copilot cloud agent"
    context_refs:
      - ".ai-os/lanes/default/tasks.yaml"
    expected_return:
      - "PR diff and test log"
    evidence_required:
      - "test-log"
    evidence_produced:
      - "npm test"
    fact_state_review:
      observed:
        - "return packet and test log inspected"
      confirmed: []
      inferred: []
      unknown: []
    agent_run_review:
      execution_surface: "external_pr_agent"
      run_refs:
        - "pr: https://example.test/pull/2"
        - "issue: https://example.test/issues/2"
      write_scope:
        owned:
          - "bin/ai-os-doctor.js"
          - "test/doctor.test.js"
        out_of_scope:
          - "docs/cli.md"
      progress_checkpoints:
        - "plan accepted"
        - "diff produced"
        - "tests run"
        - "review requested"
      return_packet:
        summary: "W078 complete"
        changed_files:
          - "bin/ai-os-doctor.js"
          - "test/doctor.test.js"
        tests:
          - "npm test"
        unresolved_risks: []
        follow_up_needed: []
      human_review_status: "reviewed"
`;
  fs.writeFileSync(tasksPath, repaired);
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w078After = parsedAfter.semantic_warnings.find((it) => it.code === "W078");
  assert(!w078After, "W078 clears once long-horizon run review is complete");
  cleanup(dir);
}

section("doctor: W079a fires (info) when CR baseline lacks Preventability review");

{
  const dir = tmpDir();
  runInstall([dir]);
  write(
    dir,
    ".ai-os/lanes/default/baseline-log/CR-20260525-100000-no-preventability.md",
    "# CR no preventability\n\n## Current behavior\n\n- old\n\n## Proposed delta\n\n- new\n\n## Affected artifacts\n\n- foo\n\n## Acceptance delta\n\n- AC-001\n\n## Close/archive condition\n\n- merged\n",
  );
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w079a = parsed.issues.find((it) => it.code === "W079a");
  assert(!!w079a, "doctor surfaces W079a for CR missing Preventability review");
  assert(w079a && w079a.level === "info", "W079a is reported at info level");
  assert(w079a && w079a.message.includes("CR-20260525-100000-no-preventability.md"), "W079a names the offending CR file");

  const semanticW079 = (parsed.semantic_warnings || []).find((it) => it.code === "W079a");
  assert(!semanticW079, "W079a is NOT included in semantic_warnings");

  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 0, "doctor --strict does NOT upgrade W079a to error");

  const repairedPath = path.join(dir, ".ai-os", "lanes", "default", "baseline-log", "CR-20260525-100000-no-preventability.md");
  const repairedContent = fs.readFileSync(repairedPath, "utf8") +
    "\n## Preventability review\n\n- Preventable: no\n- If yes, root cause: n/a\n- Maps to: n/a\n- Suggested guard: n/a\n";
  fs.writeFileSync(repairedPath, repairedContent);
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w079aAfter = parsedAfter.issues.find((it) => it.code === "W079a");
  assert(!w079aAfter, "W079a clears once CR includes Preventability review");
  cleanup(dir);
}

section("doctor: W079b fires (info) when closed lane lacks retrospective baseline-log");

{
  const dir = tmpDir();
  runInstall([dir]);
  const baselineDir = path.join(dir, ".ai-os", "lanes", "default", "baseline-log");
  for (const entry of fs.readdirSync(baselineDir)) {
    const full = path.join(baselineDir, entry);
    const content = fs.readFileSync(full, "utf8") +
      "\n## Preventability review\n\n- Preventable: no\n- If yes, root cause: n/a\n- Maps to: n/a\n- Suggested guard: n/a\n";
    fs.writeFileSync(full, content);
  }

  const laneTomlPath = path.join(dir, ".ai-os", "lanes", "default", "lane.toml");
  const closedToml = fs.readFileSync(laneTomlPath, "utf8").replace('status = "active"', 'status = "closed"');
  fs.writeFileSync(laneTomlPath, closedToml);

  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w079b = parsed.issues.find((it) => it.code === "W079b");
  assert(!!w079b, "doctor surfaces W079b for closed lane without retrospective baseline-log");
  assert(w079b && w079b.level === "info", "W079b is reported at info level");

  const semanticW079b = (parsed.semantic_warnings || []).find((it) => it.code === "W079b");
  assert(!semanticW079b, "W079b is NOT included in semantic_warnings");

  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 0, "doctor --strict does NOT upgrade W079b to error");

  write(
    dir,
    ".ai-os/lanes/default/baseline-log/BL-20260525-150000-retrospective-test.md",
    "# Retrospective\n\n- Type: retrospective\n- Status: closed\n\n## Preventable findings\n\n- none\n\n## Unmapped → PL candidates\n\n- none\n\n## Suggested framework changes\n\n- none\n",
  );
  const after = runDoctor([dir, "--json"]);
  const parsedAfter = JSON.parse(after.stdout);
  const w079bAfter = parsedAfter.issues.find((it) => it.code === "W079b");
  assert(!w079bAfter, "W079b clears once a retrospective baseline-log is present");
  cleanup(dir);
}

section("doctor: clean install reports no W079a / W079b");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w079 = parsed.issues.find((it) => it.code === "W079a" || it.code === "W079b");
  assert(!w079, "clean install emits no W079a / W079b (no CRs yet, lane is active)");
  cleanup(dir);
}
