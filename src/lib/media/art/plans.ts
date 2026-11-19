import { H, W, esc, line, n, rect, type Ctx } from "./core";

interface RoomBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: "bed" | "bath" | "living" | "kitchen" | "dining" | "garage" | "closet" | "office" | "laundry" | "core" | "suite";
}

const INK = "#1f2937";
const PAPER = "#fbfaf7";

function door(x: number, y: number, size: number, orient: "h" | "v"): string {
  if (orient === "h") {
    return `${rect(x, y - 6, size, 12, PAPER)}<path d="M${n(x)} ${n(y)} A ${n(size)} ${n(size)} 0 0 1 ${n(x + size)} ${n(y - size)}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.6"/>${line(x + size, y, x + size, y - size, INK, 2, 'opacity="0.6"')}`;
  }
  return `${rect(x - 6, y, 12, size, PAPER)}<path d="M${n(x)} ${n(y)} A ${n(size)} ${n(size)} 0 0 1 ${n(x + size)} ${n(y + size)}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.6"/>${line(x, y + size, x + size, y + size, INK, 2, 'opacity="0.6"')}`;
}

function fixtures(room: RoomBox): string {
  const { x, y, w, h, kind } = room;
  const c = "#94a3b8";
  if (kind === "bed" || kind === "suite") {
    const bw = Math.min(w * 0.55, 170);
    const bh = Math.min(h * 0.5, 200);
    const bx = x + (w - bw) / 2;
    const by = y + 24;
    return `<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(bh)}" fill="none" stroke="${c}" stroke-width="3" rx="6"/><rect x="${n(bx + 10)}" y="${n(by + 10)}" width="${n(bw / 2 - 16)}" height="${n(26)}" fill="none" stroke="${c}" stroke-width="2" rx="6"/><rect x="${n(bx + bw / 2 + 6)}" y="${n(by + 10)}" width="${n(bw / 2 - 16)}" height="26" fill="none" stroke="${c}" stroke-width="2" rx="6"/>`;
  }
  if (kind === "bath") {
    return `<rect x="${n(x + 12)}" y="${n(y + 12)}" width="${n(Math.min(w - 24, 150))}" height="${n(Math.min(h * 0.35, 70))}" fill="none" stroke="${c}" stroke-width="3" rx="20"/><circle cx="${n(x + w - 36)}" cy="${n(y + h - 40)}" r="18" fill="none" stroke="${c}" stroke-width="3"/><rect x="${n(x + 16)}" y="${n(y + h - 60)}" width="60" height="40" fill="none" stroke="${c}" stroke-width="3" rx="8"/>`;
  }
  if (kind === "kitchen") {
    return `<path d="M${n(x + 10)} ${n(y + 10)} H ${n(x + w - 10)} V ${n(y + 50)} H ${n(x + 50)} V ${n(y + h - 10)} H ${n(x + 10)} Z" fill="none" stroke="${c}" stroke-width="3"/><rect x="${n(x + w / 2 - 70)}" y="${n(y + h / 2 - 10)}" width="140" height="56" fill="none" stroke="${c}" stroke-width="3" rx="4"/>`;
  }
  if (kind === "living") {
    return `<rect x="${n(x + w / 2 - 110)}" y="${n(y + h - 90)}" width="220" height="60" fill="none" stroke="${c}" stroke-width="3" rx="14"/><rect x="${n(x + w / 2 - 60)}" y="${n(y + h - 170)}" width="120" height="50" fill="none" stroke="${c}" stroke-width="2" rx="6"/>`;
  }
  if (kind === "dining") {
    return `<rect x="${n(x + w / 2 - 70)}" y="${n(y + h / 2 - 40)}" width="140" height="80" fill="none" stroke="${c}" stroke-width="3" rx="8"/>${[0, 1, 2]
      .map((i) => `<circle cx="${n(x + w / 2 - 50 + i * 50)}" cy="${n(y + h / 2 - 58)}" r="12" fill="none" stroke="${c}" stroke-width="2"/><circle cx="${n(x + w / 2 - 50 + i * 50)}" cy="${n(y + h / 2 + 58)}" r="12" fill="none" stroke="${c}" stroke-width="2"/>`)
      .join("")}`;
  }
  if (kind === "garage") {
    return `<rect x="${n(x + 24)}" y="${n(y + 30)}" width="${n(w / 2 - 36)}" height="${n(h - 60)}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="10 8" rx="20"/><rect x="${n(x + w / 2 + 12)}" y="${n(y + 30)}" width="${n(w / 2 - 36)}" height="${n(h - 60)}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="10 8" rx="20"/>`;
  }
  return "";
}

