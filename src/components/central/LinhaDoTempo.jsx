import React, { useMemo } from 'react';
import { getTesteDirigido } from '@/constants/testesDirigidos.js';

// Linha do Tempo de uma pessoa (Central › Pessoas & Histórico, DELTA 25).
// Junta, em ordem cronológica, os ciclos da CONTA (app_profiles + histórico)
// e as avaliações de SESSÃO (link WhatsApp), mostrando D/I/S/C e PQ de cada
// um e o Δ em relação ao ciclo concluído anterior. Só leitura — nada grava.

const PROFILE = {
  D: { nome: 'Dominante', hex: '#EF4444' },
  I: { nome: 'Influente', hex: '#F59E0B' },
  S: { nome: 'Estável',   hex: '#22C55E' },
  C: { nome: 'Analítico', hex: '#6366F1' },
};

function fmtData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
}

// Normaliza conta + sessão num único formato de "evento" da linha do tempo.
export function montarLinhaDoTempo(pessoa) {
  const eventos = [];

  for (const c of pessoa?.conta?.ciclos || []) {
    eventos.push({
      id: `conta-${c.ciclo}`,
      origem: 'conta',
      rotulo: c.atual ? `Ciclo ${c.ciclo} · atual` : `Ciclo ${c.ciclo}`,
      data: c.criadoEm,
      concluido: true,
      diagnostico: c.diagnostico,
    });
  }

  for (const av of pessoa?.avaliacoes || []) {
    eventos.push({
      id: `sessao-${av.avaliadoId}`,
      origem: 'sessao',
      rotulo: av.sessaoTitulo || 'Avaliação avulsa',
      data: av.concluidoEm || av.criadoEm,
      concluido: av.status === 'concluido' || !!av.diagnostico,
      diagnostico: av.diagnostico || null,
    });
  }

  // DELTA 26: testes dirigidos aplicados (conta e avulso) — eventos sem Δ DISC.
  const testes = [
    ...(pessoa?.conta?.testes || []),
    ...(pessoa?.avaliacoes || []).flatMap((av) => av.testes || []),
  ];
  for (const c of testes) {
    if (c.status === 'descartado') continue;
    const t = getTesteDirigido(c.moduloCodigo);
    eventos.push({
      id: `teste-${c.id}`,
      origem: 'teste',
      rotulo: t?.titulo || c.moduloCodigo,
      data: c.concluidoEm || c.criadoEm,
      concluido: c.status === 'concluido',
      diagnostico: null,
      teste: { ...c, subescalas: t?.subescalas || {} },
    });
  }

  eventos.sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));

  // Δ em relação ao evento concluído anterior (com diagnóstico).
  let anterior = null;
  for (const ev of eventos) {
    if (!ev.diagnostico) { ev.delta = null; continue; }
    // Conta criada a partir do link (convertAvaliado copia o perfil): o 1º ciclo
    // da conta repete o resultado da sessão — é migração, não reavaliação.
    if (ev.origem === 'conta' && ev.rotulo.startsWith('Ciclo 1') && anterior?.origem === 'sessao'
        && mesmoResultado(anterior.diagnostico, ev.diagnostico)) {
      ev.migrado = true;
      ev.delta = null;
      anterior = ev;
      continue;
    }
    ev.delta = anterior ? calcularDelta(anterior.diagnostico, ev.diagnostico) : null;
    anterior = ev;
  }
  return eventos;
}

function mesmoResultado(a, b) {
  return ['D', 'I', 'S', 'C'].every(
    (k) => Math.round(Number(a.scores?.[k]) || 0) === Math.round(Number(b.scores?.[k]) || 0),
  ) && a.perfilPrimario === b.perfilPrimario;
}

function calcularDelta(antes, depois) {
  const d = {};
  for (const k of ['D', 'I', 'S', 'C']) {
    d[k] = Math.round((Number(depois.scores?.[k]) || 0) - (Number(antes.scores?.[k]) || 0));
  }
  d.pq = (antes.pqScore != null && depois.pqScore != null)
    ? Math.round(Number(depois.pqScore) - Number(antes.pqScore))
    : null;
  d.mudouPerfil = antes.perfilPrimario !== depois.perfilPrimario;
  return d;
}

