# AI-OS v11 Quality Hardening Completion Matrix

- **Design:** `docs/superpowers/specs/2026-07-10-ai-os-v11-quality-hardening-design.md`
- **Candidate:** unreleased `11.0.0`
- **Branch:** `codex/ai-os-v11-quality-hardening`
- **Evidence rule:** `pass` is committed/local evidence; `live` is current-head GitHub evidence delegated to the remote validators; `pending`, `blocked`, and `fail` are never completion.
- **Local evidence date:** 2026-07-14

The IDs below are a one-to-one reviewed catalog of the normative goal, non-goals, bullets, table rows, rules, completion claims, and workstreams in design sections 1–19. Repeated commands are intentional: each requirement remains independently traceable even when one behavioral suite proves several requirements.

| ID | Requirement | Evidence command/source | Expected | Actual | Status |
|---|---|---|---|---|---|
| D01-R01 | Keep AI-OS a delivery-governance distribution, not a runtime or service | `node --test test/contracts.test.js test/docs.test.js` | Product boundaries are explicit and no runtime surface exists | Boundary contracts pass | pass |
| D01-R02 | Fix or remove every audit finding and prove code, repository data, and runtime separately | This matrix plus final local and remote validators | Every finding has direct current-state evidence | Local implementation proven; remote closeout pending | pending |
| D02-R01 | Do not add an agent runner, scheduler, lease service, model router, MCP server, or daemon | `node --test test/contracts.test.js` | Forbidden runtime surfaces are absent | Contract scan passes | pass |
| D02-R02 | Do not add automatic memory extraction, CR aggregation, or telemetry upload | `node --test test/contracts.test.js test/docs.test.js` | Automation and telemetry claims are absent | Contract scan passes | pass |
| D02-R03 | Doctor does not produce a subjective quality score | `node --test test/doctor-layout.test.js test/doctor-readiness.test.js` | Doctor reports deterministic layout/readiness only | Doctor suites pass | pass |
| D02-R04 | Do not create a general package manager or migration framework | `node --test test/migration.test.js test/contracts.test.js` | Migration remains version-scoped | Migration contracts pass | pass |
| D02-R05 | Do not add automatic deployment or release automation | `node --test test/contracts.test.js test/docs.test.js` | Release remains an explicit external action | Release boundary tests pass | pass |
| D02-R06 | Add no default business artifact without a deterministic cross-project failure | `node --test test/contracts.test.js test/docs.test.js` | Core and on-demand surfaces match the approved matrix | Surface contracts pass | pass |
| D03-R01 | Treat v11.0.0 as an unreleased candidate with no remote tag | `git ls-remote --exit-code https://github.com/royeedai/ai-os.git refs/tags/v11.0.0` | Exit 2 and no tag | Exit 2; tag absent | pass |
| D03-R02 | Distinguish development VERSION from latest RELEASED_VERSION | `node --test test/release.test.js` | VERSION is 11.0.0 and RELEASED_VERSION is 10.5.1 | Release-truth suite passes | pass |
| D03-R03 | Pin user docs to RELEASED_VERSION, keep changelog unreleased, and do not install release metadata | `node --test test/release.test.js test/package.test.js` | Pins are truthful and downstream layout excludes RELEASED_VERSION | Tests pass | pass |
| D03-R04 | Use explicit pinned GitHub invocations and never official bare npx create-ai-os | `node --test test/release.test.js test/docs.test.js` | No unsupported package invocation is advertised | Scans pass | pass |
| D03-R05 | Keep the package private while supporting GitHub-spec install and local pack verification | `node --test test/package.test.js test/dependencies.test.js` | private is true and pack/install smoke succeeds | Package suites pass | pass |
| D04-R01 | Framework-owned paths replace only after safety checks and record source hashes | `node --test test/install-plan.test.js test/install-transaction.test.js test/install.test.js` | Framework mutations are planned, safe, and hashed | Installer suites pass | pass |
| D04-R02 | Project-owned paths are create-only except exact recognized pristine upgrades | `node --test test/install-idempotency.test.js test/migration.test.js` | Modified project content is preserved | Preservation suites pass | pass |
| D04-R03 | Session STATE is create-only and never overwritten | `node --test test/install-idempotency.test.js test/migration.test.js` | Existing STATE bytes remain unchanged | Preservation suites pass | pass |
| D04-R04 | IDE pointers preserve custom content and refresh only recognized stubs | `node --test test/install-idempotency.test.js test/migration.test.js` | Custom pointers win | IDE migration tests pass | pass |
| D04-R05 | Team config changes only one strict managed block | `node --test test/migration.test.js test/doctor-readiness.test.js` | Outside bytes are unchanged and malformed blocks fail | Team-config suites pass | pass |
| D05-R01 | Install the exact canonical layout schema 11 | `node --test test/install.test.js` | Fresh install file set and metadata equal layout 11 | Layout suites pass | pass |
| D05-R02 | Ship one offline local artifact reference as the constitution and skill schema target | `node --test test/link-integrity.test.js test/contracts.test.js` | Installed references resolve locally | Link contracts pass | pass |
| D05-R03 | Package docs/artifacts.md and copy it byte-for-byte into local reference | `node --test test/package.test.js test/install.test.js test/link-integrity.test.js` | Source, tarball, and installed bytes match | Parity tests pass | pass |
| D05-R04 | Commit stable metadata without timestamps and ignore only session or temporary state | `node --test test/install.test.js test/doctor-readiness.test.js` | Reproducible metadata and exact ignore rules | Tests pass | pass |
| D05-R05 | managed-files.tsv has exact columns and hashes only framework sources | `node --test test/install.test.js test/doctor-layout.test.js` | Manifest syntax, inventory, and hashes are exact | Manifest tests pass | pass |
| D05-R06 | Treat managed-files.tsv as the sole non-self-listed exception | `node --test test/install.test.js test/doctor-layout.test.js` | Every other managed path appears exactly once | Completeness tests pass | pass |
| D06-R01 | Preflight validates every packaged source before target writes | `node --test test/install-plan.test.js test/install-transaction.test.js` | Invalid source fails before mutation | Transaction tests pass | pass |
| D06-R02 | Resolve the target root once | `node --test test/path-safety.test.js test/install-plan.test.js` | Plan binds one canonical root | Path tests pass | pass |
| D06-R03 | Walk existing parents and destinations with lstat | `node --test test/path-safety.test.js` | Link and wrong-type ancestors are detected | Adversarial path tests pass | pass |
| D06-R04 | Reject links, junctions, non-directory parents, and target escape | `node --test test/path-safety.test.js` | No external sentinel changes | Adversarial path tests pass | pass |
| D06-R05 | Classify every destination by ownership and current hash | `node --test test/install-plan.test.js test/install.test.js` | Operation plan has deterministic ownership decisions | Planning tests pass | pass |
| D06-R06 | Detect foreign AGENTS, IDE pointers, and team-config conflicts | `node --test test/install-idempotency.test.js test/migration.test.js` | Conflicts are reported before writes | Conflict tests pass | pass |
| D06-R07 | Build a complete operation plan or fail with no target mutation | `node --test test/install-plan.test.js test/install-transaction.test.js` | Preflight is read-only and atomic | Transaction tests pass | pass |
| D06-R08 | Acquire one exclusive install lock after preflight and remove invocation-created empty targets on failure | `node --test test/install-transaction.test.js test/install-idempotency.test.js` | Lock serializes commit and cleanup is complete | Lock tests pass | pass |
| D06-R09 | Render expected filesystem conflicts without raw stacks | `node --test test/install.test.js test/path-safety.test.js` | Stable concise diagnostics | CLI error tests pass | pass |
| D06-R10 | Render all replacement content before commit | `node --test test/install-plan.test.js test/install-transaction.test.js` | No lazy render after mutation begins | Plan/commit tests pass | pass |
| D06-R11 | Stage same-directory exclusive files and bounded backups with no-follow safeguards | `node --test test/install-transaction.test.js test/path-safety.test.js` | Staging cannot follow attacker links | Transaction tests pass | pass |
| D06-R12 | Create destinations with no-replace hard-link ownership proof | `node --test test/install-transaction.test.js` | Collision cannot overwrite a foreign inode | Create race tests pass | pass |
| D06-R13 | Replace only after an exclusive verified backup and atomic rename | `node --test test/install-transaction.test.js` | Replacement is rollback-safe | Replacement race tests pass | pass |
| D06-R14 | Remove only after an exclusive verified backup | `node --test test/install-transaction.test.js` | Removal can restore the verified inode | Removal tests pass | pass |
| D06-R15 | Roll back only identities created or verified by the current operation | `node --test test/install-transaction.test.js` | Rollback never deletes foreign content | Rollback adversarial tests pass | pass |
| D06-R16 | Roll back project paths only for exact known pristine upgrades | `node --test test/install-transaction.test.js test/migration.test.js` | Modified project content is never a mutation target | Migration rollback tests pass | pass |
| D06-R17 | Remove lock, stage, and backup files on success and handled failure | `node --test test/install-transaction.test.js test/install-idempotency.test.js` | No transaction debris remains | Cleanup tests pass | pass |
| D06-R18 | First install creates missing core project/session and framework paths | `node --test test/install.test.js` | Canonical fresh layout exists | Fresh install tests pass | pass |
| D06-R19 | Reinstall preserves project/session bytes and initial baseline count | `node --test test/install-idempotency.test.js` | Reinstall is file-set and baseline idempotent | Idempotency tests pass | pass |
| D06-R20 | Force refreshes framework only | `node --test test/install-idempotency.test.js` | Force never changes project/session/custom config | Force preservation tests pass | pass |
| D06-R21 | Foreign root AGENTS is an atomic preflight conflict | `node --test test/install-idempotency.test.js` | No partial .ai-os layout is written | Conflict test passes | pass |
| D06-R22 | Upgrade exact earlier constitutions but require manual merge for custom ones | `node --test test/migration.test.js test/install-idempotency.test.js` | Hash-gated upgrade behavior is exact | Constitution migration tests pass | pass |
| D06-R23 | Preserve every existing on-demand artifact | `node --test test/migration.test.js test/install-idempotency.test.js` | Migration and force never remove extensions | Preservation tests pass | pass |
| D07-R01 | Recognize v10 metadata, all distributed tag hashes, and legacy managed blocks | `node --test test/compat-hashes.test.js test/migration.test.js` | Compatibility catalog is exact and version-scoped | Compatibility tests pass | pass |
| D07-R02 | Preserve modified project/session truth while upgrading only exact pristine scaffolds | `node --test test/migration.test.js` | Modified bytes win | Migration tests pass | pass |
| D07-R03 | Add governance_tier only to exact pristine v10 lane metadata without changing surrounding truth | `node --test test/migration.test.js` | Lane identity, pointer, tiers, mode, and bytes are preserved | Lane migration tests pass | pass |
| D07-R04 | Replace only recognized pristine v10 framework/tooling bytes | `node --test test/migration.test.js test/install-transaction.test.js` | Future ownership never authorizes unknown old content | Hash-gate tests pass | pass |
| D07-R05 | Install stable metadata, manifest, local reference, and smaller shared doctor module | `node --test test/migration.test.js test/package.test.js` | Migrated layout has exact v11 framework surface | Migration tests pass | pass |
| D07-R06 | Replace legacy gitignore block so only STATE remains ignored | `node --test test/migration.test.js` | Stable metadata is committed and STATE ignored | Managed-block tests pass | pass |
| D07-R07 | Remove the managed memory merge=union rule | `node --test test/migration.test.js` | No active AI-OS union merge rule remains | Migration tests pass | pass |
| D07-R08 | Preserve all on-demand artifacts through v10 migration | `node --test test/migration.test.js` | Extensions remain byte-identical | Preservation tests pass | pass |
| D07-R09 | Stop before writes for customized constitution or team configuration | `node --test test/migration.test.js` | Precise conflict and unchanged snapshot | Conflict tests pass | pass |
| D07-R10 | Keep migration specific and never recommend destructive force migration | `node --test test/docs.test.js test/contracts.test.js` | No general engine or force instruction | Documentation scans pass | pass |
| D08-R01 | Root AGENTS owns behavior constitution truth | `node --test test/contracts.test.js test/governance-schema.test.js` | Authority order starts at AGENTS | Authority tests pass | pass |
| D08-R02 | lane.toml owns lane identity, baseline pointer, and tiers | `node --test test/contracts.test.js test/governance-schema.test.js` | Machine truth source is unique | Authority tests pass | pass |
| D08-R03 | MISSION owns human-readable product and acceptance baseline | `node --test test/contracts.test.js test/governance-schema.test.js` | MISSION role is consistent | Authority tests pass | pass |
| D08-R04 | DESIGN owns confirmed contracts and acceptance criteria | `node --test test/contracts.test.js test/governance-schema.test.js` | DESIGN role is consistent | Authority tests pass | pass |
| D08-R05 | tasks.yaml owns execution, approval, dependency, and evidence state | `node --test test/contracts.test.js test/governance-schema.test.js` | Task role is consistent | Authority tests pass | pass |
| D08-R06 | STATE is recoverable navigation and never committed truth authority | `node --test test/contracts.test.js test/doctor-readiness.test.js` | Drift warns and rebuilds without changing readiness | STATE drift tests pass | pass |
| D08-R07 | Keep task priority P0–P3 separate from governance namespace | `node --test test/governance-schema.test.js` | Priority and governance enums do not alias | Schema tests pass | pass |
| D08-R08 | G0 requires confirmed scope and project-native verification | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | G0 minimum gate is enforced | Readiness tests pass | pass |
| D08-R09 | G1 requires confirmed design, traceability, and regression checks | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | G1 minimum gate is enforced | Readiness tests pass | pass |
| D08-R10 | G2 requires approval, risk/verification artifacts, conditional release artifact, and rollback evidence | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | G2 minimum gate is enforced | G2 tests pass | pass |
| D08-R11 | Fresh tiers are unassessed and block delivery readiness | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Fresh install is layout-valid but not ready | Fresh readiness test passes | pass |
| D08-R12 | Verify every human-readable tier mirror against lane.toml | `node --test test/doctor-readiness.test.js` | Mirror mismatch is deterministic | Mirror tests pass | pass |
| D08-R13 | Enforce rank floor while allowing higher governance | `node --test test/doctor-readiness.test.js` | Governance rank is at least max quality/risk | Tier floor table passes | pass |
| D08-R14 | Parse baseline records only within the first-H1 canonical metadata boundary | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Examples after H2 cannot spoof live metadata | Boundary tests pass | pass |
| D08-R15 | Preserve bootstrap to confirmed BL to CR to new BL lifecycle | `node --test test/governance-schema.test.js` | Canonical lifecycle is exact | Lifecycle tests pass | pass |
| D08-R16 | Keep bootstrap unconfirmed and confirmed BL metadata complete | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Confirmation fields distinguish record types | Record tests pass | pass |
| D08-R17 | Require complete CR delta and preventability review fields | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | CR schema fails closed | CR tests pass | pass |
| D08-R18 | Use one transition matrix and require new confirmed BL plus completed review for applied CR | `node --test test/governance-schema.test.js` | Terminal combinations are exact | Transition tests pass | pass |
| D08-R19 | Doctor validates current CR snapshot without claiming historical freeze proof | `node --test test/doctor-readiness.test.js test/docs.test.js` | Diagnostics state bounded proof | Doctor/docs tests pass | pass |
| D08-R20 | Validate immutable retrospective subtype outside active pointer chain | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Filename, lists, IDs, and exclusion are exact | Retrospective tests pass | pass |
| D08-R21 | Bind lane pointer and task snapshot while treating STATE as recoverable mirror | `node --test test/doctor-readiness.test.js` | Baseline alignment is mechanical | Alignment tests pass | pass |
| D08-R22 | Reevaluate approvals/evidence on baseline change without rewriting human decisions | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Old bindings cannot satisfy new baseline | Rebinding tests pass | pass |
| D09-R01 | Use canonical task schema version 5 with structured approval/evidence | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Exact top-level and task keys validate | Schema tests pass | pass |
| D09-R02 | Never infer or populate a human approval decision | `node --test test/contracts.test.js test/governance-schema.test.js` | Constitution forbids inferred approval | Contract tests pass | pass |
| D09-R03 | Use stable unique required evidence IDs and compound task/evidence identity | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Binding and uniqueness rules fail closed | Evidence schema tests pass | pass |
| D09-R04 | Require exactly nine produced-evidence keys | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Missing/extra keys fail | Exact-key tests pass | pass |
| D09-R05 | Require terminal evidence on full ancestor SHA, clean tree, nonempty declarations, and zero exit | `node --test test/doctor-readiness.test.js` | Invalid evidence blocks readiness | Git evidence tests pass | pass |
| D09-R06 | Allow only evidence-only task changes within the mechanically bounded impact scope | `node --test test/doctor-readiness.test.js` | Root/shared/current-lane semantic drift invalidates evidence | Drift tests pass | pass |
| D09-R07 | Anchor freshness to confirmed baseline and fixed clock with all rejection cases | `node --test test/doctor-readiness.test.js` | Future, old, missing, duplicate, dirty, drifted evidence fails | Freshness tests pass | pass |
| D09-R08 | Reject inferred or unknown evidence at completion | `node --test test/doctor-readiness.test.js` | Only observed evidence satisfies gates | Confidence tests pass | pass |
| D09-R09 | Persist code/data/runtime state in tasks | `node --test test/governance-schema.test.js test/doctor-readiness.test.js` | Three delivery dimensions are required | Delivery-state tests pass | pass |
| D09-R10 | Require nonempty all-terminal tasks, exact evidence sets, and observed/not-applicable delivery states | `node --test test/doctor-readiness.test.js` | No vacuous completion is possible | Terminal aggregation tests pass | pass |
| D09-R11 | Require valid acyclic terminal dependencies and complete DESIGN AC coverage | `node --test test/doctor-readiness.test.js` | Dependencies and AC references resolve exactly | Graph/AC tests pass | pass |
| D09-R12 | Validate deterministic approval declarations and exact field combinations | `node --test test/doctor-readiness.test.js` | Approval state combinations fail closed | Approval tests pass | pass |
| D09-R13 | Require approved active-baseline decisions for required and G2 terminal tasks | `node --test test/doctor-readiness.test.js` | Old or pending approval blocks | G2 approval tests pass | pass |
| D09-R14 | Reject AI self-identities without claiming human authentication | `node --test test/doctor-readiness.test.js test/docs.test.js` | Identity diagnostics remain bounded | Identity tests pass | pass |
| D09-R15 | Never execute or dereference evidence, approval, condition, command, artifact, or URL fields | `node --test test/doctor-readiness.test.js test/contracts.test.js` | Fields remain declarations only | Bounded-doctor tests pass | pass |
| D10-R01 | Create risk-register only for G2/high risk | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D10-R02 | Create release-plan only for explicit release intent or G2 release preparation | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D10-R03 | Create verification matrix for stable failure-mode guard or G2 minimum guard | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D10-R04 | Split specs only when DESIGN needs local contracts | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D10-R05 | Create design-pack only for reverse-spec parity evidence | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D10-R06 | Promote evals only after the same root cause is observed at least three times | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | Canonical trigger matches all surfaces | Trigger matrix tests pass | pass |
| D11-R01 | Keep doctor zero-network and zero-runtime-dependency | `node --test test/doctor.test.js test/dependencies.test.js` | Vendored doctor runs offline with built-ins only | Offline tests pass | pass |
| D11-R02 | Report layout_ok for supported structure and containment | `node --test test/doctor-layout.test.js` | Structural dimension is independent | Layout tests pass | pass |
| D11-R03 | Report delivery_ready for baseline, tiers, tasks, evidence, approval, and G2 artifacts | `node --test test/doctor-readiness.test.js` | Delivery dimension is independent | Readiness tests pass | pass |
| D11-R04 | Preserve compatible ok semantics for strict and non-strict modes | `node --test test/doctor.test.js test/doctor-layout.test.js` | ok derives from documented dimensions | CLI contract tests pass | pass |
| D11-R05 | Exit 0 for no structural error with non-strict warnings allowed | `node --test test/doctor.test.js` | Exit contract is stable | CLI tests pass | pass |
| D11-R06 | Exit 1 for structural errors or strict warnings | `node --test test/doctor.test.js` | Exit contract is stable | CLI tests pass | pass |
| D11-R07 | Exit 2 for a non-AI-OS target | `node --test test/doctor.test.js` | Exit contract is stable | CLI tests pass | pass |
| D11-R08 | Let a fresh install pass layout and fail strict delivery readiness | `node --test test/doctor-readiness.test.js test/doctor.test.js` | Fresh state is honest | Fresh doctor tests pass | pass |
| D11-R09 | Aggregate only active lanes while retaining closed-lane structure/history checks | `node --test test/doctor-readiness.test.js` | Every active lane must be ready | Aggregation tests pass | pass |
| D11-R10 | Exclude only exact closed status, reject zero-active vacuity, keep R issues informational, and emit W072 for stale STATE | `node --test test/doctor-readiness.test.js` | Closed/invalid/STATE semantics are exact | Edge-case tests pass | pass |
| D11-R11 | Validate required metadata keys and exact schema/layout/mode/default lane | `node --test test/doctor-layout.test.js` | Missing/invalid values fail closed | Metadata table tests pass | pass |
| D11-R12 | Validate framework versions without inventing current truth | `node --test test/doctor-layout.test.js` | Version mismatch is explicit | Version tests pass | pass |
| D11-R13 | Inspect every lane rather than only default | `node --test test/doctor-layout.test.js test/doctor-readiness.test.js` | Extra lane issues are scoped and aggregated | All-lane tests pass | pass |
| D11-R14 | Enforce regular types, directories, containment, and managed-path link rejection | `node --test test/doctor-layout.test.js test/path-safety.test.js` | Wrong types and links fail closed | Path/type tests pass | pass |
| D11-R15 | Require anchored baseline filenames and regular records | `node --test test/doctor-layout.test.js test/doctor-readiness.test.js` | Baseline inventory is deterministic | Baseline tests pass | pass |
| D11-R16 | Validate lane, MISSION, and task baseline alignment | `node --test test/doctor-readiness.test.js` | Pointer mismatches block readiness | Alignment tests pass | pass |
| D11-R17 | Parse the canonical YAML subset independent of key order | `node --test test/doctor-parser.test.js test/doctor-readiness.test.js` | Supported reorderings parse and unsupported syntax fails | Parser tests pass | pass |
| D11-R18 | Validate duplicate IDs, owner, status, dependencies, and acceptance references | `node --test test/doctor-readiness.test.js` | Task structural defects are deterministic | Task tests pass | pass |
| D11-R19 | Validate terminal evidence and G2 approval | `node --test test/doctor-readiness.test.js` | Readiness gates fail closed | Evidence/approval tests pass | pass |
| D11-R20 | Validate present on-demand schemas and deterministically required presence | `node --test test/doctor-readiness.test.js` | Wrong types/schema and missing G2 artifacts fail | Extension tests pass | pass |
| D11-R21 | Evaluate exact active gitignore rules with negation/order semantics | `node --test test/doctor-readiness.test.js` | Comments and later negations cannot spoof rules | Gitignore tests pass | pass |
| D11-R22 | Check distributed constitution identity/anchors without claiming semantic proof | `node --test test/doctor-layout.test.js test/docs.test.js` | Bounded constitution checks are explicit | Constitution tests pass | pass |
| D11-R23 | Use a bounded hardened local Git allowlist with SHA-1/SHA-256, monorepo, raw NUL paths, local-only objects, and sanitized reasons | `node --test test/doctor-readiness.test.js` | All runner security and compatibility cases pass | Git runner tests pass | pass |
| D11-R24 | Fail closed on unsupported canonical TOML/YAML without pretending to be general parsers | `node --test test/doctor-parser.test.js test/doctor-layout.test.js` | Specific parser issues are emitted | Parser adversarial tests pass | pass |
| D12-R01 | Remove memory merge=union and use ordinary Git conflict handling | `node --test test/migration.test.js` | No managed union rule remains | Tests pass | pass |
| D12-R02 | Give stable memory entries IDs, status, source, owner, last_verified, and supersedes | `node --test test/governance-schema.test.js test/docs.test.js` | Memory schema is complete | Schema tests pass | pass |
| D12-R03 | Keep superseded records traceable but never simultaneously active | `node --test test/governance-schema.test.js` | Active/archive semantics are explicit | Schema tests pass | pass |
| D12-R04 | Parameterize lane paths and ask one question only when repository facts cannot disambiguate | `node --test test/contracts.test.js` | Skill selects dynamic lane safely | Skill contracts pass | pass |
| D12-R05 | Use one coordinating writer and the bounded six-field worker handoff | `node --test test/contracts.test.js` | Handoff tuple has one owner | Handoff tests pass | pass |
| D12-R06 | Keep collaboration a file/communication protocol, not an orchestrator | `node --test test/contracts.test.js test/docs.test.js` | No runtime orchestration claim exists | Contract tests pass | pass |
| D13-R01 | Keep the official skill a thin activation/loading adapter | `node --test test/contracts.test.js test/docs.test.js` | Skill contains only activation, selection, read order, and local constitution handoff | Skill tests pass | pass |
| D13-R02 | Reference only files available after installation and never downstream maintainer docs | `node --test test/link-integrity.test.js test/docs.test.js` | Installed links resolve | Link tests pass | pass |
| D13-R03 | Make examples obey scope/trigger rules and remove invented photo Stripe/initial CR behavior | `node --test test/examples.test.js` | Corrected scenario decisions are exact | Example tests pass | pass |
| D13-R04 | Use canonical release-intent trigger in every release example | `node --test test/examples.test.js test/contracts.test.js` | Release-plan is not created early | Trigger tests pass | pass |
| D13-R05 | Give every eval machine-readable input, decisions, forbidden actions, artifact deltas, evidence, version, and provenance | `node --test test/evals.test.js test/docs.test.js` | All eleven oracles validate | Eval tests pass | pass |
| D13-R06 | Test static oracle matrices, ship no live harness, and document optional sanitized manual runs | `node --test test/evals.test.js test/docs.test.js` | Static contract is complete and bounded | Eval/docs tests pass | pass |
| D14-R01 | Use node:test source/unit suites for parsers, hashes, ownership, and planning | `npm test` | Unit suites run natively | Full suite passes | pass |
| D14-R02 | Cover fresh-install integration | `node --test test/install.test.js` | Fresh install works | Integration suite passes | pass |
| D14-R03 | Cover reinstall, force, and v10 preservation/idempotency | `node --test test/install-idempotency.test.js test/migration.test.js` | User truth and baseline count are unchanged | Suites pass | pass |
| D14-R04 | Cover adversarial links, types, readonly, concurrency, and rollback | `node --test test/path-safety.test.js test/install-transaction.test.js` | Filesystem failures are safe | Adversarial suites pass | pass |
| D14-R05 | Cover doctor metadata, lanes, baselines, task forms, approval, evidence, and gitignore tables | `node --test test/doctor-layout.test.js test/doctor-parser.test.js test/doctor-readiness.test.js` | Doctor matrix is complete | Doctor suites pass | pass |
| D14-R06 | Cover installed reference and link integrity | `node --test test/link-integrity.test.js` | All installed references resolve | Link suite passes | pass |
| D14-R07 | Cover npm pack allowlist and tarball-install smoke | `node --test test/package.test.js` | Tarball is minimal and executable | Package suite passes | pass |
| D14-R08 | Cover docs, examples, and eval matrix consistency | `node --test test/docs.test.js test/examples.test.js test/evals.test.js test/contracts.test.js` | Surfaces converge | Surface suites pass | pass |
| D14-R09 | Cover release truth separation | `node --test test/release.test.js` | VERSION and RELEASED_VERSION semantics hold | Release suite passes | pass |
| D14-R10 | Enforce 94 line, 72 branch, and 98 function coverage floors as supporting evidence | `npm run test:coverage` | Coverage thresholds pass | 368 tests and thresholds pass | pass |
| D15-R01 | Give CI explicit contents-read permissions | `node --test test/ci-config.test.js` | Workflow permissions are least privilege | CI config tests pass | pass |
| D15-R02 | Pin every action to a reviewed full commit SHA | `node --test test/ci-config.test.js` | No mutable action refs | Pin tests pass | pass |
| D15-R03 | Run ci, lint, full tests, diff-check, audit, and pack in supported quality jobs | `node --test test/ci-config.test.js` | Quality job contains all gates | CI tests pass | pass |
| D15-R04 | Make Node 22 and 24 blocking | `node --test test/ci-config.test.js` | Stable quality checks exist | Matrix tests pass | pass |
| D15-R05 | Run Node 26 as non-blocking canary | `node --test test/ci-config.test.js` | Canary is excluded from protection | Canary tests pass | pass |
| D15-R06 | Run blocking Ubuntu, Windows, and macOS smoke including path/symlink behavior | `node --test test/ci-config.test.js` | Three platform jobs exist | Platform config tests pass | pass |
| D15-R07 | Cover Unicode/space paths and CRLF | `node --test test/path-safety.test.js test/migration.test.js test/ci-config.test.js` | Cross-platform path/text cases exist | Tests pass | pass |
| D15-R08 | Run production audit and scheduled full development audit | `node --test test/ci-config.test.js` | Both audit modes are configured | Audit config tests pass | pass |
| D15-R09 | Verify package contents and executable mode | `node --test test/package.test.js test/ci-config.test.js` | Tarball surface and modes are exact | Package tests pass | pass |
| D15-R10 | Require Node at least 22.13.0 consistently | `node --test test/dependencies.test.js` | Package and contributor docs agree | Dependency tests pass | pass |
| D15-R11 | Configure Dependabot for npm and Actions | `node --test test/ci-config.test.js` | Both weekly ecosystems exist | Config tests pass | pass |
| D15-R12 | Publish a truthful SECURITY policy | `node --test test/ci-config.test.js test/package.test.js` | Supported release and reporting route are accurate | Security tests pass | pass |
| D15-R13 | Protect critical paths with CODEOWNERS owned by royeedai | `node --test test/ci-config.test.js` | Installer, templates, workflows, metadata, and CODEOWNERS are owned | Ownership tests pass | pass |
| D15-R14 | Configure dependency review where settings permit | `node --test test/ci-config.test.js` | Pinned blocking workflow exists | Config tests pass | pass |
| D15-R15 | Configure advanced CodeQL where settings permit | `node --test test/ci-config.test.js` | Pinned least-privilege workflow exists | Config tests pass | pass |
| D15-R16 | Apply and read back review, checks, conversation, force/delete, and code-owner repository rules | `node scripts/verify-repository-settings.js` | Live settings equal reviewed desired state or a feature is proven unavailable | GitHub authentication is invalid; no mutation/readback claimed | blocked |
| D16-R01 | Require VERSION, package, lockfile, changelog target, and candidate tag agreement for every release | `node --test test/release.test.js test/docs.test.js` | Seven-claim checklist includes version agreement | Release policy tests pass | pass |
| D16-R02 | Require docs pins to agree with RELEASED_VERSION before and after transition | `node --test test/release.test.js` | Pin transition is explicit | Release truth tests pass | pass |
| D16-R03 | Require supported-platform CI and tarball smoke before release | `node --test test/docs.test.js test/ci-config.test.js` | Checklist names both | Policy tests pass | pass |
| D16-R04 | Require zero known production vulnerability | `npm audit --omit=dev` | Exit 0 | Audit passes with zero vulnerabilities | pass |
| D16-R05 | Require verified release commit and annotated tag trust | `node --test test/docs.test.js` | Checklist includes trust proof | Docs test passes | pass |
| D16-R06 | Require exact GitHub Release tag plus checksum/package evidence | `node --test test/docs.test.js` | Checklist includes release/readback evidence | Docs test passes | pass |
| D16-R07 | Require pinned-ref installation smoke | `node --test test/docs.test.js test/package.test.js` | Checklist and package smoke exist | Tests pass | pass |
| D16-R08 | Keep public tag/release separate and never advertise nonexistent v11 | `node --test test/release.test.js test/docs.test.js` | v11 stays unreleased until separately authorized | Release truth tests pass | pass |
| D17-R01 | Give expected user/path/schema conflicts stable diagnostics without stacks | `node --test test/install.test.js test/doctor.test.js` | Error output is bounded | CLI tests pass | pass |
| D17-R02 | Keep doctor JSON additive except intentional v11 truth changes | `node --test test/doctor-layout.test.js test/fixtures/doctor-report.json` | Fresh report contract is locked | JSON snapshot tests pass | pass |
| D17-R03 | Preserve extensions and validate only present or required ones | `node --test test/migration.test.js test/doctor-readiness.test.js` | On-demand behavior is non-destructive and deterministic | Tests pass | pass |
| D17-R04 | Let modified user content win over framework convenience | `node --test test/install-idempotency.test.js test/migration.test.js` | Modified project/session bytes are preserved | Preservation tests pass | pass |
| D17-R05 | Leave either previous valid state or complete new state after failure | `node --test test/install-transaction.test.js` | No claimed mixed success | Rollback tests pass | pass |
| D18-R01 | Ensure no official command references a nonexistent or unintended package/ref | `node --test test/release.test.js test/docs.test.js` | All public commands are pinned to real release metadata | Command scans pass | pass |
| D18-R02 | Prevent normal, force, and migration from overwriting modified project/session truth | `node --test test/install-idempotency.test.js test/migration.test.js` | Byte snapshots remain equal | Preservation tests pass | pass |
| D18-R03 | Prevent adversarial links from writing outside the target | `node --test test/path-safety.test.js test/install-transaction.test.js` | External sentinels remain unchanged | Adversarial suites pass | pass |
| D18-R04 | Make reinstall file-set and baseline-count idempotent | `node --test test/install-idempotency.test.js` | Reinstall snapshot is stable | Idempotency suite passes | pass |
| D18-R05 | Roll back failed installs | `node --test test/install-transaction.test.js` | Previous snapshot is restored | Rollback suite passes | pass |
| D18-R06 | Keep fresh install unconfirmed and not delivery-ready | `node --test test/doctor-readiness.test.js` | layout_ok true and delivery_ready false | Fresh readiness test passes | pass |
| D18-R07 | Resolve local schemas offline | `node --test test/link-integrity.test.js test/doctor.test.js` | Installed reference is sufficient without network | Offline/link tests pass | pass |
| D18-R08 | Keep tiers, baseline, approval, evidence, and authority consistent everywhere | `node --test test/governance-schema.test.js test/contracts.test.js test/doctor-readiness.test.js` | Cross-surface governance contracts agree | Governance suites pass | pass |
| D18-R09 | Make doctor fail closed for canonical formats and inspect every lane | `node --test test/doctor-parser.test.js test/doctor-layout.test.js test/doctor-readiness.test.js` | Malformed formats fail and all lanes report | Doctor suites pass | pass |
| D18-R10 | Keep skill thin and examples/evals canonical | `node --test test/contracts.test.js test/examples.test.js test/evals.test.js` | All surface oracles pass | Surface suites pass | pass |
| D18-R11 | Pass native tests, lint, diff, pack/tarball, coverage, and supported-platform CI | `npm test`; `npm run test:coverage`; `npm run lint`; `git diff --check`; `node scripts/verify-remote-evidence.js` | Local gates and nine current-head remote checks pass | Ordinary local gates pass; Node 24 coverage is below threshold and branch/PR CI is unavailable | blocked |
| D18-R12 | Apply repository security/release settings or prove feature unavailability without misleading claims | `node scripts/verify-repository-settings.js` | Current live settings satisfy desired state | Authenticated readback shows protection absent, Actions SHA pinning false, vulnerability/security settings disabled, and label missing | blocked |
| D18-R13 | Report code, repository data, and runtime status separately with evidence | Final evidence comment and strict matrix validation | Three dimensions reference immutable current head | pending | pending |
| D19-R01 | Complete test/release-truth foundation workstream with regression tests/review | `npm test` and branch history | Workstream contracts pass | Foundation commits and tests present | pass |
| D19-R02 | Complete installer safety/migration workstream with regression tests/review | Installer focused suites and migration probe | Workstream contracts pass | Installer suites and real v10 probe pass | pass |
| D19-R03 | Complete governance/doctor workstream with regression tests/review | Governance and doctor focused suites | Workstream contracts pass | Governance/doctor suites pass | pass |
| D19-R04 | Complete surface-convergence workstream with regression tests/review | Surface focused suites | Workstream contracts pass | Surface suites pass | pass |
| D19-R05 | Complete CI/security source workstream with regression tests/review | `node --test test/ci-config.test.js test/dependencies.test.js` | Committed desired-state sources pass | CI/security config tests pass | pass |
| D19-R06 | Complete audit/release-readiness workstream with adversarial, tarball, and remote readback | Strict matrix plus local/remote validators | No unresolved row remains | Remote readback pending | pending |
| D19-R07 | Finish each dependency-ordered workstream with regression tests and review; parallelize only non-overlap | Final self-review record and clean immutable head | No unresolved high/medium finding and all gates pass | Final review and immutable-head proof pending | pending |

## Current closeout state

- Code/source: local implementation and local behavioral gates are green.
- Repository data/settings: committed desired state exists; authenticated readback shows the reviewed settings have not been applied.
- Runtime/CI: local runtime evidence is green; supported-platform PR checks require the pushed branch and draft PR.
- Release: v11 remains intentionally untagged and `Unreleased`; no release action is authorized by this matrix.