function frame(title: string, subtitle: string): string {
  let s = rect(0, 0, W, H, PAPER);
  for (let x = 0; x < W; x += 40) s += line(x, 0, x, H, "#e5e7eb", 1);
  for (let y = 0; y < H; y += 40) s += line(0, y, W, y, "#e5e7eb", 1);
  s += `<text x="80" y="80" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700" fill="${INK}">${esc(title)}</text>`;
  s += `<text x="80" y="118" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" fill="#475569">${esc(subtitle)}</text>`;
  s += `<g transform="translate(1470 92)"><circle r="38" fill="none" stroke="${INK}" stroke-width="3"/><path d="M0 -30 L12 8 L0 0 L-12 8 Z" fill="${INK}"/><text y="-44" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="${INK}">N</text></g>`;
  s += `<text x="${W - 80}" y="${H - 40}" text-anchor="end" font-family="ui-sans-serif, system-ui" font-size="18" fill="#64748b">Illustrative only · not to scale · CITI VIEW</text>`;
  return s;
}

function drawRooms(rooms: RoomBox[], ftPerPx: number): string {
  let s = "";
  for (const room of rooms) {
    s += `<rect x="${n(room.x)}" y="${n(room.y)}" width="${n(room.w)}" height="${n(room.h)}" fill="${room.kind === "garage" ? "#f1f5f9" : "#ffffff"}" stroke="${INK}" stroke-width="7"/>`;
    s += fixtures(room);
    const wft = Math.round(room.w * ftPerPx);
    const hft = Math.round(room.h * ftPerPx);
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2 + (room.kind === "bed" || room.kind === "suite" ? room.h * 0.18 : 0);
    const fs = room.w < 170 ? 16 : 21;
    s += `<text x="${n(cx)}" y="${n(cy)}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="${fs}" font-weight="700" fill="${INK}">${esc(room.label)}</text>`;
    if (room.kind !== "closet" && room.kind !== "core") {
      s += `<text x="${n(cx)}" y="${n(cy + fs + 4)}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="${fs - 3}" fill="#475569">${wft}' × ${hft}'</text>`;
    }
  }
  return s;
}

export interface FloorPlanSpec {
  beds: number;
  baths: number;
  sqft: number;
  kind: "home" | "condo" | "commercial";
  garage?: boolean;
}

