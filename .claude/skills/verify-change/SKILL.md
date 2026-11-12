---
name: verify-change
description: Verify that a change to Agent Quest is complete and safe - type-check, tests, build and the project checklist. Use after implementing anything and before reviewing or committing.
allowed-tools:
  - Bash(pnpm typecheck)
  - Bash(pnpm test)
  - Bash(pnpm build)
  - Bash(git status *)
  - Bash(git diff *)
---

Verify the current change. Run every step even if an earlier one fails, then report.

1. `pnpm typecheck`
2. `pnpm test` — includes the architecture test; a failure there means an import crosses a layer the wrong way. Fix the import, never the test.
3. `pnpm build` — required when `app/`, `src/ui` or `src/composition` changed.
4. `git status --short` and `git diff --stat` — every changed file should belong to the task. Flag strays (logs, `.bak`, unrelated edits).
5. Checklist against the diff:
   - No change to URLs, game ids, medal ids, `taller.*` or `aq:*` keys, or the shape of stored values.
   - Identifiers and comments in English; user-facing text in Spanish.
   - No `fetch`, `localStorage`, `sessionStorage` or `process.env` in `src/domain`, `src/application` or React components.
   - Changed rules have tests. No assertion was weakened.
   - No new dependency in `package.json`.
6. If the change affects what a player sees, say what should be checked by hand with `pnpm dev` (which screen, which steps). Do not claim it was checked in a browser unless it was.

Report each step as pass or fail with the relevant output for failures, then one line: ready or not. Do not fix anything as part of this skill unless asked.
