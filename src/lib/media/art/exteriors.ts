import {
  H,
  LEAF,
  W,
  clip,
  line,
  linear,
  mountains,
  n,
  pickMood,
  pineTree,
  poly,
  radial,
  rect,
  ridge,
  roundTree,
  shrub,
  sky,
  type Ctx,
  type Mood,
} from "./core";

const HOUSE_PALETTES = [
  { wall: "#f3eee5", trim: "#ffffff", roof: "#3f4652", door: "#2f5d62" },
  { wall: "#dde6ec", trim: "#ffffff", roof: "#2d3440", door: "#9a3b2e" },
  { wall: "#b65a40", trim: "#f3ece4", roof: "#3a3a3a", door: "#24323f" },
  { wall: "#e7dbc4", trim: "#fffaf2", roof: "#5a4638", door: "#3b5b44" },
  { wall: "#2f3b45", trim: "#ece6dc", roof: "#1d242b", door: "#c98d4a" },
  { wall: "#f6f6f2", trim: "#20252b", roof: "#20252b", door: "#c9955e" },
  { wall: "#c8d5c1", trim: "#fdfcf8", roof: "#4b4f45", door: "#7a4f3a" },
  { wall: "#e9e2f0", trim: "#ffffff", roof: "#3c3650", door: "#4a6b8a" },
];

function glass(mood: Mood): string {
  return mood === "dusk" ? "#ffd58a" : mood === "golden" ? "#f6e2c4" : "#b9d6e8";
}

function windowUnit(x: number, y: number, w: number, h: number, trim: string, pane: string, shutters?: string): string {
  let s = rect(x - 7, y - 7, w + 14, h + 14, trim, 'rx="2"');
  s += rect(x, y, w, h, pane);
  s += rect(x, y, w, h * 0.45, "#ffffff", 'opacity="0.18"');
  s += line(x + w / 2, y, x + w / 2, y + h, trim, 4);
  s += line(x, y + h / 2, x + w, y + h / 2, trim, 4);
  s += rect(x - 12, y + h + 6, w + 24, 8, trim);
  if (shutters) {
    s += rect(x - 34, y - 6, 20, h + 12, shutters);
    s += rect(x + w + 14, y - 6, 20, h + 12, shutters);
  }
  return s;
}

