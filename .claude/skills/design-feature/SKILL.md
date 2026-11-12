---
name: design-feature
description: Design a new feature for Agent Quest and split it into small user stories with acceptance criteria, saved as a spec in docs/specs. Use when the user has an idea or a need that is bigger than one change, before any code is written.
argument-hint: "[the idea or need]"
model: opus
effort: high
disable-model-invocation: true
---

Design this feature for Agent Quest and split it into user stories: $ARGUMENTS

You are designing, not building. Do not edit anything outside `docs/specs/`.

## 1. Understand

- Read `CLAUDE.md`, then the code the idea touches (screens, domain rules, services). Reuse what exists; say what is already there.
- If the idea leaves a decision open that changes the design (who it is for, what counts as done, what it must not break), ask the user — at most three questions, all at once, each with your recommended answer. If nothing is really open, do not ask; state your assumptions in the spec instead.
- This skill runs on Opus only for the turn in which it is invoked. If you asked questions, then when the answers arrive delegate steps 2 and 3 to the `architect` agent (Opus), giving it the idea, the answers and the relevant paths you found, and write the spec from what it returns.

## 2. Shape the feature

- Write the problem and the outcome from the point of view of a **team playing** or the **facilitator**, not of the code.
- Decide what is in and what is explicitly out. Prefer the smallest version that delivers the outcome; park the rest under "Más adelante".
- When there are real alternatives, compare them briefly (what each costs, what each risks) and pick one.
- Check the idea against the fixed points of the project: the hexagonal layers, the persisted and public names that never change (URLs, game and medal ids, `taller.*` and `aq:*` keys), offline play, and sessions that are already running.

## 3. Split into user stories

Each story is a **vertical slice**: after it is merged, someone can see or do something new. Never split by layer ("domain", then "UI").

- Independent where possible, ordered so the first one alone already gives value and the riskiest unknown is tackled early.
- Small: one story should fit in one `/next-iteration`. If it needs more than about five acceptance criteria or touches every layer heavily, split it again.
- Acceptance criteria are observable and testable: concrete inputs and the exact result, including the Spanish text the user will read when it matters.
- Mark each story `S` (one layer, a few files → done directly) or `M` (several layers → needs a plan). An `L` is a story to split.
- Give technical notes only where they prevent a mistake: which layer owns the rule, which port is involved, what must not be renamed.

## 4. Write the spec

Save it as `docs/specs/<kebab-case-feature-name>.md` following `template.md` in this skill's folder. Write it in Spanish; keep identifiers and file paths in English. Keep it to what someone needs to build it — one page is a good spec.

## 5. Hand over

Reply with: the path of the spec, the list of stories (id, title, size), any assumption you made that the user should confirm, and the suggestion to start with `/next-iteration US-01`.
