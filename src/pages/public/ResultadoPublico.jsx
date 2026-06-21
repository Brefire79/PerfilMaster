import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarPorToken, insightPerfil } from '@/firebase/functions.js';
import { SABOTEUR_LABELS } from '@/lib/saboteurScoring.js';

// ─── Configuração DISC (fonte única de cores — alinhada aos tokens F1) ─────────
const DISC = {
  D: { nome: 'Dominante',  emoji: '🔴', cor: '#EF4444', bg: '#EF444415', campo: 'dominante'  },
  I: { nome: 'Influente',  emoji: '🟡', cor: '#F59E0B', bg: '#F59E0B15', campo: 'influente'  },
  S: { nome: 'Estável',   emoji: '🟢', cor: '#22C55E', bg: '#22C55E15', campo: 'estavel'    },
  C: { nome: 'Analítico', emoji: '🔵', cor: '#6366F1', bg: '#6366F115', campo: 'analitico'  },
};

const DESC_DISC = {
  D: 'Orientado a resultados, decidido, direto e competitivo. Assume riscos e gosta de desafios.',
  I: 'Comunicativo, entusiasta, persuasivo e otimista. Inspira pessoas e cria conexões com facilidade.',
  S: 'Paciente, confiável, colaborativo e leal. Constrói relações sólidas e mantém ambientes harmônicos.',
  C: 'Preciso, analítico, organizado e criterioso. Busca qualidade, detalhes e soluções bem fundamentadas.',
};

// ─── Barra de score DISC (animada, sem dado clínico) ──────────────────────────
function BarraDisc({ letra, valor, primario }) {
  const cfg = DISC[letra];
  return (
    <div className="score-row">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-md text-[11px] font-bold text-white"
            style={{ background: cfg.cor }}
          >
            {letra}
          </span>
          <span className="text-sm font-medium text-[#F7F8FC]">{cfg.nome}</span>
          {primario && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: cfg.cor }}
            >
              PRIMÁRIO
            </span>
          )}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: cfg.cor, fontFamily: "'JetBrains Mono', monospace" }}>
          {valor}%
        </span>
      </div>
      <div className="score-track">
        <div
          className={`score-fill score-fill--${letra}`}
          style={{ width: `${valor}%` }}
        />
      </div>
    </div>
  );
}

function Chip({ label }) {
  return <span className="chip">{label}</span>;
}

function Section({ icon, title, children }) {
  return (
    <section className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg" aria-hidden="true">{icon}</span>
        <h2 className="text-xs font-bold text-[#A0A3B1] uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── Radar DISC: retrato dos 4 eixos em SVG (sem biblioteca) ───────────────────
function DiscRadar({ perfil, accent = '#6366F1', size = 188 }) {
  const C = 60, R = 46;
  const vals = {
    D: Math.max(0, Math.min(100, Math.round(perfil.dominante ?? 0))),
    I: Math.max(0, Math.min(100, Math.round(perfil.influente ?? 0))),
    S: Math.max(0, Math.min(100, Math.round(perfil.estavel ?? 0))),
    C: Math.max(0, Math.min(100, Math.round(perfil.analitico ?? 0))),
  };
  const ang = { D: -Math.PI / 2, I: 0, S: Math.PI / 2, C: Math.PI };
  const pt = (k) => {
    const r = (R * vals[k]) / 100;
    return [C + r * Math.cos(ang[k]), C + r * Math.sin(ang[k])];
  };
  const axisEnd = (k) => [C + R * Math.cos(ang[k]), C + R * Math.sin(ang[k])];
  const lbl = (k, off) => [C + (R + off) * Math.cos(ang[k]), C + (R + off) * Math.sin(ang[k])];
  const poly = ['D', 'I', 'S', 'C'].map((k) => pt(k).map((n) => n.toFixed(1)).join(',')).join(' ');

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="disc-radar" aria-hidden="true">
      {[0.33, 0.66, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="#2D3047" strokeWidth="1" />
      ))}
      {['D', 'I', 'S', 'C'].map((k) => {
        const [x, y] = axisEnd(k);
        return <line key={k} x1={C} y1={C} x2={x} y2={y} stroke="#2D3047" strokeWidth="1" />;
      })}
      <polygon className="disc-radar__shape" points={poly} fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      {['D', 'I', 'S', 'C'].map((k) => {
        const [x, y] = pt(k);
        return <circle key={k} cx={x} cy={y} r="3" fill={DISC[k].cor} stroke="#0F1117" strokeWidth="1.5" />;
      })}
      {['D', 'I', 'S', 'C'].map((k) => {
        const [x, y] = lbl(k, 11);
        return (
          <text key={k} x={x} y={y} fill={DISC[k].cor} fontSize="11" fontWeight="700"
            textAnchor="middle" dominantBaseline="central" fontFamily="'JetBrains Mono', monospace">{k}</text>
        );
      })}
    </svg>
  );
}

