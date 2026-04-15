#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  ensureDir,
  fail,
  getProjectTemplatePath,
  getLaneFilePath,
  copyFramework,
  copyTemplateIfMissing,
  createProjectFiles,
  writeMetadata,
  writeManagedFilesManifest,
} = require("./shared");

const NODE = process.execPath;
const BIN_ROOT = __dirname;

const SCENARIOS = {
  greenfield: {
    title: "从想法开始的新项目",
    example: "examples/greenfield-guided-product.md",
    startWorkflow: "/align",
    acceptanceFocus: [
      "先锁目标、范围和成功标准，再进入设计与计划",
      "观察 design-confirmation / logic-confirmation 是否仍保持 pending，避免跳过确认直接 build",
    ],
    optionalArtifacts: [],
  },
  "reverse-spec": {
    title: "截图 / API / 源码驱动的对标项目",
    example: "examples/reverse-spec-admin-console.md",
    startWorkflow: "/align (reverse-spec)",
    acceptanceFocus: [
      "检查 DESIGN 和 parity map 是否先于大规模实现被锁定",
      "重点观察页面像了但逻辑错、契约漂移和 parity-gate 风险",
    ],
    optionalArtifacts: [
      {
        template: path.join("design-pack", "parity-map.md"),
        destination: path.join("design-pack", "parity-map.md"),
      },
    ],
  },
  brownfield: {
    title: "已有项目里的局部变更",
    example: "examples/brownfield-change-journey.md",
    startWorkflow: "/change-request",
    acceptanceFocus: [
      "检查是否先更新需求基准，而不是直接按聊天改代码",
      "观察局部改动是否被错误放大成全仓分析或无关扩散",
    ],
    optionalArtifacts: [],
  },
  debug: {
    title: "单点 bug / 微调修复",
    example: "examples/debug-bounded-fix.md",
    startWorkflow: "/debug",
    acceptanceFocus: [
      "检查修复前是否先锁根因、影响范围和计划修改文件",
      "观察验证结果是否同时覆盖目标问题和影响范围回归",
    ],
    optionalArtifacts: [],
  },
  "high-risk": {
    title: "高风险状态流转 / 权限 / 资产变更",
    example: "examples/high-risk-state-change.md",
    startWorkflow: "/plan",
    acceptanceFocus: [
      "检查是否自动升级治理档位，并要求 approval_required",
      "观察 risk-register、release-plan 和专项审查是否被补齐",
    ],
    optionalArtifacts: [
      { template: "risk-register.md", destination: "risk-register.md" },
      { template: "release-plan.md", destination: "release-plan.md" },
      { template: "verification-matrix.yaml", destination: "verification-matrix.yaml" },
    ],
  },
  "degraded-path": {
    title: "异常 / 空数据 / 拒绝路径验证",
    example: "examples/degraded-path-verification.md",
    startWorkflow: "/verify",
    acceptanceFocus: [
      "不要把 happy path 通过当成可交付",
      "观察 acceptance 和 verification matrix 是否显式覆盖 degraded-path-check",
    ],
    optionalArtifacts: [
      { template: "verification-matrix.yaml", destination: "verification-matrix.yaml" },
    ],
  },
};

const DEFAULT_SCENARIOS = [
  "greenfield",
  "reverse-spec",
  "brownfield",
  "debug",
  "high-risk",
  "degraded-path",
];

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-lab [target-dir] [--target <dir>] [--scenarios <name[,name...]>]
  ai-os-lab --list-scenarios

Bootstrap a local AI-OS lab matrix, run core checks, and write an acceptance report.

Options:
  --target <dir>      Target lab root. Defaults to the first positional arg or ./ai-os-labs
  --scenarios <list>  Comma-separated scenario ids. Defaults to: ${DEFAULT_SCENARIOS.join(",")}
  --list-scenarios    Print available scenario ids
  -h, --help          Show this help message
