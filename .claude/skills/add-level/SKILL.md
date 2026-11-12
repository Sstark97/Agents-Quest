---
name: add-level
description: Add a new level (game) to Agent Quest, or check that an existing one is wired everywhere it should be.
argument-hint: "[level number and concept]"
---

Add a level to Agent Quest: $ARGUMENTS

A level is spread over four places. Do them in this order and keep `pnpm typecheck` and `pnpm test` green after each step.

1. **Catalog** — `src/domain/games/catalog.ts`: add the entry (`id` `nivel-N`, `short`, `title`, `concept`, `href` `/juegos/nivel-N`, `maxScore`). Existing ids and hrefs never change. Add its lesson to `lessons.ts` and its cards to `glossary.ts` (Spanish text). If the level awards its own medal, add it to `medals.ts`.
2. **Rules** — `src/domain/levels/level-N/<name>.ts`: the data (rounds, cards, items…) and pure functions for scoring, the mistake labels sent to the stats (Spanish), and medals. Export a `MAX_SCORE` equal to the catalog's `maxScore`. No React, no randomness that is not passed in or seeded with `teamSeed`.
3. **Tests** — `tests/domain/levels.test.ts`: the maximum score is reachable and equals the catalog's, the worst play scores what it should, every mistake label, and any variant logic.
4. **Screen** — `src/ui/levels/level-N/LevelNScreen.tsx` (`"use client"`), modelled on `src/ui/levels/level-2/Level2Screen.tsx`:
   - `LevelIntro` before starting, `LevelResult` at the end with `game`, `team`, `points`, `max`, `onRetry`, `tags` (mistakes) and `medals`.
   - `useTeamName()`, `useAvatar()`, `useServices()`; variants seeded with `teamSeed(team, membership.current()?.code)`.
   - Sound through `sfx`, screen shake through `shake()`, sprites from `src/ui/art`.
   - Styles go in `app/globals.css`, reusing existing classes where possible.
5. **Route** — `app/juegos/nivel-N/page.tsx`: one line re-exporting the screen. The level gate and the music loop pick it up from the catalog (add a track in `src/ui/audio/sound.ts` if there are more levels than tracks, and a building in `src/ui/art/pixel-art.ts` plus a spot in `src/ui/screens/home/WorldMap.tsx` for the map).
6. **Practice** (optional) — a mini tutorial in `src/ui/practice/Practice.tsx`, keyed by game id.
7. Update the levels table in `README.md`, then run `/verify-change`.

Things that depend on the number of levels and need a look: `GAMES.length` uses in the facilitator panel and projector, `SPOTS` in `WorldMap.tsx`, `TRACKS` in `sound.ts`, `BUILDINGS` in `pixel-art.ts`.
