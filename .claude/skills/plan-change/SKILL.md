---
name: plan-change
description: Get a plan from the architect for one concrete change to Agent Quest, without implementing it. Use to explore how something would be done or to compare approaches; /next-iteration already plans as part of its cycle.
argument-hint: "[what to change]"
context: fork
agent: architect
background: false
---

Plan this change to Agent Quest: $ARGUMENTS

Read `CLAUDE.md` and the code involved, then produce the plan in your usual format: goal, design by layer, ordered slices with their files and tests, risks, and open questions. Do not write code.