`);
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-9;]*m/g, "");
}

function parseResultLine(output) {
  const plain = stripAnsi(output);
  const match = plain.match(/Result:\s+([^\n]+)/);
  return match ? match[1].trim() : "unknown";
}

function collectWarnings(output) {
  const plain = stripAnsi(output);
  const lines = plain.split(/\r?\n/);
  const warnings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith("⚠")) {
      continue;
    }

    const detail = [line.replace(/^⚠\s*/, "")];
    const nextLine = (lines[index + 1] || "").trim();
    if (nextLine.startsWith("- ")) {
      detail.push(nextLine.replace(/^- /, ""));
      index += 1;
    }
    warnings.push(detail.join(" — "));
  }

  return warnings;
}

function runCli(scriptName, targetDir) {
  return spawnSync(NODE, [path.join(BIN_ROOT, scriptName), targetDir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeScenarioBrief(targetDir, scenarioId, scenario) {
  const briefPath = path.join(targetDir, "LAB.md");
  const lines = [
    `# AI-OS Lab: ${scenarioId}`,
    "",
    "## 场景说明",
    "",
    `- **类型**：${scenarioId}`,
    `- **目标**：${scenario.title}`,
    `- **建议起点**：\`${scenario.startWorkflow}\``,
    `- **参考示例**：\`${scenario.example}\``,
    "",
    "## 自动推进边界",
    "",
    "- 可以自动做：初始化工件、跑 doctor / validate / status / next、生成报告、发现 warning / fail 并归类。",
    "- 需要叫用户：需求基准确认、设计确认、任务 / 验收确认、命中 approval_required、高风险发布前收口。",
    "",
    "## 本场景重点验收",
    "",
    ...scenario.acceptanceFocus.map((item) => `- ${item}`),
    "",
    "## 发现新问题后如何告诉 AI-OS",
    "",
    "把下面模板直接贴给 AI：",
    "",
    "```text",
    "这是一个新的真实问题，请先不要直接改规则。",
    "1. 先把它登记到 docs/problem-ledger.md",
    "2. 再用 docs/change-evaluation-template.md 评估它应该进入哪里",
    "3. 如果要纳入，至少补一个 eval 和一个 example 或 CLI check",
    "",
    "背景：",
    "- 项目类型：",
    "- 用户输入：",
    "- AI 的错误行为：",
    "- 正确行为：",
    "- 现有哪个锚点没拦住：",
    "- 它影响哪条核心要求：",
    "```",
    "",
  ];

  fs.writeFileSync(briefPath, lines.join("\n"), "utf8");
}

function bootstrapScenario(targetDir, scenarioId, scenario) {
  ensureDir(targetDir);
  copyFramework(targetDir, { overwrite: false, logger: () => {} });
  createProjectFiles(targetDir, { logger: () => {} });

  for (const artifact of scenario.optionalArtifacts) {
    copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(artifact.template),
      getLaneFilePath(targetDir, "default", artifact.destination),
      { logger: () => {} }
    );
  }

  writeMetadata(targetDir);
  writeManagedFilesManifest(targetDir);
  writeScenarioBrief(targetDir, scenarioId, scenario);
}

function summarizeScenario(targetDir, scenarioId, scenario) {
  const doctor = runCli("ai-os-doctor.js", targetDir);
  const validate = runCli("ai-os-validate.js", targetDir);
  const status = runCli("ai-os-status.js", targetDir);
  const next = runCli("ai-os-next.js", targetDir);

  return {
    id: scenarioId,
    title: scenario.title,
    directory: targetDir,
    example: scenario.example,
    startWorkflow: scenario.startWorkflow,
    doctorCode: doctor.status,
    doctorResult: parseResultLine(doctor.stdout),
    validateCode: validate.status,
    validateResult: parseResultLine(validate.stdout),
    validateWarnings: collectWarnings(validate.stdout),
    statusCode: status.status,
    nextCode: next.status,
  };
}

