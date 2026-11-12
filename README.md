# 🤖 Agent Quest

A pixel-art campaign for learning how to work with AI coding agents: a robot agent in a repo dungeon, one level per concept. Teams play inside a session run by the facilitator and compete in a live ranking.

Agent Quest is part of a workshop on agent-driven development from [LeanMind](https://leanmind.es/es) and [Sirviendo Código](https://sirviendocodigo.com/). The robots are an 8-bit take on the Sirviendo Código mascot.

Built with Next.js 16 (App Router), React 19 and TypeScript. The interface is in Spanish.

```bash
# requires pnpm (corepack enable)
pnpm install
pnpm dev        # http://localhost:3000
```

Playing requires a session (see below). To try every level without one, open `/?todos=1`.

## Levels

| Level | Concept | Mechanic |
|---|---|---|
| 1 · La cámara de permisos | Ask / Plan / Agent modes | A robot on a foggy map: Ask reads, Plan draws the route, Agent executes it |
| 2 · Programa al robot | Anatomy of a prompt | Pick the goal, references and workflow; the result comes out as clean pixel art or as noise |
| 3 · La mochila | Context management | An 8-slot desk: the oldest items are forgotten, noise degrades the result, `/clear` has a cost |
| 4 · Torres de defensa | Rules in AGENTS.md | Waves of bad practices; 4 rules per wave, and vague ones stop nothing |
| 5 · La palanca de railes | The tool spectrum | A conveyor belt with 3 rails (editor, IDE, CLI): the lever decides which tool gets each task |
| 6 · El equipo de agentes | Subagents | Split a mission between the main agent and two subagents without overloading anyone's context |
| 7 · Jefe final | All six concepts | One mission, one decision per concept, three lives |

## Progression

**The facilitator opens the levels.** A new session starts with every level closed. From the facilitator panel (`/sesion/nueva`), press «ABRIR NIVEL N» when the explanation of that concept is over (there are also «CERRAR NIVEL» and «ABRIR TODOS»). Teams see the level open instantly on their home screen, with a notice and a sound, and anyone waiting on the locked-level screen is let in automatically.

A level counts as passed with 60 % of its points (180 out of 300). That drives medals, the map and the ranking, but not which levels can be played. Progress is **per session** and is stored in the browser. To try everything without opening it: `/?todos=1` (and `/?todos=0` to undo it).

## Sessions and ranking

Every workshop is a **session** with its own ranking:

1. The facilitator opens `/sesion/nueva`, types a name ("Taller ULPGC") and presses *Crear sesión*. They get a **code** (for example `K7M2Q`), a **QR** and the link to project the ranking.
2. Teams go to `/` (or scan the QR) and enter the code and their team name.
3. When a level ends, the team's best score for that level is saved in the session ranking.
4. The facilitator can **close** the session (no more scores), reopen it, **reset** the scores or **delete** the session and everything in it.

The facilitator key is stored in the browser that created the session. Two teams with the same name in a session are merged (the best score of each level is kept).

Routes: `/` · `/sesion/nueva` · `/ranking?s=CODE` · `/tv?s=CODE` · `/glosario` · `/api/sessions` · `/api/sessions/[code]` · `/api/scores?session=CODE` · `/api/stats?session=CODE`.

### Where the data lives (Upstash Redis, free plan)

Vercel functions keep no state between requests, so a store is needed. The app uses **Upstash Redis** (key-value), available for free on Vercel:

1. In the Vercel project: *Storage → Create Database → Upstash Redis* (Marketplace), and connect it to the project.
2. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` work too).
3. Redeploy. Sessions and scores expire on their own after 30 days.

Without those variables everything runs **in memory**: fine for local testing, but on Vercel the data is lost between requests.

## Deployment

Import the repository into Vercel as it is (Next.js is detected, no Root Directory needed).

## Architecture

Hexagonal architecture: the game rules know nothing about React, Next.js, the browser or Redis. Dependencies always point inwards (`ui` / `infrastructure` → `application` → `domain`) and a test enforces it.

```
app/                      Next.js delivery layer: pages and API routes a few lines long
src/
  domain/                 Pure rules, no dependencies
    games/                Level catalog, progress, medals, lessons and glossary
    levels/level-1..7/    Data and rules of each level (scoring, mistakes, medals)
    session/              Session, score submission, ranking and stats
    shared/               Seeds and randomness
  application/
    server/               Server use cases + ports (SessionRepository, ScoreRepository, RandomSource)
    client/               Browser services + ports (KeyValueStore, SessionGateway)
  infrastructure/
    server/               Adapters: Upstash Redis, in-memory, Node randomness
    client/               Adapters: localStorage and the HTTP API
  composition/            The only place where adapters are chosen (server and client)
  ui/                     React: screens, levels, components, hooks, pixel art and sound
tests/                    Tests for the domain, the use cases (with fake ports) and the architecture
```

- **Changing the store** (another database, for instance): implement `SessionRepository` and `ScoreRepository` in `src/infrastructure/server` and select them in `src/composition/server.ts`.
- **The interface** never touches `localStorage` or `fetch`: it asks for what it needs through `useServices()`.
- The code is in English. The interface texts stay in Spanish, and so does everything that is already public or stored: URLs (`/juegos/nivel-1`, `/glosario`…), level and medal ids, and the `localStorage` and Redis keys.

```bash
pnpm test        # tests with Node's built-in runner (no extra dependencies; needs Node 22.6+)
pnpm typecheck   # tsc --noEmit
```

## Adding a level

1. Register it in `src/domain/games/catalog.ts` (id, title, `maxScore`) and add its lesson and glossary cards in `lessons.ts` and `glossary.ts`.
2. Write its rules in `src/domain/levels/level-N/` (data, scoring, mistakes), with tests in `tests/domain`.
3. Build the screen in `src/ui/levels/level-N/` (see `level-1`) using `LevelIntro` and `LevelResult`.
4. Expose it in `app/juegos/<id>/page.tsx` with a one-line re-export.

## Workshop-day extras

- **Projector screen** (`/tv?s=CODE`, button in the facilitator panel): podium, live ranking with climbs and drops, QR to join and the most common mistake in the room.
- **Mistake statistics**: the facilitator panel shows, per level, which mistakes most teams make, to discuss them right after playing. They are stored in Redis with the session.
- **Chiptune sound** generated with WebAudio (♪ button to mute), screen shake, confetti, score counter and **medals** (perfect score, first try, frugal, clean desk).
- **Robot avatar** per team, visible in the rankings.
- **Offline**: if the connection drops, the score is kept and re-sent on its own when it comes back.
- **Per-team variations**: level 1 uses one of 6 map variants, levels 2, 3 and 6 change the order of their rounds and the final boss picks one of two missions, all depending on team and session, so neighbours cannot copy each other.
- **Glossary** (`/glosario`): concept cards that unlock as each level is passed.

## Working on this repo with Claude Code

`CLAUDE.md` and `.claude/` hold the project conventions, agents and skills. Start with `/design-feature <idea>` to split a feature into user stories, and `/next-iteration` to build the next one.

## Credits

<p>
  <a href="https://sirviendocodigo.com/"><img src="public/logos/sirviendo-codigo.svg" alt="Sirviendo Código" height="40"></a>
  &nbsp;&nbsp;
  <a href="https://leanmind.es/es"><img src="public/logos/leanmind.webp" alt="LeanMind" height="40"></a>
</p>

- [Sirviendo Código](https://sirviendocodigo.com/) — the mascot that inspired the robots.
- [LeanMind](https://leanmind.es/es) — the workshop this game was made for.
- Made by [ascinfo.dev](https://ascinfo.dev/).
