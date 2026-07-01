import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '@/store/authStore.js';
import useMestreStore from '@/store/mestreStore.js';
import { responderMestre, registrarErroMestre } from '@/lib/mestreLocal.js';
import { logAudit } from '@/firebase/functions.js';
import { getUser } from '@/firebase/firestore.js';
import usePwaUpdate from '@/hooks/usePwaUpdate.js';
import { playBeep, showOsNotification } from '@/lib/notify.js';

// ============================================================================
// Mestre — chat flutuante (substitui a antiga sub-aba Central › Mestre (IA)).
// Motor 100% local (mestreLocal.js): sem IA externa; a API DeepSeek fica só na
// análise do Relatório Oficial. A conversa persiste no mestreStore
// (localStorage) até o logout — navegar ou recarregar não apaga o contexto.
// ============================================================================

const SUGESTOES = [
  { texto: 'Como está a distribuição DISC dos meus grupos?', tag: 'Grupos', cor: '#6366F1' },
  { texto: 'Qual a taxa de conclusão nos últimos 30 dias?', tag: 'Período', cor: '#F59E0B' },
  { texto: 'Como está a saúde do app? Algo fora do normal?', tag: 'Status', cor: '#22C55E' },
  { texto: 'Como faço uma avaliação avulsa pelo WhatsApp?', tag: 'Como fazer', cor: '#EF4444' },
];

const STATUS_META = {
  saudavel: { label: 'Saudável', cor: '#22C55E' },
  observar: { label: 'Observar', cor: '#F59E0B' },
  atencao:  { label: 'Atenção',  cor: '#EF4444' },
};

const PEEK_LABELS = {
  min_n: 'Mín. amostra', grupos_exibidos: 'Grupos', grupos_suprimidos: 'Suprimidos',
  janela_dias: 'Janela (dias)', criadas: 'Criadas', iniciadas: 'Iniciadas',
  concluidas: 'Concluídas', taxa_conclusao: 'Conclusão %', tempo_medio_min: 'Tempo médio (min)',
  alunos_total: 'Alunos (total)', contas_em_grupos: 'Contas em grupos',
  avaliados_sessao: 'Avaliados de sessão', contas_avulsas: 'Contas avulsas', grupos: 'Grupos',
};

