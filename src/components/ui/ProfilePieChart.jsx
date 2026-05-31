import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante',  color: 'var(--color-D)',  hex: '#EF4444' },
  I: { name: 'Influente',  color: 'var(--color-I)',  hex: '#F59E0B' },
  S: { name: 'Estável',    color: 'var(--color-S)',  hex: '#22C55E' },
  C: { name: 'Analítico',  color: 'var(--color-C)',  hex: '#6366F1' },
};

const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const key = entry?.payload?.key;
  const config = PROFILE_CONFIG[key];
  if (!config) return null;

  return (
    <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold" style={{ color: config.hex }}>
        {key} — {config.name}
      </p>
      <p className="text-sm font-bold text-[#F7F8FC] mt-0.5">{entry.value}%</p>
    </div>
  );
}

// ─── Center label rendered via foreignObject workaround — pure SVG label ─────
function CenterLabel({ cx, cy, dominantKey }) {
  if (!dominantKey) return null;
  const config = PROFILE_CONFIG[dominantKey];
  return (
    <g>
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={config?.hex || '#F7F8FC'}
        fontSize={22}
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight={700}
      >
        {dominantKey}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(160,163,177,0.8)"
        fontSize={9.5}
        fontFamily="'DM Sans', sans-serif"
      >
        Perfil
      </text>
    </g>
  );
}

// ─── Custom Legend ────────────────────────────────────────────────────────────
function ProfileLegend({ data }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
      {data.map(({ key, value }) => {
        const config = PROFILE_CONFIG[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.hex }}
            />
            <span className="text-xs text-[#A0A3B1]">
              {config.name}
            </span>
            <span className="text-xs font-semibold text-[#F7F8FC]">{value}%</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * ProfilePieChart — donut chart for a single profile's DISC scores
 *
 * @param {{ D: number, I: number, S: number, C: number }} scores
 * @param {number} size
 * @param {boolean} showLegend
 */
export default function ProfilePieChart({ scores = {}, size = 200, showLegend = true }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = PROFILE_ORDER.map((key) => ({
    key,
    name: PROFILE_CONFIG[key].name,
    value: Math.max(0, Math.round(scores[key] ?? 0)),
  })).filter((d) => d.value > 0);

  // Find dominant profile
  const dominantKey = PROFILE_ORDER.reduce(
    (best, key) => ((scores[key] ?? 0) > (scores[best] ?? 0) ? key : best),
    'D'
  );

  const innerRadius = Math.round(size * 0.3);
  const outerRadius = Math.round(size * 0.42);

  const renderCenterLabel = ({ cx, cy }) => (
    <CenterLabel cx={cx} cy={cy} dominantKey={dominantKey} />
  );

  return (
    <div className="flex flex-col items-center">
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx={size / 2}
          cy={size / 2}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          paddingAngle={2}
          animationBegin={0}
          animationDuration={700}
          labelLine={false}
          label={renderCenterLabel}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map(({ key }, index) => (
            <Cell
              key={key}
              fill={PROFILE_CONFIG[key].hex}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.55}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>

      {showLegend && <ProfileLegend data={data} />}
    </div>
  );
}
