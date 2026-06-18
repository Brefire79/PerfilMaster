import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Cell,
} from 'recharts';
import useAuthStore from '@/store/authStore.js';
import { getObservabilidadeData } from '@/firebase/firestore.js';
import { computeObservabilidade, formatMinutos } from '@/lib/observabilidade.js';
import { useSuperadmin } from '@/hooks/useSuperadmin.js';

// ─── Helpers de período ─────────────────────────────────────────────────────────
function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
const PERIODOS = [
  { key: '7',   label: '7 dias',  dias: 7 },
  { key: '30',  label: '30 dias', dias: 30 },
  { key: '90',  label: '90 dias', dias: 90 },
  { key: 'all', label: 'Tudo',    dias: null },
];

// ─── UI atoms ────────────────────────────────────────────────────────────────────
function KpiCard({ titulo, valor, sub }) {
  return (
    <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-5">
      <p className="text-[#A0A3B1] text-xs uppercase tracking-wide">{titulo}</p>
      <p className="text-3xl font-heading font-bold text-[#F7F8FC] mt-2">{valor}</p>
      {sub && <p className="text-[#A0A3B1] text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Painel({ titulo, children, hint }) {
  return (
    <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-5">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-[#F7F8FC] font-heading font-semibold">{titulo}</h3>
        {hint && <span className="text-[#6B6F80] text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const FUNIL_CORES = ['#6366F1', '#F59E0B', '#22C55E'];

const tooltipStyle = {
  contentStyle: { background: '#242736', border: '1px solid #2D3047', borderRadius: 12, color: '#F7F8FC' },
  labelStyle: { color: '#A0A3B1' },
};

// ─── Página ──────────────────────────────────────────────────────────────────────
export default function VisaoGeral() {
  const user = useAuthStore((s) => s.user);
  const { isSuperadmin } = useSuperadmin();
  const [periodo, setPeriodo] = useState('30');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  // Superadmin: alterna entre visão global (todas as empresas) e só o seu escopo.
  const [apenasMeu, setApenasMeu] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!user?.uid) return;
    setLoading(true);
    setErro(null);
    // Fonte unificada via RPC: avaliados de sessão + contas de aluno, com escopo
    // (admin = próprio; superadmin = global) resolvido no servidor.
    getObservabilidadeData({ apenasMeu })
      .then((rows) => { if (ativo) setRegistros(rows || []); })
      .catch((e) => { if (ativo) setErro(e.message || 'Falha ao carregar dados.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [user?.uid, apenasMeu]);

  const dados = useMemo(() => {
    const dias = PERIODOS.find((p) => p.key === periodo)?.dias ?? null;
    const fromIso = dias ? isoDaysAgo(dias) : null;
    return computeObservabilidade(registros, { fromIso });
  }, [registros, periodo]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-[#1A1D2E] border border-[#2D3047] animate-pulse" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl bg-[#1A1D2E] border border-[#EF4444]/30 p-6 text-center">
        <p className="text-[#EF4444] font-medium">Não foi possível carregar a Visão Geral</p>
        <p className="text-[#A0A3B1] text-sm mt-1">{erro}</p>
      </div>
    );
  }

  const { totais, funil, abandono, serie, tempoMedioMin, amostraTempo } = dados;

  return (
    <div className="space-y-6">
      {/* Filtros de período */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 rounded-xl bg-[#1A1D2E] border border-[#2D3047] p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodo === p.key
                  ? 'bg-[#6366F1] text-white'
                  : 'text-[#A0A3B1] hover:text-[#F7F8FC]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isSuperadmin && (
        <div className="rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/25 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-[#A5B4FC]">
            {apenasMeu
              ? 'Mostrando apenas o seu escopo.'
              : 'Visão global: agregando todas as empresas-cliente (todos os facilitadores).'}
          </span>
          <div className="flex gap-1 rounded-lg bg-[#0F1117]/40 p-1">
            <button
              onClick={() => setApenasMeu(false)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                !apenasMeu ? 'bg-[#6366F1] text-white' : 'text-[#A0A3B1] hover:text-[#F7F8FC]'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setApenasMeu(true)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                apenasMeu ? 'bg-[#6366F1] text-white' : 'text-[#A0A3B1] hover:text-[#F7F8FC]'
              }`}
            >
              Meu escopo
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Avaliações iniciadas" valor={totais.iniciadas} sub={`${totais.total} criadas no período`} />
        <KpiCard titulo="Concluídas" valor={totais.concluidas} />
        <KpiCard titulo="Taxa de conclusão" valor={`${totais.taxaConclusao}%`} sub="concluídas ÷ iniciadas" />
        <KpiCard
          titulo="Tempo médio até concluir"
          valor={formatMinutos(tempoMedioMin)}
          sub={amostraTempo > 0 ? `amostra de ${amostraTempo}` : 'sem dados de tempo'}
        />
      </div>

      {/* Funil + Série temporal */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Painel titulo="Funil de conclusão" hint="criadas → iniciadas → concluídas">
          {totais.total === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funil} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" horizontal={false} />
                <XAxis type="number" stroke="#A0A3B1" allowDecimals={false} />
                <YAxis type="category" dataKey="etapa" stroke="#A0A3B1" width={80} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {funil.map((_, i) => <Cell key={i} fill={FUNIL_CORES[i % FUNIL_CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Painel>

        <Painel titulo="Volume por dia" hint="criadas vs. concluídas">
          {serie.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={serie} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="gCriadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gConcluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" />
                <XAxis dataKey="dia" stroke="#A0A3B1" tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#A0A3B1" allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="criadas" stroke="#6366F1" fill="url(#gCriadas)" name="Criadas" />
                <Area type="monotone" dataKey="concluidas" stroke="#22C55E" fill="url(#gConcluidas)" name="Concluídas" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Painel>
      </div>

      {/* Onde as pessoas param (status macro) */}
      <Painel titulo="Onde as pessoas param" hint="status do fluxo">
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          <StatusPill cor="#F59E0B" label="Pendentes" valor={abandono.pendentes} />
          <StatusPill cor="#6366F1" label="Em andamento" valor={abandono.emAndamento} />
          <StatusPill cor="#22C55E" label="Concluídas" valor={abandono.concluidas} />
        </div>
        <p className="text-[#6B6F80] text-xs mt-4">
          O funil por etapa do wizard (DISC vs. Sabotadores) exige instrumentação por etapa —
          previsto para uma fase futura. Hoje rastreamos o status macro acima.
        </p>
      </Painel>
    </div>
  );
}

function StatusPill({ cor, label, valor }) {
  return (
    <div className="rounded-xl bg-[#242736] p-4 text-center">
      <p className="text-2xl font-heading font-bold" style={{ color: cor }}>{valor}</p>
      <p className="text-[#A0A3B1] text-xs mt-1">{label}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[240px] text-[#6B6F80] text-sm">
      Sem dados no período selecionado.
    </div>
  );
}