// ── Sigilo do Mestre: bússola de 4 eixos nas cores DISC ─────────────────────
export function MestreSigil({ size = 40, thinking = false }) {
  return (
    <span
      className={`mfc-sigil${thinking ? ' is-thinking' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#2D3047" strokeWidth="1.5" />
        <g className="mfc-sigil__star">
          <polygon points="50,7 56,50 44,50" fill="#EF4444" />
          <polygon points="93,50 50,44 50,56" fill="#F59E0B" />
          <polygon points="50,93 44,50 56,50" fill="#22C55E" />
          <polygon points="7,50 50,56 50,44" fill="#6366F1" />
        </g>
        <circle className="mfc-sigil__core" cx="50" cy="50" r="11" fill="#6366F1" />
        <circle cx="50" cy="50" r="4.5" fill="#0F1117" />
      </svg>
    </span>
  );
}

function KpiTile({ label, value, accent = '#6366F1' }) {
  return (
    <div className="mfc-kpi">
      <span className="mfc-kpi__val" style={{ color: accent }}>{value}</span>
      <span className="mfc-kpi__lbl">{label}</span>
    </div>
  );
}

function StatusCard({ d }) {
  const meta = STATUS_META[d.status_geral] || STATUS_META.observar;
  const av = d.avaliacoes || {};
  return (
    <div className="mfc-data">
      <div className="mfc-status" style={{ '--st': meta.cor }}>
        <span className="mfc-status__dot" />
        <span className="mfc-status__label">{meta.label}</span>
        {d.app_version && <span className="mfc-status__ver">v{d.app_version}</span>}
      </div>
      <div className="mfc-kpis">
        <KpiTile label="Grupos" value={d.grupos ?? 0} />
        <KpiTile label="Alunos" value={d.alunos ?? 0} />
        <KpiTile label="Conclusão" value={`${d.taxa_conclusao ?? 0}%`} accent="#22C55E" />
        <KpiTile label="Concluídas" value={av.concluidas ?? 0} accent="#22C55E" />
        <KpiTile label="Em andamento" value={av.em_andamento ?? 0} accent="#F59E0B" />
        <KpiTile label="Paradas" value={d.avaliacoes_paradas ?? 0} accent={(d.avaliacoes_paradas ?? 0) > 0 ? '#EF4444' : '#A0A3B1'} />
      </div>
    </div>
  );
}

function MetricsPeek({ d }) {
  const tiles = Object.entries(d)
    .filter(([k, v]) => k !== 'consulta' && typeof v === 'number')
    .map(([k, v]) => ({ k, label: PEEK_LABELS[k] || k.replace(/_/g, ' '), v }));
  const grupos = Array.isArray(d.grupos) ? d.grupos.slice(0, 6) : null;
  if (tiles.length === 0 && !grupos) return null;
  return (
    <div className="mfc-data">
      {tiles.length > 0 && (
        <div className="mfc-kpis">
          {tiles.map((t) => (
            <KpiTile key={t.k} label={t.label} value={t.v}
              accent={t.k === 'taxa_conclusao' ? '#22C55E' : '#6366F1'} />
          ))}
        </div>
      )}
      {grupos && grupos.length > 0 && (
        <div className="mfc-grupos">
          {grupos.map((g, i) => (
            <div key={i} className="mfc-grupo">
              <span className="mfc-grupo__nome">{g.grupo || `Grupo ${i + 1}`}</span>
              <div className="mfc-grupo__bar">
                <span style={{ width: `${Math.max(0, Math.min(100, g.taxa_conclusao ?? 0))}%` }} />
              </div>
              <span className="mfc-grupo__pct">{g.taxa_conclusao ?? 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DadosBlock({ d }) {
  if (!d) return null;
  if (d.consulta === 'saude_status') return <StatusCard d={d} />;
  return <MetricsPeek d={d} />;
}

// ── Gatilho do header do Painel (posição marcada no design) ─────────────────
export function MestreTrigger() {
  const abrir = useMestreStore((s) => s.abrir);
  return (
    <>
      <MestreTriggerStyles />
      <button type="button" className="mfc-trigger" onClick={abrir} aria-label="Abrir o chat do Mestre">
        <MestreSigil size={26} />
        <span className="mfc-trigger__txt">
          <span className="mfc-trigger__title">Perguntar ao Mestre</span>
          <span className="mfc-trigger__sub">local · sem PII</span>
        </span>
      </button>
    </>
  );
}

// ── Painel flutuante (montado no AdminLayout — sobrevive à navegação) ───────
// Montado apenas no AdminLayout, que já é protegido por ProtectedRoute
// (role=admin) — por isso não há checagem de role aqui dentro.
export default function MestreChatFlutuante() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { aberto, fechar, mensagens, addMensagem, limparConversa } = useMestreStore();
  const { currentVersion, updateAvailable } = usePwaUpdate();
  const prefsRef = useRef({ aiReply: true, sound: true });

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    getUser(uid)
      .then((doc) => {
        const n = doc?.notifications;
        if (n && typeof n === 'object') {
          prefsRef.current = { aiReply: n.aiReply !== false, sound: n.sound !== false };
        }
      })
      .catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!aberto) return;
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, enviando, aberto]);

  // Fecha com Escape; foca o input ao abrir.
  useEffect(() => {
    if (!aberto) return;
    inputRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [aberto, fechar]);

  const enviar = async (perguntaTexto) => {
    const pergunta = (perguntaTexto ?? texto).trim();
    if (!pergunta || enviando) return;
    setTexto('');
    addMensagem({ autor: 'user', texto: pergunta });
    setEnviando(true);
    try {
      const res = await responderMestre({
        pergunta,
        adminUid: uid,
        contexto: {
          tela: 'chat-flutuante',
          appVersion: currentVersion,
          atualizacaoDisponivel: !!updateAvailable,
        },
      });
      addMensagem({
        autor: 'ia',
        texto: res?.narrativa || 'Sem resposta.',
        dados: res?.dados || null,
        queryUsada: res?.queryUsada || null,
        modo: res?.modo || 'conversa',
        pergunta,
      });
      if (prefsRef.current.aiReply) {
        if (prefsRef.current.sound) playBeep();
        if (typeof document !== 'undefined' && document.hidden) {
          showOsNotification({ title: 'Mestre respondeu', body: 'Sua análise está pronta.', tag: 'pm-ai' });
        }
      }
    } catch (e) {
      registrarErroMestre(pergunta, e);
      addMensagem({
        autor: 'ia',
        texto: 'Não consegui consultar seus dados agora. Verifique a conexão e tente de novo — a falha ficou registrada para diagnóstico.',
        modo: 'conversa',
        pergunta,
      });
    } finally {
      setEnviando(false);
    }
  };

  const baixarPdf = async (msg) => {
    // Import dinâmico: o jsPDF só baixa quando o facilitador exporta.
    const { gerarPdfCentral } = await import('@/lib/centralPdf.js');
    gerarPdfCentral({
      pergunta: msg.pergunta,
      narrativa: msg.texto,
      dados: msg.dados,
      queryUsada: msg.queryUsada,
    });
    logAudit({ action: 'report_exported', target_type: 'central_ai', target_id: msg.queryUsada || 'analise' });
  };

  if (!aberto) return null;

  return createPortal(
    <div className="mfc-shell" role="dialog" aria-label="Chat do Mestre">
      <MestreChatStyles />

      {/* Cabeçalho */}
      <header className="mfc-head">
        <MestreSigil size={30} thinking={enviando} />
        <div className="mfc-head__id">
          <span className="mfc-head__name">Mestre</span>
          <span className="mfc-head__sub">Inteligência local · sem PII</span>
        </div>
        <button
          type="button"
          className="mfc-iconbtn"
          onClick={limparConversa}
          title="Limpar conversa"
          aria-label="Limpar conversa"
          disabled={mensagens.length === 0}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
        <button type="button" className="mfc-iconbtn" onClick={fechar} title="Fechar (Esc)" aria-label="Fechar chat">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </header>

      {/* Conversa */}
      <div className="mfc-stream">
        {mensagens.length === 0 && (
          <div className="mfc-hero">
            <MestreSigil size={56} />
            <p className="mfc-hero__lead">
              Pergunte sobre seus grupos, o ritmo do período ou a saúde do app.
              Respondo aqui mesmo, com seus números — ninguém é identificado.
            </p>
            <div className="mfc-sugs">
              {SUGESTOES.map((s) => (
                <button key={s.texto} type="button" className="mfc-sug" onClick={() => enviar(s.texto)} style={{ '--ac': s.cor }}>
                  <span className="mfc-sug__tag">{s.tag}</span>
                  <span className="mfc-sug__txt">{s.texto}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((msg, i) => (
          <div key={i} className={`mfc-msg mfc-msg--${msg.autor}`}>
            <div className="mfc-bubble">
              {msg.autor === 'ia' && <span className="mfc-bubble__who">Mestre</span>}
              <p className="mfc-bubble__txt">{msg.texto}</p>
              {msg.autor === 'ia' && msg.modo === 'dado' && <DadosBlock d={msg.dados} />}
              {msg.autor === 'ia' && msg.modo === 'dado' && (
                <button type="button" onClick={() => baixarPdf(msg)} className="mfc-export">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Exportar PDF
                </button>
              )}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="mfc-msg mfc-msg--ia">
            <div className="mfc-bubble">
              <span className="mfc-bubble__who">Mestre</span>
              <span className="mfc-think">consultando seus dados<i>.</i><i>.</i><i>.</i></span>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Entrada */}
      <div className="mfc-input">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Pergunte sobre grupos, período ou o app…"
          rows={1}
          className="mfc-textarea"
        />
        <button type="button" onClick={() => enviar()} disabled={enviando || !texto.trim()} className="mfc-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Estilos do gatilho (header do Painel) ───────────────────────────────────
function MestreTriggerStyles() {
  return (
    <style>{`
      .mfc-trigger {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 8px 16px 8px 10px; border-radius: 999px; cursor: pointer;
        background: linear-gradient(#141625, #141625) padding-box,
                    linear-gradient(120deg, #6366F1, #2D3047 55%, #6366F1) border-box;
        border: 1px solid transparent;
        transition: transform .18s ease, box-shadow .18s ease;
      }
      .mfc-trigger:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(99,102,241,0.28); }
      .mfc-trigger:focus-visible { outline: 2px solid #6366F1; outline-offset: 2px; }
      .mfc-trigger:hover .mfc-sigil__star { animation-duration: 8s; }
      .mfc-trigger__txt { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
      .mfc-trigger__title {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 700; font-size: 13px; color: #F7F8FC;
      }
      .mfc-trigger__sub {
        font-family: "JetBrains Mono", monospace; font-size: 9px; letter-spacing: 0.08em;
        text-transform: uppercase; color: #6EE7B7;
      }
      .mfc-sigil { display: inline-flex; filter: drop-shadow(0 0 6px rgba(99,102,241,0.35)); }
      .mfc-sigil__star { transform-origin: 50px 50px; animation: mfcSpin 48s linear infinite; }
      .mfc-sigil__core { transform-origin: 50px 50px; animation: mfcPulse 3.4s ease-in-out infinite; }
      .mfc-sigil.is-thinking .mfc-sigil__star { animation-duration: 6s; }
      .mfc-sigil.is-thinking .mfc-sigil__core { animation-duration: 1.1s; }
      @keyframes mfcSpin { to { transform: rotate(360deg); } }
      @keyframes mfcPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.16); opacity: 0.85; } }
      @media (prefers-reduced-motion: reduce) {
        .mfc-sigil__star, .mfc-sigil__core { animation: none; }
        .mfc-trigger, .mfc-trigger:hover { transition: none; transform: none; }
      }
    `}</style>
  );
}

// ── Estilos do painel flutuante ─────────────────────────────────────────────
function MestreChatStyles() {
  return (
    <style>{`
      .mfc-shell {
        position: fixed; right: 16px; bottom: 16px; z-index: 70;
        display: flex; flex-direction: column;
        width: min(420px, calc(100vw - 24px));
        height: min(620px, calc(100dvh - 48px));
        background: #12141F; border: 1px solid #2D3047; border-radius: 18px;
        box-shadow: 0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.06);
        font-family: "DM Sans", sans-serif;
        animation: mfcIn .28s cubic-bezier(.2,.8,.2,1) both;
        overflow: hidden;
      }
      @keyframes mfcIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
      @media (max-width: 480px) { .mfc-shell { right: 8px; left: 8px; bottom: 8px; width: auto; } }
      @media (prefers-reduced-motion: reduce) { .mfc-shell, .mfc-msg { animation: none; } }

      .mfc-head {
        display: flex; align-items: center; gap: 10px; padding: 12px 14px;
        border-bottom: 1px solid #2D3047; position: relative; flex-shrink: 0;
      }
      .mfc-head::after {
        content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent);
      }
      .mfc-head__id { display: flex; flex-direction: column; line-height: 1.1; margin-right: auto; }
      .mfc-head__name {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 800; font-size: 15px; color: #F7F8FC;
      }
      .mfc-head__sub {
        font-family: "JetBrains Mono", monospace; font-size: 9px; letter-spacing: 0.07em;
        text-transform: uppercase; color: #6EE7B7;
      }
      .mfc-iconbtn {
        display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
        color: #A0A3B1; background: transparent; transition: color .15s ease, background .15s ease;
      }
      .mfc-iconbtn:hover:not(:disabled) { color: #F7F8FC; background: #242736; }
      .mfc-iconbtn:disabled { opacity: .35; cursor: not-allowed; }

      .mfc-stream { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
      .mfc-stream::-webkit-scrollbar { width: 6px; }
      .mfc-stream::-webkit-scrollbar-thumb { background: #2D3047; border-radius: 999px; }

      .mfc-hero { margin: auto 0; text-align: center; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .mfc-hero__lead { color: #A0A3B1; font-size: 13px; line-height: 1.55; max-width: 300px; margin: 0; }
      .mfc-sugs { display: flex; flex-direction: column; gap: 7px; width: 100%; }
      .mfc-sug {
        position: relative; display: flex; flex-direction: column; gap: 3px; text-align: left;
        padding: 10px 12px 10px 15px; border-radius: 12px; cursor: pointer;
        background: #171A28; border: 1px solid #2D3047; overflow: hidden;
        transition: border-color .15s ease, background .15s ease;
      }
      .mfc-sug::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ac); opacity: .85; }
      .mfc-sug:hover { border-color: var(--ac); background: #1A1D2E; }
      .mfc-sug__tag {
        font-family: "JetBrains Mono", monospace; font-size: 9px; letter-spacing: 0.08em;
        text-transform: uppercase; color: var(--ac); font-weight: 600;
      }
      .mfc-sug__txt { font-size: 12.5px; color: #E6E8F0; line-height: 1.35; }

      .mfc-msg { display: flex; animation: mfcMsgIn .26s cubic-bezier(.2,.8,.2,1) both; }
      .mfc-msg--user { justify-content: flex-end; }
      @keyframes mfcMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      .mfc-bubble { max-width: 88%; border-radius: 14px; padding: 10px 13px; }
      .mfc-msg--user .mfc-bubble {
        background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff;
        border-bottom-right-radius: 4px;
      }
      .mfc-msg--ia .mfc-bubble {
        background: #1A1D2E; border: 1px solid #2D3047; color: #F7F8FC;
        border-bottom-left-radius: 4px;
      }
      .mfc-bubble__who {
        display: block; font-family: "JetBrains Mono", monospace; font-size: 9px;
        letter-spacing: 0.08em; text-transform: uppercase; color: #6366F1; margin-bottom: 4px; font-weight: 600;
      }
      .mfc-bubble__txt { font-size: 13px; line-height: 1.58; white-space: pre-wrap; margin: 0; }

      .mfc-think { font-family: "JetBrains Mono", monospace; font-size: 12px; color: #A0A3B1; }
      .mfc-think i { animation: mfcBlink 1.2s infinite both; font-style: normal; }
      .mfc-think i:nth-child(2) { animation-delay: .2s; }
      .mfc-think i:nth-child(3) { animation-delay: .4s; }
      @keyframes mfcBlink { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

      .mfc-data { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #2D3047; display: flex; flex-direction: column; gap: 10px; }
      .mfc-status { display: flex; align-items: center; gap: 8px; }
      .mfc-status__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--st); box-shadow: 0 0 8px var(--st); }
      .mfc-status__label {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 700; font-size: 12px; color: var(--st);
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      .mfc-status__ver { font-family: "JetBrains Mono", monospace; font-size: 9.5px; color: #6B6F80; margin-left: auto; }
      .mfc-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .mfc-kpi { display: flex; flex-direction: column; gap: 1px; padding: 8px 9px; border-radius: 10px; background: #0F1117; border: 1px solid #242736; }
      .mfc-kpi__val { font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 15px; line-height: 1.2; }
      .mfc-kpi__lbl { font-size: 9.5px; color: #6B6F80; }
      .mfc-grupos { display: flex; flex-direction: column; gap: 6px; }
      .mfc-grupo { display: grid; grid-template-columns: 1fr 64px 34px; align-items: center; gap: 8px; }
      .mfc-grupo__nome { font-size: 11.5px; color: #E6E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mfc-grupo__bar { height: 5px; border-radius: 999px; background: #242736; overflow: hidden; }
      .mfc-grupo__bar span { display: block; height: 100%; background: linear-gradient(90deg, #6366F1, #22C55E); border-radius: 999px; }
      .mfc-grupo__pct { font-family: "JetBrains Mono", monospace; font-size: 10px; color: #A0A3B1; text-align: right; }

      .mfc-export {
        display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500;
        margin-top: 10px; padding: 6px 10px; border-radius: 8px; background: #242736; color: #A5B4FC;
        transition: color .15s ease, background .15s ease;
      }
      .mfc-export:hover { color: #fff; background: #2D3047; }

      .mfc-input { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid #2D3047; flex-shrink: 0; }
      .mfc-textarea {
        flex: 1; resize: none; max-height: 110px; padding: 10px 13px; border-radius: 12px;
        background: #1A1D2E; border: 1px solid #2D3047; color: #F7F8FC; font-size: 13px;
        font-family: "DM Sans", sans-serif; transition: border-color .15s ease, box-shadow .15s ease;
      }
      .mfc-textarea::placeholder { color: #6B6F80; }
      .mfc-textarea:focus { outline: none; border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
      .mfc-send {
        flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
        background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff;
        transition: transform .15s ease, opacity .15s ease;
      }
      .mfc-send:hover:not(:disabled) { transform: translateY(-1px); }
      .mfc-send:disabled { opacity: 0.4; cursor: not-allowed; }
    `}</style>
  );
}
