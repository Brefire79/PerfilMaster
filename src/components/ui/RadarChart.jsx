import React, { useEffect, useRef, useState } from 'react';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_COLORS = {
  D: 'var(--color-D)',
  I: 'var(--color-I)',
  S: 'var(--color-S)',
  C: 'var(--color-C)',
};

const PROFILE_LABELS = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

// Axis positions: top=D, right=I, bottom=S, left=C
const AXES = [
  { key: 'D', angle: -90 }, // top
  { key: 'I', angle:   0 }, // right
  { key: 'S', angle:  90 }, // bottom
  { key: 'C', angle: 180 }, // left
];

const DEG2RAD = Math.PI / 180;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = angleDeg * DEG2RAD;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildPolygonPoints(cx, cy, maxR, scores) {
  return AXES.map(({ key, angle }) => {
    const r = maxR * ((scores[key] ?? 0) / 100);
    return polarToCartesian(cx, cy, r, angle);
  });
}

function pointsToPath(points) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function polygonPerimeter(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/**
 * RadarChart — pure SVG D/I/S/C radar chart
 *
 * @param {{ D: number, I: number, S: number, C: number }} scores
 * @param {number} size
 * @param {boolean} showLabels
 * @param {boolean} animated
 */
export default function RadarChart({ scores = {}, size = 300, showLabels = true, animated = true }) {
  const pathRef = useRef(null);
  const [ready, setReady] = useState(!animated);

  const cx = size / 2;
  const cy = size / 2;
  const padding = showLabels ? 44 : 20;
  const maxR = cx - padding;

  const dataPoints = buildPolygonPoints(cx, cy, maxR, scores);
  const dataPath = pointsToPath(dataPoints);
  const perimeter = polygonPerimeter(dataPoints);

  // Animate stroke-dashoffset on mount
  useEffect(() => {
    if (!animated) return;
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Gráfico radar de perfil comportamental"
      role="img"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* ── Grid rings ── */}
      {gridLevels.map((level) => {
        const ringPoints = AXES.map(({ angle }) =>
          polarToCartesian(cx, cy, maxR * level, angle)
        );
        const ringPath = pointsToPath(ringPoints);
        return (
          <path
            key={level}
            d={ringPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}

      {/* ── Axis lines ── */}
      {AXES.map(({ key, angle }) => {
        const tip = polarToCartesian(cx, cy, maxR, angle);
        return (
          <line
            key={key}
            x1={cx}
            y1={cy}
            x2={tip.x.toFixed(2)}
            y2={tip.y.toFixed(2)}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
        );
      })}

      {/* ── Data polygon — filled ── */}
      <path
        d={dataPath}
        fill="rgba(99,102,241,0.18)"
        stroke="none"
      />

      {/* ── Data polygon — stroke (animated) ── */}
      <path
        ref={pathRef}
        d={dataPath}
        fill="none"
        stroke="#6366F1"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray={animated ? perimeter : undefined}
        strokeDashoffset={animated ? (ready ? 0 : perimeter) : undefined}
        style={
          animated
            ? { transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }
            : undefined
        }
      />

      {/* ── Axis tips: colored dots + labels + scores ── */}
      {AXES.map(({ key, angle }) => {
        const score = scores[key] ?? 0;
        const tip = polarToCartesian(cx, cy, maxR, angle);
        const labelOffset = 16;
        const labelPos = polarToCartesian(cx, cy, maxR + labelOffset, angle);
        const scorePos = polarToCartesian(cx, cy, maxR * (score / 100), angle);

        // Anchor text based on position
        let textAnchor = 'middle';
        if (angle === 0) textAnchor = 'start';
        if (angle === 180) textAnchor = 'end';

        // Vertical alignment nudge
        let dy = '0.35em';
        if (angle === -90) dy = '-0.3em';
        if (angle === 90) dy = '1.1em';

        return (
          <g key={key}>
            {/* Axis tip dot */}
            <circle
              cx={tip.x.toFixed(2)}
              cy={tip.y.toFixed(2)}
              r={4}
              fill={PROFILE_COLORS[key]}
            />

            {/* Data vertex dot */}
            {score > 0 && (
              <circle
                cx={scorePos.x.toFixed(2)}
                cy={scorePos.y.toFixed(2)}
                r={3.5}
                fill="#6366F1"
                stroke="#0F1117"
                strokeWidth={1.5}
              />
            )}

            {/* Label */}
            {showLabels && (
              <>
                <text
                  x={labelPos.x.toFixed(2)}
                  y={labelPos.y.toFixed(2)}
                  dy={dy}
                  textAnchor={textAnchor}
                  fill={PROFILE_COLORS[key]}
                  fontSize={10}
                  fontFamily="'DM Sans', sans-serif"
                  fontWeight={600}
                >
                  {key}
                </text>
                <text
                  x={labelPos.x.toFixed(2)}
                  y={(parseFloat(labelPos.y) + (angle === -90 ? -12 : angle === 90 ? 12 : 0)).toFixed(2)}
                  dy={angle === -90 ? '-0.3em' : angle === 90 ? '1.4em' : dy}
                  textAnchor={textAnchor}
                  fill="rgba(160,163,177,0.8)"
                  fontSize={8.5}
                  fontFamily="'DM Sans', sans-serif"
                >
                  {PROFILE_LABELS[key]}
                </text>
                {/* Score value near vertex */}
                <text
                  x={(scorePos.x + (angle === 0 ? 8 : angle === 180 ? -8 : 0)).toFixed(2)}
                  y={(scorePos.y + (angle === -90 ? -8 : angle === 90 ? 8 : 0)).toFixed(2)}
                  dy="0.35em"
                  textAnchor={textAnchor}
                  fill="rgba(247,248,252,0.85)"
                  fontSize={9}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={500}
                >
                  {score}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* ── Center dot ── */}
      <circle cx={cx} cy={cy} r={2.5} fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}
