/**
 * ProfileAI — AMB FUSI | "Damos vida à inovação"
 * ResultsDashboard.jsx — Dashboard de resultados do Assessment
 * Exibe: Radar DISC (SVG) · Barras Sabotadores · PQ Score Gauge · Relatório IA
 * Boas práticas React: memoização, derivação de estado, sem efeitos desnecessários
 * Versão: 1.0 | Abril 2026
 */

import { useState, useMemo, useCallback, memo } from 'react';

// ============================================================
// CONSTANTES (hoistadas fora do componente — sem re-criação)
// ============================================================

const DISC_CONFIG = {
  D: { nome: 'Dominante', cor: '#e74c3c', corClara: '#fde8e8' },
  I: { nome: 'Influente',  cor: '#f39c12', corClara: '#fef3cd' },
  S: { nome: 'Estável',    cor: '#2ecc71', corClara: '#d4f5e3' },
  C: { nome: 'Analítico',  cor: '#3498db', corClara: '#dbeffe' },
};

const SABOTEUR_CONFIG = {
  judge:         { nome: 'Juiz',            cor: '#DC2626' },
  stickler:      { nome: 'Insistente',      cor: '#7C3AED' },
  pleaser:       { nome: 'Prestativo',      cor: '#DB2777' },
  hyperAchiever: { nome: 'Hiper-Realizador',cor: '#EA580C' },
  victim:        { nome: 'Vítima',          cor: '#64748B' },
  hyperRational: { nome: 'Hiper-Racional',  cor: '#2563EB' },
  hyperVigilant: { nome: 'Hiper-Vigilante', cor: '#D97706' },
  restless:      { nome: 'Inquieto',        cor: '#0891B2' },
  controller:    { nome: 'Controlador',     cor: '#B45309' },
  avoider:       { nome: 'Esquivo',         cor: '#16A34A' },
};

const SUBTIPO_DESCRICOES = {
  DC: 'Desafiador — direto, cético e exigente',
  D:  'Realizador — focado, competitivo e decisivo',
  Di: 'Dinâmico — ativo, ousado e persuasivo',
  iD: 'Inspirador — energético, assertivo e visionário',
  i:  'Comunicador — expressivo, otimista e sociável',
  iS: 'Acolhedor — amigável, paciente e colaborativo',
  Si: 'Apoiador — calmo, atencioso e receptivo',
  S:  'Leal — confiável, estável e consistente',
  SC: 'Técnico — meticuloso, estável e cuidadoso',
  CS: 'Deliberado — cauteloso, preciso e reflexivo',
  C:  'Criterioso — detalhista, lógico e independente',
  CD: 'Resoluto — analítico, determinado e objetivo',
};

const INTENSIDADE_CORES = {
  baixa:      { bg: '#f0fdf4', text: '#15803d', label: 'Baixa' },
  moderada:   { bg: '#fffbeb', text: '#d97706', label: 'Moderada' },
  alta:       { bg: '#fff7ed', text: '#ea580c', label: 'Alta' },
  muito_alta: { bg: '#fef2f2', text: '#dc2626', label: 'Muito Alta' },
};

// ============================================================
// HELPERS (module-level — sem re-criação por render)
// ============================================================

function getSaboteurIntensity(score) {
  if (score <= 3.0) return 'baixa';
  if (score <= 5.0) return 'moderada';
  if (score <= 7.0) return 'alta';
  return 'muito_alta';
}

function getDISCLevel(score) {
  if (score <= 2.0) return 'Baixo';
  if (score <= 3.0) return 'Moderado';
  if (score <= 4.0) return 'Alto';
  return 'Dominante';
}

/** Formata data ISO para pt-BR */
function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Pontos do radar DISC em SVG (escala 1–5 → raio proporcional) */
function calcularPontosRadar(scores, cx, cy, raioMax) {
  const perfis = ['D', 'I', 'S', 'C'];
  const angulos = perfis.map((_, i) => (i * 2 * Math.PI) / perfis.length - Math.PI / 2);

  return perfis.map((code, i) => {
    const raio = ((scores[code] - 1) / 4) * raioMax; // normaliza 1–5 para 0–raioMax
    return {
      x: cx + raio * Math.cos(angulos[i]),
      y: cy + raio * Math.sin(angulos[i]),
      labelX: cx + (raioMax + 28) * Math.cos(angulos[i]),
      labelY: cy + (raioMax + 28) * Math.sin(angulos[i]),
      code,
    };
  });
}

