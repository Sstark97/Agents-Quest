---
name: review-change
description: Review the uncommitted changes (or a given commit range) of Agent Quest for bugs, accidental behaviour changes and architecture violations before committing.
argument-hint: "[optional commit range or paths]"
context: fork
agent: reviewer
background: false
---

Review the changes in this repository. Scope: $ARGUMENTS

If no scope was given, review everything uncommitted (`git status`, `git diff`, and untracked files). Follow your review order and report format, and finish with the verdict.
