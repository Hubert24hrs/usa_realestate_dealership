import { H, LEAF, W, clip, line, linear, n, pickMood, poly, radial, rect, roundTree, sky, type Ctx } from "./core";

const WALLS = ["#f4efe8", "#eef1f4", "#ece6dd", "#e9ede6", "#f2ebe4", "#e7e9ef", "#3b4350", "#e9e1d6"];
const WOODS = ["#b98a5e", "#c9a27a", "#a77650", "#d2b48c", "#8f6a4a", "#c7ad8e"];
const ACCENTS = ["#2f5d62", "#b5543c", "#3f4f8a", "#c98d4a", "#6b8f71", "#8e5572", "#4a6b8a"];

interface Room {
  L: number;
  R: number;
  T: number;
  B: number;
  wall: string;
  accent: string;
}

function shade(hex: string, amount: number): string {
  const v = parseInt(hex.slice(1), 16);
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)));
  const r = clamp(((v >> 16) & 255) * (1 + amount));
  const g = clamp(((v >> 8) & 255) * (1 + amount));
  const b = clamp((v & 255) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** One-point-perspective room shell with floor treatment and a back-wall window. */
function shell(ctx: Ctx, opts: { floor: "wood" | "tile" | "concrete" | "carpet"; tall?: boolean; windowW?: number }): { s: string; room: Room } {
  const r = ctx.rng;
  const room: Room = {
    L: 300,
    R: 1300,
    T: opts.tall ? 90 : 170,
    B: 740,
    wall: r.pick(WALLS),
    accent: r.pick(ACCENTS),
  };
  const { L, R, T, B, wall } = room;
  const dark = wall === "#3b4350";
  let s = "";
  s += poly([[0, 0], [W, 0], [R, T], [L, T]], shade(wall, dark ? 0.15 : 0.04));
  s += poly([[0, 0], [L, T], [L, B], [0, H]], shade(wall, -0.08));
  s += poly([[W, 0], [R, T], [R, B], [W, H]], shade(wall, -0.04));
  s += rect(L, T, R - L, B - T, wall);

  const floorShape = poly([[0, H], [L, B], [R, B], [W, H]], "#000");
  const floorClip = clip(ctx, floorShape);
  const vpX = 800;
  const vpY = (T + B) / 2;
  let floor = "";
  if (opts.floor === "wood" || opts.floor === "tile" || opts.floor === "concrete") {
    const base = opts.floor === "wood" ? r.pick(WOODS) : opts.floor === "tile" ? r.pick(["#d9d6cf", "#e6e2da", "#cfd3d6"]) : "#b7b9b8";
    floor += rect(0, B, W, H - B, linear(ctx, [[0, shade(base, -0.06)], [1, shade(base, 0.08)]]));
    if (opts.floor !== "concrete") {
      const stepCount = opts.floor === "wood" ? 26 : 14;
      for (let i = -stepCount; i <= stepCount * 2; i++) {
        const xb = -800 + i * (3200 / (stepCount * 2));
        const xt = vpX + ((xb - vpX) * (B - vpY)) / (H - vpY);
        floor += line(xt, B, xb, H, "#000", 2, 'opacity="0.1"');
      }
      for (let k = 1; k < (opts.floor === "wood" ? 9 : 7); k++) {
        const t = k / 9;
        const y = B + (H - B) * t * t;
        floor += line(0, y, W, y, "#000", opts.floor === "wood" ? 1 : 2, `opacity="${opts.floor === "wood" ? 0.05 : 0.1}"`);
      }
    } else {
      floor += rect(0, B, W, H - B, radial(ctx, [[0, "#ffffff", 0.25], [1, "#ffffff", 0]], 0.5, 0.2, 0.7));
    }
  } else {
    floor += rect(0, B, W, H - B, r.pick(["#cbbfb0", "#bfc4c9", "#d6cbbd"]));
  }
  s += `<g clip-path="${floorClip}">${floor}</g>`;
  s += line(L, B, R, B, shade(wall, -0.25), 4);
  s += line(L, T, L, B, shade(wall, -0.2), 2);
  s += line(R, T, R, B, shade(wall, -0.2), 2);
  return { s, room };
}

function backWindow(ctx: Ctx, x: number, y: number, w: number, h: number, curtains = false): string {
  const r = ctx.rng;
  const mood = pickMood(r);
  const outside = clip(ctx, rect(x, y, w, h, "#000"));
  let view = sky(ctx, mood, H);
  view += `<g>${roundTree(x + w * 0.2, y + h + 40, 1.4, r.pick(LEAF))}${roundTree(x + w * 0.75, y + h + 60, 1.7, r.pick(LEAF))}</g>`;
  let s = `<g clip-path="${outside}"><g transform="translate(${n(x - 200)} ${n(y - 100)}) scale(0.5)">${view}</g></g>`;
  s += rect(x, y, w, h, "#ffffff", 'opacity="0.08"');
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ffffff" stroke-width="16"/>`;
  const panes = Math.max(2, Math.round(w / 180));
  for (let i = 1; i < panes; i++) s += line(x + (w / panes) * i, y, x + (w / panes) * i, y + h, "#ffffff", 8);
  s += line(x, y + h * 0.62, x + w, y + h * 0.62, "#ffffff", 6);
  s += rect(x - 20, y + h, w + 40, 14, "#ffffff");
  if (curtains) {
    const c = r.pick(["#d8cfc2", "#b8c4cc", "#e5d6cc", "#9fa98f"]);
    s += rect(x - 90, y - 30, 90, h + 70, c, 'opacity="0.95"');
    s += rect(x + w, y - 30, 90, h + 70, c, 'opacity="0.95"');
    s += rect(x - 110, y - 40, w + 220, 10, "#6b5a47");
  }
  s += rect(x - 40, y - 20, w + 80, h + 600, radial(ctx, [[0, "#ffffff", 0.22], [1, "#ffffff", 0]], 0.5, 0.2, 0.6));
  return s;
}

function art(ctx: Ctx, x: number, y: number, w: number, h: number): string {
  const r = ctx.rng;
  let s = rect(x - 10, y - 10, w + 20, h + 20, r.pick(["#2b2b2b", "#c9a46b", "#f5f1ea"]));
  s += rect(x, y, w, h, r.pick(["#f4efe6", "#e3ecef", "#f1e3d6"]));
  for (let i = 0; i < 3; i++) {
    s += `<circle cx="${n(x + r.float(0.2, 0.8) * w)}" cy="${n(y + r.float(0.2, 0.8) * h)}" r="${n(r.float(0.12, 0.3) * Math.min(w, h))}" fill="${r.pick(ACCENTS)}" opacity="0.75"/>`;
  }
  return s;
}

function plant(x: number, y: number, k = 1): string {
  return `<g>${rect(x - 30 * k, y - 70 * k, 60 * k, 70 * k, "#d8cbb8", `rx="${8 * k}"`)}<ellipse cx="${x}" cy="${y - 130 * k}" rx="${36 * k}" ry="${70 * k}" fill="#4f7d47"/><ellipse cx="${x - 40 * k}" cy="${y - 110 * k}" rx="${28 * k}" ry="${54 * k}" fill="#5f8f4e" transform="rotate(-25 ${x - 40 * k} ${y - 110 * k})"/><ellipse cx="${x + 40 * k}" cy="${y - 112 * k}" rx="${28 * k}" ry="${54 * k}" fill="#6e9b58" transform="rotate(25 ${x + 40 * k} ${y - 112 * k})"/></g>`;
}

function pendant(x: number, topY: number, len: number, color: string, glow: string): string {
  return `${line(x, topY, x, topY + len, "#333", 3)}<path d="M${x - 46} ${topY + len + 46} Q ${x} ${topY + len - 20} ${x + 46} ${topY + len + 46} Z" fill="${color}"/><circle cx="${x}" cy="${topY + len + 70}" r="90" fill="${glow}"/>`;
}

export function livingRoom(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["wood", "wood", "carpet", "tile"]) });
  let s = base;
  s += backWindow(ctx, room.L + 60, room.T + 70, 300, 330, r.chance(0.5));
  s += art(ctx, 760, 260, 300, 200);
  if (r.chance(0.5)) s += rect(room.R - 230, room.T + 60, 170, 520, shade(room.wall, -0.1));
  const rugColor = r.pick(["#c9b79c", "#9fb4c7", "#d4a59a", "#b7c4a8", "#8e8aa8"]);
  s += poly([[360, 1000], [520, 790], [1180, 790], [1340, 1000]], rugColor, 'opacity="0.85"');
  const sofa = r.pick(["#5b6b7d", "#a7988a", "#3f5a4a", "#8a5a44", "#d7cfc4", "#41465a"]);
  s += rect(560, 520, 620, 110, shade(sofa, -0.1), 'rx="26"');
  s += rect(540, 600, 660, 140, sofa, 'rx="24"');
  s += rect(500, 560, 80, 190, shade(sofa, -0.12), 'rx="24"');
  s += rect(1160, 560, 80, 190, shade(sofa, -0.12), 'rx="24"');
  s += line(760, 610, 760, 740, shade(sofa, -0.2), 3);
  s += line(980, 610, 980, 740, shade(sofa, -0.2), 3);
  for (let i = 0; i < 3; i++) s += rect(600 + i * 180, 540, 120, 90, r.pick(["#efe6d8", "#c98d4a", "#2f5d62", "#e3d5ca"]), 'rx="18"');
  s += rect(640, 820, 460, 26, r.pick(WOODS), 'rx="8"');
  s += rect(660, 846, 14, 70, "#4a3a2c");
  s += rect(1066, 846, 14, 70, "#4a3a2c");
  s += line(1330, 360, 1330, 760, "#2b2b2b", 6);
  s += poly([[1280, 360], [1380, 360], [1360, 290], [1300, 290]], "#efe6d8");
  s += plant(420, 760, 1.1);
  return s;
}

