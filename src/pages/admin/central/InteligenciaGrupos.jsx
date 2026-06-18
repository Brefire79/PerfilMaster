import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import { getGroupInsights } from '@/firebase/firestore.js';
import { useSuperadmin } from '@/hooks/useSuperadmin.js';
import { SABOTEUR_LABELS, SABOTEUR_KEYS } from '@/lib/saboteurScoring.js';

// ─── DISC ────────────────────────────────────────────────────────────────────────
const DISC = [
  { key: 'D', nome: 'Dominante', hex: '#EF4444' },
  { key: 'I', nome: 'Influente', hex: '#F59E0B' },
  { key: 'S', nome: 'Estável',   hex: '#22C55E' },
  { key: 'C', nome: 'Analítico', hex: '#6366F1' },
];
// Paleta para distinguir grupos no radar/legendas.
const GROUP_COLORS = ['#6366F1', '#F59E0B', '#22C55E', '#EF4444', '#A5B4FC', '#14B8A6'];

const tooltipStyle = {
  contentStyle: { background: '#242736', border: '1px solid #2D3047', borderRadius: 12, color: '#F7F8FC' },
  labelStyle: { color: '#A0A3B1' },
};

function SemDadosPq() {
  return (
    <div className="flex items-center justify-center h-[200px] text-center text-[#6B6F80] text-sm px-4">
      Sem dados de PQ/Sabotadores neste escopo ainda (gerados ao concluir a avaliação completa pela conta de aluno).
    </div>
  );
}