export function floorPlan(ctx: Ctx, spec: FloorPlanSpec): string {
  const r = ctx.rng;
  const beds = Math.max(0, Math.min(6, Math.round(spec.beds)));
  const baths = Math.max(1, Math.min(5, spec.baths));
  const sqft = Math.max(400, spec.sqft);
  if (spec.kind === "commercial") return commercialPlan(ctx, sqft);

  const X = 140;
  const Y = 170;
  const FW = spec.garage ? 1040 : 1320;
  const FH = 780;
  const ftPerPx = Math.sqrt(sqft / (FW * FH)) * 0.94;
  const rooms: RoomBox[] = [];

  const leftW = beds >= 3 ? FW * 0.32 : beds === 2 ? FW * 0.3 : FW * 0.26;
  const rightW = FW * 0.3;
  const midW = FW - leftW - rightW;

  // Left wing: secondary bedrooms with a shared bath between.
  const secondary = Math.max(0, beds - 1);
  const leftRooms: Array<{ label: string; kind: RoomBox["kind"]; weight: number }> = [];
  if (secondary === 0) leftRooms.push({ label: "Office / Den", kind: "office", weight: 1 });
  for (let i = 0; i < secondary; i++) {
    leftRooms.push({ label: `Bedroom ${i + 2}`, kind: "bed", weight: 1 });
    if (i === 0 && baths >= 2) leftRooms.push({ label: "Bath", kind: "bath", weight: 0.55 });
  }
  const totalWeight = leftRooms.reduce((a, b) => a + b.weight, 0);
  let cy = Y;
  for (const lr of leftRooms) {
    const h = (FH * lr.weight) / totalWeight;
    rooms.push({ x: X, y: cy, w: leftW, h, label: lr.label, kind: lr.kind });
    cy += h;
  }

  // Middle: kitchen + dining on top, living below.
  const kitchenH = FH * r.float(0.38, 0.45);
  const kitchenW = midW * r.float(0.52, 0.6);
  rooms.push({ x: X + leftW, y: Y, w: kitchenW, h: kitchenH, label: "Kitchen", kind: "kitchen" });
  rooms.push({ x: X + leftW + kitchenW, y: Y, w: midW - kitchenW, h: kitchenH, label: "Dining", kind: "dining" });
  const hasPowder = baths % 1 !== 0 || baths >= 3;
  const livingH = FH - kitchenH - (hasPowder ? 120 : 0);
  rooms.push({ x: X + leftW, y: Y + kitchenH, w: midW, h: livingH, label: beds === 0 ? "Living / Sleeping" : "Living room", kind: "living" });
  if (hasPowder) {
    rooms.push({ x: X + leftW, y: Y + kitchenH + livingH, w: midW * 0.45, h: 120, label: "Powder", kind: "bath" });
    rooms.push({ x: X + leftW + midW * 0.45, y: Y + kitchenH + livingH, w: midW * 0.55, h: 120, label: "Laundry", kind: "laundry" });
  }

  // Right: primary suite
  const rx = X + leftW + midW;
  if (beds >= 1) {
    const suiteH = FH * 0.58;
    rooms.push({ x: rx, y: Y, w: rightW, h: suiteH, label: "Primary bedroom", kind: "suite" });
    rooms.push({ x: rx, y: Y + suiteH, w: rightW * 0.6, h: FH - suiteH, label: "Primary bath", kind: "bath" });
    rooms.push({ x: rx + rightW * 0.6, y: Y + suiteH, w: rightW * 0.4, h: FH - suiteH, label: "W.I.C.", kind: "closet" });
  } else {
    rooms.push({ x: rx, y: Y, w: rightW, h: FH * 0.45, label: "Bath", kind: "bath" });
    rooms.push({ x: rx, y: Y + FH * 0.45, w: rightW, h: FH * 0.55, label: "Flex space", kind: "office" });
  }
  if (spec.garage) rooms.push({ x: X + FW, y: Y + FH * 0.3, w: 300, h: FH * 0.7, label: "Garage", kind: "garage" });

  const subtitle = `${beds === 0 ? "Studio" : `${beds} bd`} · ${baths} ba · ${sqft.toLocaleString("en-US")} sqft`;
  let s = frame(spec.kind === "condo" ? "Unit floor plan" : "Floor plan: main level", subtitle);
  s += drawRooms(rooms, ftPerPx);
  s += `<rect x="${X}" y="${Y}" width="${n(FW)}" height="${FH}" fill="none" stroke="${INK}" stroke-width="14"/>`;
  // doors
  s += door(X + leftW - 2, Y + FH * 0.2, 54, "v");
  s += door(X + leftW + midW / 2, Y + FH, 70, "h");
  s += door(rx - 2, Y + FH * 0.3, 54, "v");
  // windows
  for (const wx of [X + leftW * 0.3, X + leftW + midW * 0.3, rx + rightW * 0.4]) {
    s += rect(wx, Y - 7, 90, 14, "#bfdbfe", `stroke="${INK}" stroke-width="2"`);
  }
  // scale bar
  const tenFt = 10 / ftPerPx;
  s += `<g transform="translate(140 ${H - 70})">${rect(0, 0, tenFt, 10, INK)}${rect(tenFt, 0, tenFt, 10, "#ffffff", `stroke="${INK}" stroke-width="2"`)}<text y="-10" font-family="ui-sans-serif, system-ui" font-size="18" fill="${INK}">0</text><text x="${n(tenFt * 2)}" y="-10" text-anchor="end" font-family="ui-sans-serif, system-ui" font-size="18" fill="${INK}">20 ft</text></g>`;
  return s;
}

