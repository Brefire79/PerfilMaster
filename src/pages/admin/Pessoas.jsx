import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import { getPessoas, autoVincularPorCpf, deleteIdentityLink } from '@/firebase/firestore.js';
import { maskCpf } from '@/lib/cpf.js';
import Card from '@/components/ui/Card.jsx';
import Input from '@/components/ui/Input.jsx';

const PROFILE_COLORS = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };

// Rótulo + cor de cada origem onde a pessoa aparece.
const ORIGEM_META = {
  sessao: { label: 'Sessão', cor: '#818CF8' },
  grupo: { label: 'Grupo', cor: '#22C55E' },
  aluno: { label: 'Aluno', cor: '#F59E0B' },
};

const VINCULO_META = {
  auto: { label: 'Unificado (CPF)', cor: '#6366F1' },
  manual: { label: 'Unificado (manual)', cor: '#22C55E' },
  isolado: { label: '', cor: '' },
};

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

function fmtData(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-2 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[#2D3047] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-[#2D3047]" />
        <div className="h-3 w-48 rounded bg-[#2D3047]" />
      </div>
      <div className="h-5 w-16 rounded bg-[#2D3047]" />
      <div className="h-5 w-20 rounded bg-[#2D3047]" />
    </div>
  );
}

export default function Pessoas() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [pessoas, setPessoas] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [search, setSearch] = useState('');
  const [selecionada, setSelecionada] = useState(null);

  const carregar = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setErro('');
    try {
      // Híbrido (PRD §4 caso A): materializa vínculos por CPF idêntico antes de listar.
      try { await autoVincularPorCpf(user.uid); }
      catch (e) { if (import.meta.env.DEV) console.warn('[Pessoas] autoVincularPorCpf:', e?.message); }

      const { pessoas: lista, sugestoes: sug } = await getPessoas(user.uid);
      setPessoas(lista);
      setSugestoes(sug);
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar pessoas.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = pessoas;
    if (q) {
      list = list.filter((p) =>
        (p.nome || '').toLowerCase().includes(q) ||
        (p.conta?.email || '').toLowerCase().includes(q) ||
        (p.cpf ? maskCpf(p.cpf).includes(q) : false)
      );
    }
    // Ordena: com diagnóstico primeiro, depois alfabético.
    return [...list].sort((a, b) => {
      if (!!b.diagnostico - !!a.diagnostico) return !!b.diagnostico - !!a.diagnostico;
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });
  }, [pessoas, search]);

  const handleDesvincular = async (linkId) => {
    try {
      await deleteIdentityLink(linkId);
      setSelecionada(null);
      await carregar();
    } catch (e) {
      setErro(e?.message || 'Não foi possível desvincular.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">Central de Pessoas</h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            Cada pessoa física uma única vez — sessão, grupo e conta unificados por CPF.
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          title="Atualizar"
          className="w-9 h-9 rounded-xl border border-[#2D3047] bg-[#1A1C2A] flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#6366F1] transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Busca */}
      <Input
        placeholder="Buscar por nome, e-mail ou CPF..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />

      {erro && (
        <div className="px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">{erro}</div>
      )}

      {/* Possíveis duplicatas por nome (caso C — advisory) */}
      {!loading && sugestoes.length > 0 && (
        <Card variant="default">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} className="w-4 h-4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#F7F8FC]">Possíveis duplicatas</h3>
              <p className="text-xs text-[#A0A3B1] mt-0.5 mb-3">
                Mesmo nome sem CPF para confirmar. Informe o CPF nas duas para unificar automaticamente.
              </p>
              <ul className="space-y-2">
                {sugestoes.map((s) => (
                  <li key={s.chave} className="text-xs text-[#A0A3B1] flex flex-wrap items-center gap-2">
                    <strong className="text-[#F7F8FC]">{s.nome}</strong>
                    <span className="opacity-60">aparece em</span>
                    {s.pessoas.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#242736] border border-[#2D3047]">
                        {p.origem.map((o) => ORIGEM_META[o]?.label || o).join(' · ')}
                        {p.temCpf ? ` · CPF ${maskCpf(p.cpf)}` : ' · sem CPF'}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Lista */}
      <Card variant="default" bodyClassName="p-0">
        <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#2D3047] text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
          <span>Nome</span>
          <span>Onde aparece</span>
          <span>Diagnóstico</span>
          <span></span>
        </div>

        {loading && (
          <div className="divide-y divide-[#2D3047] px-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && pessoas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-7 h-7">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-[#A0A3B1] text-sm font-medium">Nenhuma pessoa ainda.</p>
            <p className="text-[#A0A3B1] text-xs mt-1">Crie sessões/avaliados ou convide alunos para vê-los aqui.</p>
          </div>
        )}

        {!loading && pessoas.length > 0 && filtradas.length === 0 && (
          <div className="py-12 text-center px-5"><p className="text-[#A0A3B1] text-sm">Nenhum resultado.</p></div>
        )}

        {!loading && filtradas.length > 0 && (
          <div className="divide-y divide-[#2D3047]">
            {filtradas.map((p) => {
              const diag = p.diagnostico;
              const cor = diag ? PROFILE_COLORS[diag.perfilPrimario] : null;
              const vMeta = VINCULO_META[p.vinculo];
              return (
                <button
                  key={p.id}
                  onClick={() => setSelecionada(p)}
                  className="w-full text-left group flex flex-col md:grid md:grid-cols-[2fr_1.5fr_1fr_auto] items-start md:items-center gap-2 md:gap-4 px-5 py-3.5 hover:bg-[#1A1D2E]/50 transition-colors"
                >
                  {/* Nome + CPF */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: cor ? `${cor}20` : '#2D3047', color: cor || '#A0A3B1' }}
                      aria-hidden="true"
                    >
                      {getInitials(p.nome)}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm text-[#F7F8FC] font-medium truncate">{p.nome}</span>
                      {p.temCpf && <span className="block text-xs text-[#A0A3B1]">CPF {maskCpf(p.cpf)}</span>}
                    </div>
                  </div>

                  {/* Origens + vínculo */}
                  <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                    {p.origem.map((o) => {
                      const m = ORIGEM_META[o] || { label: o, cor: '#A0A3B1' };
                      return (
                        <span key={o} className="inline-flex items-center gap-1 text-xs text-[#A0A3B1]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor }} aria-hidden="true" />
                          {m.label}
                        </span>
                      );
                    })}
                    {vMeta?.label && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                        style={{ color: vMeta.cor, backgroundColor: `${vMeta.cor}15`, borderColor: `${vMeta.cor}40` }}
                      >
                        {vMeta.label}
                      </span>
                    )}
                  </div>

                  {/* Diagnóstico */}
                  <div className="pl-12 md:pl-0">
                    {diag ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{ color: cor, backgroundColor: `${cor}15`, borderColor: `${cor}40` }}
                      >
                        {diag.perfilPrimarioNome}
                        {diag.pqScore != null && <span className="opacity-80">· PQ {diag.pqScore}</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-[#A0A3B1]/70 italic">Sem avaliação concluída</span>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="hidden md:flex items-center justify-end text-[#A0A3B1] group-hover:text-[#6366F1]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="9 18 15 12 9 6" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Detalhe da pessoa (slideover) ───────────────────────────── */}
      {selecionada && (
        <PessoaDetalhe
          pessoa={selecionada}
          onClose={() => setSelecionada(null)}
          onDesvincular={handleDesvincular}
          onAbrirRelatorio={(token) => navigate(`/admin/relatorio/${token}`)}
          onAbrirRelatorioAluno={(uid) => navigate(`/admin/relatorio/aluno/${uid}`)}
        />
      )}
    </div>
  );
}

// ─── Slideover de detalhe ──────────────────────────────────────────────────────
function PessoaDetalhe({ pessoa, onClose, onDesvincular, onAbrirRelatorio, onAbrirRelatorioAluno }) {
  const diag = pessoa.diagnostico;
  const cor = diag ? PROFILE_COLORS[diag.perfilPrimario] : '#A0A3B1';
  const avaliacoesConcluidas = pessoa.avaliacoes.filter((a) => a.status === 'concluido' || a.diagnostico);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md bg-[#1A1D2E] border-l border-[#2D3047] h-full overflow-y-auto animate-slide-down">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#2D3047] sticky top-0 bg-[#1A1D2E] z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: `${cor}20`, color: cor }}>
              {getInitials(pessoa.nome)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-heading font-semibold text-[#F7F8FC] truncate">{pessoa.nome}</h2>
              {pessoa.temCpf && <p className="text-xs text-[#A0A3B1]">CPF {maskCpf(pessoa.cpf)}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Diagnóstico consolidado */}
          <div>
            <h3 className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2">Diagnóstico consolidado</h3>
            {diag ? (
              <div className="rounded-xl border border-[#2D3047] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{ color: cor, backgroundColor: `${cor}15`, borderColor: `${cor}40` }}>
                    {diag.perfilPrimarioNome}
                  </span>
                  {diag.pqScore != null && <span className="text-xs text-[#A0A3B1]">PQ Score {diag.pqScore}/100</span>}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['D', 'I', 'S', 'C'].map((k) => (
                    <div key={k} className="text-center">
                      <div className="text-sm font-bold" style={{ color: PROFILE_COLORS[k] }}>{Math.round(diag.scores[k] ?? 0)}</div>
                      <div className="text-[10px] text-[#A0A3B1]">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#A0A3B1] italic">Sem avaliação concluída ainda.</p>
            )}
          </div>

          {/* Conta */}
          {pessoa.conta && (
            <div>
              <h3 className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2">Conta de aluno</h3>
              <div className="rounded-xl border border-[#2D3047] p-3 text-sm text-[#F7F8FC]">
                {pessoa.conta.nome}
                {pessoa.conta.email && <span className="block text-xs text-[#A0A3B1] mt-0.5">{pessoa.conta.email}</span>}
                {diag && (
                  <button
                    onClick={() => onAbrirRelatorioAluno(pessoa.conta.uid)}
                    className="mt-2 text-xs font-medium text-[#6366F1] hover:underline"
                  >
                    Ver relatório oficial →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Avaliações (contextos) */}
          <div>
            <h3 className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2">
              Avaliações ({pessoa.avaliacoes.length})
            </h3>
            {pessoa.avaliacoes.length === 0 ? (
              <p className="text-sm text-[#A0A3B1] italic">Nenhuma avaliação de sessão.</p>
            ) : (
              <ul className="space-y-2">
                {pessoa.avaliacoes.map((a) => (
                  <li key={a.avaliadoId} className="rounded-xl border border-[#2D3047] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[#F7F8FC] truncate">{a.sessaoTitulo || 'Sessão'}</span>
                      <span className="text-xs text-[#A0A3B1]">{fmtData(a.concluidoEm || a.criadoEm)}</span>
                    </div>
                    {a.diagnostico && (
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-xs" style={{ color: PROFILE_COLORS[a.diagnostico.perfilPrimario] }}>
                          {a.diagnostico.perfilPrimarioNome}
                        </span>
                        <button
                          onClick={() => onAbrirRelatorio(a.token)}
                          className="text-xs font-medium text-[#6366F1] hover:underline"
                        >
                          Ver relatório →
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {avaliacoesConcluidas.length > 1 && (
              <p className="text-[11px] text-[#A0A3B1] mt-2">
                Esta pessoa tem várias avaliações — a evolução aparece no Relatório Oficial.
              </p>
            )}
          </div>

          {/* Desvincular */}
          {pessoa.vinculoLinks && pessoa.vinculoLinks.length > 0 && (
            <div className="pt-2 border-t border-[#2D3047]">
              <h3 className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2">Vínculos de identidade</h3>
              <p className="text-[11px] text-[#A0A3B1] mb-2">
                {pessoa.vinculo === 'auto'
                  ? 'Unificado automaticamente por CPF idêntico.'
                  : 'Unificado manualmente.'} Desvincular separa novamente os registros.
              </p>
              <ul className="space-y-1.5">
                {pessoa.vinculoLinks.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#A0A3B1]">
                      {l.auto ? 'Vínculo automático' : 'Vínculo manual'}{l.avaliadoId ? ' · avaliação' : ''}
                    </span>
                    <button
                      onClick={() => onDesvincular(l.id)}
                      className="px-2 py-1 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors font-medium"
                    >
                      Desvincular
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