export function houseExterior(ctx: Ctx): string {
  const r = ctx.rng;
  const mood = pickMood(r);
  const p = r.pick(HOUSE_PALETTES);
  const groundY = 800;
  let s = sky(ctx, mood, groundY + 60);
  s += ridge(ctx, groundY - 150, 30, mood === "dusk" ? "#4c5a6e" : "#a7c0b4");
  for (let i = 0; i < r.int(4, 7); i++) {
    s += roundTree(r.int(0, W), groundY - 40, r.float(0.8, 1.3), mood === "dusk" ? "#33493f" : r.pick(LEAF));
  }
  s += rect(0, groundY, W, H - groundY, linear(ctx, [[0, mood === "dusk" ? "#4d6b45" : "#86b46b"], [1, mood === "dusk" ? "#2f4a2e" : "#5e9149"]]));

  const stories = r.pick([1, 2, 2]);
  const storyH = r.int(185, 210);
  const bodyW = r.int(600, 820);
  const bodyH = stories * storyH;
  const hasGarage = r.chance(0.62);
  const garageW = hasGarage ? r.int(250, 300) : 0;
  const totalW = bodyW + garageW;
  const x0 = Math.round(W / 2 - totalW / 2 + r.int(-50, 50));
  const y0 = groundY - bodyH;
  const gx = x0 + bodyW;
  const shutters = r.chance(0.35) ? r.pick(["#2f4858", "#5b3a29", "#1f2a24", "#6d2e2e"]) : undefined;

  if (hasGarage) s += poly([[gx + 24, groundY], [gx + garageW - 24, groundY], [gx + garageW + 140, H], [gx - 90, H]], "#d4cfc6");
  const doorSlot = Math.floor(bodyW / 2);
  s += poly([[x0 + doorSlot - 30, groundY], [x0 + doorSlot + 30, groundY], [x0 + doorSlot + 70, H], [x0 + doorSlot - 70, H]], "#e2ddd3");

  // garage wing
  if (hasGarage) {
    const gh = 180;
    s += rect(gx, groundY - gh, garageW, gh, p.wall);
    s += poly([[gx - 10, groundY - gh], [gx + garageW / 2, groundY - gh - 80], [gx + garageW + 24, groundY - gh]], p.roof);
    s += rect(gx + 30, groundY - 140, garageW - 60, 140, p.trim);
    for (let i = 1; i < 5; i++) s += line(gx + 30, groundY - 140 + i * 28, gx + garageW - 30, groundY - 140 + i * 28, "#c9c4bb", 3);
  }

  // body + siding texture
  s += rect(x0, y0, bodyW, bodyH, p.wall);
  const sidingClip = clip(ctx, rect(x0, y0, bodyW, bodyH, "#000"));
  let siding = "";
  for (let y = y0 + 14; y < groundY; y += 16) siding += line(x0, y, x0 + bodyW, y, "#000", 1);
  s += `<g clip-path="${sidingClip}" opacity="0.06">${siding}</g>`;

  // roof
  const style = r.pick(["gable", "hip", "flat", "shed", "gable"] as const);
  const over = 34;
  if (style === "gable") {
    const peak = r.int(150, 230);
    s += poly([[x0 - over, y0 + 6], [x0 + bodyW / 2, y0 - peak], [x0 + bodyW + over, y0 + 6]], p.roof);
    s += windowUnit(x0 + bodyW / 2 - 34, y0 - peak * 0.55, 68, 54, p.trim, glass(mood));
  } else if (style === "hip") {
    s += poly([[x0 - over, y0 + 6], [x0 + bodyW * 0.24, y0 - 140], [x0 + bodyW * 0.76, y0 - 140], [x0 + bodyW + over, y0 + 6]], p.roof);
  } else if (style === "shed") {
    s += poly([[x0 - over, y0 + 6], [x0 - over, y0 - 150], [x0 + bodyW + over, y0 - 50], [x0 + bodyW + over, y0 + 6]], p.roof);
  } else {
    s += rect(x0 - 20, y0 - 34, bodyW + 40, 40, p.roof);
  }
  s += rect(x0 - over + 6, y0, bodyW + over * 2 - 12, 10, p.trim, 'opacity="0.9"');
  if ((style === "gable" || style === "hip") && r.chance(0.45)) {
    const cx = x0 + bodyW * r.float(0.15, 0.3);
    s += rect(cx, y0 - 170, 46, 150, r.pick(["#8a4b3a", "#5f6670", "#a1785f"]));
  }

  // windows
  const lit = glass(mood);
  const cols = Math.max(2, Math.floor(bodyW / 170));
  const spacing = bodyW / cols;
  for (let st = 0; st < stories; st++) {
    const wy = y0 + st * storyH + storyH * 0.26;
    for (let c = 0; c < cols; c++) {
      const cx = x0 + spacing * c + spacing / 2;
      if (st === stories - 1 && Math.abs(cx - (x0 + doorSlot)) < spacing / 2) continue;
      const ww = r.chance(0.2) ? 120 : 84;
      s += windowUnit(cx - ww / 2, wy, ww, storyH * 0.46, p.trim, lit, shutters);
    }
  }

  // door + porch
  const dx = x0 + doorSlot - 38;
  s += rect(dx - 70, groundY - 196, 216, 16, p.trim);
  s += poly([[dx - 86, groundY - 196], [dx + 38, groundY - 250], [dx + 162, groundY - 196]], p.roof);
  s += rect(dx - 60, groundY - 180, 12, 180, p.trim);
  s += rect(dx + 124, groundY - 180, 12, 180, p.trim);
  s += rect(dx, groundY - 160, 76, 160, p.door);
  s += rect(dx + 14, groundY - 146, 48, 42, lit, 'opacity="0.8"');
  s += `<circle cx="${n(dx + 64)}" cy="${n(groundY - 76)}" r="5" fill="#e9c46a"/>`;
  s += rect(dx - 30, groundY - 8, 136, 12, "#bdb6aa");

  if (mood === "dusk") {
    const glow = radial(ctx, [[0, "#ffd58a", 0.55], [1, "#ffd58a", 0]]);
    s += `<circle cx="${n(dx + 38)}" cy="${n(groundY - 120)}" r="160" fill="${glow}"/>`;
  }

  // landscaping
  for (let i = 0; i < r.int(4, 7); i++) s += shrub(x0 + r.int(10, bodyW - 10), groundY - 6, r.float(0.7, 1.1), r.pick(LEAF));
  s += roundTree(x0 - r.int(110, 180), groundY + 20, r.float(1.3, 1.8), r.pick(LEAF));
  if (r.chance(0.6)) s += roundTree(x0 + totalW + r.int(90, 160), groundY + 30, r.float(1.2, 1.7), r.pick(LEAF));
  if (mood === "dusk") s += rect(0, 0, W, H, "#1b2350", 'opacity="0.14"');
  return s;
}