function commercialPlan(ctx: Ctx, sqft: number): string {
  const r = ctx.rng;
  const X = 140;
  const Y = 170;
  const FW = 1320;
  const FH = 760;
  const ftPerPx = Math.sqrt(sqft / (FW * FH)) * 0.94;
  const rooms: RoomBox[] = [];
  rooms.push({ x: X + FW / 2 - 120, y: Y + FH / 2 - 110, w: 240, h: 220, label: "Core · elevators", kind: "core" });
  rooms.push({ x: X + FW / 2 - 120, y: Y + FH / 2 + 110, w: 120, h: 110, label: "Restroom", kind: "bath" });
  rooms.push({ x: X + FW / 2, y: Y + FH / 2 + 110, w: 120, h: 110, label: "Restroom", kind: "bath" });
  const conf = r.int(2, 4);
  for (let i = 0; i < conf; i++) rooms.push({ x: X + i * (FW / conf), y: Y, w: FW / conf, h: 170, label: i === 0 ? "Conference" : `Office ${i}`, kind: "office" });
  rooms.push({ x: X, y: Y + FH - 200, w: 360, h: 200, label: "Reception", kind: "living" });
  rooms.push({ x: X + FW - 300, y: Y + FH - 200, w: 300, h: 200, label: "Break room", kind: "kitchen" });
  let s = frame("Suite floor plan", `${sqft.toLocaleString("en-US")} RSF · open office layout`);
  s += `<rect x="${X}" y="${Y}" width="${FW}" height="${FH}" fill="#ffffff"/>`;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      const dx = X + 60 + col * 150;
      const dy = Y + 230 + row * 110;
      if (Math.abs(dx + 50 - (X + FW / 2)) < 200 && dy > Y + FH / 2 - 160) continue;
      s += `<rect x="${dx}" y="${dy}" width="100" height="46" fill="none" stroke="#94a3b8" stroke-width="3" rx="4"/><circle cx="${dx + 50}" cy="${dy + 66}" r="12" fill="none" stroke="#94a3b8" stroke-width="2"/>`;
    }
  }
  s += drawRooms(rooms, ftPerPx);
  s += `<rect x="${X}" y="${Y}" width="${FW}" height="${FH}" fill="none" stroke="${INK}" stroke-width="14"/>`;
  return s;
}

