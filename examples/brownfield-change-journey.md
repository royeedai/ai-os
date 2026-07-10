# Example: Brownfield change journey

Scenario: you have a 2-year-old SaaS app. A new requirement comes in: "Add CSV bulk import for product catalog."

## 0. Install (if not already done)

```bash
cd my-existing-app
npx --yes github:royeedai/ai-os#v10.5.1 .
```

The agent now reads `AGENTS.md` on every session.

## 1. Change request (agent detects this is a change to an existing project)

**You**: "Add CSV bulk import for the product catalog."

**Agent behavior (per AGENTS.md behavior rules — requirement change)**:

1. Does NOT immediately start coding
2. Creates `.ai-os/lanes/default/baseline-log/CR-20260422-141000-csv-bulk-import.md` with:
   - Impact analysis: what this changes in MISSION (catalog module scope expansion)
   - Files likely affected (controllers, services, db migrations, UI modal)
   - What sits on the boundary of shared infrastructure (request wrapper, validation pipeline, audit log)
3. Proposes MISSION baseline update (append to "scope" in catalog module)
4. Stops. Asks: "Confirm this impact analysis and MISSION baseline update?"

## 2. Brownfield shared-infrastructure audit

Per AGENTS.md §2, brownfield changes must audit shared infrastructure before implementation.

Agent:

1. Scans the repo for request wrappers, response adapters, audit-log middleware, validation pipelines
2. Writes findings into `.ai-os/lanes/default/DESIGN.md` §6 (shared-infrastructure audit / side-effects clause)
3. Identifies: "Your existing `ImportPipeline` already handles CSV for the customers module. Propose reusing it for products."
4. Asks: "Reuse existing `ImportPipeline` or write a product-specific pipeline? Trade-offs listed."

**You**: "Reuse it."

## 3. Parity check before abstraction reuse

Per AGENTS.md §2, reuse of shared abstractions requires parity check.

Agent:

1. Reads `ImportPipeline` source
2. Writes to DESIGN §6: "Products schema differs from customers — has 'sku' (unique) and 'inventory' (non-null) that customers don't. Reuse is viable but requires a product-specific validator."
3. Confirms with you

## 4. Scoped build

Agent only writes code in:

- New `ProductImportController`
- New `ProductImportValidator`
- DB migration for import-log tracking
- UI: one modal

Agent explicitly avoids touching `ImportPipeline` internals, authentication, or unrelated services (per AGENTS.md absolute rules #5, #6, #7).

## 5. Verify

Agent runs:

- Project-native static check (`pnpm build`, `pnpm typecheck`)
- Regression: all existing tests still pass (no new failures introduced)
- Edge cases: empty CSV, malformed CSV, duplicate SKUs, 10k+ rows, permission denied
- Writes results to `.ai-os/lanes/default/verification-matrix.yaml` (on-demand artifact, created when the first failure-mode guard is registered)

## 6. Ship

Release plan includes:

- "Code state": deployed
- "Data state": no migration of existing data (greenfield import)
- "Runtime state": requires one-time restart of import worker after deploy
- AI done / human needed: separate
- Rollback: feature flag off + rollback migration

## Note

No slash commands. The agent identified "this is a change request" from your message and followed the `AGENTS.md` behavior rule automatically.