function writeReport(reportPath, labRoot, selectedScenarios, summaries) {
  const lines = [
    "# AI-OS Lab Report",
    "",
    `- **Lab Root**：\`${labRoot}\``,
    `- **Scenarios**：${selectedScenarios.join(", ")}`,
    "",
    "## 自动推进边界",
    "",
    "- 这份报告只覆盖可自动执行的引导、初始化和检查。",
    "- fresh lab 默认不会直接进入 build；设计门和逻辑门保持 pending 属于预期状态。",
    "- 真正需要人工介入的时点，是需求 / 设计 / 任务验收确认、approval_required、以及最终交付验收。",
    "",
    "## 场景汇总",
    "",
  ];

  for (const summary of summaries) {
    lines.push(`### ${summary.id}`);
    lines.push("");
    lines.push(`- **目录**：\`${summary.directory}\``);
    lines.push(`- **目标**：${summary.title}`);
    lines.push(`- **建议起点**：\`${summary.startWorkflow}\``);
    lines.push(`- **参考示例**：\`${summary.example}\``);
    lines.push(`- **doctor**：${summary.doctorResult} (exit=${summary.doctorCode})`);
    lines.push(`- **validate**：${summary.validateResult} (exit=${summary.validateCode})`);
    lines.push(`- **status / next**：exit=${summary.statusCode} / ${summary.nextCode}`);
    lines.push(`- **场景说明**：\`${path.join(summary.directory, "LAB.md")}\``);

    if (summary.validateWarnings.length > 0) {
      lines.push("- **当前阻塞 / 提醒**：");
      for (const warning of summary.validateWarnings) {
        lines.push(`  - ${warning}`);
      }
    } else {
      lines.push("- **当前阻塞 / 提醒**：无");
    }

    lines.push("");
  }

  lines.push("## 何时叫用户来验收");
  lines.push("");
  lines.push("- 需求基准、设计方案和任务 / 验收标准都已经锁定。");
  lines.push("- `validate` 不再只剩设计门 / 逻辑门 pending，而是已有真实实现与证据。");
  lines.push("- 若命中高风险，`approval_required`、`risk-register.md`、`release-plan.md` 和专项审查都已补齐。");
  lines.push("");
  lines.push("## 发现新问题时的记录入口");
  lines.push("");
  lines.push("- `docs/problem-ledger.md`");
  lines.push("- `docs/change-evaluation-template.md`");
  lines.push("");

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
}

const args = process.argv.slice(2);
let targetArg = "";
let scenariosArg = "";
let listScenarios = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--list-scenarios") {
    listScenarios = true;
    continue;
  }
  if (arg === "--scenarios") {
    if (index + 1 >= args.length) {
      fail("--scenarios requires a comma-separated value");
    }
    scenariosArg = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "--target") {
    if (index + 1 >= args.length) {
      fail("--target requires a value");
    }
    targetArg = args[index + 1];
    index += 1;
    continue;
  }
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

if (listScenarios) {
  process.stdout.write(`${Object.keys(SCENARIOS).join("\n")}\n`);
  process.exit(0);
}

const selectedScenarios = (scenariosArg ? scenariosArg.split(",") : DEFAULT_SCENARIOS)
  .map((value) => value.trim())
  .filter(Boolean);

if (selectedScenarios.length === 0) {
  fail("at least one scenario is required");
}

const unknownScenarios = selectedScenarios.filter((scenarioId) => !SCENARIOS[scenarioId]);
if (unknownScenarios.length > 0) {
  fail(`unknown scenarios: ${unknownScenarios.join(", ")}`);
}

const labRoot = path.resolve(targetArg || path.join(".", "ai-os-labs"));
if (fs.existsSync(labRoot) && fs.readdirSync(labRoot).length > 0) {
  fail(`target lab root is not empty: ${labRoot}`);
}

ensureDir(labRoot);

const summaries = [];
for (const scenarioId of selectedScenarios) {
  const scenario = SCENARIOS[scenarioId];
  const scenarioDir = path.join(labRoot, scenarioId);
  bootstrapScenario(scenarioDir, scenarioId, scenario);
  summaries.push(summarizeScenario(scenarioDir, scenarioId, scenario));
}

const reportPath = path.join(labRoot, "lab-report.md");
writeReport(reportPath, labRoot, selectedScenarios, summaries);

process.stdout.write(`AI-OS Lab — ${labRoot}\n\n`);
for (const summary of summaries) {
  process.stdout.write(`- ${summary.id}: doctor=${summary.doctorResult}; validate=${summary.validateResult}\n`);
}
process.stdout.write(`\nAcceptance report: ${reportPath}\n`);
process.stdout.write(`Use create-ai-os lab --list-scenarios to see all supported scenario ids.\n`);