export function kitchen(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["wood", "tile", "tile"]) });
  let s = base;
  const cab = r.pick(["#f4f2ee", "#2f3e46", "#5b6f62", "#d9d3c7", "#3c4a6b", "#ffffff"]);
  const counter = r.pick(["#efeeea", "#d6d3cf", "#2b2b2b", "#e8e1d6"]);
  for (let x = room.L; x < room.R; x += 40) s += line(x, 420, x, 548, "#000", 1, 'opacity="0.06"');
  for (let y = 420; y < 548; y += 32) s += line(room.L, y, room.R, y, "#000", 1, 'opacity="0.06"');
  s += rect(room.L, 560, room.R - room.L, 180, cab);
  for (let x = room.L; x < room.R; x += 125) {
    s += rect(x + 8, 576, 109, 150, shade(cab, -0.04), 'rx="4"');
    s += rect(x + 50, 600, 26, 6, "#9c8a6a", 'rx="3"');
  }
  s += rect(room.L - 6, 546, room.R - room.L + 12, 18, counter);
  s += rect(room.L, 200, 380, 200, cab);
  s += rect(room.R - 380, 200, 380, 200, cab);
  for (let x = room.L; x < room.L + 380; x += 95) s += rect(x + 6, 210, 83, 180, shade(cab, -0.05), 'rx="4"');
  for (let x = room.R - 380; x < room.R; x += 95) s += rect(x + 6, 210, 83, 180, shade(cab, -0.05), 'rx="4"');
  s += backWindow(ctx, 720, 215, 160, 190);
  s += poly([[1000, 548], [1000, 520], [1120, 520], [1120, 548]], "#9aa0a6");
  s += rect(room.R - 120, 300, 120, 440, "#c7cbd0");
  s += line(room.R - 110, 520, room.R - 110, 600, "#8a8f95", 6);
  const isl = r.pick(["#2f3e46", "#7a5c3e", "#5b6f62", "#f1eee8", "#3c4a6b"]);
  s += poly([[470, 790], [1130, 790], [1180, 820], [420, 820]], counter);
  s += rect(440, 820, 720, 150, isl);
  for (let i = 0; i < 3; i++) {
    const x = 560 + i * 240;
    s += `<ellipse cx="${x}" cy="${985}" rx="58" ry="16" fill="${r.pick(["#2b2b2b", "#c9a27a", "#efe6d8"])}"/>`;
    s += line(x - 40, 990, x - 50, H, "#2b2b2b", 6);
    s += line(x + 40, 990, x + 50, H, "#2b2b2b", 6);
  }
  const glow = radial(ctx, [[0, "#ffe3a8", 0.35], [1, "#ffe3a8", 0]]);
  const shadeColor = r.pick(["#2b2b2b", "#c9a46b", "#f5f1ea", "#3f4f8a"]);
  for (let i = 0; i < 3; i++) s += pendant(600 + i * 200, room.T - 170, 330, shadeColor, glow);
  return s;
}