function ResultStyles() {
  return (
    <style>{`
      .result-hero {
        position: relative; overflow: hidden; border-radius: 26px; padding: 26px 22px 24px;
        text-align: center; border: 1px solid #2D3047;
        background:
          radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
          linear-gradient(180deg, #1C1F30, #15172150);
        animation: scaleIn .4s ease both;
      }
      .result-hero__glow { position: absolute; top: -70px; right: -40px; width: 200px; height: 200px; border-radius: 50%; filter: blur(60px); opacity: .35; pointer-events: none; }
      .result-hero__sessao { font-family: "JetBrains Mono", monospace; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: #8A8DA0; margin: 0 0 8px; }
      .result-hero__hello { font-size: 13.5px; color: #A0A3B1; margin: 0; }
      .result-hero__title { font-family: "Plus Jakarta Sans", sans-serif; font-weight: 800; font-size: 24px; letter-spacing: -0.02em; color: #F7F8FC; margin: 2px 0 6px; }
      .result-hero__radar { display: flex; justify-content: center; margin: 6px 0 14px; }
      .disc-radar__shape { transform-origin: 60px 60px; animation: radarGrow .7s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes radarGrow { from { transform: scale(.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .result-hero__badge {
        display: inline-flex; align-items: center; gap: 12px; padding: 10px 16px 10px 12px; border-radius: 16px;
        background: #0F1117a0; border: 1px solid #2D3047; backdrop-filter: blur(6px);
      }
      .result-hero__letter { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; font-family: "Plus Jakarta Sans", sans-serif; font-size: 24px; font-weight: 800; color: #fff; }
      .result-hero__pname { font-family: "Plus Jakarta Sans", sans-serif; font-weight: 700; font-size: 16px; color: #F7F8FC; margin: 0; text-align: left; line-height: 1.1; }
      .result-hero__sec { font-size: 12px; color: #A0A3B1; margin: 2px 0 0; text-align: left; }
      .result-hero__kw { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 16px; }
      .result-hero__kw span {
        font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 999px;
        color: color-mix(in srgb, var(--accent) 70%, #fff); background: color-mix(in srgb, var(--accent) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
      }
    `}</style>
  );
}

function EstadoCentral({ emoji, titulo, texto, showCta = false }) {
  return (
    <div className="min-h-[100dvh] bg-[#0F1117] flex flex-col items-center justify-center px-5 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-[#6366F1] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-heading font-semibold text-[#F7F8FC]">Perfil Master</span>
      </div>

      <div className="app-shell text-center">
        <div className="text-5xl mb-4" aria-hidden="true">{emoji}</div>
        <h1 className="text-xl font-bold text-[#F7F8FC] mb-2">{titulo}</h1>
        <p className="text-sm text-[#A0A3B1] leading-relaxed">{texto}</p>

        {showCta && (
          <a
            href="/"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#4F52D9] transition-colors"
          >
            Ir para o início
          </a>
        )}
      </div>
    </div>
  );
}