const FACADES = [
  { body: "#c9d6df", frame: "#5b6b78", glassA: "#7fa7c7", glassB: "#d4e6f2" },
  { body: "#e6dccb", frame: "#8c7b64", glassA: "#8fb0c4", glassB: "#e3eef4" },
  { body: "#33414f", frame: "#1c252e", glassA: "#5b7d99", glassB: "#a8c3d6" },
  { body: "#f1f0ec", frame: "#9aa2a8", glassA: "#6f9bb8", glassB: "#cfe2ee" },
  { body: "#b9a48b", frame: "#6b5a47", glassA: "#86a6bb", glassB: "#dbe8ef" },
];

/** Mid/high-rise residential or office building. */
export function buildingExterior(ctx: Ctx, variant: "residential" | "office" = "residential"): string {
  const r = ctx.rng;
  const mood = pickMood(r);
  const streetY = 900;
  let s = sky(ctx, mood, streetY);
  // background skyline
  for (let x = -40; x < W; x += r.int(90, 170)) {
    const h = r.int(160, 420);
    s += rect(x, streetY - 90 - h, r.int(80, 150), h + 90, mood === "dusk" ? "#3a4270" : "#b5c3d0", 'opacity="0.75"');
  }
  const towers = r.int(1, 2);
  const lit = glass(mood);
  for (let t = 0; t < towers; t++) {
    const f = r.pick(FACADES);
    const w = towers === 1 ? r.int(500, 640) : r.int(380, 460);
    const h = r.int(560, 760);
    const x = towers === 1 ? W / 2 - w / 2 + r.int(-80, 80) : t === 0 ? r.int(180, 300) : r.int(820, 980);
    const y = streetY - h;
    s += rect(x, y, w, h, f.body);
    const fill = linear(ctx, [[0, f.glassA], [1, f.glassB]], "d");
    const colW = 52;
    const rowH = 62;
    const cols = Math.floor((w - 40) / colW);
    const rows = Math.floor((h - 90) / rowH);
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 20 + c * colW;
        const wy = y + 30 + row * rowH;
        const on = mood === "dusk" && r.chance(0.35);
        s += rect(wx, wy, colW - 10, rowH - 16, on ? lit : fill);
      }
      if (variant === "residential" && row % 1 === 0) {
        s += rect(x - 8, y + 30 + row * rowH + rowH - 18, w + 16, 6, f.frame, 'opacity="0.85"');
      }
    }
    if (variant === "office") {
      for (let c = 0; c <= cols; c++) s += rect(x + 16 + c * colW, y, 6, h, f.frame, 'opacity="0.7"');
    }
    s += rect(x + w / 2 - 110, streetY - 90, 220, 90, "#2b3138");
    s += rect(x + w / 2 - 150, streetY - 106, 300, 16, f.frame);
    s += rect(x + w / 2 - 90, streetY - 80, 180, 80, lit, 'opacity="0.55"');
  }
  s += rect(0, streetY, W, 40, "#cfcac2");
  s += rect(0, streetY + 40, W, H - streetY - 40, "#4b5058");
  for (let x = 40; x < W; x += 180) s += rect(x, streetY + 98, 90, 8, "#e8e4dc");
  for (let i = 0; i < 6; i++) s += roundTree(80 + i * 290 + r.int(-30, 30), streetY + 18, r.float(0.8, 1.05), r.pick(LEAF));
  if (mood === "dusk") s += rect(0, 0, W, H, "#1b2350", 'opacity="0.12"');
  return s;
}

