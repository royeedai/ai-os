# Example: Bounded bug fix

Scenario: a dropdown in your admin panel shows no options. Users can't select a category.

## 1. You report the bug

**You**: "The category dropdown in admin/products is empty. Users can't pick a category."

## 2. Agent applies AGENTS.md debug rule

Per AGENTS.md §3 (bug-fix rule) and absolute rule #5 (no over-scope):

1. Agent does NOT immediately open `CategoryDropdown.tsx` and "fix it"
2. First writes:
   - **Symptom**: admin/products dropdown empty
   - **Reproduction**: login as admin → /admin/products → click dropdown
   - **Read-only tracing**: agent reads CategoryDropdown.tsx, CategoryService.ts, and the API route
3. Hypotheses:
   - (a) API returns empty array — check backend
   - (b) Frontend isn't calling API — check component mount
   - (c) API returns data but frontend filter drops all — check transform layer

Agent then runs `curl /api/categories` in the terminal (or asks you to) and finds:

   - API returns `{ items: [...5 categories...] }`
   - Frontend expects `{ data: [...] }`

**Root cause**: shared response wrapper was updated to `{ items }` on backend; frontend adapter still expects `{ data }`.

## 3. Agent identifies scope

1. This bug involves a **shared response wrapper** — per AGENTS.md §3 debug-rule, agent must trace the wrapper first, not patch locally
2. Agent searches for other consumers of the wrapper: finds 4 other dropdowns and 2 pages using the same adapter
3. Writes impact summary:
   - 5 components affected by the same wrapper mismatch
   - Two fix options:
     - (A) Change backend back to `{ data }` (risk: consumers outside this repo)
     - (B) Update all 5 frontend consumers to `{ items }` (risk: lose downstream legacy clients)
4. Asks you: "Which approach? (A) or (B)?"

## 4. Agent flags this as P1, not P2

Because the fix touches shared infrastructure (wrapper) and multiple modules, it's no longer a single-point P2 debug. Agent escalates to P1 and adds the wrapper contract registry to root `.ai-os/memory.md` (cross-layer contract § 8.1):

```
| Wire field | Defined in | Consumers | Change requires |
|---|---|---|---|
| { items: T[] } | backend/response.ts | 5 frontend components | All consumers updated together |
```

## 5. Scoped fix

**You**: "Go with (B), update all frontend consumers."

Agent writes a `change_scope` in `.ai-os/lanes/default/tasks.yaml`:

- Only these 5 files will be edited
- `out_of_scope_guard`: "Do not refactor, rename, or touch unrelated code"

## 6. Verify

- Each of the 5 dropdowns: manual smoke test
- Regression: full test suite
- Static check: `pnpm typecheck` (because wire contract is typed)
- State check explicitly separated:
  - Code state: fixed ✓
  - Data state: no data changes ✓
  - Runtime state: frontend needs redeploy; backend unchanged

## 7. Stable failure mode guard

The wrapper name drift is a stable failure pattern. Agent adds to `.ai-os/lanes/default/verification-matrix.yaml`:

```yaml
failure_modes:
  - id: wrapper-name-drift-items-vs-data
    trigger: "Frontend consumes { data: T[] } when backend returns { items: T[] }"
    guards:
      - "CI runs a wire-contract check across all 5 consumer files"
      - "memory.md §8.1 row must be updated before wrapper changes"
```

Future agents reading AGENTS.md + lane `verification-matrix.yaml` will check this automatically.

## What the agent NEVER did

- Patched only CategoryDropdown.tsx and declared "done"
- Touched unrelated code while "I'm already in here"
- Missed that 4 other dropdowns had the same problem
- Claimed fix was done before running static check
