# Agent Quest

Pixel-art educational game for a workshop on AI coding agents: seven levels, one concept each, played by teams inside a facilitator-run session with a live ranking. Next.js 16 (App Router), React 19, TypeScript, pnpm. No database: Upstash Redis over REST in production, in-memory locally.

## Commands

```bash
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm test         # Node's built-in test runner over tests/**/*.test.ts (Node 22.6+)
pnpm build        # production build
```

A change is done only when `pnpm typecheck`, `pnpm test` and `pnpm build` all pass.

## Architecture (hexagonal)

Dependencies point inwards only: `ui` / `infrastructure` → `application` → `domain`. `tests/architecture/dependency-rule.test.ts` enforces it.

| Folder | What lives there | May import |
|---|---|---|
| `src/domain/` | Pure rules and data. `games/` (catalog, progress, medals, lessons, glossary), `levels/level-1..7/` (rules and scoring of each level), `session/` (session, score submission, ranking, stats), `shared/` (seed, random) | `domain` only, no packages |
| `src/application/server/` | Use cases + ports `SessionRepository`, `ScoreRepository`, `RandomSource` | `domain` |
| `src/application/client/` | Browser-side services + ports `KeyValueStore`, `SessionGateway` | `domain` |
| `src/infrastructure/server/` | Upstash Redis and in-memory repositories, Node randomness | `domain`, `application` |
| `src/infrastructure/client/` | `localStorage` store, HTTP gateway | `domain`, `application` |
| `src/composition/` | The only place that picks adapters (`server.ts`, `client.ts`) | everything |
| `src/ui/` | React: `screens/`, `levels/level-N/`, `components/`, `hooks/`, `art/`, `audio/`, `practice/` | `domain`, `application` |
| `app/` | Next.js delivery layer: pages re-export a screen, API routes call a use case and map the result to HTTP | `src` |
| `tests/` | `domain/`, `application/` (with fakes from `tests/support/fakes.ts`), `architecture/` | `src` |

Where things go:

- A game rule, score, penalty, mistake label or medal → a pure function in `src/domain`, with a test. Never inside a component.
- Anything that reads or writes `localStorage` or calls the API → a service in `src/application/client`, reached from React with `useServices()`. Components never touch `localStorage`, `sessionStorage` or `fetch` (the one exception is `src/ui/screens/home/last-map-position.ts`, UI-only state).
- A new storage backend → implement the two repository ports in `src/infrastructure/server` and choose it in `src/composition/server.ts`.
- `app/` files stay a few lines long. API error messages and status codes live in `app/api/responses.ts`.

## Conventions

- **Code is English**: files, functions, types, components, comments, tests, commit messages.
- **User-facing text is Spanish**: everything a player or facilitator reads, including API error messages and the mistake labels sent to the stats.
- **Never rename what is persisted or public.** These stay in Spanish forever, because changing them breaks shared links, QR codes, stored progress and live sessions:
  - URLs: `/juegos/nivel-N`, `/glosario`, `/ranking`, `/sesion/nueva`, `/tv` (so the `app/` folders keep those names)
  - game ids `nivel-1` … `nivel-7`, medal ids `pleno`, `primero`, `frugal`, `sinclear`
  - `localStorage` keys `taller.*` (see `src/application/client/storage-keys.ts`) and Redis keys `aq:*`
- CSS class names in `app/globals.css` are short and already fixed; reuse them, do not rename them.
- Relative imports inside `domain`, `application`, `infrastructure` and `tests` (the test runner loads them without a bundler); `@/src/...` imports in `ui`, `composition` and `app`.
- No TypeScript features that need emit: no `enum`, no constructor parameter properties, no namespaces. Tests run with Node's type stripping. Use `import { type X }` for types.
- Factories over classes (`createSessionUseCases({ ... })`), ports as plain interfaces, results as tagged unions (`{ ok: true, ... } | { ok: false, error: "..." }`) instead of exceptions for expected failures.
- Name the magic numbers. No new dependencies without asking.
- Level variants are seeded with `teamSeed(team, sessionCode)`: same team and session, same variant. Keep the order of `Math.random` / `shuffle` calls stable when touching a level.
- A successful API reply with an unreadable body is treated as a connection problem (see `Reply` in `src/application/client/ports.ts`).

## Next.js 16

This version has breaking changes compared with what you may remember. Before using an API you have not seen in this repo, read the matching guide in `node_modules/next/dist/docs/`.

## How to work here

The session runs on Sonnet. Opus is used only where thinking pays off: designing features and planning non-trivial changes.

Two entry points:

- `/design-feature <idea>` (Opus) — turns an idea into a short spec split into user stories, saved in `docs/specs/<feature>.md`. No code.
- `/next-iteration [US id | description]` — starts the next piece of work. It triages first:
  - **Simple** (one layer, a handful of files, clear outcome, nothing persisted or public involved): done directly in the main thread, no subagents.
  - **Anything else**: a light spec-driven cycle — spec → plan → implement → verify → review.

Agents, used by the cycle and available on their own:

| Agent | Model | Job |
|---|---|---|
| `architect` | Opus | Plans and designs a change, weighs options. Read-only. |
| `developer` | Sonnet | Writes the code for one slice of a plan. |
| `tester` | Sonnet | Writes or fixes tests, reproduces bugs. |
| `reviewer` | Sonnet | Reviews a diff. Read-only. |

Other skills: `/plan-change`, `/add-level`, `/verify-change`, `/review-change`, `/commit-changes`.

Specs live in `docs/specs/` and are written in Spanish (identifiers and file paths in English). The spec is the source of truth for what a story must do: update it when the plan or the scope changes, and tick the story when it is done.

Behaviour must not change by accident: when refactoring, the game has to play exactly as before. If a behaviour change is intended, say so explicitly in the plan and in the final summary.

## Git

- Commit only when the user asks. Do not push, amend or rewrite history unless the user asks for exactly that.
- Conventional Commits, one short sentence, no body, no co-author or tool trailers: `feat(ui): add facilitator panel`. Scopes in use: `domain`, `application`, `infrastructure`, `api`, `ui`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Group changes into commits that make sense on their own, inner layers first.