/** Low-rise commercial: office, retail strip or warehouse. */
export function commercialExterior(ctx: Ctx, variant: string): string {
  if (variant === "office" || variant === "mixed") return buildingExterior(ctx, variant === "office" ? "office" : "residential");
  const r = ctx.rng;
  const mood = pickMood(r);
  const groundY = 760;
  let s = sky(ctx, mood, groundY + 40);
  s += ridge(ctx, groundY - 90, 18, mood === "dusk" ? "#4c5a6e" : "#b8c9c0");
  s += rect(0, groundY, W, H - groundY, "#5b6068");
  for (let x = 60; x < W; x += 150) s += line(x, groundY + 60, x - 60, H, "#e8e4dc", 6);
  if (variant === "warehouse" || variant === "industrial") {
    const x = 160;
    const w = 1280;
    const h = 300;
    s += rect(x, groundY - h, w, h, r.pick(["#d7dade", "#c9ced3", "#e2ddd2"]));
    for (let i = 0; i < w; i += 22) s += line(x + i, groundY - h, x + i, groundY, "#000", 1, 'opacity="0.08"');
    s += rect(x, groundY - h - 18, w, 18, "#8a929b");
    for (let i = 0; i < 6; i++) {
      const dx = x + 140 + i * 180;
      s += rect(dx, groundY - 170, 120, 170, "#9aa3ad");
      for (let k = 1; k < 6; k++) s += line(dx, groundY - 170 + k * 28, dx + 120, groundY - 170 + k * 28, "#7b848e", 3);
    }
    s += rect(x + 40, groundY - 220, 70, 220, "#3c4a5a");
    s += rect(x + w - 260, groundY - 240, 200, 90, glass(mood), 'opacity="0.8"');
  } else {
    const x = 120;
    const w = 1360;
    const h = 250;
    const colors = ["#2f6f73", "#b5543c", "#3f4f8a", "#7a5c3e", "#4e7a46"];
    s += rect(x, groundY - h, w, h, "#efe8dc");
    s += rect(x, groundY - h - 40, w, 44, "#d9cfbf");
    const units = 5;
    const uw = w / units;
    for (let i = 0; i < units; i++) {
      const ux = x + i * uw;
      s += rect(ux + 18, groundY - 175, uw - 36, 175, glass(mood), 'opacity="0.85"');
      s += line(ux + uw / 2, groundY - 175, ux + uw / 2, groundY, "#ffffff", 5);
      s += poly([[ux + 10, groundY - 190], [ux + uw - 10, groundY - 190], [ux + uw - 30, groundY - 150], [ux + 30, groundY - 150]], colors[i % colors.length]!);
      s += rect(ux + uw / 2 - 70, groundY - h - 30, 140, 24, "#ffffff", 'opacity="0.7" rx="4"');
    }
  }
  for (let i = 0; i < 5; i++) s += roundTree(r.int(0, W), groundY + 10, r.float(0.7, 1), r.pick(LEAF));
  return s;
}