// ============================================================
// SUBCOMPONENTES MEMORIZADOS
// ============================================================

/**
 * Gráfico Radar DISC — puro SVG, sem dependências externas
 * Boas práticas: rendering-animate-svg-wrapper (animações no wrapper, não no SVG)
 */
const RadarDISC = memo(function RadarDISC({ scores }) {
  const CX = 120, CY = 120, RAIO = 80;
  const pontos = useMemo(() => calcularPontosRadar(scores, CX, CY, RAIO), [scores]);

  // Polígono do perfil
  const poligonoPath = pontos
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Grid concêntrico (níveis 1–5)
  const niveis = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={240} height={240} viewBox="0 0 240 240" aria-label="Gráfico radar DISC">
        {/* Grid concêntrico */}
        {niveis.map(nivel => {
          const r = ((nivel - 1) / 4) * RAIO;
          const gridPontos = [0, 1, 2, 3].map(i => {
            const ang = (i * 2 * Math.PI) / 4 - Math.PI / 2;
            return `${(CX + r * Math.cos(ang)).toFixed(1)},${(CY + r * Math.sin(ang)).toFixed(1)}`;
          }).join(' ');
          return (
            <polygon
              key={nivel}
              points={gridPontos}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Linhas dos eixos */}
        {pontos.map(p => (
          <line
            key={p.code}
            x1={CX} y1={CY}
            x2={(CX + RAIO * Math.cos(Math.atan2(p.y - CY, p.x - CX))).toFixed(1)}
            y2={(CY + RAIO * Math.sin(Math.atan2(p.y - CY, p.x - CX))).toFixed(1)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Área do perfil */}
        <path
          d={poligonoPath}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Pontos nos vértices */}
        {pontos.map(p => (
          <circle
            key={p.code}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={5}
            fill={DISC_CONFIG[p.code].cor}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {/* Labels dos perfis */}
        {pontos.map(p => (
          <text
            key={`label-${p.code}`}
            x={p.labelX.toFixed(1)}
            y={p.labelY.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={700}
            fill={DISC_CONFIG[p.code].cor}
          >
            {p.code}
          </text>
        ))}
      </svg>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {Object.entries(DISC_CONFIG).map(([code, cfg]) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cfg.cor }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {code} — {cfg.nome}: <strong style={{ color: '#1f2937' }}>{(scores[code] ?? 0).toFixed(1)}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Gauge circular para PQ Score */
const PQScoreGauge = memo(function PQScoreGauge({ score }) {
  const CX = 80, CY = 80, RAIO = 60;
  const angInicio = Math.PI * 0.75;   // 135°
  const angFim    = Math.PI * 2.25;   // 405° (270° de arco)
  const angValor  = angInicio + (score / 100) * (angFim - angInicio);

  // Calcular ponto final do arco preenchido
  const x2 = (CX + RAIO * Math.cos(angValor)).toFixed(1);
  const y2 = (CY + RAIO * Math.sin(angValor)).toFixed(1);

  // Extremos do arco de fundo
  const xInicioFundo = (CX + RAIO * Math.cos(angInicio)).toFixed(1);
  const yInicioFundo = (CY + RAIO * Math.sin(angInicio)).toFixed(1);
  const xFimFundo    = (CX + RAIO * Math.cos(angFim)).toFixed(1);
  const yFimFundo    = (CY + RAIO * Math.sin(angFim)).toFixed(1);

  // Cor do gauge baseada no score
  const cor = score >= 75 ? '#2ecc71' : score >= 63 ? '#f39c12' : score >= 51 ? '#e67e22' : '#e74c3c';
  const nivel = score >= 75 ? 'Excelente' : score >= 63 ? 'Bom' : score >= 51 ? 'Médio' : 'Atenção';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={160} height={120} viewBox="0 0 160 120" aria-label={`PQ Score: ${score}`}>
        {/* Arco de fundo */}
        <path
          d={`M ${xInicioFundo} ${yInicioFundo} A ${RAIO} ${RAIO} 0 1 1 ${xFimFundo} ${yFimFundo}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Arco preenchido */}
        {score > 0 && (
          <path
            d={`M ${xInicioFundo} ${yInicioFundo} A ${RAIO} ${RAIO} 0 ${score > 50 ? 1 : 0} 1 ${x2} ${y2}`}
            fill="none"
            stroke={cor}
            strokeWidth={12}
            strokeLinecap="round"
          />
        )}

        {/* Score central */}
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize={28} fontWeight={800} fill="#1f2937">
          {score}
        </text>
        <text x={CX} y={CY + 24} textAnchor="middle" fontSize={10} fill="#9ca3af">
          / 100
        </text>

        {/* Labels dos extremos */}
        <text x={20} y={115} textAnchor="middle" fontSize={9} fill="#9ca3af">0</text>
        <text x={140} y={115} textAnchor="middle" fontSize={9} fill="#9ca3af">100</text>
        <text x={80} y={14} textAnchor="middle" fontSize={9} fill="#9ca3af">75 ótimo</text>
      </svg>

      <div style={{
        fontSize: 13, fontWeight: 700,
        color: cor,
        backgroundColor: cor + '18',
        padding: '4px 14px',
        borderRadius: 999,
        marginTop: -8,
      }}>
        {nivel}
      </div>
    </div>
  );
});

/** Barra horizontal de sabotador */
const BarraSabotador = memo(function BarraSabotador({ code, score, isTop3 }) {
  const cfg = SABOTEUR_CONFIG[code];
  const intensidade = getSaboteurIntensity(score);
  const intensCfg = INTENSIDADE_CORES[intensidade];
  const percentual = (score / 10) * 100;

  return (
    <div style={{
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6',
      opacity: isTop3 ? 1 : 0.75,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isTop3 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: cfg.cor, borderRadius: 4, padding: '1px 6px' }}>
              TOP
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: isTop3 ? 700 : 500, color: '#1f2937' }}>
            {cfg.nome}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: intensCfg.text,
            backgroundColor: intensCfg.bg,
            padding: '2px 8px',
            borderRadius: 999,
          }}>
            {intensCfg.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', minWidth: 36, textAlign: 'right' }}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ backgroundColor: '#f3f4f6', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${percentual}%`,
          backgroundColor: cfg.cor,
          borderRadius: 999,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
});

/** Card de sabotador do Top 3 */
const CardSabotadorTop = memo(function CardSabotadorTop({ code, score, rank }) {
  const cfg = SABOTEUR_CONFIG[code];
  const intensidade = getSaboteurIntensity(score);
  const intensCfg = INTENSIDADE_CORES[intensidade];

  return (
    <div style={{
      borderRadius: 16,
      border: `2px solid ${cfg.cor}30`,
      backgroundColor: cfg.cor + '08',
      padding: '20px 16px',
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: cfg.cor, fontWeight: 700, marginBottom: 4 }}>
        #{rank} MAIS ATIVO
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2937', marginBottom: 4 }}>
        {cfg.nome}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: cfg.cor, lineHeight: 1 }}>
        {score.toFixed(1)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>/10</span>
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, fontWeight: 600,
        color: intensCfg.text,
        backgroundColor: intensCfg.bg,
        padding: '3px 10px',
        borderRadius: 999,
        display: 'inline-block',
      }}>
        {intensCfg.label}
      </div>
    </div>
  );
});

/** Seção de relatório IA com markdown básico */
const RelatorioIA = memo(function RelatorioIA({ relatorio, focos, recomendacoes, pontoFortes }) {
  const [expandido, setExpandido] = useState(false);

  const toggleExpandir = useCallback(() => setExpandido(prev => !prev), []);

  return (
    <div style={estilos.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={estilos.cardTitulo}>✨ Análise por Inteligência Artificial</h3>
        <span style={estilos.badgeIA}>Gemini AI</span>
      </div>

      {/* Recomendações */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={estilos.secaoTitulo}>5 Recomendações Práticas</h4>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {recomendacoes?.map((rec, i) => (
            <li key={i} style={estilos.listaItem}>{rec}</li>
          ))}
        </ol>
      </div>

      {/* Focos de mentoria */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={estilos.secaoTitulo}>3 Focos de Mentoria</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {focos?.map((foco, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              backgroundColor: '#eff6ff', borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{
                minWidth: 24, height: 24, borderRadius: '50%',
                backgroundColor: '#6366f1', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#1e3a5f', lineHeight: 1.5 }}>{foco}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pontos fortes */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={estilos.secaoTitulo}>Pontos Fortes a Potencializar</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pontoFortes?.map((pf, i) => (
            <div key={i} style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 12, color: '#15803d', fontWeight: 500,
            }}>
              ✓ {pf}
            </div>
          ))}
        </div>
      </div>

      {/* Relatório completo expandível */}
      <button onClick={toggleExpandir} style={estilos.btnExpandir}>
        {expandido ? '▲ Ocultar relatório completo' : '▼ Ver relatório completo'}
      </button>

      {expandido && (
        <div style={{
          marginTop: 16, padding: 16,
          backgroundColor: '#f8fafc',
          borderRadius: 12,
          fontSize: 13, color: '#374151',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          fontFamily: 'Georgia, serif',
        }}>
          {relatorio}
        </div>
      )}
    </div>
  );
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

/**
 * ResultsDashboard
 * @param {Object} props
 * @param {Object} props.resultado         - Dados do assessment_results
 * @param {Object} props.relatorio         - Dados do user_reports
 * @param {string} props.proximaAvaliacao  - ISO date da próxima avaliação
 * @param {Function} props.onReavaliar     - Callback para reiniciar o assessment
 * @param {Function} props.onExportarPDF   - Callback para exportar PDF
 */
export default function ResultsDashboard({
  resultado,
  relatorio,
  proximaAvaliacao,
  onReavaliar,
  onExportarPDF,
  onVoltar,
}) {
  // ---- Estado: aba selecionada no dashboard ----
  const [abaAtiva, setAbaAtiva] = useState('visao-geral'); // 'visao-geral' | 'disc' | 'sabotadores' | 'relatorio'

  // ---- Dados derivados (sem useEffect) ----
  const discScores = useMemo(() => ({
    D: resultado?.score_dominante ?? 0,
    I: resultado?.score_influente  ?? 0,
    S: resultado?.score_estavel    ?? 0,
    C: resultado?.score_analitico  ?? 0,
  }), [resultado]);

  const sabotadoresOrdenados = useMemo(() => {
    if (!resultado) return [];
    const mapa = {
      judge:         resultado.score_juiz,
      stickler:      resultado.score_insistente,
      pleaser:       resultado.score_prestativo,
      hyperAchiever: resultado.score_hiper_realizador,
      victim:        resultado.score_vitima,
      hyperRational: resultado.score_hiper_racional,
      hyperVigilant: resultado.score_hiper_vigilante,
      restless:      resultado.score_inquieto,
      controller:    resultado.score_controlador,
      avoider:       resultado.score_esquivo,
    };
    return Object.entries(mapa)
      .map(([code, score]) => ({ code, score: score ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [resultado]);

  const topSabotadores = useMemo(
    () => resultado?.top_sabotadores ?? sabotadoresOrdenados.slice(0, 3).map(s => s.code),
    [resultado, sabotadoresOrdenados]
  );

  const pqScore = resultado?.pq_score ?? 0;
  const subtipo = resultado?.subtipo_disc ?? '';
  const perfilPrimario = resultado?.perfil_primario ?? '';
  const perfilSecundario = resultado?.perfil_secundario ?? '';

  const assessmentBloqueado = proximaAvaliacao && new Date() < new Date(proximaAvaliacao);
  const diasRestantes = proximaAvaliacao
    ? Math.ceil((new Date(proximaAvaliacao) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const completadoEm = resultado?.completed_at
    ? formatarData(resultado.completed_at)
    : null;

  // ---- Handlers memorizados ----
  const handleReavaliar = useCallback(() => {
    if (!assessmentBloqueado && onReavaliar) onReavaliar();
  }, [assessmentBloqueado, onReavaliar]);

  const handleExportar = useCallback(() => {
    if (onExportarPDF) onExportarPDF(relatorio?.relatorio_completo ?? '');
  }, [onExportarPDF, relatorio]);

  // ---- Sem dados ----
  if (!resultado) {
    return (
      <div style={{ ...estilos.container, justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>Nenhum resultado encontrado.</p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={estilos.container}>

      {/* Header */}
      <div style={estilos.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onVoltar && (
            <button
              onClick={onVoltar}
              style={{ ...estilos.btnSecundario, padding: '6px 12px', fontSize: 13 }}
              title="Voltar para a página inicial"
            >
              ← Início
            </button>
          )}
          <div>
            <div style={estilos.logo}>ProfileAI</div>
            <div style={estilos.logoSub}>AMB FUSI — Damos vida à inovação</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExportar}
            style={estilos.btnSecundario}
            title="Exportar relatório em PDF"
          >
            ↓ PDF
          </button>
          <button
            onClick={handleReavaliar}
            disabled={assessmentBloqueado}
            style={assessmentBloqueado ? estilos.btnDesabilitado : estilos.btnPrimario}
            title={assessmentBloqueado ? `Disponível em ${diasRestantes} dias` : 'Iniciar nova avaliação'}
          >
            {assessmentBloqueado ? `🔒 ${diasRestantes}d` : '↺ Reavaliar'}
          </button>
        </div>
      </div>

      {/* Subtítulo com data */}
      {completadoEm && (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, margin: '0 0 20px' }}>
          Avaliação realizada em {completadoEm}
          {proximaAvaliacao && ` · Próxima em ${formatarData(proximaAvaliacao)}`}
        </p>
      )}

      {/* Card do perfil DISC */}
      <div style={{
        ...estilos.card,
        background: `linear-gradient(135deg, ${DISC_CONFIG[perfilPrimario]?.cor ?? '#6366f1'}15, ${DISC_CONFIG[perfilSecundario]?.cor ?? '#8b5cf6'}10)`,
        border: `2px solid ${DISC_CONFIG[perfilPrimario]?.cor ?? '#6366f1'}30`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Seu Subtipo DISC
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#1f2937', letterSpacing: -1 }}>
          {subtipo}
        </div>
        <div style={{ fontSize: 15, color: DISC_CONFIG[perfilPrimario]?.cor ?? '#6366f1', fontWeight: 600, marginTop: 4 }}>
          {SUBTIPO_DESCRICOES[subtipo] ?? ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ ...estilos.badge, backgroundColor: DISC_CONFIG[perfilPrimario]?.cor ?? '#6366f1', color: '#fff' }}>
            Primário: {DISC_CONFIG[perfilPrimario]?.nome}
          </span>
          {perfilSecundario && (
            <span style={{ ...estilos.badge, backgroundColor: DISC_CONFIG[perfilSecundario]?.cor + '30', color: DISC_CONFIG[perfilSecundario]?.cor }}>
              Secundário: {DISC_CONFIG[perfilSecundario]?.nome}
            </span>
          )}
        </div>
      </div>

      {/* Abas de navegação */}
      <div style={estilos.abas}>
        {[
          { id: 'visao-geral', label: 'Visão Geral' },
          { id: 'disc',        label: 'Perfil DISC' },
          { id: 'sabotadores', label: 'Sabotadores' },
          { id: 'relatorio',   label: '✨ Relatório IA' },
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              ...estilos.abaBtn,
              ...(abaAtiva === aba.id ? estilos.abaBtnAtiva : {}),
            }}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* ---- ABA: Visão Geral ---- */}
      {abaAtiva === 'visao-geral' && (
        <div style={estilos.grid2}>

          {/* PQ Score */}
          <div style={{ ...estilos.card, textAlign: 'center' }}>
            <h3 style={estilos.cardTitulo}>PQ Score</h3>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
              Quociente de Inteligência Positiva
            </p>
            <PQScoreGauge score={pqScore} />
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12, lineHeight: 1.5 }}>
              {pqScore >= 75
                ? 'Acima do ponto crítico de desempenho ótimo (75+)'
                : pqScore >= 63
                  ? 'Acima da média populacional'
                  : 'Sabotadores têm impacto significativo no desempenho'}
            </p>
          </div>

          {/* Radar DISC resumido */}
          <div style={{ ...estilos.card, textAlign: 'center' }}>
            <h3 style={estilos.cardTitulo}>Perfil DISC</h3>
            <RadarDISC scores={discScores} />
          </div>

          {/* Top 3 Sabotadores */}
          <div style={{ ...estilos.card, gridColumn: 'span 2' }}>
            <h3 style={estilos.cardTitulo}>Top 3 Sabotadores Mais Ativos</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {topSabotadores.slice(0, 3).map((code, i) => {
                const dados = sabotadoresOrdenados.find(s => s.code === code);
                return dados ? (
                  <CardSabotadorTop key={code} code={code} score={dados.score} rank={i + 1} />
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- ABA: Perfil DISC ---- */}
      {abaAtiva === 'disc' && (
        <div style={estilos.card}>
          <h3 style={estilos.cardTitulo}>Análise Detalhada do Perfil DISC</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center', marginBottom: 24 }}>
            <RadarDISC scores={discScores} />
          </div>

          {/* Barras DISC */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(DISC_CONFIG)
              .sort(([a], [b]) => discScores[b] - discScores[a])
              .map(([code, cfg]) => {
                const score = discScores[code];
                const percentual = ((score - 1) / 4) * 100;
                return (
                  <div key={code}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cfg.cor }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                          {cfg.nome} ({code})
                        </span>
                        {code === perfilPrimario && (
                          <span style={{ ...estilos.badge, backgroundColor: cfg.cor, color: '#fff', fontSize: 10 }}>Primário</span>
                        )}
                        {code === perfilSecundario && (
                          <span style={{ ...estilos.badge, backgroundColor: cfg.cor + '20', color: cfg.cor, fontSize: 10 }}>Secundário</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{getDISCLevel(score)}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{score.toFixed(1)}/5</span>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f3f4f6', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentual}%`,
                        backgroundColor: cfg.cor,
                        borderRadius: 999,
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---- ABA: Sabotadores ---- */}
      {abaAtiva === 'sabotadores' && (
        <div style={estilos.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ ...estilos.cardTitulo, margin: 0 }}>Intensidade dos Sabotadores</h3>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>escala 1–10</span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>
            Ordenados por intensidade · TOP = top 3 mais ativos
          </p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sabotadoresOrdenados.map(({ code, score }) => (
              <BarraSabotador
                key={code}
                code={code}
                score={score}
                isTop3={topSabotadores.includes(code)}
              />
            ))}
          </div>

          {/* Legenda de intensidades */}
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(INTENSIDADE_CORES).map(([key, cfg]) => (
              <div key={key} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                backgroundColor: cfg.bg, color: cfg.text, fontWeight: 600,
              }}>
                {cfg.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- ABA: Relatório IA ---- */}
      {abaAtiva === 'relatorio' && relatorio && (
        <RelatorioIA
          relatorio={relatorio.relatorio_completo}
          focos={relatorio.focos_mentoria}
          recomendacoes={relatorio.recomendacoes}
          pontoFortes={relatorio.pontos_fortes}
        />
      )}

      {abaAtiva === 'relatorio' && !relatorio && (
        <div style={{ ...estilos.card, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <p style={{ color: '#1f2937', fontWeight: 600, marginBottom: 8 }}>
            Análise de IA temporariamente indisponível
          </p>
          <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            O serviço de geração de relatório está inacessível no momento (Gemini API indisponível ou não configurada).
            Seus dados foram salvos — você pode exportar o PDF com os resultados calculados ou tentar novamente mais tarde.
          </p>
          <button
            onClick={handleExportar}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ↓ Exportar PDF com dados calculados
          </button>
        </div>
      )}

      {/* Rodapé */}
      <p style={estilos.rodape}>
        ProfileAI v1.0 · AMB FUSI · Frameworks: Positive Intelligence + DISC
      </p>
    </div>
  );
}

// ============================================================
// ESTILOS (hoistados fora do componente — regra: rendering-hoist-jsx)
// ============================================================

const estilos = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px 16px 48px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  logoSub: {
    fontSize: 11,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: '24px 20px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    marginBottom: 16,
    border: '1px solid #f3f4f6',
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  abas: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 12,
    overflowX: 'auto',
  },
  abaBtn: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: 'transparent',
    fontSize: 12,
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  abaBtnAtiva: {
    backgroundColor: '#fff',
    color: '#1f2937',
    fontWeight: 700,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    display: 'inline-block',
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 10px',
  },
  listaItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 8,
  },
  badgeIA: {
    fontSize: 11,
    fontWeight: 600,
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    padding: '3px 10px',
    borderRadius: 999,
    border: '1px solid #ddd6fe',
  },
  btnExpandir: {
    width: '100%',
    padding: '10px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnPrimario: {
    padding: '8px 16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecundario: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1.5px solid #d1d5db',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnDesabilitado: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 13,
    cursor: 'not-allowed',
  },
  rodape: {
    fontSize: 11,
    color: '#d1d5db',
    textAlign: 'center',
    marginTop: 24,
  },
};