export function diningRoom(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["wood", "wood", "tile"]) });
  let s = base;
  s += backWindow(ctx, room.L + 70, room.T + 60, 280, 360, true);
  s += art(ctx, 900, 250, 260, 180);
  s += rect(860, 560, 360, 140, r.pick(WOODS));
  const wood = r.pick(WOODS);
  const chair = r.pick(["#efe6d8", "#2b2b2b", "#8a5a44", "#5b6b7d", "#c9b79c"]);
  for (let i = 0; i < 4; i++) {
    const x = 520 + i * 160;
    s += rect(x, 640, 90, 130, chair, 'rx="14"');
  }
  s += poly([[470, 780], [1130, 780], [1190, 830], [410, 830]], wood);
  s += rect(410, 830, 780, 20, shade(wood, -0.15));
  s += rect(450, 850, 20, 150, "#4a3a2c");
  s += rect(1130, 850, 20, 150, "#4a3a2c");
  for (let i = 0; i < 3; i++) s += rect(500 + i * 220, 930, 110, 137, chair, 'rx="16"');
  s += `<ellipse cx="800" cy="790" rx="60" ry="14" fill="#ffffff" opacity="0.9"/>`;
  s += plant(800, 790, 0.45);
  const glow = radial(ctx, [[0, "#ffe3a8", 0.4], [1, "#ffe3a8", 0]]);
  s += pendant(800, room.T - 170, 290, r.pick(["#2b2b2b", "#c9a46b", "#f5f1ea"]), glow);
  return s;
}

