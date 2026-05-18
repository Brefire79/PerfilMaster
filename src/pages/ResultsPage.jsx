/**
 * ProfileAI — AMB FUSI
 * ResultsPage — wrapper de página para o ResultsDashboard
 * Carrega o resultado do Supabase e aciona a geração do relatório IA
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { generateAnalysis, loadApiKey } from '../lib/apiKeyManager.js';
import ResultsDashboard from '../../ResultsDashboard.jsx';

// Mapeia resultado Supabase → formato { D, I, S, C } e { judge, ... }
function mapResultadoToScores(resultado) {
  return {
    discScores: {
      D: Number(resultado.score_dominante ?? 0),
      I: Number(resultado.score_influente  ?? 0),
      S: Number(resultado.score_estavel    ?? 0),
      C: Number(resultado.score_analitico  ?? 0),
    },
    sabotadorScores: {
      judge:          Number(resultado.score_juiz              ?? 0),
      stickler:       Number(resultado.score_insistente        ?? 0),
      pleaser:        Number(resultado.score_prestativo        ?? 0),
      hyperAchiever:  Number(resultado.score_hiper_realizador  ?? 0),
      victim:         Number(resultado.score_vitima            ?? 0),
      hyperRational:  Number(resultado.score_hiper_racional    ?? 0),
      hyperVigilant:  Number(resultado.score_hiper_vigilante   ?? 0),
      restless:       Number(resultado.score_inquieto          ?? 0),
      controller:     Number(resultado.score_controlador       ?? 0),
      avoider:        Number(resultado.score_esquivo           ?? 0),
    },
  };
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = {
  center: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '48px', height: '48px',
    border: '3px solid #1e293b',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  titulo: { fontSize: '1rem', color: '#94a3b8', fontWeight: '500' },
  progresso: {
    width: '200px',
    height: '4px',
    background: '#1e293b',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '0.5rem',
  },
  progressoBarra: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: '#6366f1',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  }),
  errorCard: {
    background: '#1e293b',
    border: '1px solid #ef4444',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '380px',
    width: '100%',
  },
  errorIcon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  errorTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' },
  errorMsg: { color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 },
  btn: {
    background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem', fontWeight: '700',
    cursor: 'pointer', marginTop: '1rem',
  },
};

// ─── Etapas de carregamento ───────────────────────────────────────────────────
const ETAPAS = [
  { label: 'Buscando seu resultado…',          pct: 20 },
  { label: 'Analisando seu perfil DISC…',       pct: 45 },
  { label: 'Avaliando sabotadores internos…',   pct: 65 },
  { label: 'Aprimorando análise com IA…',       pct: 85 },
  { label: 'Finalizando análise…',              pct: 95 },
];

// Badge de origem da análise
const SOURCE_BADGE = {
  local:    { icon: '📊', label: 'Análise local',               bg: 'rgba(52,152,219,0.12)', border: 'rgba(52,152,219,0.3)', color: '#3498db' },
  error:    { icon: '⚠️', label: 'Análise local (erro na API)', bg: 'rgba(255,193,7,0.10)', border: 'rgba(255,193,7,0.3)',  color: '#ffc107' },
  ai:       { icon: '✨', label: 'Análise por IA',              bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#818cf8' },
  xai:      { icon: '⚡', label: 'Análise por Grok (xAI)',      bg: 'rgba(233,69,96,0.12)',  border: 'rgba(233,69,96,0.3)',  color: '#e94560' },
};

// Converte análise estruturada em markdown (mantém retrocompatibilidade)
function buildRelatorioFromAnalysis(analysis, resultado) {
  const { disc, sabotadores, summary, recommendations, correlations } = analysis;
  const dataStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const recLines = recommendations.map((r, i) =>
    `${i + 1}. **[${r.priority?.toUpperCase() ?? 'MÉDIA'}] ${r.category}** — ${r.action}`
  ).join('\n');

  const corrLines = correlations.length
    ? correlations.map(c => `- **${c.disc} × ${c.sabotador}:** ${c.insight}`).join('\n')
    : '- Nenhuma correlação crítica identificada.';

  const discScores = disc.scores;
  const discNomes = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };
  const discLinhas = ['D', 'I', 'S', 'C'].map(k => {
    const tag = k === disc.primary ? ' ← Perfil Primário' : k === disc.secondary ? ' ← Perfil Secundário' : '';
    return `- **${discNomes[k]} (${k}):** ${Number(discScores[k]).toFixed(1)}/5.0${tag}`;
  }).join('\n');

  const sabNomes = { judge: 'Juiz', stickler: 'Insistente', pleaser: 'Prestativo', hyperAchiever: 'Hiper-Realizador', victim: 'Vítima', hyperRational: 'Hiper-Racional', hyperVigilant: 'Hiper-Vigilante', restless: 'Inquieto', controller: 'Controlador', avoider: 'Esquivo' };
  const top3Lines = sabotadores.top3.map((k, i) =>
    `${i + 1}. **${sabNomes[k] ?? k}** — ${Number(sabotadores.scores[k] ?? 0).toFixed(1)}/10`
  ).join('\n');

  const pq = sabotadores.pqScore;
  const nivel = pq >= 75 ? 'Excelente (75+)' : pq >= 63 ? 'Bom (63–74)' : pq >= 51 ? 'Médio (51–62)' : 'Atenção (≤50)';

  const deepBlock = analysis.deepInsights?.length
    ? `\n\n## Insights Aprofundados\n\n${analysis.deepInsights.map(i => `- ${i}`).join('\n')}`
    : '';

  const coachBlock = analysis.coachingQuestions?.length
    ? `\n\n## Perguntas de Coaching\n\n${analysis.coachingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const sourceLabel = analysis.source === 'local' || analysis.apiError
    ? 'Análise calculada localmente — Motor Local v1.0'
    : `Análise aprimorada por IA (${analysis.source})`;

  return `# Relatório de Perfil Comportamental
**ProfileAI · AMB FUSI · ${dataStr}**

---

## Perfil DISC: ${discNomes[disc.primary]} + ${discNomes[disc.secondary]} (Subtipo: ${disc.subtype})

${summary}

---

## Scores DISC

${discLinhas}

---

## Top 3 Sabotadores Mais Ativos

${top3Lines}

---

## PQ Score: ${pq}/100 — ${nivel}

---

## Correlações DISC × Sabotadores

${corrLines}

---

## Recomendações de Desenvolvimento

${recLines}${deepBlock}${coachBlock}

---

*${sourceLabel}*
*ProfileAI · AMB FUSI — "Damos vida à inovação"*`;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ResultsPage({ user }) {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [fase, setFase]         = useState(0);      // índice em ETAPAS
  const [dados, setDados]       = useState(null);   // { resultado, relatorio, analysis }
  const [analysisSource, setAnalysisSource] = useState(null); // 'local' | provider | null
  const [analysisError, setAnalysisError]   = useState(null);
  const [erro, setErro]         = useState('');
  const [pronto, setPronto]     = useState(false);

  // Avança a barra de progresso animada enquanto carrega
  useEffect(() => {
    if (pronto || erro) return;
    const timer = setInterval(() => {
      setFase(f => (f < ETAPAS.length - 1 ? f + 1 : f));
    }, 1800);
    return () => clearInterval(timer);
  }, [pronto, erro]);

  // Carrega dados ao montar
  useEffect(() => {
    if (id) carregarDados(id);
  }, [id]);

  const carregarDados = useCallback(async (resultadoId) => {
    try {
      // 1. Buscar resultado do banco
      const { data: resultado, error: errRes } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('id', resultadoId)
        .eq('user_id', user.id)   // garante que é dono
        .single();

      if (errRes || !resultado) {
        throw new Error('Resultado não encontrado ou sem permissão.');
      }

      // 2. Verificar se relatório já existe
      const { data: relExistente } = await supabase
        .from('user_reports')
        .select('*')
        .eq('assessment_result_id', resultadoId)
        .maybeSingle();

      let relatorio = relExistente;

      // 3. Se não existe, gerar análise via motor local + API key (se disponível)
      if (!relatorio) {
        setFase(3);
        try {
          const { discScores, sabotadorScores } = mapResultadoToScores(resultado);
          const apiKey = await loadApiKey();
          const analysis = await generateAnalysis(discScores, sabotadorScores, apiKey);

          setAnalysisSource(analysis.source);
          if (analysis.apiError) setAnalysisError(analysis.apiError);

          relatorio = buildRelatorioFromAnalysis(analysis, resultado);
          setDados({ resultado, relatorio, analysis });
          setPronto(true);
          return;
        } catch (analysisErr) {
          console.warn('[ResultsPage] generateAnalysis falhou:', analysisErr.message);
          relatorio = null;
        }
      } else {
        setAnalysisSource('cached');
      }

      setDados({ resultado, relatorio, analysis: null });
      setPronto(true);

    } catch (err) {
      console.error('[ResultsPage]', err);
      setErro(err.message ?? 'Erro desconhecido ao carregar resultados.');
    }
  }, [user.id]);

  // ── Gerador de relatório local (fallback sem IA) ────────────────────────
  const gerarRelatorioLocal = useCallback((resultado) => {
    if (!resultado) return '';
    const DISC_NOMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };
    const SAB_NOMES  = {
      judge: 'Juiz', stickler: 'Insistente', pleaser: 'Prestativo',
      hyperAchiever: 'Hiper-Realizador', victim: 'Vítima',
      hyperRational: 'Hiper-Racional', hyperVigilant: 'Hiper-Vigilante',
      restless: 'Inquieto', controller: 'Controlador', avoider: 'Esquivo',
    };
    const SAB_SCORE = {
      judge: 'score_juiz', stickler: 'score_insistente', pleaser: 'score_prestativo',
      hyperAchiever: 'score_hiper_realizador', victim: 'score_vitima',
      hyperRational: 'score_hiper_racional', hyperVigilant: 'score_hiper_vigilante',
      restless: 'score_inquieto', controller: 'score_controlador', avoider: 'score_esquivo',
    };
    const p   = resultado.perfil_primario   ?? '';
    const s   = resultado.perfil_secundario ?? '';
    const sub = resultado.subtipo_disc      ?? '';
    const pq  = resultado.pq_score          ?? 0;
    const topSabs = resultado.top_sabotadores ?? [];

    const discLinhas = ['D','I','S','C'].map(code => {
      const scores = {
        D: resultado.score_dominante ?? 0,
        I: resultado.score_influente  ?? 0,
        S: resultado.score_estavel    ?? 0,
        C: resultado.score_analitico  ?? 0,
      };
      const tag = code === p ? ' ← Perfil Primário' : code === s ? ' ← Perfil Secundário' : '';
      return `- **${DISC_NOMES[code]} (${code}):** ${Number(scores[code]).toFixed(1)}/5.0${tag}`;
    });

    const sabLinhas = topSabs.map((code, i) => {
      const score = Number(resultado[SAB_SCORE[code]] ?? 0);
      return `${i + 1}. **${SAB_NOMES[code] ?? code}** — ${score.toFixed(1)}/10`;
    });

    const allSabs = Object.keys(SAB_SCORE).map(code => ({
      code,
      nome: SAB_NOMES[code],
      score: Number(resultado[SAB_SCORE[code]] ?? 0),
    })).sort((a, b) => b.score - a.score);

    const nivel = pq >= 75 ? 'Excelente (75+)' : pq >= 63 ? 'Bom (63–74)' : pq >= 51 ? 'Médio (51–62)' : 'Atenção (≤50)';
    const pqMsg = pq >= 75
      ? 'Acima do ponto crítico de desempenho ótimo. Você tem boa proporção de estados mentais positivos.'
      : pq >= 63
        ? 'Acima da média populacional. Há espaço para reduzir a influência dos seus sabotadores.'
        : pq >= 51
          ? 'Dentro da faixa média. Os padrões limitantes têm impacto moderado no seu desempenho.'
          : 'Sabotadores têm alta influência. Este é o principal foco de desenvolvimento.';

    return `# Relatório de Perfil Comportamental
**ProfileAI · AMB FUSI · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}**

---

## Perfil DISC: ${DISC_NOMES[p] ?? p}${s ? ` + ${DISC_NOMES[s] ?? s}` : ''} (Subtipo: ${sub})

---

## Scores DISC

${discLinhas.join('\n')}

---

## Top 3 Sabotadores Mais Ativos

${sabLinhas.join('\n')}

---

## Todos os Sabotadores

${allSabs.map(({ nome, score }) => `- **${nome}:** ${score.toFixed(1)}/10`).join('\n')}

---

## PQ Score: ${pq}/100 — ${nivel}

${pqMsg}

---

*Relatório gerado por ProfileAI · AMB FUSI — "Damos vida à inovação"*
*Análise de IA indisponível no momento. Os dados refletem seus resultados calculados.*`;
  }, []);

  // Callback de exportação PDF — gera HTML formatado em nova janela
  const handleExportPDF = useCallback((markdownContent) => {
    // Se não há conteúdo de IA, gera relatório local a partir dos dados brutos
    const md = markdownContent || gerarRelatorioLocal(dados?.resultado) || '';

    // Converte markdown básico para HTML
    const html = md
      .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
      .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/^- (.+)$/gm,   '<li>$1</li>')
      .replace(/^---$/gm,       '<hr>')
      .replace(/\n\n+/g,        '</p><p>');

    const win = window.open('', '_blank');
    if (!win) return alert('Permita pop-ups para exportar o PDF.');

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório ProfileAI — AMB FUSI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 0 auto; padding: 48px 40px; color: #1e293b; font-size: 14px; line-height: 1.8; }
    h1 { font-size: 24px; color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin: 32px 0 16px; }
    h2 { font-size: 18px; color: #334155; margin: 28px 0 12px; border-left: 4px solid #6366f1; padding-left: 12px; }
    h3 { font-size: 15px; color: #475569; margin: 20px 0 8px; }
    p  { margin: 10px 0; }
    li { margin: 6px 0 6px 24px; list-style: disc; }
    ol li { list-style: decimal; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; }
    strong { color: #1e293b; }
    .capa { text-align: center; padding: 40px 0 32px; border-bottom: 2px solid #e2e8f0; margin-bottom: 32px; }
    .capa-logo { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: -1px; }
    .capa-sub  { color: #64748b; font-size: 13px; margin-top: 4px; }
    .capa-data { color: #94a3b8; font-size: 12px; margin-top: 12px; }
    .rodape { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print {
      body { padding: 20px; font-size: 12px; }
      h1 { font-size: 20px; }
      h2 { font-size: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="capa">
    <div class="capa-logo">ProfileAI</div>
    <div class="capa-sub">AMB FUSI — "Damos vida à inovação"</div>
    <div class="capa-data">Relatório gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
  <div class="no-print" style="text-align:center;margin-bottom:24px;">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
      🖨️ Imprimir / Salvar como PDF
    </button>
  </div>
  <p>${html}</p>
  <div class="rodape">ProfileAI © ${new Date().getFullYear()} · AMB FUSI · Frameworks: Positive Intelligence + DISC</div>
</body>
</html>`);
    win.document.close();
    win.focus();
  }, [dados, gerarRelatorioLocal]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!pronto && !erro) {
    const etapa = ETAPAS[fase];
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <div style={S.titulo}>{etapa.label}</div>
        <div style={S.progresso}>
          <div style={S.progressoBarra(etapa.pct)} />
        </div>
        <span style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {etapa.pct}% concluído
        </span>
      </div>
    );
  }

  // ── Erro ─────────────────────────────────────────────────────────────────
  if (erro) {
    return (
      <div style={S.center}>
        <div style={S.errorCard}>
          <div style={S.errorIcon}>⚠️</div>
          <div style={S.errorTitle}>Não foi possível carregar</div>
          <div style={S.errorMsg}>{erro}</div>
          <button style={S.btn} onClick={() => navigate('/assessment')}>
            Fazer novo assessment
          </button>
          <button
            style={{ ...S.btn, background: '#334155', marginLeft: '0.75rem' }}
            onClick={() => navigate('/')}
          >
            Início
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const badgeKey = analysisError ? 'error'
    : analysisSource === 'xai' ? 'xai'
    : (analysisSource && analysisSource !== 'local' && analysisSource !== 'cached') ? 'ai'
    : 'local';
  const badge = SOURCE_BADGE[badgeKey];

  return (
    <div style={{ position: 'relative' }}>
      {analysisSource && analysisSource !== 'cached' && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 50,
          padding: '0.4rem 0.85rem',
          borderRadius: '20px',
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          color: badge.color,
          fontSize: '0.78rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backdropFilter: 'blur(8px)',
        }}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </div>
      )}
      <ResultsDashboard
        resultado={dados.resultado}
        relatorio={dados.relatorio}
        analysis={dados.analysis}
        proximaAvaliacao={dados.resultado?.proxima_avaliacao ?? null}
        onReavaliar={() => navigate('/assessment')}
        onExportarPDF={handleExportPDF}
        onVoltar={() => navigate('/')}
      />
    </div>
  );
}
