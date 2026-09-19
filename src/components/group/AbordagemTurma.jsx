import React, { useEffect, useMemo, useState } from 'react';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import { sugerirAbordagem, sugerirAbordagemTurma } from '@/lib/abordagem.js';
import { TESTES_DIRIGIDOS, getTesteDirigido } from '@/constants/testesDirigidos.js';
import { criarCiclo, getCiclosByAdmin } from '@/firebase/firestore.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';

// Canal TURMA (DELTA 26) — Grupos › Comparativo. Agrega as sugestões
// individuais do motor ("62% da turma → Assertividade") e aplica um Teste
// Dirigido a todo mundo que concluiu, de uma vez: contas veem no Início,
// avulsos ganham link para WhatsApp (listados aqui). Quem já tem o mesmo
// teste aguardando resposta é pulado.

export default function AbordagemTurma({ linhas, groupId, groupName, adminUid }) {
  const [ciclos, setCiclos] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(null);

  const recarregar = async () => {
    if (!adminUid || !groupId) return;
    setCiclos(await getCiclosByAdmin(adminUid, { groupId }));
  };
  useEffect(() => { recarregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminUid, groupId]);

  const perfis = useMemo(() => linhas.map((l) => ({ scores: { D: l.D, I: l.I, S: l.S, C: l.C }, pqScore: l.pq, saboteurScores: l.saboteurScores })), [linhas]);
  const turma = useMemo(() => sugerirAbordagemTurma(perfis, 2), [perfis]);
  const codigoEfetivo = codigo || turma?.modulo?.codigo || TESTES_DIRIGIDOS[0].codigo;
  const teste = getTesteDirigido(codigoEfetivo);

  const chaveDe = (l) => (l.pessoa?.tipo === 'conta' ? `conta:${l.pessoa.uid}` : `avulso:${l.pessoa?.avaliadoId}`);
  const pendentesDoTeste = useMemo(() => {
    const set = new Set();
    for (const c of ciclos) {
      if (c.status !== 'aplicado' || c.moduloCodigo !== codigoEfetivo) continue;
      set.add(c.pessoaTipo === 'conta' ? `conta:${c.uid}` : `avulso:${c.avaliadoId}`);
    }
    return set;
  }, [ciclos, codigoEfetivo]);
  const elegiveis = linhas.filter((l) => l.pessoa && !pendentesDoTeste.has(chaveDe(l)));

  const aplicar = async () => {
    if (!teste || elegiveis.length === 0) return;
    if (!window.confirm(`Aplicar "${teste.titulo}" a ${elegiveis.length} ${elegiveis.length === 1 ? 'pessoa' : 'pessoas'} da turma?`)) return;
    setAplicando(true); setErro(''); setResumo(null);
    let ok = 0; const falhas = [];
    for (const l of elegiveis) {
      try {
        const s = sugerirAbordagem({ scores: { D: l.D, I: l.I, S: l.S, C: l.C }, pqScore: l.pq, saboteurScores: l.saboteurScores });
        const coincide = s?.modulo?.codigo === teste.codigo;
        await criarCiclo({
          adminUid,
          pessoaTipo: l.pessoa.tipo,
          uid: l.pessoa.uid,
          avaliadoId: l.pessoa.avaliadoId,
          pessoaNome: l.pessoa.nome,
          groupId,
          moduloCodigo: teste.codigo,
          moduloVersao: teste.versao,
          regraId: coincide ? `${s.regraId}+TURMA` : 'TURMA',
          motorVersao: s?.versao ?? null,
          justificativa: [`Aplicado à turma "${groupName || ''}"`, ...(coincide ? s.justificativa : [])],
          perfilBaseId: l.pessoa.perfilBaseId || null,
          prazoDias: teste.prazoDias,
        });
        ok += 1;
      } catch (e) { falhas.push(`${l.pessoa.nome}: ${e?.message || 'falha'}`); }
    }
    setResumo({ ok, falhas });
    setAplicando(false);
    setCodigo('');
    await recarregar();
  };

  const linkDe = (c) => `${getPublicBaseUrl()}/teste/${c.token}`;
  const copiar = async (c) => { try { await navigator.clipboard.writeText(linkDe(c)); setCopiado(c.id); setTimeout(() => setCopiado(null), 1500); } catch { /* ok */ } };
  const whatsapp = (c) => {
    const l = linhas.find((x) => x.pessoa?.avaliadoId === c.avaliadoId);
    const numero = (l?.pessoa?.telefone || '').replace(/\D/g, '');
    const t = getTesteDirigido(c.moduloCodigo);
    const msg = encodeURIComponent(`Olá, ${(c.pessoaNome || '').split(' ')[0]}! Como próximo passo do seu desenvolvimento, preparei um teste curto (12 perguntas, ~3 min): *${t?.titulo}*.\n\n🔗 ${linkDe(c)}\n\nDepois conversamos sobre o resultado.`);
    window.open(numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const aguardando = ciclos.filter((c) => c.status === 'aplicado');
  const concluidos = ciclos.filter((c) => c.status === 'concluido');
  const linksAvulsos = aguardando.filter((c) => c.pessoaTipo === 'avulso');

  return (
    <Card variant="default">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Próximo foco da turma</CardTitle>
          <CardDescription>
            {turma?.suppressed
              ? 'Com pelo menos 2 pessoas concluídas o motor sugere um foco coletivo.'
              : turma?.justificativa}
            {turma?.alertaAquiescencia ? ` ${turma.alertaAquiescencia}` : ''}
          </CardDescription>
        </div>
        {ciclos.length > 0 && (
          <p className="text-xs text-[#A0A3B1]">
            {aguardando.length} aguardando · {concluidos.length} concluído{concluidos.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {!turma?.suppressed && turma?.distribuicao?.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {turma.distribuicao.map((d) => (
            <span key={d.codigo} className="text-[11px] px-2 py-0.5 rounded-full bg-[#2D3047] text-[#A0A3B1]">{d.titulo} · {d.pct}%</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <select
          value={codigoEfetivo}
          onChange={(e) => setCodigo(e.target.value)}
          className="bg-[#0F1117] border border-[#2D3047] rounded-xl px-3 py-2 text-sm text-[#F7F8FC] focus:outline-none focus:border-[#6366F1]"
        >
          {TESTES_DIRIGIDOS.map((t) => (
            <option key={t.codigo} value={t.codigo}>{t.titulo}{turma?.modulo?.codigo === t.codigo ? ' (sugerido)' : ''}</option>
          ))}
        </select>
        <Button size="sm" onClick={aplicar} disabled={aplicando || elegiveis.length === 0}>
          {aplicando ? 'Aplicando…' : `Aplicar a ${elegiveis.length} ${elegiveis.length === 1 ? 'pessoa' : 'pessoas'}`}
        </Button>
        {pendentesDoTeste.size > 0 && (
          <span className="text-xs text-[#6B6F80]">{pendentesDoTeste.size} já {pendentesDoTeste.size === 1 ? 'tem' : 'têm'} este teste aguardando resposta</span>
        )}
      </div>
      {erro && <p className="text-xs text-[#EF4444] mt-2">{erro}</p>}
      {resumo && (
        <p className="text-xs text-[#A0A3B1] mt-2">
          Aplicado a {resumo.ok}. {resumo.falhas.length > 0 && `Falhas: ${resumo.falhas.join('; ')}`}
        </p>
      )}

      {linksAvulsos.length > 0 && (
        <div className="mt-4 border-t border-[#2D3047] pt-3">
          <p className="text-xs text-[#6B6F80] uppercase tracking-wide mb-2">Links para enviar (pessoas sem conta)</p>
          <ul className="space-y-1.5">
            {linksAvulsos.map((c) => (
              <li key={c.id} className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-[#F7F8FC]">{c.pessoaNome || '—'}</span>
                <span className="text-xs text-[#6B6F80]">· {getTesteDirigido(c.moduloCodigo)?.titulo}</span>
                <button type="button" onClick={() => whatsapp(c)} className="text-xs px-2 py-1 rounded-lg border border-[#25D366]/60 text-[#25D366]">WhatsApp</button>
                <button type="button" onClick={() => copiar(c)} className="text-xs px-2 py-1 rounded-lg border border-[#2D3047] text-[#A0A3B1]">{copiado === c.id ? 'Copiado ✓' : 'Copiar link'}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
