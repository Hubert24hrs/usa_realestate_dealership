/** Decorative hero skyline (original artwork, inline SVG — no image request, no LCP cost). */
export function SkylineBackdrop({ className }: { className?: string }) {
  const towers = [
    [0, 120], [46, 150], [80, 96], [118, 182], [160, 132], [204, 210], [246, 158], [292, 118], [330, 240], [378, 170],
    [420, 134], [462, 196], [508, 150], [548, 262], [596, 182], [640, 140], [684, 212], [728, 168], [770, 120], [812, 228],
    [858, 176], [902, 138], [946, 204], [990, 160], [1034, 248], [1080, 182], [1124, 140], [1168, 196], [1212, 150], [1256, 120],
    [1300, 188], [1344, 138], [1388, 214], [1432, 160], [1476, 128], [1520, 176], [1564, 110],
  ];
  return (
    <svg viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {towers.map(([x, h], i) => (
        <g key={x}>
          <rect x={x} y={300 - h} width={i % 3 === 0 ? 40 : 34} height={h} fill="url(#sky-fade)" />
          {Array.from({ length: Math.floor(h / 26) }, (_, k) => (
            <rect key={k} x={x + 8 + (k % 2) * 12} y={300 - h + 14 + k * 24} width={5} height={7} rx={1} fill="#f7c48a" opacity={(i * 7 + k * 3) % 5 === 0 ? 0.85 : 0.12} />
          ))}
        </g>
      ))}
    </svg>
  );
}