export function townhomeExterior(ctx: Ctx): string {
  const r = ctx.rng;
  const mood = pickMood(r);
  const groundY = 820;
  let s = sky(ctx, mood, groundY + 40);
  s += rect(0, groundY, W, H - groundY, "#cfcac2");
  s += rect(0, groundY + 70, W, H, "#5b6068");
  const units = r.int(3, 4);
  const uw = Math.floor(1400 / units);
  const palettes = r.sample(HOUSE_PALETTES, units);
  for (let i = 0; i < units; i++) {
    const p = palettes[i]!;
    const x = 100 + i * uw;
    const h = r.int(470, 540);
    s += rect(x, groundY - h, uw - 6, h, p.wall);
    s += poly([[x - 8, groundY - h], [x + uw / 2, groundY - h - 110], [x + uw + 2, groundY - h]], p.roof);
    for (let f = 0; f < 3; f++) {
      const wy = groundY - h + 40 + f * 150;
      if (f === 2) {
        s += rect(x + 40, groundY - 160, 80, 160, p.door);
        s += windowUnit(x + uw - 170, wy, 110, 90, p.trim, glass(mood));
      } else {
        s += windowUnit(x + 50, wy, 90, 100, p.trim, glass(mood));
        s += windowUnit(x + uw - 160, wy, 90, 100, p.trim, glass(mood));
      }
    }
    s += rect(x + 20, groundY - 8, 120, 10, "#bdb6aa");
  }
  for (let i = 0; i < units + 1; i++) s += roundTree(80 + i * uw, groundY + 40, r.float(0.8, 1), r.pick(LEAF));
  return s;
}

/** Rural scenes: land, water, forest, pasture, structure (barn). */
export function landscape(ctx: Ctx, kind: "land" | "water" | "forest" | "pasture" | "structure"): string {
  const r = ctx.rng;
  const mood = r.pick<Mood>(["day", "day", "golden", "golden", "dusk"]);
  let s = sky(ctx, mood, 760);
  const hue = r.pick([95, 105, 80, 70]);
  if (r.chance(0.4)) s += mountains(ctx, 560, mood === "dusk" ? "#4b4f78" : "#8ea2b8", r.chance(0.6));
  const layers = [
    [520, 26, `hsl(${hue},22%,${mood === "dusk" ? 38 : 62}%)`],
    [600, 34, `hsl(${hue},28%,${mood === "dusk" ? 32 : 52}%)`],
    [700, 40, `hsl(${hue},32%,${mood === "dusk" ? 26 : 44}%)`],
  ] as const;
  for (const [y, amp, fill] of layers) s += ridge(ctx, y, amp, fill);
  if (kind === "forest") {
    for (let i = 0; i < 46; i++) s += pineTree(r.int(-20, W + 20), r.int(560, 720), r.float(0.5, 0.9), `hsl(${r.int(120, 150)},${r.int(25, 40)}%,${r.int(20, 32)}%)`);
  } else {
    for (let i = 0; i < r.int(6, 14); i++) s += roundTree(r.int(0, W), r.int(560, 660), r.float(0.35, 0.6), `hsl(${hue + 20},30%,30%)`);
  }
  const fg = linear(ctx, [[0, `hsl(${hue + 5},38%,${mood === "dusk" ? 30 : 50}%)`], [1, `hsl(${hue + 10},40%,${mood === "dusk" ? 20 : 38}%)`]]);
  s += ridge(ctx, 790, 30, fg, 4);

  if (kind === "water") {
    const water = linear(ctx, [[0, mood === "dusk" ? "#59618f" : "#7fb3d5"], [1, mood === "dusk" ? "#2d3a66" : "#3f7fae"]]);
    const x = r.int(500, 1100);
    s += `<path d="M${x - 40} 700 C ${x - 220} 820, ${x + 260} 880, ${x - 80} ${H} L ${x + 420} ${H} C ${x + 520} 900, ${x + 120} 820, ${x + 60} 700 Z" fill="${water}"/>`;
    for (let i = 0; i < 9; i++) s += line(x + r.int(-60, 260), r.int(760, 1040), x + r.int(-20, 320), r.int(760, 1040), "#ffffff", 3, 'opacity="0.35" stroke-linecap="round"');
  }
  if (kind === "pasture") {
    for (let x = -20; x < W; x += 110) {
      const y = 860 + Math.sin(x / 260) * 18;
      s += rect(x, y - 90, 12, 110, "#6b4f3a");
    }
    s += `<path d="M0 ${n(800)} Q 800 770 1600 800" stroke="#7b5b43" stroke-width="7" fill="none"/>`;
    s += `<path d="M0 ${n(830)} Q 800 800 1600 830" stroke="#7b5b43" stroke-width="7" fill="none"/>`;
    for (let i = 0; i < r.int(2, 5); i++) {
      const bx = r.int(200, 1400);
      const by = r.int(900, 1000);
      s += `<ellipse cx="${bx}" cy="${by}" rx="54" ry="40" fill="#d9b565"/><ellipse cx="${bx}" cy="${by}" rx="30" ry="22" fill="none" stroke="#b8923f" stroke-width="5"/>`;
    }
  }
  if (kind === "structure") {
    const bx = r.int(380, 900);
    const by = 820;
    const red = r.pick(["#9b2f24", "#7f3b2a", "#5d6670", "#8a6a4a"]);
    s += rect(bx, by - 260, 420, 260, red);
    s += poly([[bx - 20, by - 260], [bx + 70, by - 360], [bx + 350, by - 360], [bx + 440, by - 260]], "#3b3b3b");
    s += rect(bx + 140, by - 190, 140, 190, "#f2ece1");
    s += line(bx + 140, by - 190, bx + 280, by, red, 10);
    s += line(bx + 280, by - 190, bx + 140, by, red, 10);
    s += rect(bx + 180, by - 320, 60, 50, "#f2ece1");
    if (r.chance(0.6)) {
      s += rect(bx + 470, by - 340, 110, 340, "#b9bcc0");
      s += `<ellipse cx="${bx + 525}" cy="${by - 340}" rx="55" ry="26" fill="#8e9398"/>`;
    }
  }
  if (kind === "land") {
    for (let i = 0; i < 90; i++) {
      s += `<circle cx="${r.int(0, W)}" cy="${r.int(820, H)}" r="${r.int(3, 6)}" fill="${r.pick(["#f4d35e", "#ffffff", "#e07a5f", "#c7a8f0"])}" opacity="0.85"/>`;
    }
    s += roundTree(r.int(1000, 1400), 870, r.float(1.6, 2.2), `hsl(${hue + 15},32%,30%)`);
  }
  if (mood === "dusk") s += rect(0, 0, W, H, "#1b2350", 'opacity="0.12"');
  return s;
}

