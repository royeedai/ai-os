#!/usr/bin/env node

/**
 * Doctor tests: checks canonical layout health and constitution compliance.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runInstall,
  runDoctor,
  runLocalDoctor,
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

section("doctor: file artifact replaced by a directory returns E022");

{
  const dir = tmpDir();
  runInstall([dir]);
  const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
  fs.unlinkSync(missionPath);
  fs.mkdirSync(missionPath);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when a file artifact is a directory");
  assert(result.stdout.includes("E022"), "doctor reports E022 for wrong artifact type");
  assert(result.stdout.includes("not a file"), "doctor explains the path is not a file");
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
  assert(parsed && parsed.version === "10.5.0", "JSON reports version 10.5.0");
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

section("doctor: W073/W075/W079 soft checks removed in v9.8");

{
  const dir = tmpDir();
  runInstall([dir]);
  write(dir, ".ai-os/lanes/default/baseline-log/CR-20260502-000000-missing-delta.md", "# CR missing delta\n\n## Current behavior\n\n- old\n");
  const parityPath = path.join(dir, ".ai-os", "lanes", "default", "design-pack", "parity-map.md");
  let parity = fs.readFileSync(parityPath, "utf8");
  parity = parity.replace(
    "| SRC-001 | url / screenshot / DOM / Network / docs | [URL or file] | [ISO timestamp] | 1440 / 768 / 390, public / logged-in | [artifact path] | observed / inferred / unknown |",
    "| SRC-999 | screenshot | https://example.test | 2026-05-02T00:00:00Z | 1440 public | evidence/home.png | missing |",
  );
  fs.writeFileSync(parityPath, parity);
  write(
    dir,
    ".ai-os/lanes/default/baseline-log/CR-20260525-100000-no-preventability.md",
    "# CR no preventability\n\n## Current behavior\n\n- old\n",
  );
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const removed = (parsed.semantic_warnings || []).concat(parsed.issues || [])
    .filter((it) => ["W073", "W075", "W079a", "W079b"].includes(it.code));
  assert(removed.length === 0, "doctor no longer emits W073/W075/W079 soft checks");
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

section("doctor: vendored local entry runs offline with no external request");

{
  const dir = tmpDir();
  runInstall([dir]);
  const local = runLocalDoctor(dir, [dir]);
  assert(local.status === 0, "local doctor exits 0 on clean install");
  assert(local.stdout.includes("All checks passed"), "local doctor reports all checks passed");

  // parity with the source doctor on the same project
  const localJson = JSON.parse(runLocalDoctor(dir, [dir, "--json"]).stdout);
  const sourceJson = JSON.parse(runDoctor([dir, "--json"]).stdout);
  assert(localJson.version === sourceJson.version, "local doctor reports same version as source doctor");
  assert(localJson.layout_mode === sourceJson.layout_mode, "local doctor reports same layout mode");
  assert(localJson.version === "10.5.0", "local doctor reports framework version 10.5.0");
  cleanup(dir);
}

section("doctor: local entry survives a team clone with gitignored framework.toml removed");

{
  const dir = tmpDir();
  runInstall([dir]);
  // framework.toml is gitignored; a teammate / CI clone never ran install and
  // has no framework.toml. The committed .ai-os/bin/ must still run doctor.
  fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
  const result = runLocalDoctor(dir, [dir, "--json"]);
  assert(result.status === 0, "local doctor exits 0 without framework.toml");
  const parsed = JSON.parse(result.stdout);
  assert(parsed.ok === true, "local doctor ok=true without framework.toml");
  const e001 = parsed.issues.find((it) => it.code === "E001");
  assert(!e001, "local doctor does not report E001 in embedded mode without framework.toml");
  assert(parsed.installedVersion === "10.5.0", "local doctor falls back to committed VERSION as installed version");
  cleanup(dir);
}

section("doctor: source doctor still reports E001 (strict) when framework.toml is absent");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
  // The dev / npx package doctor is NOT embedded, so it keeps the strict
  // "is this an AI-OS project?" check and reports E001.
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const e001 = parsed.issues.find((it) => it.code === "E001");
  assert(!!e001, "source doctor still reports E001 when framework.toml is missing");
  cleanup(dir);
}

section("doctor: vendored local entry honors --strict");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
  const normal = runLocalDoctor(dir, [dir]);
  assert(normal.status === 0, "local doctor without --strict exits 0 on warning");
  const strict = runLocalDoctor(dir, [dir, "--strict"]);
  assert(strict.status === 1, "local doctor --strict exits 1 on warning");
  cleanup(dir);
}
