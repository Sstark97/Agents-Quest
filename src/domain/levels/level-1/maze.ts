export type Pos = { r: number; c: number };
export const key = (p: Pos) => `${p.r},${p.c}`;

// # wall · . floor · S start · G goal · x critical file (hidden until it is read)
// Three different rooms with the same difficulty: the ideal safe route takes 20 steps, and the
// "straight line" path (16 steps) always steps on a critical file.
const MAPS = [
  [
    "#############",
    "#S....x.....#",
    "#.#.#.#.#.#.#",
    "#...#.....x.#",
    "###.#######.#",
    "#x..x...x...#",
    "#.#.#.###.#.#",
    "#.#...#....G#",
    "#############",
  ],
  [
    "#############",
    "#S..x...#...#",
    "###.#.#.#.###",
    "#.....#.x...#",
    "#.#.###.###.#",
    "#.#x#.#.....#",
    "#.#.#.#x#.#.#",
    "#....x.....G#",
    "#############",
  ],
  [
    "#############",
    "#S..#...x...#",
    "#.#.#.#.###.#",
    "#.....#.....#",
    "#.###.#x###.#",
    "#x#..x#...#.#",
    "#.#.#.#####.#",
    "#.#....x...G#",
    "#############",
  ],
];
export const VARIANTS = MAPS.length * 2;

const FILES = [".env", "config/prod.yml", "secrets.json", "database.sql", "terraform.tfstate"];

export const MAX_PLAN = 10;
export const READ_RADIUS = 3;
export const IMPROVISE_STEPS = 4;
export const MAX_SCORE = 300;
export const COST = { damage: 100, read: 5, extraStep: 3 };
/** Extra steps over the ideal route after which the run is labelled as a long detour. */
const LONG_ROUTE_MARGIN = 8;
const FRUGAL_MAX_READS = 2;

/** One playable room: where the walls and the hidden critical files are, and the ideal number of steps. */
export type Maze = {
  map: string[];
  rows: number;
  cols: number;
  start: Pos;
  goal: Pos;
  walls: Set<string>;
  /** Cell key -> name of the critical file hidden there. */
  hazards: Map<string, string>;
  /** Length of the shortest route that avoids every critical file. */
  par: number;
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const manhattan = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
export const isWall = (maze: Maze, p: Pos) => maze.walls.has(key(p));
export const inBounds = (maze: Maze, p: Pos) => p.r >= 0 && p.c >= 0 && p.r < maze.rows && p.c < maze.cols;

/** BFS: shortest path from `from` to the goal. With `avoidHazards` it goes around the critical files. */
export function shortestPath(maze: Maze, from: Pos, avoidHazards: boolean): Pos[] | null {
  const previous = new Map<string, Pos | null>([[key(from), null]]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const current = queue.shift()!;
    if (key(current) === key(maze.goal)) {
      const path: Pos[] = [];
      for (let p: Pos | null = current; p && key(p) !== key(from); p = previous.get(key(p)) ?? null) path.unshift(p);
      return path;
    }
    for (const [dr, dc] of DIRS) {
      const next = { r: current.r + dr, c: current.c + dc };
      if (!inBounds(maze, next) || isWall(maze, next) || previous.has(key(next))) continue;
      if (avoidHazards && maze.hazards.has(key(next))) continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }
  return null;
}

/** Builds variant 0-5: room `variant % 3`, mirrored horizontally when `variant >= 3`. */
export function createMaze(variant: number): Maze {
  let map = MAPS[variant % MAPS.length];
  if (variant >= MAPS.length) map = map.map((row) => [...row].reverse().join(""));
  const maze: Maze = { map, rows: map.length, cols: map[0].length, start: { r: 0, c: 0 }, goal: { r: 0, c: 0 }, walls: new Set(), hazards: new Map(), par: 0 };
  let files = 0;
  map.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === "#") maze.walls.add(key({ r, c }));
      if (cell === "S") maze.start = { r, c };
      if (cell === "G") maze.goal = { r, c };
      if (cell === "x") maze.hazards.set(key({ r, c }), FILES[files++ % FILES.length]);
    }),
  );
  maze.par = shortestPath(maze, maze.start, true)!.length;
  return maze;
}

export function scoreRun(maze: Maze, damage: number, reads: number, steps: number) {
  const extraSteps = Math.max(0, steps - maze.par);
  const raw = MAX_SCORE - COST.damage * damage - COST.read * reads - COST.extraStep * extraSteps;
  return Math.max(0, Math.min(MAX_SCORE, raw));
}

/** Mistake labels of a finished run, for the session statistics. */
export function runMistakes(maze: Maze, run: { broken: Iterable<string>; improvised: boolean; steps: number; reads: number }): string[] {
  return [
    ...[...run.broken].map((cell) => `Rompió ${maze.hazards.get(cell)}`),
    ...(run.improvised ? ["Ejecutó sin plan (el agente improvisó)"] : []),
    ...(run.steps > maze.par + LONG_ROUTE_MARGIN ? ["Ruta muy larga (muchos pasos de más)"] : []),
    ...(run.reads === 0 ? ["No investigó antes de ejecutar"] : []),
  ];
}

/** Medals of a finished run: "frugal" for breaking nothing while reading very little. */
export const runMedals = (damage: number, reads: number): string[] => (damage === 0 && reads <= FRUGAL_MAX_READS ? ["frugal"] : []);