export default function ResultadoPublico() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingIA, setLoadingIA] = useState(false);
  const [erro, setErro] = useState('');

  // Atualiza document.title com o nome do avaliado quando disponível
  useEffect(() => {
    if (dados?.nome) {
      document.title = `Resultado de ${dados.nome.split(' ')[0]} — Perfil Master`;
    } else {
      document.title = 'Resultado DISC — Perfil Master';
    }
    return () => { document.title = 'Perfil Master'; };
  }, [dados?.nome]);

  useEffect(() => {
    if (!token) { setErro('Token inválido.'); setLoading(false); return; }

    buscarPorToken({ token })
      .then((res) => {
        setDados(res);
        setLoading(false);

        // Auto-carrega insight se há perfil
        if (res?.perfil) {
          setLoadingIA(true);
          insightPerfil({ perfil: res.perfil, nome: res.nome })
            .then(setInsight)
            .catch(() => {/* silencia — insight é opcional */})
            .finally(() => setLoadingIA(false));
        }
      })
      .catch((err) => {
        setErro(err.message || 'Não foi possível carregar o resultado.');
        setLoading(false);
      });
  }, [token]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0F1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <p className="text-[#A0A3B1] text-sm">Carregando seu resultado...</p>
        </div>
      </div>
    );
  }

  // ── Erro / não encontrado ────────────────────────────────────────────────────
  if (erro || !dados) {
    return (
      <EstadoCentral
        emoji="😕"
        titulo="Resultado não encontrado"
        texto={erro || 'O link pode ter expirado ou ser inválido.'}
        showCta
      />
    );
  }

  // ── Ainda não concluído ──────────────────────────────────────────────────────
  if (dados.status !== 'concluido' || !dados.perfil) {
    return (
      <EstadoCentral
        emoji="⏳"
        titulo="Resultado quase pronto"
        texto={`Olá, ${dados.nome}! Ainda estamos gerando seu resultado. Assim que seu facilitador liberar, ele aparece aqui.`}
      />
    );
  }

  const { nome, sessaoTitulo, perfil } = dados;
  const primCfg = DISC[perfil.perfilPrimario];
  const secCfg  = perfil.perfilSecundario ? DISC[perfil.perfilSecundario] : null;

  const barras = Object.entries(DISC).map(([k, cfg]) => ({
    letra: k,
    valor: Math.round(perfil[cfg.campo] ?? 0),
    primario: k === perfil.perfilPrimario,
  })).sort((a, b) => b.valor - a.valor);

  // Sabotadores (PQ) — presente quando a conclusão gravou saboteurScores no perfil
  const temSabotadores = perfil.saboteurScores && Object.keys(perfil.saboteurScores).length > 0;
  const top3Sab = new Set(perfil.saboteurTop3 || []);
  const barrasSab = temSabotadores
    ? Object.entries(perfil.saboteurScores)
        .map(([key, valor]) => ({ key, label: SABOTEUR_LABELS[key] || key, valor: Math.round(valor ?? 0), top: top3Sab.has(key) }))
        .sort((a, b) => b.valor - a.valor)
    : [];

  return (
    <div className="min-h-[100dvh] bg-[#0F1117] py-6">
      <ResultStyles />
      <div className="app-shell space-y-5 animate-fade-in">

        {/* ── Marca ── */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#F7F8FC] text-base font-heading">
            Perfil <span className="text-[#6366F1]">Master</span>
          </span>
        </div>

        {/* ── Hero do perfil: radar DISC ancorado na cor do perfil dominante ── */}
        <header className="result-hero" style={{ '--accent': primCfg.cor }}>
          <div className="result-hero__glow" style={{ background: primCfg.cor }} aria-hidden="true" />
          <div className="relative">
            {sessaoTitulo && <p className="result-hero__sessao">{sessaoTitulo}</p>}
            <p className="result-hero__hello">Olá, {nome.split(' ')[0]}</p>
            <h1 className="result-hero__title">Seu retrato comportamental</h1>

            <div className="result-hero__radar">
              <DiscRadar perfil={perfil} accent={primCfg.cor} size={190} />
            </div>

            <div className="result-hero__badge">
              <span className="result-hero__letter" style={{ background: primCfg.cor }}>
                {perfil.perfilPrimario}
              </span>
              <div>
                <p className="result-hero__pname">Perfil {primCfg.nome}</p>
                {secCfg && <p className="result-hero__sec">com tendência {secCfg.nome}</p>}
              </div>
            </div>

            {insight?.palavrasChave?.length > 0 && (
              <div className="result-hero__kw">
                {insight.palavrasChave.map((p, i) => <span key={i}>{p}</span>)}
              </div>
            )}
          </div>
        </header>

        {/* ── Sobre o perfil ── */}
        {/* aria-live: anuncia ao SR quando o insight da IA carregar */}
        <Section icon="🧠" title="Sobre seu perfil">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-sm text-[#E2E8F0] leading-relaxed">
              {insight?.insight || DESC_DISC[perfil.perfilPrimario]}
            </p>
            {secCfg && !insight?.insight && (
              <p className="text-xs text-[#A0A3B1] mt-2 leading-relaxed">
                <span style={{ color: secCfg.cor }}>Tendência {secCfg.nome}:</span>{' '}
                {DESC_DISC[perfil.perfilSecundario]}
              </p>
            )}
          </div>
          {loadingIA && (
            <div
              role="status"
              aria-label="Carregando análise personalizada"
              className="flex items-center gap-2 mt-3 text-xs text-[#A0A3B1]"
            >
              <div className="w-3 h-3 rounded-full border border-[#6366F1] border-t-transparent animate-spin" aria-hidden="true" />
              Gerando análise personalizada...
            </div>
          )}
        </Section>

        {/* ── Distribuição DISC ── */}
        <Section icon="📊" title="Distribuição DISC">
          <div className="space-y-4">
            {barras.map(({ letra, valor, primario }) => (
              <BarraDisc key={letra} letra={letra} valor={valor} primario={primario} />
            ))}
          </div>
        </Section>

        {/* ── Sabotadores (PQ) — presente nas avaliações com Sabotadores ── */}
        {temSabotadores && (
          <Section icon="🧩" title="Sabotadores (PQ)">
            {typeof perfil.pqScore === 'number' && (
              <div className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl bg-[#0F1117] border border-[#2D3047]">
                <span className="text-sm text-[#A0A3B1]">PQ Score</span>
                <span className="text-lg font-bold tabular-nums text-[#22C55E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{perfil.pqScore}</span>
              </div>
            )}
            <div className="space-y-3">
              {barrasSab.map(({ key, label, valor, top }) => (
                <div key={key} className="score-row">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-[#F7F8FC]">
                      {label}
                      {top && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-white">
                          PRINCIPAL
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[#A0A3B1]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{valor}%</span>
                  </div>
                  <div className="score-track">
                    <div
                      className="score-fill"
                      style={{ width: `${valor}%`, background: top ? '#F59E0B' : '#6366F1' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#4A4D6A] mt-4 leading-relaxed">
              Sabotadores são padrões mentais automáticos. Quanto maior o score, mais forte a tendência.
              O PQ Score reflete seu equilíbrio mental geral (quanto maior, melhor).
            </p>
          </Section>
        )}

        {/* ── Forças ── */}
        {(insight?.forcas?.length > 0) && (
          <Section icon="💪" title="Seus pontos fortes">
            <ul className="space-y-2.5">
              {insight.forcas.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#E2E8F0]">
                  <span className="text-[#22C55E] mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Áreas de desenvolvimento ── */}
        {(insight?.desafios?.length > 0) && (
          <Section icon="🌱" title="Áreas de desenvolvimento">
            <ul className="space-y-2.5">
              {insight.desafios.map((d, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#E2E8F0]">
                  <span className="text-[#6366F1] mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
                  {d}
                </li>
              ))}
            </ul>
            {insight?.desenvolvimento && (
              <p className="mt-3 text-xs text-[#A0A3B1] leading-relaxed border-t border-[#2D3047] pt-3">
                {insight.desenvolvimento}
              </p>
            )}
          </Section>
        )}

        {/* ── Comunicação ── */}
        {insight?.comunicacao && (
          <Section icon="💬" title="Como você se comunica">
            <p className="text-sm text-[#E2E8F0] leading-relaxed">{insight.comunicacao}</p>
          </Section>
        )}

        {/* ── Carreiras ── */}
        {(insight?.carreiras?.length > 0) && (
          <Section icon="🎯" title="Áreas e carreiras indicadas">
            <div className="flex flex-wrap gap-2">
              {insight.carreiras.map((c, i) => (
                <Chip key={i} label={c} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Fallback: descrições sem IA ── */}
        {!insight && !loadingIA && (
          <Section icon="📋" title="Características do seu perfil">
            <div className="space-y-3">
              {barras.map(({ letra, valor }) => (
                valor > 40 && (
                  <div key={letra} className="text-sm">
                    <p className="font-medium mb-0.5" style={{ color: DISC[letra].cor }}>
                      {DISC[letra].emoji} {DISC[letra].nome} ({valor}%)
                    </p>
                    <p className="text-[#A0A3B1] text-xs leading-relaxed">{DESC_DISC[letra]}</p>
                  </div>
                )
              ))}
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-4 space-y-1">
          <p className="text-xs text-[#A0A3B1]">
            Relatório gerado pela plataforma{' '}
            <span className="text-[#6366F1] font-medium">Perfil Master</span>
          </p>
          <p className="text-xs text-[#A0A3B1]">
            Converse com seu facilitador para aprofundar os resultados.
          </p>
        </footer>
      </div>
    </div>
  );
}