export function bedroom(ctx: Ctx, primary: boolean): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["wood", "carpet", "wood"]) });
  let s = base;
  s += backWindow(ctx, primary ? room.L + 50 : room.R - 330, room.T + 70, primary ? 260 : 240, 300, true);
  const head = r.pick(["#c9b79c", "#5b6b7d", "#e3d5ca", "#3f5a4a", "#8e8aa8", "#d7cfc4"]);
  const bw = primary ? 560 : 440;
  const bx = 820 - bw / 2 + (primary ? 60 : -80);
  s += rect(bx, 420, bw, 220, head, 'rx="18"');
  s += art(ctx, bx + bw / 2 - 140, 250, 280, 130);
  const duvet = r.pick(["#ffffff", "#eef2f5", "#f4ece2", "#dfe7e2", "#e9e1f0"]);
  s += rect(bx - 20, 600, bw + 40, 150, duvet, 'rx="20"');
  s += poly([[bx - 20, 740], [bx + bw + 20, 740], [bx + bw + 90, 900], [bx - 90, 900]], shade(duvet, -0.04));
  s += rect(bx - 90, 900, bw + 180, 40, shade(duvet, -0.12), 'rx="10"');
  s += rect(bx + 20, 560, bw / 2 - 40, 70, "#ffffff", 'rx="20"');
  s += rect(bx + bw / 2 + 20, 560, bw / 2 - 40, 70, "#ffffff", 'rx="20"');
  s += rect(bx + 60, 690, bw - 120, 60, r.pick(ACCENTS), 'rx="14" opacity="0.85"');
  const stand = r.pick(WOODS);
  for (const x of [bx - 170, bx + bw + 40]) {
    s += rect(x, 640, 130, 110, stand, 'rx="6"');
    s += rect(x + 50, 560, 30, 80, "#d8cbb8");
    s += poly([[x + 20, 560], [x + 110, 560], [x + 90, 500], [x + 40, 500]], "#f4efe6");
  }
  if (primary && r.chance(0.6)) s += rect(1000, 940, 380, 127, r.pick(["#c9b79c", "#9fb4c7"]), 'opacity="0.7"');
  return s;
}

