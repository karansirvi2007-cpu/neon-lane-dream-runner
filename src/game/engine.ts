// Pure game rules: no React, no three.js.
export const LANE_W = 2.2;
export const C = {
  START_SPEED: 14, MAX_SPEED: 40, ACCEL: 0.32, GRAVITY: -40, JUMP_V: 13.5,
  FAST_FALL: -26, SLIDE_T: 0.75, LANE_LERP: 14, SPAWN_AHEAD: -130, DESPAWN: 8,
  OB_POOL: 28, COIN_POOL: 48, COIN_SCORE: 10,
};
export type ObType = "low" | "high" | "block";
export interface Ob { active: boolean; lane: number; z: number; type: ObType }
export interface Coin { active: boolean; lane: number; z: number; y: number }
export interface Game {
  lane: number; x: number; y: number; vy: number; slideT: number;
  speed: number; distance: number; coins: number; score: number; dead: boolean;
  obs: Ob[]; coinPool: Coin[]; cursor: number; bursts: [number, number, number][];
}

export function createGame(): Game {
  const g = {} as Game;
  resetGame(g);
  return g;
}

export function resetGame(g: Game) {
  Object.assign(g, {
    lane: 0, x: 0, y: 0, vy: 0, slideT: 0, speed: C.START_SPEED, distance: 0,
    coins: 0, score: 0, dead: false, cursor: -45, bursts: [],
    obs: Array.from({ length: C.OB_POOL }, () => ({ active: false, lane: 0, z: 0, type: "low" as ObType })),
    coinPool: Array.from({ length: C.COIN_POOL }, () => ({ active: false, lane: 0, z: 0, y: 0.8 })),
  });
}

export const grounded = (g: Game) => g.y <= 0.001;

export function move(g: Game, dir: -1 | 1) { g.lane = Math.max(-1, Math.min(1, g.lane + dir)); }
export function jump(g: Game) {
  if (!grounded(g)) return false;
  g.vy = C.JUMP_V; g.slideT = 0; return true;
}
export function slide(g: Game) {
  g.slideT = C.SLIDE_T;
  if (!grounded(g)) g.vy = C.FAST_FALL;
  return true;
}

function spawnRow(g: Game, z: number) {
  const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const count = g.distance > 250 && Math.random() < 0.45 ? 2 : 1;
  const types: ObType[] = ["low", "high", "block"];
  for (let i = 0; i < count; i++) {
    const o = g.obs.find((o) => !o.active);
    if (!o) break;
    Object.assign(o, { active: true, lane: lanes[i], z, type: types[Math.floor(Math.random() * 3)] });
  }
  const free = lanes[count];
  for (let i = 0; i < 5; i++) {
    const c = g.coinPool.find((c) => !c.active);
    if (!c) break;
    Object.assign(c, { active: true, lane: free, z: z - 1 - i * 2.2, y: 0.9 });
  }
}

export interface StepEvents { coins: number; crashed: boolean }

export function step(g: Game, dt: number): StepEvents {
  const ev = { coins: 0, crashed: false };
  if (g.dead) return ev;
  g.speed = Math.min(C.MAX_SPEED, g.speed + C.ACCEL * dt);
  const dz = g.speed * dt;
  g.distance += dz;

  // player
  const tx = g.lane * LANE_W;
  g.x += (tx - g.x) * (1 - Math.exp(-C.LANE_LERP * dt));
  g.vy += C.GRAVITY * dt;
  g.y = Math.max(0, g.y + g.vy * dt);
  if (g.y === 0 && g.vy < 0) g.vy = 0;
  g.slideT = Math.max(0, g.slideT - dt);
  const sliding = g.slideT > 0;

  // world
  for (const o of g.obs) if (o.active) { o.z += dz; if (o.z > C.DESPAWN) o.active = false; }
  for (const c of g.coinPool) if (c.active) { c.z += dz; if (c.z > C.DESPAWN) c.active = false; }
  g.cursor += dz;
  while (g.cursor > C.SPAWN_AHEAD) {
    spawnRow(g, g.cursor);
    g.cursor -= 15 + Math.random() * 8 + g.speed * 0.25;
  }

  // collisions
  for (const o of g.obs) {
    if (!o.active || Math.abs(o.z) > 0.7 || Math.abs(g.x - o.lane * LANE_W) > 1.0) continue;
    const hit = o.type === "block" || (o.type === "low" && g.y < 1.0) || (o.type === "high" && !sliding);
    if (hit) { g.dead = true; ev.crashed = true; return ev; }
  }
  for (const c of g.coinPool) {
    if (!c.active || Math.abs(c.z) > 0.9 || Math.abs(g.x - c.lane * LANE_W) > 1.0) continue;
    if (Math.abs(g.y + 0.8 - c.y) < 1.5) {
      c.active = false; g.coins++; ev.coins++;
      g.bursts.push([c.lane * LANE_W, c.y, c.z]);
    }
  }
  g.score = Math.floor(g.distance) + g.coins * C.COIN_SCORE;
  return ev;
}

export const runtime = { game: createGame() };
