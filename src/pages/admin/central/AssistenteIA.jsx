import React, { useRef, useState, useEffect } from 'react';
import { assistenteCentral, logAudit } from '@/firebase/functions.js';
import { gerarPdfCentral } from '@/lib/centralPdf.js';
import { getUser } from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';
import usePwaUpdate from '@/hooks/usePwaUpdate.js';
import { playBeep, showOsNotification } from '@/lib/notify.js';

// ── Identidade do Mestre ────────────────────────────────────────────────────
// Sugestões com categoria (cor de acento DISC/estado) para a tela inicial.
const SUGESTOES = [
  { texto: 'Como está a distribuição DISC dos meus grupos?', tag: 'Grupos', cor: '#6366F1' },
  { texto: 'Qual a taxa de conclusão nos últimos 30 dias?', tag: 'Período', cor: '#F59E0B' },
  { texto: 'Como está a saúde do app? Algo fora do normal?', tag: 'Status', cor: '#22C55E' },
  { texto: 'Compare a conclusão entre os grupos.', tag: 'Grupos', cor: '#6366F1' },
];

const STATUS_META = {
  saudavel: { label: 'Saudável', cor: '#22C55E', glow: 'rgba(34,197,94,0.25)' },
  observar: { label: 'Observar', cor: '#F59E0B', glow: 'rgba(245,158,11,0.22)' },
  atencao:  { label: 'Atenção',  cor: '#EF4444', glow: 'rgba(239,68,68,0.22)' },
};

const PEEK_LABELS = {
  min_n: 'Mín. amostra', grupos_exibidos: 'Grupos', grupos_suprimidos: 'Suprimidos',
  janela_dias: 'Janela (dias)', criadas: 'Criadas', iniciadas: 'Iniciadas',
  concluidas: 'Concluídas', taxa_conclusao: 'Conclusão %', tempo_medio_min: 'Tempo médio (min)',
};