export function bathroom(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: "tile" });
  let s = base;
  const tile = r.pick(["#f4f6f7", "#e9eef0", "#efe9e1", "#dfe6e2"]);
  s += rect(room.L, 380, room.R - room.L, room.B - 380, tile);
  for (let x = room.L; x < room.R; x += 60) s += line(x, 380, x, room.B, "#000", 1, 'opacity="0.08"');
  for (let y = 380; y < room.B; y += 30) s += line(room.L, y, room.R, y, "#000", 1, 'opacity="0.08"');
  const vanity = r.pick(["#2f3e46", "#c9a27a", "#f1eee8", "#5b6f62", "#3c4a6b", "#8f6a4a"]);
  const vx = r.chance(0.5) ? 420 : 640;
  s += rect(vx, 600, 520, 140, vanity);
  s += rect(vx + 20, 616, 230, 108, shade(vanity, -0.06), 'rx="4"');
  s += rect(vx + 270, 616, 230, 108, shade(vanity, -0.06), 'rx="4"');
  s += rect(vx - 10, 584, 540, 20, "#f7f7f5");
  s += `<ellipse cx="${vx + 140}" cy="590" rx="70" ry="10" fill="#ffffff" stroke="#c9ced3" stroke-width="3"/><ellipse cx="${vx + 380}" cy="590" rx="70" ry="10" fill="#ffffff" stroke="#c9ced3" stroke-width="3"/>`;
  s += line(vx + 140, 584, vx + 140, 545, "#9aa0a6", 6);
  s += line(vx + 380, 584, vx + 380, 545, "#9aa0a6", 6);
  s += rect(vx + 40, 300, 440, 220, linear(ctx, [[0, "#dfe9ee"], [1, "#f7fbfc"]], "d"), 'rx="10" stroke="#c9a46b" stroke-width="10"');
  s += line(vx + 90, 330, vx + 200, 480, "#ffffff", 6, 'opacity="0.6"');
  if (vx === 420) {
    s += rect(1050, 300, 250, 440, "#cfe3ea", 'opacity="0.45" stroke="#9aa0a6" stroke-width="6"');
    s += line(1175, 260, 1175, 330, "#9aa0a6", 6);
    s += `<ellipse cx="1175" cy="335" rx="40" ry="10" fill="#9aa0a6"/>`;
  } else {
    s += `<path d="M320 900 Q 330 760 460 760 L 560 760 Q 640 760 630 900 Z" fill="#ffffff" stroke="#d5d9dc" stroke-width="4"/>`;
    s += rect(320, 750, 320, 18, "#f4f4f2", 'rx="9"');
  }
  s += plant(1220, 900, 0.6);
  s += rect(vx + 200, 840, 120, 60, r.pick(["#efe6d8", "#b8c4cc"]), 'rx="12" opacity="0.8"');
  return s;
}

