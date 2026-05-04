import React, { useState, useRef, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante',  hex: '#E53E3E' },
  I: { name: 'Influente',  hex: '#D69E2E' },
  S: { name: 'Estável',    hex: '#38A169' },
  C: { name: 'Analítico',  hex: '#3182CE' },
};

const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

// ─── Active slice shape ───────────────────────────────────────────────────────
function ActiveShape(props) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const key = entry?.payload?.key;
  const conf = PROFILE_CONFIG[key];
  if (!conf) return null;

  return (
    <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-3 py-2 shadow-xl pointer-events-none">
      <p className="text-xs font-bold" style={{ color: conf.hex }}>
        {key} — {conf.name}
      </p>
      <p className="text-sm font-bold text-[#F7F8FC] mt-0.5">
        {entry.value.toFixed(1)}%
      </p>
      <p className="text-xs text-[#A0A3B1]">
        {entry.payload.count} {entry.payload.count === 1 ? 'membro' : 'membros'}
      </p>
    </div>
  );
}

// ─── Center label ─────────────────────────────────────────────────────────────
function CenterLabel({ cx, cy, total }) {
  return (
    <g>
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#F7F8FC"
        fontSize={24}
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight={700}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(160,163,177,0.8)"
        fontSize={10}
        fontFamily="'DM Sans', sans-serif"
      >
        membros
      </text>
    </g>
  );
}

/**
 * GroupPieChart — interactive group distribution pie chart
 *
 * @param {{ D: number, I: number, S: number, C: number }} distribution — percentages
 * @param {Array} profiles — array of profile objects with dominantProfile
 * @param {(profileCode: string) => void} onFilterByProfile
 */
export default function GroupPieChart({ distribution = {}, profiles = [], onFilterByProfile }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const chartRef = useRef(null);

  // Build data from profiles array (more accurate than distribution prop alone)
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  for (const p of profiles) {
    if (p.dominantProfile && counts[p.dominantProfile] !== undefined) {
      counts[p.dominantProfile]++;
    }
  }
  const total = profiles.length;

  // Fallback to distribution prop if no profiles
  const useProfiles = total > 0;
  const data = PROFILE_ORDER.map((key) => {
    const count = useProfiles ? counts[key] : 0;
    const percentage = useProfiles
      ? (total > 0 ? (count / total) * 100 : 0)
      : (distribution[key] ?? 0);
    return {
      key,
      name: PROFILE_CONFIG[key].name,
      value: parseFloat(percentage.toFixed(1)),
      count: useProfiles ? count : Math.round((distribution[key] ?? 0) / 100 * (profiles.length || 0)),
    };
  }).filter((d) => d.value > 0);

  const handlePieClick = useCallback((entry) => {
    const key = entry?.key || entry?.payload?.key;
    if (key) onFilterByProfile?.(key);
  }, [onFilterByProfile]);

  const handleExportPNG = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const svgSize = svgEl.getBoundingClientRect();
    canvas.width = svgSize.width || 300;
    canvas.height = svgSize.height || 300;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#242736';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'distribuicao-perfis.png';
      a.click();
    };
    img.src = url;
  }, []);

  const renderCenterLabel = useCallback(
    ({ cx, cy }) => <CenterLabel cx={cx} cy={cy} total={total || profiles.length} />,
    [total, profiles.length]
  );

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-[#A0A3B1] text-sm">Nenhum dado de perfil disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chart */}
      <div ref={chartRef} className="w-full" style={{ maxWidth: 300 }}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={100}
              dataKey="value"
              paddingAngle={2}
              activeIndex={activeIndex}
              activeShape={ActiveShape}
              animationBegin={0}
              animationDuration={700}
              label={renderCenterLabel}
              labelLine={false}
              onClick={handlePieClick}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: onFilterByProfile ? 'pointer' : 'default' }}
            >
              {data.map(({ key }) => (
                <Cell
                  key={key}
                  fill={PROFILE_CONFIG[key].hex}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full space-y-2">
        {data.map(({ key, value, count }, index) => {
          const conf = PROFILE_CONFIG[key];
          const isActive = activeIndex === index;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterByProfile?.(key)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-xl
                transition-all duration-150 text-left
                ${isActive ? 'bg-[#2D3047]' : 'hover:bg-[#2D3047]/60'}
                ${onFilterByProfile ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: conf.hex }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm font-medium text-[#F7F8FC]">
                {key} — {conf.name}
              </span>
              <span className="text-xs text-[#A0A3B1]">
                {count} {count === 1 ? 'membro' : 'membros'}
              </span>
              <span
                className="text-xs font-bold ml-1"
                style={{ color: conf.hex }}
              >
                {value.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Export button */}
      <button
        type="button"
        onClick={handleExportPNG}
        className="flex items-center gap-1.5 text-xs text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#242736]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exportar PNG
      </button>
    </div>
  );
}