function Painel({ titulo, hint, children }) {
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

export default function InteligenciaGrupos() {
  const { isSuperadmin } = useSuperadmin();
  const [minN, setMinN] = useState(5);
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [empresa, setEmpresa] = useState('todas'); // filtro superadmin (adminuid)

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro(null);
    getGroupInsights(minN)
      .then((rows) => { if (ativo) setLinhas(rows || []); })
      .catch((e) => { if (ativo) setErro(e.message || 'Falha ao carregar.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [minN]);

  // Lista de "empresas-cliente" (= facilitadores) para o filtro do superadmin.
  const empresas = useMemo(() => {
    const set = new Set(linhas.map((l) => l.adminuid).filter(Boolean));
    return [...set];
  }, [linhas]);

  const visiveis = useMemo(() => {
    if (!isSuperadmin || empresa === 'todas') return linhas;
    return linhas.filter((l) => l.adminuid === empresa);
  }, [linhas, isSuperadmin, empresa]);

  const comAmostra = visiveis.filter((l) => !l.suppressed);
  const suprimidos = visiveis.filter((l) => l.suppressed);

  // Dataset do comparativo de conclusão.
  const dadosConclusao = comAmostra.map((l) => ({
    nome: l.group_name,
    taxa: l.taxa_conclusao,
    participantes: l.n_participantes,
  }));

  // Dataset do radar: um eixo por dimensão DISC, uma série por grupo (média).
  const dadosRadar = DISC.map((d) => {
    const ponto = { dim: d.nome };
    comAmostra.forEach((l) => {
      ponto[l.group_name] = Number(l.disc_scores_avg?.[d.key] ?? 0);
    });
    return ponto;
  });

  // Dataset da distribuição DISC empilhada (contagem por letra).
  const dadosDist = comAmostra.map((l) => ({
    nome: l.group_name,
    D: Number(l.disc_distribution?.D ?? 0),
    I: Number(l.disc_distribution?.I ?? 0),
    S: Number(l.disc_distribution?.S ?? 0),
    C: Number(l.disc_distribution?.C ?? 0),
  }));

  // PQ Score / Sabotadores (DELTA 17): só grupos que têm dados de conta de aluno.
  const comPq = comAmostra.filter((l) => l.pq_score_avg != null);
  const comSab = comAmostra.filter((l) => l.saboteurs_avg);
  const dadosPq = comPq.map((l) => ({ nome: l.group_name, pq: Number(l.pq_score_avg) }));
  // Bar por sabotador (X), uma série por grupo com dados.
  const dadosSab = SABOTEUR_KEYS.map((k) => {
    const ponto = { sab: SABOTEUR_LABELS[k] || k };
    comSab.forEach((l) => { ponto[l.group_name] = Number(l.saboteurs_avg?.[k] ?? 0); });
    return ponto;
  });

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-[#1A1D2E] border border-[#2D3047] animate-pulse" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl bg-[#1A1D2E] border border-[#EF4444]/30 p-6 text-center">
        <p className="text-[#EF4444] font-medium">Não foi possível carregar a Inteligência de Grupos</p>
        <p className="text-[#A0A3B1] text-sm mt-1">{erro}</p>
        <p className="text-[#6B6F80] text-xs mt-2">
          Verifique se o DELTA 15 (<code>central_group_insights</code>) foi aplicado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[#A0A3B1] text-sm">k-anonimato (mín. participantes):</span>
          <div className="flex gap-1 rounded-xl bg-[#1A1D2E] border border-[#2D3047] p-1">
            {[5, 10].map((v) => (
              <button
                key={v}
                onClick={() => setMinN(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  minN === v ? 'bg-[#6366F1] text-white' : 'text-[#A0A3B1] hover:text-[#F7F8FC]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {isSuperadmin && empresas.length > 1 && (
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-3 py-2 text-sm text-[#F7F8FC] focus:outline-none focus:border-[#6366F1]"
          >
            <option value="todas">Todas as empresas-cliente</option>
            {empresas.map((a, i) => (
              <option key={a} value={a}>Facilitador {i + 1}</option>
            ))}
          </select>
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-8 text-center text-[#6B6F80]">
          Nenhum grupo no escopo.
        </div>
      ) : comAmostra.length === 0 ? (
        <div className="rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 p-6 text-center">
          <p className="text-[#F59E0B] font-medium">Amostra insuficiente</p>
          <p className="text-[#A0A3B1] text-sm mt-1">
            Nenhum grupo atinge o mínimo de {minN} participantes para exibir agregados anonimizados.
          </p>
        </div>
      ) : (
        <>
          {/* Comparativo de conclusão */}
          <Painel titulo="Taxa de conclusão por grupo" hint={`grupos com ≥ ${minN} participantes`}>
            <ResponsiveContainer width="100%" height={Math.max(160, dadosConclusao.length * 48)}>
              <BarChart data={dadosConclusao} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#A0A3B1" unit="%" />
                <YAxis type="category" dataKey="nome" stroke="#A0A3B1" width={120} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#ffffff08' }} formatter={(v) => `${v}%`} />
                <Bar dataKey="taxa" radius={[0, 6, 6, 0]} fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </Painel>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Radar DISC médio */}
            <Painel titulo="Perfil DISC médio (radar)" hint="média dos scores por grupo">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={dadosRadar} outerRadius="70%">
                  <PolarGrid stroke="#2D3047" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: '#A0A3B1', fontSize: 12 }} />
                  {comAmostra.map((l, i) => (
                    <Radar
                      key={l.group_id}
                      name={l.group_name}
                      dataKey={l.group_name}
                      stroke={GROUP_COLORS[i % GROUP_COLORS.length]}
                      fill={GROUP_COLORS[i % GROUP_COLORS.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12, color: '#A0A3B1' }} />
                  <Tooltip {...tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </Painel>

            {/* Distribuição DISC empilhada */}
            <Painel titulo="Distribuição DISC por grupo" hint="contagem de perfis primários">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosDist} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" />
                  <XAxis dataKey="nome" stroke="#A0A3B1" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#A0A3B1" allowDecimals={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {DISC.map((d) => (
                    <Bar key={d.key} dataKey={d.key} stackId="disc" fill={d.hex} name={d.nome} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Painel>
          </div>
        </>
      )}

      {/* Grupos com amostra insuficiente (k-anonimato) */}
      {suprimidos.length > 0 && (
        <Painel titulo="Amostra insuficiente" hint={`< ${minN} participantes`}>
          <div className="flex flex-wrap gap-2">
            {suprimidos.map((l) => (
              <span
                key={l.group_id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242736] text-sm text-[#A0A3B1]"
              >
                {l.group_name}
                <span className="text-[#6B6F80] text-xs">({l.n_participantes})</span>
              </span>
            ))}
          </div>
          <p className="text-[#6B6F80] text-xs mt-3">
            Para proteger a identidade, grupos abaixo do limiar não têm agregados exibidos.
          </p>
        </Painel>
      )}

      {/* PQ Score & Sabotadores (DELTA 17) — só contas de aluno que concluíram */}
      {comAmostra.length > 0 && (comPq.length > 0 || comSab.length > 0) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Painel titulo="PQ Score médio por grupo" hint="0–100 · só contas de aluno">
            {dadosPq.length === 0 ? (
              <SemDadosPq />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, dadosPq.length * 48)}>
                <BarChart data={dadosPq} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#A0A3B1" />
                  <YAxis type="category" dataKey="nome" stroke="#A0A3B1" width={120} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="pq" radius={[0, 6, 6, 0]} fill="#22C55E" name="PQ Score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Painel>

          <Painel titulo="Sabotadores (intensidade média)" hint="0–100 por grupo">
            {comSab.length === 0 ? (
              <SemDadosPq />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosSab} margin={{ left: -16, right: 8, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3047" />
                  <XAxis dataKey="sab" stroke="#A0A3B1" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} stroke="#A0A3B1" />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {comSab.map((l, i) => (
                    <Bar key={l.group_id} dataKey={l.group_name} fill={GROUP_COLORS[i % GROUP_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Painel>
        </div>
      ) : (
        <Painel titulo="PQ Score & Sabotadores (agregados)" hint="aguardando coleta">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-2">📊</span>
            <p className="text-[#A0A3B1] text-sm max-w-lg">
              Ainda não há contas de aluno concluídas (após o DELTA 17) com PQ Score e Sabotadores
              persistidos neste escopo. Assim que novas avaliações completas forem feitas pela
              conta de aluno, os agregados aparecem aqui (com o mesmo k-anonimato).
            </p>
          </div>
        </Painel>
      )}
    </div>
  );
}
