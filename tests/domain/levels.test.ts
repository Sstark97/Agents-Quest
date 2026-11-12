import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COST, MAX_SCORE, VARIANTS, createMaze, key, runMedals, runMistakes, scoreRun, shortestPath } from "../../src/domain/levels/level-1/maze";
import { ROUNDS as PROMPT_ROUNDS, isPromptComplete, optionTone, promptQuality, roundScore, roundWeaknesses } from "../../src/domain/levels/level-2/prompt-rounds";
import { CAPACITY, ITEMS, ROUNDS as DESK_ROUNDS, evaluateDesk, loadItem, removeItem, runMedals as deskMedals, totalScore, usedSlots } from "../../src/domain/levels/level-3/context-desk";
import { WAVES, blockedBehaviours, enemyCounts, waveMistakes, waveReport, waveScore } from "../../src/domain/levels/level-4/rules-defense";
import { CARDS, MAX_SCORE as CARDS_MAX_SCORE, isRightTool, scoreFor } from "../../src/domain/levels/level-5/tool-cards";
import { ROUNDS as TEAM_ROUNDS, evaluate, evaluationMistakes, laneLoad, type Assignment } from "../../src/domain/levels/level-6/agent-team";
import { LIVES, MISSIONS, isMissionOver, maxScore, missionFor, rightOption } from "../../src/domain/levels/level-7/final-mission";
import { GAMES } from "../../src/domain/games/catalog";

describe("level 1 · maze", () => {
  const variants = Array.from({ length: VARIANTS }, (_, variant) => createMaze(variant));

  it("gives every variant the same difficulty: 20 safe steps, and a shorter route that breaks a file", () => {
    for (const maze of variants) {
      assert.equal(maze.par, 20);
      const direct = shortestPath(maze, maze.start, false)!;
      assert.equal(direct.length, 16);
      assert.ok(direct.some((cell) => maze.hazards.has(key(cell))));
    }
  });

  it("mirrors the second half of the variants", () => {
    assert.deepEqual(variants[3].map, variants[0].map.map((row) => [...row].reverse().join("")));
  });

  it("scores a perfect run with the maximum and subtracts damage, reads and extra steps", () => {
    const maze = variants[0];
    assert.equal(scoreRun(maze, 0, 0, maze.par), MAX_SCORE);
    assert.equal(scoreRun(maze, 1, 2, maze.par + 3), MAX_SCORE - COST.damage - 2 * COST.read - 3 * COST.extraStep);
    assert.equal(scoreRun(maze, 9, 0, maze.par), 0);
  });

  it("labels the mistakes of a run and awards the frugal medal", () => {
    const maze = variants[0];
    const [cell, file] = [...maze.hazards.entries()][0];
    assert.deepEqual(runMistakes(maze, { broken: [cell], improvised: true, steps: maze.par + 9, reads: 0 }), [
      `Rompió ${file}`, "Ejecutó sin plan (el agente improvisó)", "Ruta muy larga (muchos pasos de más)", "No investigó antes de ejecutar",
    ]);
    assert.deepEqual(runMistakes(maze, { broken: [], improvised: false, steps: maze.par, reads: 1 }), []);
    assert.deepEqual(runMedals(0, 2), ["frugal"]);
    assert.deepEqual(runMedals(0, 3), []);
    assert.deepEqual(runMedals(1, 0), []);
  });
});

describe("level 2 · prompt rounds", () => {
  const round = PROMPT_ROUNDS[0];
  const best = { goal: 2, references: 2, workflow: 2 };
  const worst = { goal: 0, references: 0, workflow: 0 };

  it("needs an option for every part of the prompt", () => {
    assert.equal(isPromptComplete({ goal: 1, references: 1 }), false);
    assert.equal(isPromptComplete(best), true);
  });

  it("weighs the goal twice as much as the other parts", () => {
    assert.equal(roundScore(round, best), 100);
    assert.equal(roundScore(round, worst), 0);
    assert.equal(promptQuality(round, { goal: 2 }), 0.5);
    assert.equal(promptQuality(round, { references: 2 }), 0.25);
  });

  it("names the weak parts of a prompt", () => {
    assert.deepEqual(roundWeaknesses(round, best), []);
    assert.deepEqual(roundWeaknesses(round, { goal: 0, references: 1, workflow: 2 }), ["Objetivo vago (sin destino claro)", "Referencias imprecisas"]);
    assert.equal(optionTone(round, { goal: 1 }, "goal"), "warn");
  });
});