/** Contour map via marching squares over a sum of Gaussian hills. */
export function topography(ctx: Ctx, acres: number): string {
  const r = ctx.rng;
  const cols = 80;
  const rows = 54;
  const cw = W / cols;
  const ch = H / rows;
  const hills = Array.from({ length: r.int(3, 5) }, () => ({
    x: r.float(0.1, 0.9) * W,
    y: r.float(0.1, 0.9) * H,
    a: r.float(40, 120) * (r.chance(0.25) ? -0.6 : 1),
    s: r.float(160, 380),
  }));
  const slope = r.float(-0.04, 0.04);
  const f = (x: number, y: number) =>
    hills.reduce((sum, h) => sum + h.a * Math.exp(-((x - h.x) ** 2 + (y - h.y) ** 2) / (2 * h.s * h.s)), 0) + slope * x;
  const grid: number[][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= rows; j++) {
    const row: number[] = [];
    for (let i = 0; i <= cols; i++) {
      const v = f(i * cw, j * ch);
      row.push(v);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    grid.push(row);
  }
  const levels = 16;
  const baseElevation = r.int(600, 2400);
  let s = rect(0, 0, W, H, "#f5f0e4");
  s += rect(0, 0, W, H, "#d8e6c7", 'opacity="0.35"');
  for (let k = 1; k < levels; k++) {
    const level = min + ((max - min) * k) / levels;
    let d = "";
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v0 = grid[j]![i]!;
        const v1 = grid[j]![i + 1]!;
        const v2 = grid[j + 1]![i + 1]!;
        const v3 = grid[j + 1]![i]!;
        const idx = (v0 > level ? 8 : 0) | (v1 > level ? 4 : 0) | (v2 > level ? 2 : 0) | (v3 > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * cw;
        const y = j * ch;
        const lerp = (a: number, b: number) => (level - a) / (b - a || 1e-9);
        const top: [number, number] = [x + cw * lerp(v0, v1), y];
        const right: [number, number] = [x + cw, y + ch * lerp(v1, v2)];
        const bottom: [number, number] = [x + cw * lerp(v3, v2), y + ch];
        const left: [number, number] = [x, y + ch * lerp(v0, v3)];
        const segs: Array<[[number, number], [number, number]]> = [];
        switch (idx) {
          case 1: case 14: segs.push([left, bottom]); break;
          case 2: case 13: segs.push([bottom, right]); break;
          case 3: case 12: segs.push([left, right]); break;
          case 4: case 11: segs.push([top, right]); break;
          case 5: segs.push([left, top], [bottom, right]); break;
          case 6: case 9: segs.push([top, bottom]); break;
          case 7: case 8: segs.push([left, top]); break;
          case 10: segs.push([left, bottom], [top, right]); break;
        }
        for (const [a, b] of segs) d += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`;
      }
    }
    const major = k % 4 === 0;
    s += `<path d="${d}" fill="none" stroke="#8a6a46" stroke-width="${major ? 2.6 : 1.1}" opacity="${major ? 0.9 : 0.6}" stroke-linecap="round"/>`;
    if (major) {
      const lx = r.int(200, 1400);
      const ly = r.int(200, 900);
      s += `<text x="${lx}" y="${ly}" font-family="ui-sans-serif, system-ui" font-size="18" fill="#6b4f33" opacity="0.8">${(baseElevation + k * 20).toLocaleString("en-US")} ft</text>`;
    }
  }
  const cx = r.int(-50, 300);
  s += `<path d="M${cx} -20 C ${r.int(300, 700)} ${r.int(200, 500)}, ${r.int(800, 1100)} ${r.int(400, 800)}, ${W + 40} ${r.int(600, 1000)}" fill="none" stroke="#3b82c4" stroke-width="7" opacity="0.8" stroke-linecap="round"/>`;
  const px = r.int(260, 420);
  const py = r.int(200, 300);
  s += `<polygon points="${px},${py} ${px + r.int(700, 900)},${py + r.int(-40, 40)} ${px + r.int(760, 960)},${py + r.int(480, 600)} ${px + r.int(-60, 60)},${py + r.int(520, 620)}" fill="#fbbf24" fill-opacity="0.08" stroke="#c2410c" stroke-width="5" stroke-dasharray="20 12"/>`;
  s += `<g font-family="ui-sans-serif, system-ui"><rect x="60" y="40" width="470" height="120" rx="14" fill="#ffffff" opacity="0.92"/><text x="84" y="88" font-size="30" font-weight="700" fill="${INK}">Topography &amp; parcel</text><text x="84" y="128" font-size="20" fill="#475569">${acres.toLocaleString("en-US", { maximumFractionDigits: 1 })} acres · 20 ft contours · illustrative</text></g>`;
  s += `<g transform="translate(1490 100)"><circle r="40" fill="#ffffff" opacity="0.92" stroke="${INK}" stroke-width="3"/><path d="M0 -30 L12 8 L0 0 L-12 8 Z" fill="${INK}"/><text y="-48" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="${INK}">N</text></g>`;
  s += `<g font-family="ui-sans-serif, system-ui" font-size="18" fill="#334155"><line x1="80" y1="${H - 60}" x2="140" y2="${H - 60}" stroke="#3b82c4" stroke-width="7"/><text x="152" y="${H - 54}">Seasonal creek</text><line x1="330" y1="${H - 60}" x2="390" y2="${H - 60}" stroke="#c2410c" stroke-width="5" stroke-dasharray="14 8"/><text x="402" y="${H - 54}">Parcel boundary (approx.)</text></g>`;
  return s;
}