// ── Sigilo do Mestre: bússola de 4 eixos nas cores DISC ─────────────────────
function MestreSigil({ size = 44, thinking = false }) {
  return (
    <span
      className={`mestre-sigil${thinking ? ' is-thinking' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#2D3047" strokeWidth="1.5" />
        <g className="sigil-star">
          <polygon points="50,7 56,50 44,50" fill="#EF4444" />
          <polygon points="93,50 50,44 50,56" fill="#F59E0B" />
          <polygon points="50,93 44,50 56,50" fill="#22C55E" />
          <polygon points="7,50 50,56 50,44" fill="#6366F1" />
          {/* eixos diagonais sutis */}
          <line x1="22" y1="22" x2="40" y2="40" stroke="#3A3D5A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="22" x2="60" y2="40" stroke="#3A3D5A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="78" x2="60" y2="60" stroke="#3A3D5A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="78" x2="40" y2="60" stroke="#3A3D5A" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <circle className="sigil-core" cx="50" cy="50" r="11" fill="#6366F1" />
        <circle cx="50" cy="50" r="4.5" fill="#0F1117" />
      </svg>
    </span>
  );
}

function KpiTile({ label, value, accent = '#6366F1' }) {
  return (
    <div className="mestre-kpi">
      <span className="mestre-kpi__val" style={{ color: accent }}>{value}</span>
      <span className="mestre-kpi__lbl">{label}</span>
    </div>
  );
}

// Renderização rica do saude_status (status + KPIs + alertas).
function StatusCard({ d }) {
  const meta = STATUS_META[d.status_geral] || STATUS_META.observar;
  const av = d.avaliacoes || {};
  return (
    <div className="mestre-data">
      <div className="mestre-status-head" style={{ '--st': meta.cor, '--stglow': meta.glow }}>
        <span className="mestre-status-dot" />
        <span className="mestre-status-label">{meta.label}</span>
        {d.app_version && <span className="mestre-status-ver">v{d.app_version}</span>}
        {d.atualizacao_disponivel && <span className="mestre-status-upd">atualização disponível</span>}
      </div>
      <div className="mestre-kpis">
        <KpiTile label="Grupos" value={d.grupos ?? 0} />
        <KpiTile label="Alunos" value={d.alunos ?? 0} />
        <KpiTile label="Conclusão" value={`${d.taxa_conclusao ?? 0}%`} accent="#22C55E" />
        <KpiTile label="Concluídas" value={av.concluidas ?? 0} accent="#22C55E" />
        <KpiTile label="Em andamento" value={av.em_andamento ?? 0} accent="#F59E0B" />
        <KpiTile label="Paradas" value={d.avaliacoes_paradas ?? 0} accent={(d.avaliacoes_paradas ?? 0) > 0 ? '#EF4444' : '#A0A3B1'} />
      </div>
      {Array.isArray(d.alertas) && d.alertas.length > 0 && (
        <ul className="mestre-alertas">
          {d.alertas.map((a, i) => (
            <li key={i} className="mestre-alerta">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Renderização compacta e defensiva para as demais consultas.
function MetricsPeek({ d }) {
  const tiles = Object.entries(d)
    .filter(([k, v]) => k !== 'consulta' && typeof v === 'number')
    .map(([k, v]) => ({ k, label: PEEK_LABELS[k] || k.replace(/_/g, ' '), v }));
  const grupos = Array.isArray(d.grupos) ? d.grupos.slice(0, 8) : null;
  if (tiles.length === 0 && !grupos) return null;
  return (
    <div className="mestre-data">
      {tiles.length > 0 && (
        <div className="mestre-kpis">
          {tiles.map((t) => (
            <KpiTile key={t.k} label={t.label} value={t.v}
              accent={t.k === 'taxa_conclusao' ? '#22C55E' : '#6366F1'} />
          ))}
        </div>
      )}
      {grupos && grupos.length > 0 && (
        <div className="mestre-grupos">
          {grupos.map((g, i) => (
            <div key={i} className="mestre-grupo">
              <span className="mestre-grupo__nome">{g.grupo || `Grupo ${i + 1}`}</span>
              <div className="mestre-grupo__bar">
                <span style={{ width: `${Math.max(0, Math.min(100, g.taxa_conclusao ?? 0))}%` }} />
              </div>
              <span className="mestre-grupo__pct">{g.taxa_conclusao ?? 0}%</span>
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

export default function AssistenteIA() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { currentVersion, updateAvailable } = usePwaUpdate();
  const prefsRef = useRef({ aiReply: true, sound: true });

  const [mensagens, setMensagens] = useState([]); // {autor:'user'|'ia', texto, dados?, queryUsada?, modo?}
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const fimRef = useRef(null);

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
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, enviando]);

  const enviar = async (perguntaTexto) => {
    const pergunta = (perguntaTexto ?? texto).trim();
    if (!pergunta || enviando) return;
    setErro(null);
    setTexto('');
    setMensagens((m) => [...m, { autor: 'user', texto: pergunta }]);
    setEnviando(true);
    try {
      const res = await assistenteCentral({
        pergunta,
        contexto: {
          tela: 'central/assistente',
          appVersion: currentVersion,
          atualizacaoDisponivel: !!updateAvailable,
        },
      });
      setMensagens((m) => [
        ...m,
        {
          autor: 'ia',
          texto: res?.narrativa || 'Sem resposta.',
          dados: res?.dados || null,
          queryUsada: res?.queryUsada || null,
          modo: res?.modo || 'conversa',
          cacheHit: res?.cacheHit || false,
          pergunta,
        },
      ]);
      if (prefsRef.current.aiReply) {
        if (prefsRef.current.sound) playBeep();
        if (typeof document !== 'undefined' && document.hidden) {
          showOsNotification({ title: 'Mestre respondeu', body: 'Sua análise está pronta na Central.', tag: 'pm-ai' });
        }
      }
    } catch (e) {
      setErro(e?.message || 'Falha ao consultar o Mestre.');
    } finally {
      setEnviando(false);
    }
  };

  const baixarPdf = (msg) => {
    gerarPdfCentral({
      pergunta: msg.pergunta,
      narrativa: msg.texto,
      dados: msg.dados,
      queryUsada: msg.queryUsada,
    });
    logAudit({ action: 'report_exported', target_type: 'central_ai', target_id: msg.queryUsada || 'analise' });
  };

  const vazio = mensagens.length === 0;

  return (
    <div className="mestre-shell">
      <MestreStyles />

      {/* Cabeçalho / identidade */}
      <header className="mestre-header">
        <MestreSigil size={40} thinking={enviando} />
        <div className="mestre-id">
          <h2 className="mestre-name">Mestre</h2>
          <span className="mestre-sub">Inteligência do Perfil Master</span>
        </div>
        <span className="mestre-live" title="Só números agregados. O Mestre nunca vê nome, e-mail ou CPF.">
          <span className="mestre-live__dot" />
          sem PII
        </span>
      </header>

      {/* Conversa */}
      <div className="mestre-stream">
        {vazio && (
          <div className="mestre-hero">
            <div className="mestre-hero__sigil"><MestreSigil size={92} /></div>
            <h1 className="mestre-hero__title">Pergunte ao Mestre</h1>
            <p className="mestre-hero__lead">
              O Mestre lê o comportamento dos seus grupos e o ritmo do período em números.
              Ninguém é identificado.
            </p>
            <div className="mestre-sugs">
              {SUGESTOES.map((s) => (
                <button key={s.texto} className="mestre-sug" onClick={() => enviar(s.texto)} style={{ '--ac': s.cor }}>
                  <span className="mestre-sug__tag">{s.tag}</span>
                  <span className="mestre-sug__txt">{s.texto}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((msg, i) => (
          <div key={i} className={`mestre-msg mestre-msg--${msg.autor}`}>
            {msg.autor === 'ia' && <div className="mestre-msg__avatar"><MestreSigil size={30} /></div>}
            <div className="mestre-bubble">
              {msg.autor === 'ia' && <span className="mestre-bubble__who">Mestre</span>}
              <p className="mestre-bubble__txt">{msg.texto}</p>
              {msg.autor === 'ia' && msg.modo === 'dado' && <DadosBlock d={msg.dados} />}
              {msg.autor === 'ia' && msg.modo === 'dado' && (
                <div className="mestre-bubble__foot">
                  <button onClick={() => baixarPdf(msg)} className="mestre-export">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Exportar PDF
                  </button>
                  {msg.cacheHit && <span className="mestre-cache">do cache</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="mestre-msg mestre-msg--ia">
            <div className="mestre-msg__avatar"><MestreSigil size={30} thinking /></div>
            <div className="mestre-bubble mestre-bubble--thinking">
              <span className="mestre-bubble__who">Mestre</span>
              <span className="mestre-think">consultando seus dados<i>.</i><i>.</i><i>.</i></span>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <p className="mestre-erro">{erro}</p>}

      {/* Campo de entrada */}
      <div className="mestre-input">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Pergunte ao Mestre sobre grupos, período ou a saúde do app…"
          rows={1}
          className="mestre-textarea"
        />
        <button onClick={() => enviar()} disabled={enviando || !texto.trim()} className="mestre-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Estilos do Mestre (scoped) ──────────────────────────────────────────────
function MestreStyles() {
  return (
    <style>{`
      .mestre-shell {
        position: relative;
        display: flex; flex-direction: column;
        height: calc(100vh - 220px); min-height: 440px;
        font-family: "DM Sans", sans-serif;
      }
      .mestre-shell::before {
        content: ""; position: absolute; inset: -40px -20px auto; height: 280px;
        background: radial-gradient(60% 100% at 30% 0%, rgba(99,102,241,0.16), transparent 70%);
        pointer-events: none; z-index: 0;
      }
      .mestre-shell > * { position: relative; z-index: 1; }

      /* Sigilo */
      .mestre-sigil { display: inline-flex; filter: drop-shadow(0 0 6px rgba(99,102,241,0.35)); }
      .mestre-sigil .sigil-star { transform-origin: 50px 50px; animation: sigilSpin 48s linear infinite; }
      .mestre-sigil .sigil-core { animation: sigilPulse 3.4s ease-in-out infinite; transform-origin: 50px 50px; }
      .mestre-sigil.is-thinking { filter: drop-shadow(0 0 12px rgba(99,102,241,0.7)); }
      .mestre-sigil.is-thinking .sigil-star { animation-duration: 6s; }
      .mestre-sigil.is-thinking .sigil-core { animation-duration: 1.1s; }
      @keyframes sigilSpin { to { transform: rotate(360deg); } }
      @keyframes sigilPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.16); opacity: 0.82; } }

      /* Header */
      .mestre-header {
        display: flex; align-items: center; gap: 12px;
        padding-bottom: 14px; margin-bottom: 14px;
        border-bottom: 1px solid #2D3047;
      }
      .mestre-id { display: flex; flex-direction: column; line-height: 1.1; margin-right: auto; }
      .mestre-name {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 800; font-size: 20px;
        letter-spacing: -0.01em; color: #F7F8FC; margin: 0;
        background: linear-gradient(120deg, #F7F8FC, #A5B4FC); -webkit-background-clip: text;
        background-clip: text; -webkit-text-fill-color: transparent;
      }
      .mestre-sub { font-size: 11.5px; color: #6B6F80; letter-spacing: 0.02em; }
      .mestre-live {
        display: inline-flex; align-items: center; gap: 6px;
        font-family: "JetBrains Mono", monospace; font-size: 10.5px; letter-spacing: 0.05em;
        text-transform: uppercase; color: #6EE7B7; padding: 5px 10px; border-radius: 999px;
        background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); cursor: help;
      }
      .mestre-live__dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 8px #22C55E; animation: sigilPulse 2s ease-in-out infinite; }

      /* Stream */
      .mestre-stream { flex: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 18px; }
      .mestre-stream::-webkit-scrollbar { width: 6px; }
      .mestre-stream::-webkit-scrollbar-thumb { background: #2D3047; border-radius: 999px; }

      /* Hero / empty */
      .mestre-hero { margin: auto; text-align: center; max-width: 620px; padding: 24px 0; animation: fadeIn 0.5s ease both; }
      .mestre-hero__sigil { display: inline-flex; margin-bottom: 18px; }
      .mestre-hero__title {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 800; font-size: 30px;
        letter-spacing: -0.02em; color: #F7F8FC; margin: 0 0 10px;
      }
      .mestre-hero__lead { color: #A0A3B1; font-size: 14.5px; line-height: 1.6; margin: 0 auto 26px; max-width: 460px; }
      .mestre-sugs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; text-align: left; }
      @media (max-width: 560px) { .mestre-sugs { grid-template-columns: 1fr; } }
      .mestre-sug {
        position: relative; display: flex; flex-direction: column; gap: 6px;
        padding: 14px 15px 14px 17px; border-radius: 14px; cursor: pointer;
        background: #15172240; border: 1px solid #2D3047; overflow: hidden;
        transition: transform .18s ease, border-color .18s ease, background .18s ease;
      }
      .mestre-sug::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ac); opacity: .8; }
      .mestre-sug:hover { transform: translateY(-2px); border-color: var(--ac); background: #1A1D2E; }
      .mestre-sug__tag {
        font-family: "JetBrains Mono", monospace; font-size: 10px; letter-spacing: 0.08em;
        text-transform: uppercase; color: var(--ac); font-weight: 600;
      }
      .mestre-sug__txt { font-size: 13.5px; color: #E6E8F0; line-height: 1.4; }

      /* Mensagens */
      .mestre-msg { display: flex; gap: 10px; align-items: flex-end; animation: msgIn 0.32s cubic-bezier(.2,.8,.2,1) both; }
      .mestre-msg--user { justify-content: flex-end; }
      .mestre-msg__avatar { flex-shrink: 0; margin-bottom: 2px; }
      @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

      .mestre-bubble { max-width: 86%; border-radius: 16px; padding: 12px 15px; }
      .mestre-msg--user .mestre-bubble {
        background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff;
        border-bottom-right-radius: 5px; box-shadow: 0 6px 18px rgba(79,70,229,0.28);
      }
      .mestre-msg--ia .mestre-bubble {
        background: #1A1D2E; border: 1px solid #2D3047; color: #F7F8FC;
        border-bottom-left-radius: 5px; position: relative;
      }
      .mestre-msg--ia .mestre-bubble::before {
        content: ""; position: absolute; inset: 0 0 auto; height: 1px; border-radius: 16px 16px 0 0;
        background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent);
      }
      .mestre-bubble__who {
        display: block; font-family: "JetBrains Mono", monospace; font-size: 10px;
        letter-spacing: 0.08em; text-transform: uppercase; color: #6366F1; margin-bottom: 5px; font-weight: 600;
      }
      .mestre-bubble__txt { font-size: 14px; line-height: 1.62; white-space: pre-wrap; margin: 0; }
      .mestre-bubble__foot { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
      .mestre-export {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
        padding: 7px 11px; border-radius: 9px; background: #242736; color: #A5B4FC;
        transition: color .15s ease, background .15s ease;
      }
      .mestre-export:hover { color: #fff; background: #2D3047; }
      .mestre-cache { font-family: "JetBrains Mono", monospace; font-size: 10px; color: #6B6F80; }

      /* Thinking */
      .mestre-bubble--thinking .mestre-think { font-family: "JetBrains Mono", monospace; font-size: 12.5px; color: #A0A3B1; }
      .mestre-think i { animation: blink 1.2s infinite both; font-style: normal; }
      .mestre-think i:nth-child(2) { animation-delay: .2s; }
      .mestre-think i:nth-child(3) { animation-delay: .4s; }
      @keyframes blink { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

      /* Bloco de dados */
      .mestre-data { margin-top: 13px; padding-top: 13px; border-top: 1px dashed #2D3047; display: flex; flex-direction: column; gap: 12px; }
      .mestre-status-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
      .mestre-status-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--st); box-shadow: 0 0 10px var(--stglow); }
      .mestre-status-label {
        font-family: "Plus Jakarta Sans", sans-serif; font-weight: 700; font-size: 13px; color: var(--st);
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      .mestre-status-ver { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: #6B6F80; }
      .mestre-status-upd {
        font-family: "JetBrains Mono", monospace; font-size: 10px; color: #FBBF24; margin-left: auto;
        padding: 3px 8px; border-radius: 999px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
      }
      .mestre-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      @media (max-width: 480px) { .mestre-kpis { grid-template-columns: repeat(2, 1fr); } }
      .mestre-kpi { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 11px; background: #0F1117; border: 1px solid #242736; }
      .mestre-kpi__val { font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 19px; line-height: 1; }
      .mestre-kpi__lbl { font-size: 11px; color: #6B6F80; }
      .mestre-alertas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .mestre-alerta {
        display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #FCD9A8;
        padding: 8px 11px; border-radius: 10px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.22);
      }
      .mestre-alerta svg { margin-top: 1px; color: #F59E0B; flex-shrink: 0; }

      .mestre-grupos { display: flex; flex-direction: column; gap: 7px; }
      .mestre-grupo { display: grid; grid-template-columns: 1fr 80px 38px; align-items: center; gap: 9px; }
      .mestre-grupo__nome { font-size: 12.5px; color: #E6E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mestre-grupo__bar { height: 6px; border-radius: 999px; background: #242736; overflow: hidden; }
      .mestre-grupo__bar span { display: block; height: 100%; background: linear-gradient(90deg, #6366F1, #22C55E); border-radius: 999px; }
      .mestre-grupo__pct { font-family: "JetBrains Mono", monospace; font-size: 11px; color: #A0A3B1; text-align: right; }

      /* Erro + input */
      .mestre-erro { color: #EF4444; font-size: 13px; margin: 8px 0 0; }
      .mestre-input { display: flex; align-items: flex-end; gap: 9px; margin-top: 14px; }
      .mestre-textarea {
        flex: 1; resize: none; max-height: 132px; padding: 13px 16px; border-radius: 15px;
        background: #1A1D2E; border: 1px solid #2D3047; color: #F7F8FC; font-size: 14px;
        font-family: "DM Sans", sans-serif; transition: border-color .15s ease, box-shadow .15s ease;
      }
      .mestre-textarea::placeholder { color: #6B6F80; }
      .mestre-textarea:focus { outline: none; border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
      .mestre-send {
        flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
        background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff;
        box-shadow: 0 6px 18px rgba(79,70,229,0.35); transition: transform .15s ease, opacity .15s ease, box-shadow .15s ease;
      }
      .mestre-send:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(79,70,229,0.5); }
      .mestre-send:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
    `}</style>
  );
}
