import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import AbordagemTurma from '@/components/group/AbordagemTurma.jsx';
import {
  getUsersByGroup, getProfilesByUids, getSessoesByAdmin, getAvaliadosByAdmin,
} from '@/firebase/firestore.js';

// DELTA 24 — Comparativo da turma (Fase 3): uma linha por pessoa que concluiu,
// juntando as duas portas (conta → app_profiles; celular → app_avaliados da
// sessão do grupo). Ordenável por qualquer coluna, médias no rodapé,
// distribuição por perfil dominante e exportação CSV (abre direto no Excel).

const DISC = {
  D: { nome: 'Dominante', cor: '#EF4444' },
  I: { nome: 'Influente', cor: '#F59E0B' },
  S: { nome: 'Estável', cor: '#22C55E' },
  C: { nome: 'Analítico', cor: '#6366F1' },
};
const LETRAS = ['D', 'I', 'S', 'C'];

function n(v) {
  const x = Math.round(Number(v));
  return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : null;
}

function paraDate(v) {
  const d = v?.toDate ? v.toDate() : (v ? new Date(v) : null);
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function fmtData(v) {
  const d = paraDate(v);
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
}

function inferir(scores) {
  const ord = LETRAS.map((k) => [k, scores[k] ?? -1]).sort((a, b) => b[1] - a[1]);
  const dom = ord[0][0];
  const sec = ord[1] && ord[1][1] >= ord[0][1] * 0.8 ? ord[1][0] : null;
  return { dom, sec };
}

/** Monta as linhas a partir das duas fontes. */
function montarLinhas({ membros, perfis, avaliados, groupId }) {
  const linhas = [];
  const porUid = new Map(perfis.map((p) => [p.uid, p]));
  for (const m of membros) {
    const p = porUid.get(m.uid);
    if (!p || !p.scores) continue;
    const scores = { D: n(p.scores.D), I: n(p.scores.I), S: n(p.scores.S), C: n(p.scores.C) };
    if (LETRAS.every((k) => scores[k] == null)) continue;
    const inf = inferir(scores);
    linhas.push({
      chave: `conta:${m.uid}`,
      // DELTA 26: identidade + sabotadores para aplicar Testes Dirigidos à turma
      pessoa: { tipo: 'conta', uid: m.uid, nome: m.displayName || m.name || m.email || '—', telefone: m.phoneNumber || m.telefone || '', perfilBaseId: p.id || null },
      saboteurScores: p.saboteurScores || null,
      nome: m.displayName || m.name || m.email || '—',
      contato: m.email || '',
      origem: 'Conta',
      anterior: !!(p.groupId && groupId && p.groupId !== groupId), // perfil de outro contexto
      ...scores,
      dom: LETRAS.includes(p.dominantProfile) ? p.dominantProfile : inf.dom,
      sec: LETRAS.includes(p.secondaryProfile) ? p.secondaryProfile : inf.sec,
      pq: n(p.pqScore),
      data: p.updatedAt || p.createdAt || null,
      link: `/admin/relatorio/aluno/${m.uid}`,
    });
  }
  for (const a of avaliados) {
    const pf = a.perfil || {};
    const scores = { D: n(pf.dominante), I: n(pf.influente), S: n(pf.estavel), C: n(pf.analitico) };
    if (LETRAS.every((k) => scores[k] == null)) continue;
    const inf = inferir(scores);
    linhas.push({
      chave: `avulso:${a.token}`,
      pessoa: { tipo: 'avulso', avaliadoId: a.id, nome: a.nome || '—', telefone: a.telefone ? String(a.telefone) : '' },
      saboteurScores: pf.saboteurScores || null,
      nome: a.nome || '—',
      contato: a.telefone ? String(a.telefone) : (a.email || ''),
      origem: 'Celular',
      anterior: false,
      ...scores,
      dom: LETRAS.includes(pf.perfilPrimario) ? pf.perfilPrimario : inf.dom,
      sec: LETRAS.includes(pf.perfilSecundario) ? pf.perfilSecundario : inf.sec,
      pq: n(pf.pqScore),
      data: a.concluidoEm || a.atualizadoEm || null,
      link: `/admin/relatorio/${a.token}`,
    });
  }
  return linhas;
}

function media(linhas, campo) {
  const vals = linhas.map((l) => l[campo]).filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportarCsv(linhas, nomeTurma) {
  const cab = ['Nome', 'Contato', 'Origem', 'Perfil dominante', 'Perfil secundário', 'D', 'I', 'S', 'C', 'PQ Score', 'Concluído em', 'Observação'];
  const corpo = linhas.map((l) => [
    l.nome, l.contato, l.origem, DISC[l.dom]?.nome || l.dom, l.sec ? DISC[l.sec]?.nome : '',
    l.D ?? '', l.I ?? '', l.S ?? '', l.C ?? '', l.pq ?? '', fmtData(l.data), l.anterior ? 'perfil anterior à turma' : '',
  ]);
  const med = ['MÉDIA DA TURMA', '', '', '', '', media(linhas, 'D') ?? '', media(linhas, 'I') ?? '', media(linhas, 'S') ?? '', media(linhas, 'C') ?? '', media(linhas, 'pq') ?? '', '', ''];
  // BOM + ';' → Excel pt-BR abre em colunas com acentos certos
  const texto = '﻿' + [cab, ...corpo, med].map((r) => r.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = String(nomeTurma || 'turma').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  a.download = `comparativo-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const COLUNAS = [
  { k: 'nome', label: 'Pessoa', alinha: 'left' },
  { k: 'dom', label: 'Perfil', alinha: 'left' },
  { k: 'D', label: 'D', cor: DISC.D.cor },
  { k: 'I', label: 'I', cor: DISC.I.cor },
  { k: 'S', label: 'S', cor: DISC.S.cor },
  { k: 'C', label: 'C', cor: DISC.C.cor },
  { k: 'pq', label: 'PQ' },
  { k: 'data', label: 'Concluído' },
];

export default function ComparativoTurma({ groupId, groupName, adminUid }) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [ordem, setOrdem] = useState({ k: 'nome', asc: true });
  const [filtroDom, setFiltroDom] = useState(null);
  const [incluirAnteriores, setIncluirAnteriores] = useState(true);

  useEffect(() => {
    if (!groupId) return undefined;
    let cancel = false;
    (async () => {
      setCarregando(true);
      setErro('');
      try {
        const membros = await getUsersByGroup(groupId).catch(() => []);
        const [perfis, sessoes, todosAvaliados] = await Promise.all([
          getProfilesByUids(membros.map((m) => m.uid)).catch(() => []),
          adminUid ? getSessoesByAdmin(adminUid).catch(() => []) : [],
          adminUid ? getAvaliadosByAdmin(adminUid).catch(() => []) : [],
        ]);
        const sessoesDoGrupo = new Set(sessoes.filter((s) => (s.groupId || null) === groupId).map((s) => s.id));
        // Avulsos concluídos da sessão do grupo; convertidos em conta já aparecem como conta
        const avaliados = todosAvaliados.filter((a) => sessoesDoGrupo.has(a.sessaoId) && a.status === 'concluido' && !a.convertedUid);
        if (!cancel) setLinhas(montarLinhas({ membros, perfis, avaliados, groupId }));
      } catch (e) {
        if (!cancel) setErro(e?.message || 'Não foi possível montar o comparativo.');
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => { cancel = true; };
  }, [groupId, adminUid]);

  const visiveis = useMemo(() => {
    let v = linhas.filter((l) => incluirAnteriores || !l.anterior);
    if (filtroDom) v = v.filter((l) => l.dom === filtroDom);
    const { k, asc } = ordem;
    const dir = asc ? 1 : -1;
    return [...v].sort((a, b) => {
      let x = a[k]; let y = b[k];
      if (k === 'data') { x = paraDate(x)?.getTime() ?? 0; y = paraDate(y)?.getTime() ?? 0; }
      if (k === 'dom') { x = LETRAS.indexOf(x); y = LETRAS.indexOf(y); }
      if (typeof x === 'string' || typeof y === 'string') return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR') * dir;
      return ((x ?? -1) - (y ?? -1)) * dir;
    });
  }, [linhas, ordem, filtroDom, incluirAnteriores]);

  const base = linhas.filter((l) => incluirAnteriores || !l.anterior);
  const distribuicao = LETRAS.map((k) => ({ k, qtd: base.filter((l) => l.dom === k).length }));
  const temAnteriores = linhas.some((l) => l.anterior);

  const ordenar = (k) => setOrdem((o) => (o.k === k ? { k, asc: !o.asc } : { k, asc: k === 'nome' || k === 'dom' }));

  if (carregando) {
    return <Card variant="default"><p className="text-sm text-[#A0A3B1]">Montando o comparativo…</p></Card>;
  }
  if (erro) {
    return <Card variant="default"><p className="text-sm text-[#EF4444]">{erro}</p></Card>;
  }
  if (linhas.length === 0) {
    return (
      <Card variant="default">
        <CardTitle>Comparativo da turma</CardTitle>
        <CardDescription>Ninguém concluiu a avaliação ainda. Assim que os resultados entrarem, a tabela aparece aqui.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* DELTA 26: próximo foco da turma + aplicação em lote */}
      <AbordagemTurma linhas={base} groupId={groupId} groupName={groupName} adminUid={adminUid} />

      {/* Distribuição + ações */}
      <Card variant="default">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Comparativo da turma</CardTitle>
            <CardDescription>{base.length} {base.length === 1 ? 'pessoa' : 'pessoas'} com resultado · clique no cabeçalho para ordenar</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportarCsv(visiveis, groupName)}>
            Exportar CSV (Excel)
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {distribuicao.map(({ k, qtd }) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltroDom((f) => (f === k ? null : k))}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filtroDom === k ? 'border-[#F7F8FC] text-[#F7F8FC]' : 'border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC]',
              )}
              style={{ background: `${DISC[k].cor}14` }}
            >
              <span className="w-5 h-5 rounded-md text-[10px] font-bold text-white grid place-items-center" style={{ background: DISC[k].cor }}>{k}</span>
              {DISC[k].nome} <strong className="text-[#F7F8FC]">{qtd}</strong>
            </button>
          ))}
          {filtroDom && (
            <button type="button" onClick={() => setFiltroDom(null)} className="text-xs text-[#6366F1] hover:underline">limpar filtro</button>
          )}
          {temAnteriores && (
            <label className="ml-auto flex items-center gap-2 text-xs text-[#A0A3B1] cursor-pointer">
              <input type="checkbox" checked={incluirAnteriores} onChange={(e) => setIncluirAnteriores(e.target.checked)} className="accent-[#6366F1]" />
              incluir perfis anteriores à turma
            </label>
          )}
        </div>
      </Card>

      {/* Tabela */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-xs text-[#A0A3B1] border-b border-[#2D3047]">
                {COLUNAS.map((c) => (
                  <th
                    key={c.k}
                    onClick={() => ordenar(c.k)}
                    className={clsx('px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap hover:text-[#F7F8FC]', c.alinha === 'left' ? 'text-left' : 'text-right')}
                    style={c.cor ? { color: c.cor } : undefined}
                  >
                    {c.label}{ordem.k === c.k ? (ordem.asc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr key={l.chave} className="border-b border-[#2D3047]/60 hover:bg-[#1A1D2E]">
                  <td className="px-3 py-2">
                    <Link to={l.link} className="text-[#F7F8FC] hover:text-[#6366F1] font-medium">{l.nome}</Link>
                    <div className="text-xs text-[#A0A3B1] flex items-center gap-1.5 flex-wrap">
                      <span>{l.origem}</span>
                      {l.anterior && <Badge variant="warning" size="sm" pill>perfil anterior</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md text-[10px] font-bold text-white grid place-items-center" style={{ background: DISC[l.dom]?.cor }}>{l.dom}</span>
                      <span className="text-[#F7F8FC]">{DISC[l.dom]?.nome}</span>
                      {l.sec && <span className="text-xs text-[#A0A3B1]">/ {l.sec}</span>}
                    </span>
                  </td>
                  {LETRAS.map((k) => (
                    <td key={k} className="px-3 py-2 text-right tabular-nums" style={{ color: l.dom === k ? DISC[k].cor : undefined }}>
                      {l[k] ?? '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums text-[#F7F8FC]">{l.pq ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-xs text-[#A0A3B1] whitespace-nowrap">{fmtData(l.data)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs font-semibold text-[#F7F8FC] bg-[#1A1D2E]">
                <td className="px-3 py-2" colSpan={2}>Média ({visiveis.length})</td>
                {LETRAS.map((k) => <td key={k} className="px-3 py-2 text-right tabular-nums">{media(visiveis, k) ?? '—'}</td>)}
                <td className="px-3 py-2 text-right tabular-nums">{media(visiveis, 'pq') ?? '—'}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