function Delta({ valor }) {
  if (valor == null || valor === 0) return <span className="text-[#6B6F80]">—</span>;
  const pos = valor > 0;
  return (
    <span className={pos ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
      {pos ? '▲' : '▼'} {Math.abs(valor)}
    </span>
  );
}

function BarrasDisc({ scores }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {['D', 'I', 'S', 'C'].map((k) => {
        const v = Math.max(0, Math.min(100, Math.round(Number(scores?.[k]) || 0)));
        return (
          <div key={k} className="min-w-0">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="font-semibold" style={{ color: PROFILE[k].hex }}>{PROFILE[k].nome}</span>
              <span className="text-[#A0A3B1]">{v}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#2D3047] overflow-hidden mt-1">
              <div className="h-full rounded-full" style={{ width: `${v}%`, background: PROFILE[k].hex }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LinhaDoTempo({ pessoa }) {
  const eventos = useMemo(() => montarLinhaDoTempo(pessoa), [pessoa]);
  const concluidos = eventos.filter((e) => e.diagnostico).length;

  if (eventos.length === 0) {
    return <p className="text-sm text-[#6B6F80]">Sem avaliações registradas.</p>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs text-[#6B6F80] uppercase tracking-wide">Linha do tempo</p>
        <p className="text-xs text-[#6B6F80]">
          {concluidos} {concluidos === 1 ? 'avaliação concluída' : 'avaliações concluídas'}
          {concluidos >= 2 && ' · Δ em relação à anterior'}
        </p>
      </div>

      <ol className="relative border-l border-[#2D3047] ml-2 space-y-4">
        {eventos.map((ev) => {
          const diag = ev.diagnostico;
          const cor = diag ? PROFILE[diag.perfilPrimario]?.hex || '#6B6F80' : ev.origem === 'teste' ? '#6366F1' : '#2D3047';
          return (
            <li key={ev.id} className="pl-5 relative">
              <span
                className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-[#1A1D2E]"
                style={{ background: cor }}
              />
              <div className="rounded-xl bg-[#0F1117] border border-[#2D3047] p-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[#F7F8FC] font-medium">{ev.rotulo}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#2D3047] text-[#A0A3B1]">
                    {ev.origem === 'conta' ? 'conta' : ev.origem === 'teste' ? 'teste dirigido' : 'link'}
                  </span>
                  <span className="text-[#6B6F80]">{fmtData(ev.data)}</span>
                  {!ev.concluido && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">em aberto</span>
                  )}
                </div>

                {ev.origem === 'teste' ? (
                  <div className="mt-2 text-xs text-[#A0A3B1] space-y-1">
                    {ev.teste.status === 'concluido' && ev.teste.resultado ? (
                      <>
                        <p>Resultado geral <span className="text-[#F7F8FC] font-semibold">{ev.teste.resultado.geral}</span>/100</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(ev.teste.resultado.subescalas || {}).map(([k, v]) => (
                            <span key={k}>{ev.teste.subescalas[k] || k}: <span className="text-[#F7F8FC]">{v ?? '—'}</span></span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p>Aguardando resposta{ev.teste.prazoEm ? ` · prazo ${fmtData(ev.teste.prazoEm)}` : ''}</p>
                    )}
                    <p className="text-[10px] text-[#6B6F80]">regra {ev.teste.regraId}{ev.teste.motorVersao ? ` · motor v${ev.teste.motorVersao}` : ''}</p>
                  </div>
                ) : diag ? (
                  <>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="font-semibold" style={{ color: cor }}>
                        {diag.perfilPrimarioNome}
                      </span>
                      {diag.perfilSecundario && PROFILE[diag.perfilSecundario] && (
                        <span className="text-[#A0A3B1]">/ {PROFILE[diag.perfilSecundario].nome}</span>
                      )}
                      {diag.pqScore != null && (
                        <span className="ml-auto text-xs text-[#A0A3B1]">
                          PQ <span className="text-[#F7F8FC] font-medium">{diag.pqScore}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <BarrasDisc scores={diag.scores} />
                    </div>
                    {ev.migrado && (
                      <p className="mt-2 pt-2 border-t border-[#2D3047] text-[11px] text-[#6B6F80]">
                        Perfil migrado da avaliação por link ao criar a conta — não é uma reavaliação.
                      </p>
                    )}
                    {ev.delta && (
                      <div className="mt-2 pt-2 border-t border-[#2D3047] flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        {['D', 'I', 'S', 'C'].map((k) => (
                          <span key={k} className="text-[#6B6F80]">
                            {k} <Delta valor={ev.delta[k]} />
                          </span>
                        ))}
                        {ev.delta.pq != null && (
                          <span className="text-[#6B6F80]">PQ <Delta valor={ev.delta.pq} /></span>
                        )}
                        {ev.delta.mudouPerfil && (
                          <span className="text-[#F59E0B]">perfil dominante mudou</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-xs text-[#6B6F80]">Sem resultado ainda.</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
