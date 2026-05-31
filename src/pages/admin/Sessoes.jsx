import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useSessaoStore from '@/store/sessaoStore.js';
import { SiglaProvider, SiglaComSignificado } from '@/constants/siglas.jsx';
import SessionCreator from '@/components/sessao/SessionCreator.jsx';
import AvaliadoForm from '@/components/sessao/AvaliadoForm.jsx';
import { insightPerfil, therapyFlag } from '@/firebase/functions.js';

// ─── Helpers visuais ──────────────────────────────────────────────────────────
const STATUS_AVALIADO = {
  pendente:     { label: 'Pendente',     cor: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
  em_andamento: { label: 'Em andamento', cor: 'bg-[#6366F1]/20 text-[#6366F1]' },
  concluido:    { label: 'Concluído',    cor: 'bg-[#22C55E]/20 text-[#22C55E]' },
};

const PERFIL_COR = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };
const PERFIL_NOME = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

// ─── Configuração visual DISC ─────────────────────────────────────────────────
const DISC_CONFIG = {
  D: { nome: 'Dominante',  cor: '#EF4444', bg: '#EF444420', campo: 'dominante'  },
  I: { nome: 'Influente',  cor: '#F59E0B', bg: '#F59E0B20', campo: 'influente'  },
  S: { nome: 'Estável',    cor: '#22C55E', bg: '#22C55E20', campo: 'estavel'    },
  C: { nome: 'Analítico',  cor: '#6366F1', bg: '#6366F120', campo: 'analitico'  },
};

