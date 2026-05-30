import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarPorToken } from '@/firebase/functions.js';
import { insightPerfil } from '@/firebase/functions.js';

// ─── Configuração DISC ────────────────────────────────────────────────────────
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

function BarraDisc({ letra, valor, primario }) {
  const cfg = DISC[letra];
  return (
    <div className={`rounded-xl p-3 border transition-all ${primario ? 'border-opacity-60' : 'border-opacity-20'}`}
      style={{ background: cfg.bg, borderColor: cfg.cor + (primario ? '99' : '30') }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.emoji}</span>
          <div>
            <span className="text-sm font-semibold" style={{ color: cfg.cor }}>{cfg.nome}</span>
            {primario && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: cfg.cor }}>PRIMÁRIO</span>
            )}
          </div>
        </div>
        <span className="text-sm font-bold" style={{ color: cfg.cor }}>{valor}%</span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${valor}%`, background: cfg.cor }} />
      </div>
    </div>
  );
}

function Chip({ label, cor }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
      style={{ color: cor || '#6366F1', borderColor: (cor || '#6366F1') + '40', background: (cor || '#6366F1') + '15' }}>
      {label}
    </span>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-[#F7F8FC] uppercase tracking-wide">{title}</h3>
      </div>
      {children}
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
  const [animado, setAnimado] = useState(false);

  useEffect(() => {
    if (!token) { setErro('Token inválido.'); setLoading(false); return; }

    buscarPorToken({ token })
      .then((res) => {
        setDados(res);
        setLoading(false);
        setTimeout(() => setAnimado(true), 100);

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
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
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
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-[#F7F8FC] mb-2">Resultado não encontrado</h2>
          <p className="text-[#A0A3B1] text-sm">{erro || 'O link pode ter expirado ou ser inválido.'}</p>
        </div>
      </div>
    );
  }

  // ── Ainda não concluído ──────────────────────────────────────────────────────
  if (dados.status !== 'concluido' || !dados.perfil) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-[#F7F8FC] mb-2">Resultado em processamento</h2>
          <p className="text-[#A0A3B1] text-sm">
            Olá, <strong className="text-[#F7F8FC]">{dados.nome}</strong>! Seu resultado ainda está sendo
            processado. Por favor, aguarde o seu facilitador liberar o acesso.
          </p>
        </div>
      </div>
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
    <div className="min-h-screen bg-[#0F1117] py-8 px-4">
      <div className={`max-w-lg mx-auto space-y-5 transition-all duration-700 ${animado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* ── Header ProfileAI ── */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#F7F8FC] text-base">ProfileAI</span>
        </div>

        {/* ── Banner de perfil ── */}
        <div className="rounded-2xl p-6 border-2 text-center"
          style={{ background: primCfg.bg, borderColor: primCfg.cor + '60' }}>
          <p className="text-xs text-[#A0A3B1] mb-1">{sessaoTitulo}</p>
          <h1 className="text-xl font-bold text-[#F7F8FC] mb-0.5">Olá, {nome.split(' ')[0]}! 🎉</h1>
          <p className="text-xs text-[#A0A3B1] mb-4">Seu relatório de perfil comportamental DISC</p>

          {/* Perfil primário */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 bg-[#0F1117]/30"
            style={{ borderColor: primCfg.cor }}>
            <span className="text-3xl font-black" style={{ color: primCfg.cor }}>
              {perfil.perfilPrimario}
            </span>
            <div className="text-left">
              <p className="text-sm font-bold text-[#F7F8FC]">Perfil {primCfg.nome}</p>
              {secCfg && (
                <p className="text-xs" style={{ color: secCfg.cor }}>
                  + tendência {secCfg.nome}
                </p>
              )}
            </div>
          </div>

          {/* Palavras-chave da IA */}
          {insight?.palavrasChave?.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {insight.palavrasChave.map((p, i) => (
                <Chip key={i} label={p} cor={primCfg.cor} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sobre este perfil ── */}
        <Section icon="🧠" title="Sobre seu perfil">
          <p className="text-sm text-[#C7D2FE] leading-relaxed">
            {insight?.insight || DESC_DISC[perfil.perfilPrimario]}
          </p>
          {secCfg && !insight?.insight && (
            <p className="text-xs text-[#A0A3B1] mt-2 leading-relaxed">
              <span style={{ color: secCfg.cor }}>Tendência {secCfg.nome}:</span>{' '}
              {DESC_DISC[perfil.perfilSecundario]}
            </p>
          )}
          {loadingIA && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[#A0A3B1]">
              <div className="w-3 h-3 rounded-full border border-[#6366F1] border-t-transparent animate-spin" />
              Gerando análise personalizada...
            </div>
          )}
        </Section>

        {/* ── Distribuição DISC ── */}
        <Section icon="📊" title="Distribuição DISC">
          <div className="space-y-2.5">
            {barras.map(({ letra, valor, primario }) => (
              <BarraDisc key={letra} letra={letra} valor={valor} primario={primario} />
            ))}
          </div>
        </Section>

        {/* ── Forças ── */}
        {(insight?.forcas?.length > 0) && (
          <Section icon="💪" title="Seus pontos fortes">
            <ul className="space-y-2">
              {insight.forcas.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#E2E8F0]">
                  <span className="text-[#22C55E] mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Áreas de desenvolvimento ── */}
        {(insight?.desafios?.length > 0) && (
          <Section icon="🌱" title="Áreas de desenvolvimento">
            <ul className="space-y-2">
              {insight.desafios.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#E2E8F0]">
                  <span className="text-[#6366F1] mt-0.5 flex-shrink-0">→</span>
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

        {/* ── Áreas de carreira ── */}
        {(insight?.carreiras?.length > 0) && (
          <Section icon="🎯" title="Áreas e carreiras indicadas">
            <div className="flex flex-wrap gap-2">
              {insight.carreiras.map((c, i) => (
                <Chip key={i} label={c} cor={primCfg.cor} />
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
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-[#4A4D6A]">
            Este relatório foi gerado pela plataforma{' '}
            <span className="text-[#6366F1] font-medium">ProfileAI</span>
          </p>
          <p className="text-xs text-[#4A4D6A]">
            Converse com seu facilitador para aprofundar os resultados.
          </p>
        </div>
      </div>
    </div>
  );
}
