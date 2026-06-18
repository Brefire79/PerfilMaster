import React, { useEffect, useMemo, useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import { getPessoas, getAuditLog } from '@/firebase/firestore.js';
import { logAudit } from '@/firebase/functions.js';

// ─── Config de perfil ────────────────────────────────────────────────────────────
const PROFILE = {
  D: { nome: 'Dominante', hex: '#EF4444' },
  I: { nome: 'Influente', hex: '#F59E0B' },
  S: { nome: 'Estável',   hex: '#22C55E' },
  C: { nome: 'Analítico', hex: '#6366F1' },
};

// Rótulos legíveis para as ações da trilha de auditoria.
const ACAO_LABEL = {
  assessment_completed: 'Avaliação concluída',
  invite_created: 'Convite criado',
  invite_used: 'Convite utilizado',
  admin_viewed_history: 'Histórico acessado',
  report_generated: 'Relatório gerado',
  report_exported: 'Relatório exportado',
};
const ACAO_COR = {
  assessment_completed: '#22C55E',
  invite_created: '#6366F1',
  invite_used: '#F59E0B',
  admin_viewed_history: '#A0A3B1',
  report_generated: '#6366F1',
  report_exported: '#6366F1',
};

function fmtData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

// ─── Página ──────────────────────────────────────────────────────────────────────
export default function PessoasHistorico() {
  const user = useAuthStore((s) => s.user);
  const [pessoas, setPessoas] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    let ativo = true;
    if (!user?.uid) return;
    setLoading(true);
    setErro(null);
    Promise.all([
      getPessoas(user.uid),
      getAuditLog({ adminUid: user.uid, limit: 100 }).catch(() => []),
    ])
      .then(([res, audit]) => {
        if (!ativo) return;
        setPessoas(res?.pessoas || []);
        setAuditoria(audit || []);
      })
      .catch((e) => { if (ativo) setErro(e.message || 'Falha ao carregar.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [user?.uid]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pessoas;
    return pessoas.filter((p) => (p.nome || '').toLowerCase().includes(q));
  }, [pessoas, busca]);

  const toggleExpandir = (pessoa) => {
    if (expandida === pessoa.id) {
      setExpandida(null);
      return;
    }
    setExpandida(pessoa.id);
    // Auditoria explícita: admin acessou o histórico do participante (best-effort).
    logAudit({
      action: 'admin_viewed_history',
      target_type: 'pessoa',
      target_id: pessoa.id,
      metadata: { totalAvaliacoes: pessoa.totalAvaliacoes }, // sem PII (nome/CPF)
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[#1A1D2E] border border-[#2D3047] animate-pulse" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl bg-[#1A1D2E] border border-[#EF4444]/30 p-6 text-center">
        <p className="text-[#EF4444] font-medium">Não foi possível carregar Pessoas & Histórico</p>
        <p className="text-[#A0A3B1] text-sm mt-1">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Participantes ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-heading font-semibold text-[#F7F8FC]">
            Participantes <span className="text-[#6B6F80] text-sm font-normal">({pessoas.length})</span>
          </h2>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
            className="bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-3 py-2 text-sm text-[#F7F8FC] placeholder-[#6B6F80] focus:outline-none focus:border-[#6366F1] w-full sm:w-64"
          />
        </div>

        {filtradas.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-8 text-center text-[#6B6F80]">
            Nenhum participante encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((p) => (
              <PessoaRow
                key={p.id}
                pessoa={p}
                aberta={expandida === p.id}
                onToggle={() => toggleExpandir(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Trilha de auditoria ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-lg font-heading font-semibold text-[#F7F8FC]">Trilha de auditoria</h2>
          <span className="text-[#6B6F80] text-xs">append-only · eventos explícitos</span>
        </div>

        {auditoria.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-8 text-center">
            <p className="text-[#A0A3B1] text-sm">Nenhum evento registrado ainda.</p>
            <p className="text-[#6B6F80] text-xs mt-1">
              Os eventos aparecem após rodar o DELTA 14 e (re)deployar as Edge Functions de auditoria.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] divide-y divide-[#2D3047]">
            {auditoria.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: ACAO_COR[ev.action] || '#6B6F80' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F7F8FC] truncate">
                    {ACAO_LABEL[ev.action] || ev.action}
                    {ev.target_type && (
                      <span className="text-[#6B6F80]"> · {ev.target_type}</span>
                    )}
                  </p>
                  <p className="text-xs text-[#6B6F80]">
                    {ev.actor_role || 'sistema'} · {fmtData(ev.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Linha de participante (expansível) ──────────────────────────────────────────
function PessoaRow({ pessoa, aberta, onToggle }) {
  const diag = pessoa.diagnostico;
  const cor = diag ? PROFILE[diag.perfilPrimario]?.hex : '#2D3047';

  return (
    <div className="rounded-xl bg-[#1A1D2E] border border-[#2D3047] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#242736] transition-colors"
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: cor }}
        >
          {(pessoa.nome || '?').charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F7F8FC] truncate">{pessoa.nome}</p>
          <p className="text-xs text-[#6B6F80]">
            {pessoa.origem.join(' · ') || '—'}
            {pessoa.temCpf && ' · CPF'}
          </p>
        </div>

        {/* Status real (independente do shape do perfil) */}
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            pessoa.concluiu
              ? 'bg-[#22C55E]/15 text-[#22C55E]'
              : 'bg-[#F59E0B]/15 text-[#F59E0B]'
          }`}
        >
          {pessoa.concluiu ? 'Concluída' : 'Em aberto'}
        </span>

        {diag && (
          <span className="hidden sm:inline text-xs text-[#A0A3B1]">
            {diag.perfilPrimarioNome}
          </span>
        )}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={`w-4 h-4 text-[#6B6F80] transition-transform ${aberta ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberta && (
        <div className="px-4 pb-4 pt-1 border-t border-[#2D3047]">
          <p className="text-xs text-[#6B6F80] uppercase tracking-wide mb-2">
            Histórico de avaliações
          </p>
          {pessoa.avaliacoes.length === 0 && !pessoa.conta ? (
            <p className="text-sm text-[#6B6F80]">Sem avaliações registradas.</p>
          ) : (
            <ul className="space-y-2">
              {pessoa.conta && (
                <li className="flex items-center gap-3 text-sm">
                  <span className="text-[#6B6F80] text-xs w-28 flex-shrink-0">Conta de aluno</span>
                  <span className="text-[#F7F8FC]">
                    {pessoa.conta.diagnostico
                      ? `${PROFILE[pessoa.conta.diagnostico.perfilPrimario]?.nome || ''}`
                      : (pessoa.conta.assessmentStatus === 'completed' ? 'Concluída' : 'Pendente')}
                  </span>
                </li>
              )}
              {pessoa.avaliacoes
                .slice()
                .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0))
                .map((av) => (
                  <li key={av.avaliadoId} className="flex items-center gap-3 text-sm">
                    <span className="text-[#6B6F80] text-xs w-28 flex-shrink-0">
                      {fmtData(av.concluidoEm || av.criadoEm)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        av.status === 'concluido'
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      }`}
                    >
                      {av.status || '—'}
                    </span>
                    <span className="text-[#A0A3B1]">
                      {av.sessaoTitulo || 'Avaliação avulsa'}
                      {av.diagnostico && ` · ${av.diagnostico.perfilPrimarioNome}`}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