export function office(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["concrete", "carpet", "wood"]), tall: true });
  let s = base;
  for (let i = 0; i < 4; i++) s += backWindow(ctx, room.L + 30 + i * 245, room.T + 50, 210, 420);
  for (let x = 380; x < 1300; x += 180) s += rect(x, 40, 120, 10, "#ffffff", 'opacity="0.9"');
  for (let row = 0; row < 3; row++) {
    const y = 700 + row * 120;
    const k = 1 + row * 0.25;
    for (let c = 0; c < 4; c++) {
      const x = 800 + (c - 1.5) * 300 * k;
      s += rect(x - 120 * k, y, 240 * k, 16 * k, r.pick(["#f1eee8", "#d6d3cf", "#c9a27a"]));
      s += rect(x - 110 * k, y + 16 * k, 8 * k, 60 * k, "#55595e");
      s += rect(x + 102 * k, y + 16 * k, 8 * k, 60 * k, "#55595e");
      s += rect(x - 60 * k, y - 70 * k, 120 * k, 66 * k, "#1f2328", `rx="${4 * k}"`);
      s += rect(x - 54 * k, y - 64 * k, 108 * k, 54 * k, "#4a6b8a", 'opacity="0.7"');
      s += `<ellipse cx="${n(x)}" cy="${n(y + 70 * k)}" rx="${n(44 * k)}" ry="${n(14 * k)}" fill="#2b2b2b"/>`;
    }
  }
  s += plant(360, 900, 1.2);
  s += plant(1250, 860, 1);
  return s;
}

export function lobby(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: "tile", tall: true });
  let s = base;
  for (let i = 0; i < 3; i++) s += backWindow(ctx, room.L + 40 + i * 320, room.T + 40, 280, 520);
  const desk = r.pick(["#2f3e46", "#c9a27a", "#f1eee8", "#3c4a6b"]);
  s += rect(560, 690, 480, 140, desk, 'rx="12"');
  s += rect(540, 670, 520, 24, shade(desk, 0.2), 'rx="10"');
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? 300 : 1120;
    s += rect(x, 860, 220, 90, r.pick(["#5b6b7d", "#a7988a", "#3f5a4a"]), 'rx="18"');
    s += rect(x, 820, 220, 50, r.pick(["#5b6b7d", "#a7988a", "#3f5a4a"]), 'rx="18" opacity="0.85"');
  }
  s += plant(470, 760, 1.3);
  s += plant(1150, 760, 1.3);
  s += rect(700, 560, 200, 40, room.accent, 'rx="6" opacity="0.9"');
  return s;
}

export function retailSpace(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: r.pick(["concrete", "wood"]) });
  let s = base;
  s += backWindow(ctx, room.L + 40, room.T + 40, 920, 470);
  for (let i = 0; i < 2; i++) {
    const x = 380 + i * 520;
    s += rect(x, 800, 340, 26, r.pick(WOODS));
    s += rect(x + 20, 826, 14, 120, "#4a3a2c");
    s += rect(x + 306, 826, 14, 120, "#4a3a2c");
    for (let k = 0; k < 5; k++) s += rect(x + 20 + k * 64, 760, 46, 40, r.pick(ACCENTS), 'rx="4"');
  }
  s += line(room.R - 260, 560, room.R - 20, 560, "#2b2b2b", 6);
  for (let k = 0; k < 6; k++) s += rect(room.R - 250 + k * 38, 565, 30, 150, r.pick(ACCENTS), 'rx="6"');
  return s;
}

export function warehouse(ctx: Ctx): string {
  const r = ctx.rng;
  const { s: base, room } = shell(ctx, { floor: "concrete", tall: true });
  let s = base;
  for (let x = 0; x < W; x += 200) s += line(x, 0, 800 + (x - 800) * 0.6, room.T, "#6b7078", 6);
  for (let k = 0; k < 4; k++) s += line(0, 20 + k * 22, W, 20 + k * 22, "#6b7078", 3, 'opacity="0.6"');
  for (let i = 0; i < 3; i++) {
    const dx = room.L + 80 + i * 310;
    s += rect(dx, 420, 220, 320, "#9aa3ad");
    for (let k = 1; k < 9; k++) s += line(dx, 420 + k * 36, dx + 220, 420 + k * 36, "#7b848e", 3);
  }
  const rackColor = r.pick(["#e07a2e", "#2f5d9b", "#d9a400"]);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = side < 0 ? 120 + k * 40 : W - 160 - k * 40;
      s += rect(x, 300 + k * 60, 16, 700 - k * 60, rackColor);
      for (let lv = 0; lv < 4; lv++) {
        const y = 380 + k * 50 + lv * 150;
        s += rect(side < 0 ? x : x - 120, y, 136, 10, rackColor);
        s += rect(side < 0 ? x + 10 : x - 110, y - 70, 110, 70, r.pick(["#c9a27a", "#b98a5e", "#d2b48c"]));
      }
    }
  }
  s += rect(700, 880, 150, 90, "#e8b829", 'rx="10"');
  s += rect(840, 790, 14, 180, "#3b3b3b");
  s += `<circle cx="730" cy="980" r="26" fill="#2b2b2b"/><circle cx="830" cy="980" r="26" fill="#2b2b2b"/>`;
  return s;
}

