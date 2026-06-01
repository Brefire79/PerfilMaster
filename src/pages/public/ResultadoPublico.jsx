import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarPorToken, insightPerfil } from '@/firebase/functions.js';

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
        <span className="text-sm font-bold tabular-nums" style={{ color: cfg.cor }}>
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
        <span className="text-sm font-heading font-semibold text-[#F7F8FC]">ProfileAI</span>
      </div>

      <div className="app-shell text-center">
        <div className="text-5xl mb-4" aria-hidden="true">{emoji}</div>
        <h1 className="text-xl font-bold text-[#F7F8FC] mb-2">{titulo}</h1>
        <p className="text-sm text-[#A0A3B1] leading-relaxed">{texto}</p>

        {showCta && (
          <a
            href="/login"
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
      document.title = `Resultado de ${dados.nome.split(' ')[0]} — ProfileAI`;
    } else {
      document.title = 'Resultado DISC — ProfileAI';
    }
    return () => { document.title = 'ProfileAI'; };
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
        titulo="Resultado em processamento"
        texto={`Olá, ${dados.nome}! Seu resultado ainda está sendo processado. Por favor, aguarde o seu facilitador liberar o acesso.`}
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

  return (
    <div className="min-h-[100dvh] bg-[#0F1117] py-6">
      <div className="app-shell space-y-5 animate-fade-in">

        {/* ── Marca ── */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#F7F8FC] text-base font-heading">
            Profile<span className="text-[#6366F1]">AI</span>
          </span>
        </div>

        {/* ── Hero do perfil ── */}
        <header
          className="relative overflow-hidden rounded-3xl p-6 text-center surface-brand animate-scale-in"
        >
          {/* brilho sutil de fundo */}
          <div
            className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full blur-3xl opacity-40"
            style={{ background: primCfg.cor }}
            aria-hidden="true"
          />
          <div className="relative">
            {sessaoTitulo && (
              <p className="text-xs text-white/70 mb-1">{sessaoTitulo}</p>
            )}
            <h1 className="text-2xl font-bold text-white text-balance">
              Olá, {nome.split(' ')[0]}! 🎉
            </h1>
            <p className="text-sm text-white/80 mt-1 mb-5">
              Seu perfil comportamental DISC
            </p>

            {/* Avatar/letra do perfil primário */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/12 backdrop-blur-sm border border-white/20">
              <span
                className="grid place-items-center w-12 h-12 rounded-xl text-2xl font-black text-white"
                style={{ background: primCfg.cor }}
              >
                {perfil.perfilPrimario}
              </span>
              <div className="text-left">
                <p className="text-base font-bold text-white leading-tight">
                  Perfil {primCfg.nome}
                </p>
                {secCfg && (
                  <p className="text-xs text-white/80">+ tendência {secCfg.nome}</p>
                )}
              </div>
            </div>

            {/* Palavras-chave da IA */}
            {insight?.palavrasChave?.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {insight.palavrasChave.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white"
                  >
                    {p}
                  </span>
                ))}
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
            <span className="text-[#6366F1] font-medium">ProfileAI</span>
          </p>
          <p className="text-xs text-[#A0A3B1]">
            Converse com seu facilitador para aprofundar os resultados.
          </p>
        </footer>
      </div>
    </div>
  );
}
