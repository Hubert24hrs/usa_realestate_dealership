/**
 * Tiny SVG toolkit for CITI VIEW's original, procedurally generated
 * illustrations (fallback listing imagery, floor plans and topo maps).
 * Everything is deterministic for a given seed.
 */
import { Rng } from "@/lib/random";

export const W = 1600;
export const H = 1067;

export type Mood = "day" | "golden" | "dusk";

export interface Ctx {
  rng: Rng;
  defs: string[];
  uid: number;
}

export function makeCtx(seed: string): Ctx {
  return { rng: new Rng(seed), defs: [], uid: 0 };
}

export function uid(ctx: Ctx, prefix: string): string {
  ctx.uid += 1;
  return `${prefix}${ctx.uid}`;
}

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function wrapSvg(ctx: Ctx, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><defs>${ctx.defs.join("")}</defs>${body}</svg>`;
}

export function n(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function hsl(h: number, s: number, l: number, a = 1): string {
  const hh = ((h % 360) + 360) % 360;
  return a >= 1
    ? `hsl(${hh.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%)`
    : `hsla(${hh.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%,${a})`;
}

/** Linear gradient; returns `url(#id)`. */
export function linear(ctx: Ctx, stops: Array<[number, string]>, dir: "v" | "h" | "d" = "v"): string {
  const id = uid(ctx, "lg");
  const [x2, y2] = dir === "v" ? [0, 1] : dir === "h" ? [1, 0] : [1, 1];
  ctx.defs.push(
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
      .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
      .join("")}</linearGradient>`,
  );
  return `url(#${id})`;
}

export function radial(ctx: Ctx, stops: Array<[number, string, number?]>, cx = 0.5, cy = 0.5, r = 0.5): string {
  const id = uid(ctx, "rg");
  ctx.defs.push(
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
      .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`)
      .join("")}</radialGradient>`,
  );
  return `url(#${id})`;
}

export function clip(ctx: Ctx, shape: string): string {
  const id = uid(ctx, "cp");
  ctx.defs.push(`<clipPath id="${id}">${shape}</clipPath>`);
  return `url(#${id})`;
}

export function rect(x: number, y: number, w: number, h: number, fill: string, extra = ""): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(0, w))}" height="${n(Math.max(0, h))}" fill="${fill}" ${extra}/>`;
}

export function poly(points: Array<[number, number]>, fill: string, extra = ""): string {
  return `<polygon points="${points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="${fill}" ${extra}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 2, extra = ""): string {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
}

export function pickMood(rng: Rng): Mood {
  return rng.pick<Mood>(["day", "day", "day", "golden", "dusk"]);
}

const SKY: Record<Mood, [string, string]> = {
  day: ["#86bfe9", "#e4f2fb"],
  golden: ["#efae74", "#fde7cc"],
  dusk: ["#2c356c", "#e79b78"],
};

export function sky(ctx: Ctx, mood: Mood, height = H): string {
  const r = ctx.rng;
  const [top, bottom] = SKY[mood];
  let s = rect(0, 0, W, height, linear(ctx, [[0, top], [1, bottom]]));
  const sx = r.int(140, 1460);
  const sy = mood === "day" ? r.int(70, 200) : r.int(height * 0.45, height * 0.7);
  const sunFill = radial(ctx, [[0, mood === "dusk" ? "#ffd6a8" : "#fffbe8", 1], [1, mood === "dusk" ? "#ffd6a8" : "#fffbe8", 0]]);
  s += `<circle cx="${sx}" cy="${sy}" r="${r.int(140, 220)}" fill="${sunFill}" opacity="0.55"/>`;
  s += `<circle cx="${sx}" cy="${sy}" r="${r.int(38, 60)}" fill="${mood === "dusk" ? "#ffd3a0" : "#fff8dc"}" opacity="0.95"/>`;
  const clouds = r.int(2, 5);
  for (let i = 0; i < clouds; i++) {
    const cx = r.int(0, W);
    const cy = r.int(60, Math.max(120, height * 0.4));
    const k = r.float(0.6, 1.4);
    s += `<g fill="#ffffff" opacity="${mood === "dusk" ? 0.22 : 0.78}"><ellipse cx="${cx}" cy="${cy}" rx="${n(110 * k)}" ry="${n(26 * k)}"/><ellipse cx="${n(cx - 50 * k)}" cy="${n(cy - 14 * k)}" rx="${n(56 * k)}" ry="${n(30 * k)}"/><ellipse cx="${n(cx + 36 * k)}" cy="${n(cy - 22 * k)}" rx="${n(64 * k)}" ry="${n(36 * k)}"/></g>`;
  }
  return s;
}

/** Smooth rolling ridge from left to right, filled to the bottom. */
export function ridge(ctx: Ctx, baseY: number, amp: number, fill: string, segments = 6): string {
  const r = ctx.rng;
  const step = W / segments;
  let prevY = baseY + r.float(-amp, amp);
  let d = `M0 ${n(prevY)}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * step;
    const y = baseY + r.float(-amp, amp);
    const cy = (prevY + y) / 2 + r.float(-amp, amp) * 0.7;
    d += ` Q${n(x - step / 2)} ${n(cy)} ${n(x)} ${n(y)}`;
    prevY = y;
  }
  return `<path d="${d} L${W} ${H} L0 ${H} Z" fill="${fill}"/>`;
}

export function mountains(ctx: Ctx, baseY: number, color: string, snow: boolean): string {
  const r = ctx.rng;
  let s = "";
  let x = -100;
  while (x < W + 100) {
    const w = r.int(320, 560);
    const h = r.int(160, 300);
    const peak: [number, number] = [x + w / 2 + r.int(-40, 40), baseY - h];
    s += poly([[x, baseY], peak, [x + w, baseY]], color);
    if (snow) {
      const t = 0.26;
      s += poly(
        [
          [peak[0] - (w / 2) * t, peak[1] + h * t],
          peak,
          [peak[0] + (w / 2) * t, peak[1] + h * t],
          [peak[0] + 10, peak[1] + h * t * 0.7],
          [peak[0] - 14, peak[1] + h * t * 0.85],
        ],
        "#f4f7fb",
        'opacity="0.92"',
      );
    }
    x += w * r.float(0.55, 0.8);
  }
  return s;
}

export function roundTree(x: number, groundY: number, k: number, leaf: string, trunk = "#6b4f3a"): string {
  return `<g><rect x="${n(x - 7 * k)}" y="${n(groundY - 70 * k)}" width="${n(14 * k)}" height="${n(70 * k)}" fill="${trunk}"/><circle cx="${n(x)}" cy="${n(groundY - 105 * k)}" r="${n(52 * k)}" fill="${leaf}"/><circle cx="${n(x - 36 * k)}" cy="${n(groundY - 80 * k)}" r="${n(36 * k)}" fill="${leaf}"/><circle cx="${n(x + 34 * k)}" cy="${n(groundY - 84 * k)}" r="${n(39 * k)}" fill="${leaf}" opacity="0.9"/></g>`;
}

export function pineTree(x: number, groundY: number, k: number, leaf: string): string {
  return `<g><rect x="${n(x - 5 * k)}" y="${n(groundY - 34 * k)}" width="${n(10 * k)}" height="${n(34 * k)}" fill="#5b4332"/><polygon points="${n(x)},${n(groundY - 180 * k)} ${n(x - 48 * k)},${n(groundY - 30 * k)} ${n(x + 48 * k)},${n(groundY - 30 * k)}" fill="${leaf}"/><polygon points="${n(x)},${n(groundY - 215 * k)} ${n(x - 34 * k)},${n(groundY - 110 * k)} ${n(x + 34 * k)},${n(groundY - 110 * k)}" fill="${leaf}" opacity="0.92"/></g>`;
}

export function shrub(x: number, y: number, k: number, fill: string): string {
  return `<g fill="${fill}"><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(44 * k)}" ry="${n(26 * k)}"/><ellipse cx="${n(x - 26 * k)}" cy="${n(y + 4 * k)}" rx="${n(28 * k)}" ry="${n(20 * k)}"/><ellipse cx="${n(x + 28 * k)}" cy="${n(y + 4 * k)}" rx="${n(30 * k)}" ry="${n(21 * k)}"/></g>`;
}

export const LEAF = ["#5f8f4e", "#4f7d47", "#6e9b58", "#3f6e45", "#7aa363"];
