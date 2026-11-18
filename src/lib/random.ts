/** Deterministic, seedable randomness for seed data and generated imagery. */

export function hashString(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly next01: () => number;

  constructor(seed: number | string) {
    this.next01 = mulberry32(typeof seed === "string" ? hashString(seed) : seed);
  }

  next(): number {
    return this.next01();
  }

  float(min: number, max: number): number {
    return min + (max - min) * this.next01();
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next01() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick on empty array");
    return items[Math.floor(this.next01() * items.length)]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next01() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
  }

  /** Normal-ish distribution via the central limit theorem. */
  gaussian(mean = 0, sd = 1): number {
    let sum = 0;
    for (let i = 0; i < 6; i++) sum += this.next01();
    return mean + (sum - 3) * sd * (1 / Math.sqrt(0.5));
  }
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
