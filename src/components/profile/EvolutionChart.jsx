import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante',  hex: '#EF4444' },
  I: { name: 'Influente',  hex: '#F59E0B' },
  S: { name: 'Estável',    hex: '#22C55E' },
  C: { name: 'Analítico',  hex: '#6366F1' },
};

const PROFILE_KEYS = ['D', 'I', 'S', 'C'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbreviate(title = '', maxLen = 14) {
  if (!title) return '';
  return title.length > maxLen ? title.slice(0, maxLen - 1) + '…' : title;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // Find dominant profile for this data point
  const dominantProfile = payload[0]?.payload?.dominantProfile;

  return (
    <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-3 py-3 shadow-xl min-w-[160px]">
      <p className="text-xs font-semibold text-[#F7F8FC] mb-2 pb-1.5 border-b border-[#2D3047]">
        {label}
      </p>
      {payload.map((entry) => {
        const conf = PROFILE_CONFIG[entry.dataKey];
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: conf?.hex }}
                aria-hidden="true"
              />
              <span className="text-xs text-[#A0A3B1]">{conf?.name || entry.dataKey}</span>
            </div>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: conf?.hex }}
            >
              {entry.value}
            </span>
          </div>
        );
      })}
      {dominantProfile && (
        <p className="text-xs text-[#A0A3B1] mt-2 pt-1.5 border-t border-[#2D3047]">
          Dominante:{' '}
          <span
            className="font-semibold"
            style={{ color: PROFILE_CONFIG[dominantProfile]?.hex }}
          >
            {dominantProfile} — {PROFILE_CONFIG[dominantProfile]?.name}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── Custom Legend ────────────────────────────────────────────────────────────
function CustomLegend({ payload }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
      {payload?.map((entry) => {
        const conf = PROFILE_CONFIG[entry.value] || PROFILE_CONFIG[entry.dataKey];
        return (
          <div key={entry.value} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-1.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: conf?.hex || entry.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-[#A0A3B1]">
              {entry.value} = {conf?.name || entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Custom Dot ───────────────────────────────────────────────────────────────
function CustomDot(props) {
  const { cx, cy, stroke, payload, dataKey } = props;
  const isDominant = payload?.dominantProfile === dataKey;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isDominant ? 5 : 3.5}
      fill={isDominant ? stroke : '#1A1D2E'}
      stroke={stroke}
      strokeWidth={isDominant ? 0 : 2}
    />
  );
}

/**
 * EvolutionChart — timeline evolution chart across modules
 *
 * @param {Array<{ moduleTitle: string, completedAt: any, scores: {D,I,S,C}, dominantProfile: string }>} history
 * @param {boolean} showAllDimensions
 */
export default function EvolutionChart({ history = [], showAllDimensions = true }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-[#A0A3B1] text-sm">Nenhum histórico de avaliações disponível.</p>
      </div>
    );
  }

  // Build chart data
  const chartData = history.map((entry) => ({
    name: abbreviate(entry.moduleTitle || 'Módulo'),
    fullName: entry.moduleTitle || 'Módulo',
    dominantProfile: entry.dominantProfile,
    D: Math.round(entry.scores?.D ?? 0),
    I: Math.round(entry.scores?.I ?? 0),
    S: Math.round(entry.scores?.S ?? 0),
    C: Math.round(entry.scores?.C ?? 0),
  }));

  const isSinglePoint = chartData.length === 1;

  return (
    <div className="w-full">
      {isSinglePoint && (
        <p className="text-xs text-[#A0A3B1] text-center mb-4 px-4 py-2 bg-[#242736] rounded-xl">
          Complete mais avaliações para ver sua evolução ao longo do tempo.
        </p>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            stroke="rgba(45,48,71,0.8)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{
              fill: '#A0A3B1',
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
            }}
            axisLine={{ stroke: '#2D3047' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{
              fill: '#A0A3B1',
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

          {PROFILE_KEYS.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={PROFILE_CONFIG[key].hex}
              strokeWidth={2}
              dot={<CustomDot dataKey={key} />}
              activeDot={{ r: 6, stroke: PROFILE_CONFIG[key].hex, strokeWidth: 2, fill: '#1A1D2E' }}
              animationDuration={600}
              animationBegin={0}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