describe("level 3 · context desk", () => {
  const round = DESK_ROUNDS[0];
  const desk = (...ids: string[]) => ids.map((id) => ITEMS[id]);

  it("forgets the oldest items when the desk overflows", () => {
    const full = desk("biglog", "lock", "tax");
    assert.equal(usedSlots(full), CAPACITY);
    const { desk: next, evicted } = loadItem(full, ITEMS.agents);
    assert.deepEqual(evicted.map((item) => item.id), ["biglog"]);
    assert.deepEqual(next.map((item) => item.id), ["lock", "tax", "agents"]);
    assert.deepEqual(removeItem(next, "lock").map((item) => item.id), ["tax", "agents"]);
  });

  it("rewards having what the task needs and penalises every slot of noise", () => {
    assert.equal(evaluateDesk(round, desk(...round.needed)).score, 100);
    const noisy = evaluateDesk(round, desk("agents", "tax", "biglog"));
    assert.deepEqual(noisy.missing, ["stack"]);
    assert.equal(noisy.score, Math.round(200 / 3 - 9 * 3));
  });

  it("charges every /clear and rewards finishing without one", () => {
    assert.equal(totalScore([100, 100, 100], 2), 280);
    assert.equal(totalScore([5], 3), 0);
    assert.deepEqual(deskMedals(180, 0), ["sinclear"]);
    assert.deepEqual(deskMedals(300, 1), []);
  });
});

describe("level 4 · rules defense", () => {
  it("lets only concrete rules block a behaviour", () => {
    assert.deepEqual([...blockedBehaviours(["multi", "any-v", "junk1"])], ["multi"]);
  });

  it("previews the enemies of a wave", () => {
    assert.deepEqual(enemyCounts(0), [["multi", 3], ["any", 2], ["main", 1]]);
    assert.deepEqual(enemyCounts(WAVES.length), []);
  });

  it("reports what got through and which rules were vague or idle", () => {
    const report = waveReport(0, ["multi", "secrets", "any-v"], { stopped: 3, total: 6, leaked: ["any", "any", "main"] });
    assert.deepEqual(report.leaked, ["any", "main"]);
    assert.deepEqual(report.vague, ["Escribe código TypeScript limpio."]);
    assert.deepEqual(report.idle, ["Los secretos solo en variables de entorno, nunca en el repo."]);
    assert.equal(waveScore(report), 50);
    assert.equal(waveMistakes(report).length, 3);
  });
});

describe("level 5 · tool cards", () => {
  it("is worth exactly the level's maximum score", () => {
    assert.equal(CARDS_MAX_SCORE, GAMES[4].maxScore);
    assert.equal(scoreFor(CARDS.length), CARDS_MAX_SCORE);
    assert.equal(isRightTool(CARDS[0], "editor"), true);
    assert.equal(isRightTool(CARDS[0], "cli"), false);
  });
});

describe("level 6 · agent team", () => {
  const round = TEAM_ROUNDS[0];

  it("charges the main agent a slot per subagent summary", () => {
    const assignment: Assignment = { a: "a", b: "main", c: "b", d: "b", e: "b" };
    assert.equal(laneLoad(round, assignment, "main"), 1 + 2);
    assert.equal(laneLoad(round, assignment, "a"), 4);
  });

  it("accepts a clean split", () => {
    const evaluation = evaluate(round, { a: "a", b: "main", c: "b", d: "main", e: "b" });
    assert.deepEqual(evaluation, { score: 100, issues: [] });
  });

  it("finds every kind of problem in a bad split", () => {
    const everythingInMain = evaluate(round, { a: "main", b: "main", c: "main", d: "main", e: "main" });
    assert.deepEqual(evaluationMistakes(everythingInMain), ["Saturó el contexto del agente principal"]);
    assert.equal(everythingInMain.score, 100 - 10 * (11 - 5));

    const messy = evaluate(round, { a: "main", b: "a", c: "a", d: "b", e: "b" });
    assert.deepEqual(evaluationMistakes(messy), [
      "Saturó el contexto del agente principal",
      "Delegó una decisión que había que hablar con la persona",
      "Lanzó en paralelo dos tareas que dependían una de otra",
      "Puso a dos agentes a editar el mismo fichero",
    ]);

    const trivial = evaluate(round, { a: "a", b: "main", c: "main", d: "main", e: "b" });
    assert.ok(evaluationMistakes(trivial).includes("Usó un subagente para una tarea mínima"));
  });
});

describe("level 7 · final mission", () => {
  it("offers equivalent missions with one right option per stage", () => {
    for (const mission of MISSIONS) {
      assert.equal(maxScore(mission), GAMES[6].maxScore);
      for (const stage of mission.stages) assert.equal(stage.options.filter((option) => option.ok).length, 1, stage.ask);
      assert.ok(rightOption(mission.stages[0]).ok);
    }
    assert.equal(missionFor(MISSIONS.length + 1), MISSIONS[1]);
  });

  it("ends after the last stage or when the lives run out", () => {
    const mission = MISSIONS[0];
    assert.equal(isMissionOver(mission, 0, 0), false);
    assert.equal(isMissionOver(mission, mission.stages.length - 1, 0), true);
    assert.equal(isMissionOver(mission, 1, LIVES), true);
  });
});