export function backyard(ctx: Ctx): string {
  const r = ctx.rng;
  const mood = pickMood(r);
  let s = sky(ctx, mood, 640);
  for (let i = 0; i < r.int(5, 8); i++) s += roundTree(r.int(0, W), 560, r.float(1.1, 1.6), r.pick(LEAF));
  const fence = r.pick(["#c9a27a", "#8f6a4a", "#e7e2d8", "#5b5f63"]);
  s += rect(0, 470, W, 160, fence);
  for (let x = 0; x < W; x += 34) s += line(x, 470, x, 630, "#000", 2, 'opacity="0.12"');
  s += rect(0, 620, W, H - 620, linear(ctx, [[0, "#86b46b"], [1, "#5e9149"]]));
  const hasPool = r.chance(0.4);
  if (hasPool) {
    const water = linear(ctx, [[0, "#7fd1ea"], [1, "#2d9fc7"]]);
    s += poly([[520, 700], [1250, 700], [1380, 880], [380, 880]], "#efe9df");
    s += poly([[560, 715], [1220, 715], [1330, 865], [430, 865]], water);
    for (let i = 0; i < 7; i++) s += line(r.int(520, 1200), r.int(740, 850), r.int(560, 1260), r.int(740, 850), "#ffffff", 3, 'opacity="0.5"');
  }
  const paverY = hasPool ? 880 : 760;
  s += poly([[0, H], [140, paverY], [1460, paverY], [W, H]], r.pick(["#d6cfc3", "#c7bfb2", "#b8b3ab"]));
  for (let i = 0; i < 18; i++) {
    const xb = -400 + i * 160;
    s += line(800 + (xb - 800) * 0.55, paverY, xb, H, "#000", 2, 'opacity="0.08"');
  }
  const cushion = r.pick(["#efe6d8", "#2f5d62", "#c98d4a", "#5b6b7d"]);
  s += rect(260, paverY + 20, 420, 90, "#6b5a47", 'rx="12"');
  s += rect(270, paverY - 30, 400, 70, cushion, 'rx="18"');
  s += `<ellipse cx="1050" cy="${paverY + 80}" rx="140" ry="40" fill="#7b7f84"/><ellipse cx="1050" cy="${paverY + 64}" rx="90" ry="20" fill="#f08a3c" opacity="${mood === "dusk" ? 0.95 : 0.6}"/>`;
  if (r.chance(0.7)) {
    let lights = `<path d="M0 360 Q 400 470 800 380 T 1600 380" stroke="#3b3b3b" stroke-width="3" fill="none"/>`;
    for (let x = 40; x < W; x += 80) {
      const y = 380 + Math.sin((x / W) * Math.PI * 2) * 30 + 30;
      lights += `<circle cx="${x}" cy="${n(y)}" r="9" fill="#ffe3a8" opacity="${mood === "dusk" ? 1 : 0.7}"/>`;
    }
    s += lights;
  }
  if (mood === "dusk") s += rect(0, 0, W, H, "#1b2350", 'opacity="0.18"');
  return s;
}

