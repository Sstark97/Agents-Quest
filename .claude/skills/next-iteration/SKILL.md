---
name: next-iteration
description: Start the next piece of work on Agent Quest - a user story from docs/specs or a described task. Simple tasks are done directly; larger ones follow a light spec-driven cycle (spec, plan, implement, verify, review).
argument-hint: "[US id, spec file or task description - empty for the next pending story]"
disable-model-invocation: true
---

Start the next iteration on Agent Quest. Input: $ARGUMENTS

## 1. Pick the work

- A story id (`US-03`) or a spec path → read that story in `docs/specs/`.
- A description → that is the task. If it is really a feature (several things a user could do), stop and suggest `/design-feature` instead.
- Nothing → take the first story without a tick in the spec whose state is `aprobada` or `en curso`. If there are several specs with pending stories, or none, ask which one.

Check `git status` first. If there are uncommitted changes unrelated to this work, say so and ask whether to continue on top of them.

## 2. Triage

Read the code the task touches before deciding. The task is **simple** only if all of these hold:

- one layer, or a rule plus the one place that shows it; about four files or fewer;
- no new port, adapter, API route, screen or dependency;
- nothing persisted or public is involved (URLs, game and medal ids, `taller.*` and `aq:*` keys, the shape of stored or transmitted data);
- the expected result is unambiguous — you could write the test now.

Typical simple tasks: a text or style change, a scoring constant, a bug with an obvious cause, a small rule tweak, a missing test. When in doubt, it is not simple.

Say which path you take and why, in one line, then follow it.

## 3a. Simple path — no subagents

Do it yourself in this thread:

1. Make the change, following `CLAUDE.md`. Update or add the test for any rule you touch.
2. Run `/verify-change` and fix what fails.
3. Go to step 4.

If it turns out not to be simple once you are in it (it spreads to other layers, or the right design is unclear), stop, say so, and switch to 3b. Do not push through.

## 3b. Light spec-driven cycle

**Spec.** The story needs acceptance criteria before anyone plans. If it came from `docs/specs/`, use them. If it came as a description, write a mini spec — goal, what stays the same, three to five acceptance criteria — in `docs/specs/<name>.md` (same template as `/design-feature`, one story). Ask the user only what you cannot settle from the code, at most three questions at once. Show the criteria and wait for a yes.

**Plan.** Delegate to the `architect` agent with the story, its criteria and the paths you already found relevant. It returns the design by layer and ordered slices. Save the plan under "Plan" in the spec. Show the user a short version (the design in a few lines and the slices) and wait for approval. If the architect raises open questions, pass them to the user.

**Implement.** One slice at a time, inner layers first. For each slice, delegate to the `developer` agent with: the slice from the plan, the acceptance criteria it serves and the files involved. Use the `tester` agent when a slice is mostly tests or a bug needs reproducing first. After each slice `pnpm typecheck` and `pnpm test` must be green before starting the next. If a slice shows the plan is wrong, go back to the architect with what was learnt rather than patching around it.

**Verify.** Run `/verify-change` on the whole change. Then check each acceptance criterion and say how it is covered: by which test, or by which manual step with `pnpm dev`.

**Review.** Run `/review-change`. Fix every "must fix" (through the `developer`), re-verify, and list the suggestions you did not apply.

## 4. Close

- If the work came from a spec: tick the story, update the spec state, and correct the spec if what was built differs from what it said.
- Summarise: what changed for the user, the files touched by layer, verification results, what to check by hand, anything left open, and the next pending story.
- Do not commit. Offer `/commit-changes`.

## Rules for the whole cycle

- Stay inside the story. Note unrelated problems you find; do not fix them.
- Behaviour outside the story must not change. If something visible changes on purpose, say it in the summary.
- Give each subagent everything it needs in the prompt — it does not see this conversation.
