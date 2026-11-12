---
name: commit-changes
description: Group the pending changes of Agent Quest into Conventional Commits. Only when the user asks to commit.
argument-hint: "[optional hint about how to group]"
disable-model-invocation: true
---

Commit the pending changes. $ARGUMENTS

1. Make sure `/verify-change` passed for the current state; if it has not been run, run it first and stop if it fails.
2. Look at `git status` and `git diff`. Group the changes into commits that each make sense alone, inner layers first (`domain` → `application` → `infrastructure` → `api` → `ui` → `test` → `docs` → `chore`). One commit is fine for a small change.
3. Show the user the proposed list (message + files) when there is more than one commit or the grouping is not obvious, and wait for a yes.
4. For each group: `git add` exactly its files, then `git commit -m "<message>"`.

Message rules:

- Conventional Commits: `type(scope): summary`. Types `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scopes `domain`, `application`, `infrastructure`, `api`, `ui` (omit when it does not fit).
- One short sentence in English, imperative, lower case, no final period, no body.
- No `Co-Authored-By`, no tool or session trailers, no emojis.
- Do not change the git author; use the repository's configured identity.

Do not push, amend, rebase or force anything unless the user asks for exactly that. Finish with `git log --oneline` of the new commits.