// ─── Modal: resultado completo + IA + liberação para aluno ────────────────────
const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function ResultadoModal({ avaliado, onClose }) {
  const TAB = { ADMIN: 'admin', ALUNO: 'aluno' };
  const [tab, setTab]               = useState(TAB.ADMIN);
  const [insight, setInsight]         = useState(null);  // objeto rico: { insight, forcas, desafios, carreiras, comunicacao, desenvolvimento, palavrasChave }
  const [flagClinica, setFlagClinica] = useState(null);  // { flagged, level, note }
  const [loadingIA, setLoadingIA]   = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [erroIA, setErroIA]         = useState('');
  const [liberado, setLiberado]     = useState(false);

  if (!avaliado?.perfil) return null;

  const { perfil, nome, telefone, token } = avaliado;
  const primCfg = DISC_CONFIG[perfil.perfilPrimario];
  const secCfg  = perfil.perfilSecundario ? DISC_CONFIG[perfil.perfilSecundario] : null;
  const barras  = Object.entries(DISC_CONFIG).map(([k, cfg]) => ({
    key: k, label: cfg.nome, cor: cfg.cor, valor: Math.round(perfil[cfg.campo] ?? 0),
  }));

  // ── IA: usa insightPerfil — recebe perfil DISC já calculado ────────────────
  const handleRefinarIA = async () => {
    setLoadingIA(true); setErroIA('');
    try {
      const res = await insightPerfil({ perfil, nome });
      setInsight(res); // objeto rico com forcas, carreiras, etc.
    } catch (err) {
      setErroIA('Erro ao chamar IA: ' + (err.message || 'tente novamente'));
    } finally { setLoadingIA(false); }
  };

  // ── Flags clínicas: usa therapyFlag com profileData ──────────────────────
  const handleVerificarFlag = async () => {
    setLoadingFlag(true);
    try {
      const res = await therapyFlag({
        profileData: {
          dominantProfile: perfil.perfilPrimario,
          secondaryProfile: perfil.perfilSecundario || null,
          scores: {
            D: perfil.dominante  ?? 0,
            I: perfil.influente  ?? 0,
            S: perfil.estavel    ?? 0,
            C: perfil.analitico  ?? 0,
          },
        },
      });
      setFlagClinica({
        flagged: res?.flagged === true,
        level: res?.level || 'none',
        note: res?.note || 'Sem indicadores relevantes detectados.',
      });
    } catch {
      setFlagClinica({ flagged: false, level: 'erro', note: 'Não foi possível verificar indicadores clínicos.' });
    } finally { setLoadingFlag(false); }
  };

  // ── Liberar: mensagem limpa SEM flags + link para /resultado/:token ──────
  const handleLiberar = () => {
    const numero = telefone?.replace(/\D/g, '');
    if (!numero) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://perfilmaster.netlify.app';
    const linkResultado = `${baseUrl}/resultado/${token}`;
    const pct = barras.map((b) => `${b.key}: ${b.valor}%`).join(' · ');

    const resumo = insight?.insight
      ? `\n\n💡 *Sobre você:* ${insight.insight.slice(0, 300)}`
      : '';
    const forcasTxt = insight?.forcas?.length
      ? `\n\n💪 *Seus pontos fortes:*\n${insight.forcas.slice(0, 3).map((f) => `• ${f}`).join('\n')}`
      : '';

    const msg = encodeURIComponent(
      `Olá, ${nome.split(' ')[0]}! 🎉\n\n` +
      `Sua avaliação de perfil comportamental *DISC* foi concluída!\n\n` +
      `🔷 *Perfil: ${primCfg.nome}*` +
      (secCfg ? ` com tendência ${secCfg.nome}` : '') +
      `\n\n📊 *Distribuição DISC:*\n${pct}` +
      resumo +
      forcasTxt +
      `\n\n🔗 *Acesse seu relatório completo:*\n${linkResultado}` +
      `\n\nNele você encontra características, carreira indicada, comunicação e áreas de desenvolvimento. 😊`
    );
    window.open(`https://wa.me/${numero}?text=${msg}`, '_blank', 'noopener,noreferrer');
    setLiberado(true);
  };

  const flagLevelColor = { none: '#22C55E', watch: '#F59E0B', suggest: '#F59E0B', erro: '#A0A3B1' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#2D3047]">
          <div>
            <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">Resultado — {nome}</h2>
            <p className="text-xs text-[#A0A3B1] mt-0.5">{telefone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors ml-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Abas ── */}
        <div className="flex border-b border-[#2D3047]">
          {[
            { id: TAB.ADMIN, label: '🔒 Visão Admin' },
            { id: TAB.ALUNO, label: '👤 Preview do Aluno' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex-1 py-3 text-xs font-semibold transition-colors',
                tab === t.id
                  ? 'text-[#F7F8FC] border-b-2 border-[#6366F1]'
                  : 'text-[#A0A3B1] hover:text-[#F7F8FC]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">

          {/* ═══ ABA ADMIN ═══ */}
          {tab === TAB.ADMIN && (
            <>
              {/* Badge */}
              <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: primCfg.bg, borderColor: primCfg.cor + '40' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border-2"
                  style={{ background: primCfg.bg, borderColor: primCfg.cor, color: primCfg.cor }}>
                  {perfil.perfilPrimario}
                </div>
                <div>
                  <p className="font-bold text-[#F7F8FC]">Perfil {primCfg.nome}</p>
                  {secCfg && <p className="text-xs mt-0.5" style={{ color: secCfg.cor }}>com tendência {secCfg.nome}</p>}
                </div>
              </div>

              {/* Barras DISC — FIX: usar `cor` não `color` */}
              <div className="bg-[#0F1117] rounded-xl p-4 space-y-3 border border-[#2D3047]">
                <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wide">Distribuição DISC</p>
                {barras.map(({ key, label, cor, valor }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A0A3B1]">{key} — {label}</span>
                      <span className="font-semibold" style={{ color: cor }}>{valor}%</span>
                    </div>
                    <div className="h-2 bg-[#2D3047] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${valor}%`, background: cor }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Insight rico da IA */}
              {insight && (
                <div className="bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#818CF8]">✨ Análise da IA</p>
                  {insight.insight && (
                    <p className="text-sm text-[#C7D2FE] leading-relaxed">{insight.insight}</p>
                  )}
                  {insight.forcas?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#A0A3B1] mb-1.5">💪 Pontos fortes</p>
                      <ul className="space-y-1">
                        {insight.forcas.map((f, i) => (
                          <li key={i} className="text-xs text-[#C7D2FE] flex gap-1.5">
                            <span className="text-[#22C55E] flex-shrink-0">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insight.carreiras?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#A0A3B1] mb-1.5">🎯 Carreiras indicadas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {insight.carreiras.map((c, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {insight.desafios?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#A0A3B1] mb-1.5">🌱 Áreas de desenvolvimento</p>
                      <ul className="space-y-1">
                        {insight.desafios.map((d, i) => (
                          <li key={i} className="text-xs text-[#C7D2FE] flex gap-1.5">
                            <span className="text-[#6366F1] flex-shrink-0">→</span>{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {erroIA && <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 rounded-lg px-3 py-2">{erroIA}</p>}

              {/* Flag clínica — SOMENTE ADMIN, nunca enviada ao aluno */}
              {flagClinica && (
                <div className="rounded-xl p-4 border"
                  style={{ background: flagLevelColor[flagClinica.level] + '15', borderColor: flagLevelColor[flagClinica.level] + '40' }}>
                  <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
                    style={{ color: flagLevelColor[flagClinica.level] }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    🔒 Indicador clínico — Admin only · Nível: <strong>{flagClinica.level?.toUpperCase()}</strong>
                    {' '}· {flagClinica.flagged ? '⚠️ Atenção' : '✓ Sem alerta'}
                  </p>
                  {flagClinica.note && (
                    <p className="text-xs text-[#F7F8FC]/80 leading-relaxed">{flagClinica.note}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ ABA ALUNO — preview do que o aluno recebe ═══ */}
          {tab === TAB.ALUNO && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/25">
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-xs text-[#22C55E]">
                  Flags clínicas e notas internas <strong>não são enviadas</strong>. O aluno recebe dados + link do relatório completo.
                </p>
              </div>

              {/* Preview da mensagem WhatsApp */}
              <div className="bg-[#0F1117] border border-[#2D3047] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wide">📱 Preview da mensagem</p>
                <div className="bg-[#1E2030] rounded-lg p-3 text-xs text-[#E2E8F0] leading-relaxed space-y-1.5">
                  <p>Olá, <strong>{nome.split(' ')[0]}</strong>! 🎉</p>
                  <p>Sua avaliação DISC foi concluída!</p>
                  <p>🔷 <strong>Perfil: {primCfg.nome}</strong>{secCfg ? ` com tendência ${secCfg.nome}` : ''}</p>
                  <p>📊 {barras.map(b => `${b.key}: ${b.valor}%`).join(' · ')}</p>
                  {insight?.insight && (
                    <p className="text-[#A0A3B1]">💡 {insight.insight.slice(0, 120)}...</p>
                  )}
                  {insight?.forcas?.length > 0 && (
                    <div>
                      <p>💪 Pontos fortes:</p>
                      {insight.forcas.slice(0, 3).map((f, i) => (
                        <p key={i} className="pl-2 text-[#A0A3B1]">• {f}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-[#6366F1]">🔗 Relatório completo → /resultado/{token?.slice(0, 12)}...</p>
                </div>
              </div>

              {!insight && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25">
                  <span>💡</span>
                  <p className="text-xs text-[#F59E0B]">
                    Gere a análise IA na aba Admin para incluir forças e análise na mensagem do aluno.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ações ── */}
        <div className="px-5 py-4 border-t border-[#2D3047] flex flex-col gap-2">
          {tab === TAB.ADMIN && (
            <>
              <button onClick={handleRefinarIA} disabled={loadingIA}
                className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loadingIA
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analisando...</>
                  : <>{insight ? '↻ Regerar análise IA' : '✨ Refinar com IA — forças, carreira, comunicação'}</>}
              </button>
              <button onClick={handleVerificarFlag} disabled={loadingFlag}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10">
                {loadingFlag
                  ? <><div className="w-4 h-4 rounded-full border-2 border-[#F59E0B]/30 border-t-[#F59E0B] animate-spin" /> Verificando...</>
                  : '🔍 Verificar indicadores de atenção (admin)'}
              </button>
            </>
          )}
          {tab === TAB.ALUNO && (
            <button onClick={handleLiberar}
              className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
              style={{ background: liberado ? '#16A34A20' : '#25D36620', border: `1px solid ${liberado ? '#16A34A60' : '#25D36660'}`, color: liberado ? '#16A34A' : '#25D366' }}>
              {WHATSAPP_SVG}
              {liberado ? '✓ Enviado! Reenviar ao aluno' : '📤 Liberar resultado via WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente: card de avaliado ─────────────────────────────────────────
function AvaliadoCard({ avaliado, onWhatsApp, onCopiarLink, onDeletar, onVerResultado, onRelatorio }) {
  const info = STATUS_AVALIADO[avaliado.status] || STATUS_AVALIADO.pendente;
  const perfil = avaliado.perfil;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1C2A] hover:bg-[#1E2030] transition-colors">
      {/* Avatar inicial */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: perfil
            ? `${PERFIL_COR[perfil.perfilPrimario]}20`
            : '#2D3047',
          color: perfil ? PERFIL_COR[perfil.perfilPrimario] : '#A0A3B1',
        }}
      >
        {perfil
          ? perfil.perfilPrimario
          : avaliado.nome.charAt(0).toUpperCase()}
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F7F8FC] truncate">{avaliado.nome}</p>
        <p className="text-xs text-[#A0A3B1] truncate">{avaliado.telefone}</p>
        {perfil && (
          <p className="text-xs mt-0.5" style={{ color: PERFIL_COR[perfil.perfilPrimario] }}>
            {PERFIL_NOME[perfil.perfilPrimario]}
            {perfil.perfilSecundario ? ` · ${PERFIL_NOME[perfil.perfilSecundario]}` : ''}
          </p>
        )}
      </div>

      {/* Badge status */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${info.cor}`}>
        {info.label}
      </span>

      {/* Ações */}
      <div className="flex gap-1 shrink-0">
        {/* Ver resultado completo — só quando concluído */}
        {avaliado.status === 'concluido' && avaliado.perfil && (
          <>
            {/* Modal rápido */}
            <button
              onClick={() => onVerResultado(avaliado)}
              title="Visão rápida do resultado" aria-label="Visão rápida do resultado"
              className="p-1.5 rounded-lg text-[#818CF8] hover:text-white hover:bg-[#6366F1] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            {/* Relatório completo */}
            <button
              onClick={() => onRelatorio(avaliado)}
              title="Abrir relatório oficial completo" aria-label="Abrir relatório oficial completo"
              className="p-1.5 rounded-lg text-[#22C55E] hover:text-white hover:bg-[#22C55E] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </button>
          </>
        )}
        <button
          onClick={() => onCopiarLink(avaliado.token)}
          title="Copiar link de avaliação" aria-label="Copiar link de avaliação"
          className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </button>
        <button
          onClick={() => onWhatsApp(avaliado)}
          title="Enviar via WhatsApp" aria-label="Enviar resultado via WhatsApp"
          className="p-1.5 rounded-lg hover:bg-[#25D366]/20 transition-colors"
          style={{ color: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
        <button
          onClick={() => onDeletar(avaliado)}
          title="Remover avaliado" aria-label="Remover avaliado"
          className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Painel principal ─────────────────────────────────────────────────────────
export default function Sessoes() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const {
    sessoes,
    sessaoAtiva,
    avaliadosBySessao,
    loadingAvaliados,
    iniciarListenerSessoes,
    pararListenerSessoes,
    selecionarSessao,
    getLinkWhatsApp,
    getLinkAvaliacao,
    removerAvaliado,
    deletarSessaoById,
    encerrarSessaoAtiva,
  } = useSessaoStore();

  const [modalSessao, setModalSessao] = useState(false);
  const [modalAvaliado, setModalAvaliado] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteSessao, setConfirmDeleteSessao] = useState(null);
  const [deletingSessao, setDeletingSessao] = useState(false);
  const [confirmEncerrar, setConfirmEncerrar] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [avaliadoResultado, setAvaliadoResultado] = useState(null); // modal resultado rápido

  function handleRelatorio(avaliado) {
    navigate(`/admin/relatorio/${avaliado.token}`, { state: { avaliado } });
  }

  useEffect(() => {
    if (user?.uid) iniciarListenerSessoes(user.uid);
    return () => pararListenerSessoes();
  }, [user?.uid]);

  const avaliadosDaSessao = sessaoAtiva
    ? avaliadosBySessao[sessaoAtiva.id] || []
    : [];

  const estatisticas = {
    total: avaliadosDaSessao.length,
    pendentes: avaliadosDaSessao.filter((a) => a.status === 'pendente').length,
    andamento: avaliadosDaSessao.filter((a) => a.status === 'em_andamento').length,
    concluidos: avaliadosDaSessao.filter((a) => a.status === 'concluido').length,
  };

  function handleWhatsApp(avaliado) {
    const link = getLinkWhatsApp(avaliado);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function handleCopiarLink(token) {
    const link = getLinkAvaliacao(token);
    await navigator.clipboard.writeText(link);
    setLinkCopiado(token);
    setTimeout(() => setLinkCopiado(''), 2000);
  }

  function handleDeletar(avaliado) {
    setConfirmDelete(avaliado);
  }

  async function confirmarDelete() {
    if (!confirmDelete || !sessaoAtiva) return;
    setDeleting(true);
    try {
      await removerAvaliado(sessaoAtiva.id, confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Erro ao remover avaliado:', err);
    } finally {
      setDeleting(false);
    }
  }

  // FIX: encerrar sessão ativa
  async function confirmarEncerrar() {
    if (!sessaoAtiva) return;
    setEncerrando(true);
    try {
      await encerrarSessaoAtiva(sessaoAtiva.id);
      setConfirmEncerrar(false);
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    } finally {
      setEncerrando(false);
    }
  }

  async function confirmarDeleteSessao() {
    if (!confirmDeleteSessao) return;
    setDeletingSessao(true);
    try {
      await deletarSessaoById(confirmDeleteSessao.id);
      setConfirmDeleteSessao(null);
    } catch (err) {
      console.error('Erro ao deletar sessão:', err);
    } finally {
      setDeletingSessao(false);
    }
  }

  return (
    <SiglaProvider>
      <div className="flex flex-col h-full gap-6 p-6 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
              Sessões de Avaliação
            </h1>
            <p className="text-sm text-[#A0A3B1] mt-1">
              Gerencie avaliações <SiglaComSignificado id="DISC" /> enviadas via WhatsApp
            </p>
          </div>
          <button
            onClick={() => setModalSessao(true)}
            className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span> Nova Sessão
          </button>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row flex-1 min-h-0">
          {/* ── Coluna esquerda: lista de sessões ─────────────────────────── */}
          <div className="lg:w-72 shrink-0 flex flex-col gap-3">
            <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider">
              Suas sessões ({sessoes.length})
            </p>

            {sessoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#1A1C2A] flex items-center justify-center text-2xl">
                  📋
                </div>
                <p className="text-sm text-[#A0A3B1]">Nenhuma sessão criada ainda.</p>
                <button
                  onClick={() => setModalSessao(true)}
                  className="text-xs text-[#6366F1] hover:underline"
                >
                  Criar primeira sessão
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {sessoes.map((s) => (
                  <div
                    key={s.id}
                    className={`
                      relative group p-3 rounded-xl border transition-colors cursor-pointer
                      ${sessaoAtiva?.id === s.id
                        ? 'border-[#6366F1] bg-[#6366F1]/10'
                        : 'border-[#2D3047] bg-[#1A1C2A] hover:border-[#4A4D6A]'}
                    `}
                    onClick={() => selecionarSessao(s)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#F7F8FC] truncate">{s.titulo}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            s.status === 'ativa'
                              ? 'bg-[#22C55E]/20 text-[#22C55E]'
                              : 'bg-[#4A4D6A]/30 text-[#A0A3B1]'
                          }`}
                        >
                          {s.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteSessao(s); }}
                          title="Deletar sessão"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#4A4D6A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {s.descricao && (
                      <p className="text-xs text-[#A0A3B1] mt-1 truncate">{s.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Coluna direita: avaliados da sessão ──────────────────────── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {!sessaoAtiva ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-[#1A1C2A] flex items-center justify-center text-3xl">
                  👈
                </div>
                <p className="text-[#A0A3B1] text-sm">Selecione uma sessão para ver os avaliados</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho da sessão */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F7F8FC]">
                      {sessaoAtiva.titulo}
                    </h2>
                    {sessaoAtiva.descricao && (
                      <p className="text-xs text-[#A0A3B1]">{sessaoAtiva.descricao}</p>
                    )}
                  </div>
                  {sessaoAtiva.status === 'ativa' && (
                    <div className="flex items-center gap-2">
                      {/* FIX: botão encerrar sessão */}
                      <button
                        onClick={() => setConfirmEncerrar(true)}
                        className="px-3 py-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 text-[#EF4444] text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Encerrar
                      </button>
                      <button
                        onClick={() => setModalAvaliado(true)}
                        className="px-3 py-2 rounded-xl bg-[#1A1C2A] border border-[#2D3047] hover:border-[#6366F1] text-[#F7F8FC] text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <span>+</span> Adicionar avaliado
                      </button>
                    </div>
                  )}
                </div>

                {/* Cards de estatísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total',        valor: estatisticas.total,     cor: '#6366F1' },
                    { label: 'Pendentes',    valor: estatisticas.pendentes, cor: '#F59E0B' },
                    { label: 'Em andamento', valor: estatisticas.andamento, cor: '#818CF8' },
                    { label: 'Concluídos',   valor: estatisticas.concluidos,cor: '#22C55E' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-[#1A1C2A] rounded-xl p-3 border border-[#2D3047]"
                    >
                      <p className="text-2xl font-bold" style={{ color: stat.cor }}>
                        {stat.valor}
                      </p>
                      <p className="text-xs text-[#A0A3B1] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Lista de avaliados */}
                {loadingAvaliados ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
                  </div>
                ) : avaliadosDaSessao.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-[#1A1C2A] rounded-2xl border border-dashed border-[#2D3047]">
                    <p className="text-[#A0A3B1] text-sm">Nenhum avaliado cadastrado nesta sessão.</p>
                    {sessaoAtiva.status === 'ativa' && (
                      <button
                        onClick={() => setModalAvaliado(true)}
                        className="text-xs text-[#6366F1] hover:underline"
                      >
                        Adicionar primeiro avaliado
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {avaliadosDaSessao.map((a) => (
                      <AvaliadoCard
                        key={a.id}
                        avaliado={a}
                        onWhatsApp={handleWhatsApp}
                        onCopiarLink={handleCopiarLink}
                        onDeletar={handleDeletar}
                        onVerResultado={setAvaliadoResultado}
                        onRelatorio={handleRelatorio}
                      />
                    ))}
                  </div>
                )}

                {/* Toast de link copiado */}
                {linkCopiado && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#22C55E] text-white text-sm px-4 py-2 rounded-full shadow-xl z-50 pointer-events-none">
                    Link copiado!
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {modalSessao && (
        <SessionCreator
          onFechar={() => setModalSessao(false)}
          onCriado={(id) => {
            const nova = sessoes.find((s) => s.id === id);
            if (nova) selecionarSessao(nova);
          }}
        />
      )}

      {modalAvaliado && sessaoAtiva && (
        <AvaliadoForm
          sessaoId={sessaoAtiva.id}
          onFechar={() => setModalAvaliado(false)}
        />
      )}

      {/* Modal resultado completo + IA + notificação */}
      {avaliadoResultado && (
        <ResultadoModal
          avaliado={avaliadoResultado}
          onClose={() => setAvaliadoResultado(null)}
        />
      )}

      {/* FIX: Modal confirmação encerrar sessão */}
      {confirmEncerrar && sessaoAtiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-encerrar">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-encerrar" className="text-base font-heading font-semibold text-[#F7F8FC]">Encerrar sessão</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#A0A3B1]">
                Tem certeza que deseja encerrar{' '}
                <strong className="text-[#F7F8FC]">{sessaoAtiva.titulo}</strong>?
              </p>
              <p className="text-xs text-[#A0A3B1] mt-2">
                Nenhum dado será apagado. Avaliados ainda poderão concluir, mas novos não poderão ser adicionados.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <button
                onClick={() => setConfirmEncerrar(false)}
                disabled={encerrando}
                className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEncerrar}
                disabled={encerrando}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EF4444] hover:bg-[#C53030] text-white transition-colors disabled:opacity-60"
              >
                {encerrando ? 'Encerrando...' : 'Encerrar sessão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: deletar sessão */}
      {confirmDeleteSessao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-del-sessao">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-del-sessao" className="text-base font-heading font-semibold text-[#F7F8FC]">
                Deletar sessão
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#A0A3B1]">
                Tem certeza que deseja deletar a sessão{' '}
                <strong className="text-[#F7F8FC]">{confirmDeleteSessao.titulo}</strong>?
              </p>
              <p className="text-xs text-[#A0A3B1] mt-2">
                Todos os avaliados e respostas desta sessão serão apagados permanentemente.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <button
                onClick={() => setConfirmDeleteSessao(null)}
                disabled={deletingSessao}
                className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDeleteSessao}
                disabled={deletingSessao}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EF4444] hover:bg-[#C53030] text-white transition-colors disabled:opacity-60"
              >
                {deletingSessao ? 'Deletando...' : 'Deletar sessão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-remover">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-remover" className="text-base font-heading font-semibold text-[#F7F8FC]">
                Remover avaliado
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#A0A3B1]">
                Tem certeza que deseja remover{' '}
                <strong className="text-[#F7F8FC]">{confirmDelete.nome}</strong> desta sessão?
              </p>
              <p className="text-xs text-[#A0A3B1] mt-2">
                As respostas e o token serão apagados permanentemente.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EF4444] hover:bg-[#C53030] text-white transition-colors disabled:opacity-60"
              >
                {deleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SiglaProvider>
  );
}
