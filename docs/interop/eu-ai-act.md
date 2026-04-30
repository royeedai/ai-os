# AI-OS × EU AI Act audit trail

> The EU AI Act ([Regulation (EU) 2024/1689](https://artificialintelligenceact.eu)) enters its high-risk-system obligations on 2 August 2026. AI-OS does not market itself as a compliance tool, but its 12-artifact set already produces most of what Articles 12, 14, and 17 require for record-keeping, human oversight, and a quality-management system around AI-assisted delivery. This document maps AI-OS artifacts to those obligations so teams can demonstrate the audit trail without inventing a parallel one.

> **Disclaimer**: This is an engineering-narrative mapping, not legal advice. Have qualified counsel sign off the final compliance position.

## Scope

This mapping is most useful for two cases:

1. Teams shipping high-risk AI systems (Article 6 / Annex III) who must produce records of how the system was built and changed
2. Teams shipping non-AI software using AI coding agents at high autonomy, where internal QA wants the same audit trail discipline

Article 6 systems have their own substantive technical-documentation requirements (Annex IV) that are out of scope here. AI-OS supports the **process trail**, not the model itself.

## Article 12 — Record-keeping

> "High-risk AI systems shall technically allow for the automatic recording of events ('logs') over the lifetime of the system."

| Article 12 obligation | AI-OS artifact | Notes |
|---|---|---|
| Identification of the AI system | `.ai-os/MISSION.md` Section 1 (host project identity) | Single source for "what is being built" |
| Reference databases / training data | `.ai-os/lanes/<lane>/specs/*.spec.md` and `.ai-os/memory.md` | Reference contracts and stable decisions; for model training datasets, AI-OS does not own the data layer |
| Each operation / event | `.ai-os/lanes/<lane>/baseline-log/CR-*.md` and `BL-*.md` | Every change to baseline is a timestamped record |
| Period of operation | `lane.toml` `status` + baseline filenames (`YYYYMMDD-HHMMSS`) | Lane lifecycle reflects current delivery period |
| Identification of the persons | `tasks.yaml` `owner:` field; commit / review tooling for agent-vs-human attribution | AI-OS records owner; the underlying VCS records who reviewed |

The `baseline-log/` filenames intentionally encode UTC timestamps and slugs (`(BL|CR)-YYYYMMDD-HHMMSS-<slug>.md`) so an external auditor can reconstruct order without reading file contents.

## Article 14 — Human oversight

> "High-risk AI systems shall be designed and developed in such a way ... that they can be effectively overseen by natural persons during the period in which they are in use."

| Article 14 obligation | AI-OS artifact | Notes |
|---|---|---|
| User-in-the-loop confirmation gates | `AGENTS.md` Five Core Requirements §1 ("goal and user confirmation first") | Hard rule, not a soft suggestion |
| Stop-and-wait points | `AGENTS.md` Behavior rules ("等用户确认", "等待审批") | Multiple explicit confirmation points |
| Approval before high-risk action | `tasks.yaml` `approval_required: true`; `risk-register.md` | Mandatory escalation per Constitution §High-risk |
| Override / interrupt of automated step | `AGENTS.md` Absolute Prohibitions §11 ("用户未明确确认时自行推进阶段或跨过审批停点") | Prohibition is enforced as a constitution rule |
| Visibility of AI vs human contribution | Delivery double-checklist ("AI 已完成 vs 需人工执行") | Required at delivery |

## Article 17 — Quality management system

> "Providers of high-risk AI systems shall put a quality management system in place that ensures compliance ... in the form of written policies, procedures and instructions."

| Article 17 obligation | AI-OS artifact | Notes |
|---|---|---|
| Strategy for regulatory compliance | `AGENTS.md` (delivery constitution) + `docs/constitution-spec.md` | Written policy, single trunk |
| Techniques for design / verification / validation | `lanes/<lane>/DESIGN.md` + `verification-matrix.yaml` + `design-pack/parity-map.md` | Design + verification gates per requirement |
| Examination procedures | Four gates in `AGENTS.md` (design / logic / implementation / delivery) | Required to pass before "complete" |
| Risk management | `risk-register.md` + `release-plan.md` | high-risk lane augments standard governance |
| Resource management & supplier relations | `tasks.yaml` `owner:` + `memory.md` (cross-layer contracts) | Owners and external dependencies recorded |
| Reporting of serious incidents | `evals/*.md` (with `trigger_source: promoted-from-verification-matrix`) | Stable failure modes get promoted from runtime to permanent record |

## Suggested CI / audit checks

Add to your CI:

```bash
# Layout + semantic health
npx --yes github:royeedai/ai-os doctor . --strict
```

`--strict` upgrades W070/W071/W072 to errors, which catches:

- W070: orphan baseline references in `MISSION.md` (Article 12 record integrity)
- W071: tasks without owner (Article 14 human-oversight attribution)
- W072: acceptance criteria not covered by verification matrix (Article 17 verification completeness)

Recommended additional, non-AI-OS checks:

- `git log` retention configured to match the period required by Annex IV §6 (typically 10 years for high-risk providers)
- Repository archival of `.ai-os/lanes/<lane>/` plus `evals/` at major milestones (the `STATE.md` file is intentionally gitignored as session-local; everything else is tracked)
- A signed release of `AGENTS.md` per release tag, so the constitution version in force at delivery time is provable

## Where AI-OS does not help

AI-OS is silent on:

- The model itself (provider, weights, evaluation against Annex IV)
- Personal-data flows under GDPR
- Customer-facing transparency notices (Article 13)
- Cybersecurity & robustness testing of the deployed AI system (Article 15)
- Supplier conformity assessment (Articles 41–47)

Pair AI-OS with whatever model-evaluation, data-protection, and security-testing frameworks your sector requires.

## See also

- [docs/artifacts.md](../artifacts.md) — full artifact schema with layer assignments
- [docs/interop/mcp-resources.md](mcp-resources.md) — protocol-level access if a compliance dashboard reads artifacts via MCP
- [docs/problem-ledger.md](../problem-ledger.md) — failure-mode coverage entries that any audit can spot-check
- [Article 12 / 14 / 17 full text](https://artificialintelligenceact.eu/the-act/) — official references