export function cityView(ctx: Ctx): string {
  const r = ctx.rng;
  const mood = r.pick<"day" | "golden" | "dusk">(["day", "golden", "dusk", "dusk"]);
  let outside = sky(ctx, mood, H);
  for (let layer = 0; layer < 3; layer++) {
    const baseY = 760 + layer * 60;
    for (let x = -50; x < W; x += r.int(70, 140)) {
      const h = r.int(160, 520) - layer * 60;
      const w = r.int(60, 130);
      const shadeC = mood === "dusk" ? ["#2b3160", "#232850", "#1b2040"][layer]! : ["#9fb0c2", "#8396ab", "#6d8197"][layer]!;
      outside += rect(x, baseY - h, w, h + 400, shadeC);
      for (let wy = baseY - h + 14; wy < baseY; wy += 26) {
        for (let wx = x + 8; wx < x + w - 10; wx += 18) {
          if (r.chance(mood === "dusk" ? 0.45 : 0.15)) outside += rect(wx, wy, 8, 12, mood === "dusk" ? "#ffd58a" : "#dbe7f0", 'opacity="0.85"');
        }
      }
    }
  }
  let s = outside;
  s += rect(0, 0, W, 90, "#2b2f36");
  s += rect(0, 0, 70, H, "#2b2f36");
  s += rect(W - 70, 0, 70, H, "#2b2f36");
  s += line(800, 90, 800, H, "#2b2f36", 14);
  s += rect(0, 820, W, 12, "#9aa0a6");
  for (let x = 40; x < W; x += 60) s += line(x, 832, x, H, "#9aa0a6", 5);
  s += rect(0, H - 40, W, 40, "#3b3f46");
  return s;
}

export function amenity(ctx: Ctx): string {
  const r = ctx.rng;
  if (r.chance(0.5)) {
    const mood = pickMood(r);
    let s = sky(ctx, mood, 600);
    s += rect(0, 380, W, 220, mood === "dusk" ? "#3a4270" : "#c9d6df");
    for (let x = 0; x < W; x += 80) s += rect(x + 10, 400, 50, 60, mood === "dusk" ? "#ffd58a" : "#e6eef3", 'opacity="0.8"');
    s += rect(0, 600, W, H - 600, "#efe9df");
    const water = linear(ctx, [[0, "#86d7ee"], [1, "#2496c2"]]);
    s += poly([[220, 680], [1380, 680], [1560, 920], [40, 920]], water);
    for (let i = 0; i < 4; i++) s += line(320 + i * 300, 690, 200 + i * 420, 915, "#ffffff", 4, 'opacity="0.55"');
    for (let i = 0; i < 4; i++) {
      const x = 160 + i * 360;
      s += poly([[x, 990], [x + 200, 990], [x + 230, 1040], [x - 10, 1040]], "#ffffff");
      s += rect(x + 150, 950, 70, 50, "#ffffff", 'rx="10"');
    }
    s += line(1450, 600, 1450, 940, "#6b5a47", 8);
    s += `<path d="M1300 640 Q 1450 520 1600 640 Z" fill="${r.pick(["#2f5d62", "#c98d4a", "#3f4f8a"])}"/>`;
    return s;
  }
  const { s: base, room } = shell(ctx, { floor: "concrete", tall: true });
  let s = base;
  s += rect(room.L + 20, room.T + 60, room.R - room.L - 40, 400, linear(ctx, [[0, "#dfe9ee"], [1, "#f7fbfc"]], "d"), 'opacity="0.85"');
  for (let i = 0; i < 4; i++) {
    const x = 380 + i * 240;
    s += poly([[x, 800], [x + 170, 800], [x + 190, 860], [x - 10, 860]], "#2b2b2b");
    s += line(x + 140, 800, x + 170, 640, "#55595e", 10);
    s += rect(x + 130, 610, 70, 44, "#1f2328", 'rx="6"');
  }
  for (let k = 0; k < 6; k++) s += `<circle cx="${420 + k * 150}" cy="960" r="30" fill="#2b2b2b"/><rect x="${430 + k * 150}" y="952" width="60" height="16" fill="#55595e"/>`;
  return s;
}