/** Top-down drone view. */
export function aerial(ctx: Ctx, kind: "residential" | "commercial" | "land"): string {
  const r = ctx.rng;
  let s = "";
  const angle = r.float(-14, 14);
  if (kind === "land") {
    s += rect(0, 0, W, H, "#7f9a5a");
    let inner = "";
    for (let i = 0; i < 26; i++) {
      const x = r.int(-200, W);
      const y = r.int(-200, H);
      const w = r.int(260, 620);
      const h = r.int(200, 480);
      const fill = r.pick(["#9cae6a", "#c2b37a", "#6f8f4c", "#a98f5b", "#8fa863", "#b9c27f"]);
      inner += rect(x, y, w, h, fill, 'opacity="0.95"');
      for (let k = 10; k < h; k += 18) inner += line(x, y + k, x + w, y + k, "#000", 1, 'opacity="0.07"');
    }
    for (let i = 0; i < 160; i++) inner += `<circle cx="${r.int(0, W)}" cy="${r.int(0, H)}" r="${r.int(10, 26)}" fill="${r.pick(["#3f6b3a", "#4a7a40", "#2f5530"])}"/>`;
    inner += `<path d="M -50 ${r.int(200, 800)} C 500 ${r.int(0, 1000)}, 1100 ${r.int(0, 1000)}, 1700 ${r.int(200, 800)}" stroke="#d8c59a" stroke-width="18" fill="none"/>`;
    inner += `<ellipse cx="${r.int(300, 1300)}" cy="${r.int(250, 800)}" rx="${r.int(80, 160)}" ry="${r.int(50, 110)}" fill="#5f8fb0"/>`;
    s += `<g transform="rotate(${n(angle)} 800 533)">${inner}</g>`;
    const px = r.int(380, 600);
    const py = r.int(260, 380);
    s += `<polygon points="${px},${py} ${px + r.int(500, 700)},${py + r.int(-60, 40)} ${px + r.int(560, 760)},${py + r.int(360, 480)} ${px + r.int(-40, 60)},${py + r.int(380, 460)}" fill="none" stroke="#fbbf24" stroke-width="6" stroke-dasharray="22 14"/>`;
    return s;
  }
  s += rect(0, 0, W, H, kind === "commercial" ? "#9aa0a6" : "#86ad6a");
  let inner = "";
  const blockW = kind === "commercial" ? 460 : 520;
  const blockH = kind === "commercial" ? 340 : 300;
  for (let bx = -400; bx < W + 400; bx += blockW + 70) {
    for (let by = -400; by < H + 400; by += blockH + 70) {
      if (kind === "commercial") {
        inner += rect(bx, by, blockW, blockH, "#b9bdc2");
        const roofs = r.int(1, 3);
        for (let k = 0; k < roofs; k++) {
          const rw = blockW / roofs - 20;
          inner += rect(bx + 10 + k * (blockW / roofs), by + 20, rw, blockH - 120, r.pick(["#e7e7e4", "#d6d9dd", "#c4c8cc", "#efe9df"]));
          for (let h = 0; h < 4; h++) inner += rect(bx + 30 + k * (blockW / roofs) + h * 40, by + 40, 24, 24, "#9aa0a6");
        }
        for (let p = 0; p < blockW; p += 34) inner += line(bx + p, by + blockH - 90, bx + p, by + blockH - 20, "#ffffff", 3, 'opacity="0.6"');
      } else {
        const lots = 4;
        const lw = blockW / lots;
        for (let k = 0; k < lots * 2; k++) {
          const lx = bx + (k % lots) * lw;
          const ly = by + (k < lots ? 0 : blockH / 2);
          inner += rect(lx + 4, ly + 4, lw - 8, blockH / 2 - 8, r.pick(["#92b874", "#8ab06c", "#9cc07d"]));
          const hw = lw * r.float(0.48, 0.62);
          const hh = blockH * r.float(0.2, 0.26);
          const hx = lx + (lw - hw) / 2;
          const hy = ly + (k < lots ? 20 : blockH / 2 - hh - 20);
          const roof = r.pick(["#5b6470", "#7a5a48", "#4b5563", "#8b7d6b", "#6b4e3d"]);
          inner += rect(hx, hy, hw, hh / 2, roof);
          inner += rect(hx, hy + hh / 2, hw, hh / 2, roof, 'opacity="0.78"');
          if (r.chance(0.25)) inner += rect(hx + hw * 0.2, ly + (k < lots ? blockH / 2 - 60 : 30), hw * 0.5, 34, "#6fc3e6", 'rx="6"');
          for (let t = 0; t < 2; t++) inner += `<circle cx="${n(lx + r.float(10, lw - 10))}" cy="${n(ly + r.float(10, blockH / 2 - 10))}" r="${r.int(14, 26)}" fill="${r.pick(["#3f6b3a", "#4a7a40", "#2f5530"])}"/>`;
        }
      }
      inner += rect(bx - 70, by - 70, blockW + 140, 70, "#6b7078");
      inner += rect(bx - 70, by, 70, blockH, "#6b7078");
    }
  }
  s += `<g transform="rotate(${n(angle)} 800 533)">${inner}</g>`;
  s += `<circle cx="800" cy="533" r="${kind === "commercial" ? 210 : 150}" fill="none" stroke="#fbbf24" stroke-width="6" stroke-dasharray="20 12"/>`;
  return s;
}
