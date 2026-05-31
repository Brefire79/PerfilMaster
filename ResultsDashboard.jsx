/**
 * ProfileAI — AMB FUSI
 * ResultsDashboard — dark-theme redesign v2.0
 */

import { useState, useMemo, useCallback, memo } from 'react';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const DISC_COR = { D: '#E53E3E', I: '#D69E2E', S: '#38A169', C: '#3182CE' };
const DISC_NOME = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };
const DISC_DESC = {
  D: 'Orientado a resultados, direto e assertivo. Toma decisões rápidas e aceita desafios.',
  I: 'Entusiasta, otimista e sociável. Motiva os outros e prospera em ambientes colaborativos.',
  S: 'Confiável, paciente e consistente. Cria ambientes estáveis e valoriza relacionamentos.',
  C: 'Analítico, preciso e sistemático. Foca em qualidade e segue processos rigorosos.',
};

const SABOTADOR = {
  judge:         { nome: 'Juiz',             icon: '⚖️',  desc: 'Crítico consigo mesmo, com os outros e com as circunstâncias.' },
  stickler:      { nome: 'Insistente',       icon: '📐',  desc: 'Perfeccionista em excesso, com padrões rígidos e intolerância ao erro.' },
  pleaser:       { nome: 'Agradador',        icon: '😊',  desc: 'Foca em agradar os outros para evitar conflitos, sacrificando necessidades próprias.' },
  hyperAchiever: { nome: 'Hiper-Realizador', icon: '🏆',  desc: 'Deriva seu senso de valor do desempenho e das realizações externas.' },
  victim:        { nome: 'Vítima',           icon: '😢',  desc: 'Foca nas emoções negativas e cria empatia ao exibir vulnerabilidade.' },
  hyperRational: { nome: 'Hiper-Racional',   icon: '🧠',  desc: 'Dependência excessiva da razão para processar sentimentos e emoções.' },
  hyperVigilant: { nome: 'Hiper-Vigilante',  icon: '👁️', desc: 'Ansiedade constante sobre perigos e riscos potenciais no ambiente.' },
  restless:      { nome: 'Inquieto',         icon: '🌪️', desc: 'Busca constante por novas atividades para evitar sentimentos desconfortáveis.' },
  controller:    { nome: 'Controlador',      icon: '🎯',  desc: 'Tende a assumir o controle para reduzir ansiedade em situações de incerteza.' },
  avoider:       { nome: 'Esquivo',          icon: '🚪',  desc: 'Foca no positivo e no agradável, evitando tarefas e conflitos difíceis.' },
};

const SUBTIPO_LABEL = {
  DC:'Desafiador', D:'Realizador', Di:'Dinâmico', iD:'Inspirador',
  i:'Comunicador', iS:'Acolhedor', Si:'Apoiador', S:'Leal',
  SC:'Técnico', CS:'Deliberado', C:'Criterioso', CD:'Resoluto',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pqCor(s) { return s >= 75 ? '#38A169' : s >= 60 ? '#D69E2E' : '#E53E3E' }
function sabCor(s) { return s >= 6 ? '#E53E3E' : s >= 4 ? '#D69E2E' : '#38A169' }
function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function pct5(v) { return Math.round((v / 5) * 100) }   // 1-5 → %
function Bold({ children }) {
  if (typeof children !== 'string') return children;
  const parts = children.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#e2e8f0' }}>{p}</strong>
      : <span key={i}>{p}</span>
  );
}

// ─── Estilos base ─────────────────────────────────────────────────────────────
const C = {
  wrap:      { minHeight:'100vh', background:'#0a0a1a', color:'#e2e8f0',
               fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  inner:     { maxWidth:'900px', margin:'0 auto', padding:'2rem 1rem 3rem' },
  card:      { background:'#1a1a2e', borderRadius:'14px', padding:'1.5rem',
               border:'1px solid #1e2a3a', marginBottom:'1.5rem' },
  cardSm:    { background:'#0f172a', borderRadius:'10px', padding:'1rem', marginBottom:'.75rem' },
  secTitle:  { fontSize:'.95rem', fontWeight:700, color:'#e2e8f0', marginBottom:'1rem', letterSpacing:'.01em' },
  tabs:      { display:'flex', gap:'.25rem', marginBottom:'1.5rem', background:'#1a1a2e',
               borderRadius:'10px', padding:'.3rem', border:'1px solid #1e2a3a', overflowX:'auto' },
  tabBtn:    (active) => ({
    flex:1, padding:'.6rem .5rem', borderRadius:'8px', border:'none',
    cursor:'pointer', fontWeight:600, fontSize:'.83rem', whiteSpace:'nowrap',
    transition:'all .2s',
    background: active ? '#e94560' : 'transparent',
    color: active ? '#fff' : '#64748b',
  }),
  grid2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' },
  checkItem: { display:'flex', gap:'.5rem', marginBottom:'.6rem', fontSize:'.85rem',
               color:'#94a3b8', lineHeight:1.5 },
};

// ─── Radar DISC ───────────────────────────────────────────────────────────────
const RadarDISC = memo(function RadarDISC({ scores }) {
  const cx = 120, cy = 120, r = 90;
  const keys = ['D','I','S','C'];
  const angles = [-90, 0, 90, 180];

  function pt(ang, rad) {
    const a = ang * Math.PI / 180;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  }

  const levels = [.25, .5, .75, 1];
  const dataPoints = keys.map((k, i) => pt(angles[i], (scores[k] / 5) * r));
  const polyPts = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow:'visible' }}>
      {levels.map(lv => {
        const gpts = keys.map((_, i) => { const p = pt(angles[i], lv*r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
        return <polygon key={lv} points={gpts} fill="none" stroke="#1e2a3a" strokeWidth="1"/>;
      })}
      {keys.map((_, i) => { const p = pt(angles[i], r); return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#1e2a3a" strokeWidth="1"/>; })}
      <polygon points={polyPts} fill="#e9456022" stroke="#e94560" strokeWidth="2"/>
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill={DISC_COR[keys[i]]} stroke="#0a0a1a" strokeWidth="2"/>
      ))}
      {keys.map((k, i) => { const lp = pt(angles[i], r+18); return (
        <text key={k} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
          fill={DISC_COR[k]} fontSize="14" fontWeight="800">{k}</text>
      ); })}
    </svg>
  );
});

// ─── PQ Gauge ─────────────────────────────────────────────────────────────────
const PQGauge = memo(function PQGauge({ score }) {
  const cor = pqCor(score);
  const circumference = 2 * Math.PI * 52;
  const arcFrac = 0.75;
  const offset = circumference * (1 - (score / 100) * arcFrac);
  const trackOffset = circumference * (1 - arcFrac);
  const label = score >= 75 ? 'Mente Sábia' : score >= 60 ? 'Em Desenvolvimento' : 'Sabotadores Ativos';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.5rem' }}>
      <svg width="160" height="110" viewBox="0 0 160 110">
        <circle cx="80" cy="95" r="52" fill="none" stroke="#1e2a3a" strokeWidth="12"
          strokeDasharray={circumference.toFixed(1)}
          strokeDashoffset={trackOffset.toFixed(1)}
          transform="rotate(-135 80 95)" strokeLinecap="round"/>
        <circle cx="80" cy="95" r="52" fill="none" stroke={cor} strokeWidth="12"
          strokeDasharray={circumference.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform="rotate(-135 80 95)" strokeLinecap="round"/>
        <text x="80" y="88" textAnchor="middle" fill={cor} fontSize="28" fontWeight="800">{score}</text>
        <text x="80" y="103" textAnchor="middle" fill="#64748b" fontSize="11">/ 100</text>
      </svg>
      <span style={{ fontSize:'.8rem', fontWeight:600, padding:'.2rem .75rem', borderRadius:'99px',
        background:`${cor}22`, color:cor, border:`1px solid ${cor}44` }}>{label}</span>
    </div>
  );
});

// ─── Aba Visão Geral ──────────────────────────────────────────────────────────
function AbaVisaoGeral({ discScores, pqScore, analysis, subtipo, perfilPrimario, perfilSecundario }) {
  const subLabel = SUBTIPO_LABEL[subtipo] ?? subtipo;
  const corPrim = DISC_COR[perfilPrimario] ?? '#e94560';

  return (
    <>
      {/* Hero do perfil */}
      <div style={{ ...C.card, display:'flex', alignItems:'center', gap:'1.25rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:corPrim,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.8rem', fontWeight:900, color:'#fff', flexShrink:0 }}>
          {perfilPrimario}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#f1f5f9' }}>
            Perfil {subLabel || perfilPrimario}
            {perfilSecundario && <span style={{ color:'#64748b', fontWeight:400, fontSize:'1rem' }}> + {perfilSecundario}</span>}
          </div>
          <div style={{ color:'#64748b', fontSize:'.85rem', marginTop:'.15rem' }}>Subtipo DISC: {subtipo}</div>
        </div>
        <div style={{ display:'flex', gap:'1rem' }}>
          <div style={{ textAlign:'center', background:'#0f172a', padding:'.75rem 1.25rem', borderRadius:'10px',
            border:`1px solid ${corPrim}33` }}>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:corPrim, lineHeight:1 }}>{perfilPrimario}</div>
            <div style={{ color:'#64748b', fontSize:'.7rem', marginTop:'2px' }}>Primário</div>
          </div>
          <div style={{ textAlign:'center', background:'#0f172a', padding:'.75rem 1.25rem', borderRadius:'10px',
            border:`1px solid ${pqCor(pqScore)}33` }}>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:pqCor(pqScore), lineHeight:1 }}>{pqScore}</div>
            <div style={{ color:'#64748b', fontSize:'.7rem', marginTop:'2px' }}>PQ Score</div>
          </div>
        </div>
      </div>

      {/* Radar + Gauge */}
      <div style={C.grid2}>
        <div style={{ ...C.card, marginBottom:0 }}>
          <div style={C.secTitle}>Mapa DISC</div>
          <div style={{ display:'flex', justifyContent:'center', padding:'.5rem 0' }}>
            <RadarDISC scores={discScores}/>
          </div>
        </div>
        <div style={{ ...C.card, marginBottom:0 }}>
          <div style={C.secTitle}>PQ Score</div>
          <div style={{ padding:'1rem 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <PQGauge score={pqScore}/>
            <p style={{ color:'#94a3b8', fontSize:'.78rem', textAlign:'center', maxWidth:'240px',
              lineHeight:1.5, marginTop:'1rem' }}>
              O PQ mede quanto de seu tempo mental você age como aliado versus sabotador de si mesmo.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo */}
      {analysis?.summary && (
        <div style={{ ...C.card, marginBottom:'1.5rem' }}>
          <div style={C.secTitle}>Resumo Executivo</div>
          <p style={{ color:'#94a3b8', lineHeight:1.7, fontSize:'.9rem' }}>
            <Bold>{analysis.summary}</Bold>
          </p>
        </div>
      )}

      {/* Forças + Atenções */}
      {(analysis?.strengths?.length > 0 || analysis?.watchouts?.length > 0) && (
        <div style={C.grid2}>
          {analysis.strengths?.length > 0 && (
            <div style={{ ...C.card, marginBottom:0 }}>
              <div style={{ ...C.secTitle, color:'#38A169' }}>Pontos Fortes</div>
              {analysis.strengths.map((s, i) => (
                <div key={i} style={C.checkItem}>
                  <span style={{ color:'#38A169', flexShrink:0 }}>✓</span> {s}
                </div>
              ))}
            </div>
          )}
          {analysis.watchouts?.length > 0 && (
            <div style={{ ...C.card, marginBottom:0 }}>
              <div style={{ ...C.secTitle, color:'#E53E3E' }}>Pontos de Atenção</div>
              {analysis.watchouts.map((w, i) => (
                <div key={i} style={C.checkItem}>
                  <span style={{ color:'#E53E3E', flexShrink:0 }}>!</span> {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Aba DISC ─────────────────────────────────────────────────────────────────
function AbaDisc({ discScores, perfilPrimario, perfilSecundario }) {
  return (
    <>
      <div style={C.card}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'14px',
            background:DISC_COR[perfilPrimario] ?? '#e94560',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.8rem', fontWeight:900, color:'#fff' }}>
            {perfilPrimario}
          </div>
          <div>
            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#e2e8f0' }}>
              Perfil {perfilPrimario} — {DISC_NOME[perfilPrimario]}
            </div>
            <div style={{ color:'#64748b', fontSize:'.83rem' }}>Dimensão dominante</div>
          </div>
        </div>

        {(['D','I','S','C']).map(dim => {
          const score = discScores[dim] ?? 0;
          const pct = pct5(score);
          const cor = DISC_COR[dim];
          return (
            <div key={dim} style={{ marginBottom:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.35rem' }}>
                <span style={{ fontWeight:700, fontSize:'.95rem', color:cor }}>
                  {dim} <span style={{ color:'#94a3b8', fontWeight:400, fontSize:'.8rem' }}>— {DISC_NOME[dim]}</span>
                  {dim === perfilPrimario && <span style={{ marginLeft:'.5rem', fontSize:'.7rem', background:`${cor}22`, color:cor,
                    padding:'1px 6px', borderRadius:'4px', border:`1px solid ${cor}44` }}>Primário</span>}
                  {dim === perfilSecundario && <span style={{ marginLeft:'.5rem', fontSize:'.7rem', background:'#1e2a3a', color:'#94a3b8',
                    padding:'1px 6px', borderRadius:'4px' }}>Secundário</span>}
                </span>
                <span style={{ fontWeight:700, color:cor, fontSize:'.95rem' }}>{score.toFixed(1)}/5</span>
              </div>
              <div style={{ height:'10px', background:'#1e2a3a', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`,
                  background:`linear-gradient(90deg,${cor}aa,${cor})`,
                  borderRadius:'99px', transition:'width .8s cubic-bezier(.4,0,.2,1)' }}/>
              </div>
              <p style={{ color:'#64748b', fontSize:'.78rem', marginTop:'.35rem' }}>{DISC_DESC[dim]}</p>
            </div>
          );
        })}
      </div>

      {/* Como se manifesta */}
      <div style={{ ...C.card, marginBottom:0 }}>
        <div style={C.secTitle}>Como esse perfil se manifesta no trabalho</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          {[
            { icon:'🗣️', label:'Comunicação', desc:'Estilo baseado no perfil dominante — expressão, escuta e preferências de canal.' },
            { icon:'🎯', label:'Tomada de decisão', desc:'Velocidade e critérios de decisão influenciados pelo seu DISC primário.' },
            { icon:'⚡', label:'Sob pressão', desc:'Reações comportamentais típicas em situações de alta demanda ou conflito.' },
            { icon:'🤝', label:'Em equipe', desc:'Contribuição natural, papel preferido e zonas de atrito em grupo.' },
          ].map((item, i) => (
            <div key={i} style={C.cardSm}>
              <div style={{ fontSize:'1.5rem', marginBottom:'.35rem' }}>{item.icon}</div>
              <div style={{ fontWeight:700, fontSize:'.85rem', color:'#e2e8f0', marginBottom:'.25rem' }}>{item.label}</div>
              <div style={{ color:'#64748b', fontSize:'.78rem', lineHeight:1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Aba PQ & Sabotadores ─────────────────────────────────────────────────────
function AbaPQ({ pqScore, sabotadoresOrdenados, top3 }) {
  return (
    <>
      <div style={C.grid2}>
        {/* Gauge */}
        <div style={{ ...C.card, marginBottom:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <PQGauge score={pqScore}/>
          <p style={{ color:'#64748b', fontSize:'.8rem', lineHeight:1.6, marginTop:'1rem', textAlign:'center' }}>
            Pessoas com PQ acima de <strong style={{ color:'#38A169' }}>75</strong> atingem consistentemente
            melhores resultados, relações mais satisfatórias e menor nível de estresse.
          </p>
        </div>

        {/* O que é o PQ */}
        <div style={{ ...C.card, marginBottom:0 }}>
          <div style={C.secTitle}>O que é o PQ?</div>
          <p style={{ color:'#94a3b8', fontSize:'.83rem', lineHeight:1.7, marginBottom:'.75rem' }}>
            O <strong style={{ color:'#e2e8f0' }}>Positive Intelligence Quotient</strong> foi desenvolvido
            por Shirzad Chamine e mede a proporção de tempo em que sua mente age como aliada versus sabotadora.
          </p>
          <div style={{ display:'flex', gap:'.75rem' }}>
            {[
              { range:'0–59', label:'Crítico',  cor:'#E53E3E' },
              { range:'60–74', label:'Moderado', cor:'#D69E2E' },
              { range:'75–100', label:'Alto',    cor:'#38A169' },
            ].map(r => (
              <div key={r.range} style={{ flex:1, background:'#0f172a', borderRadius:'8px',
                padding:'.6rem', textAlign:'center', border:`1px solid ${r.cor}33` }}>
                <div style={{ fontWeight:800, color:r.cor, fontSize:'.85rem' }}>{r.range}</div>
                <div style={{ color:'#64748b', fontSize:'.7rem', marginTop:'2px' }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sabotadores */}
      <div style={{ ...C.card, marginTop:'1.5rem', marginBottom:0 }}>
        <div style={C.secTitle}>Sabotadores Identificados</div>
        <p style={{ color:'#64748b', fontSize:'.8rem', marginBottom:'1rem' }}>
          Ranqueados por intensidade (escala 1–10). Sabotadores acima de 6 têm impacto significativo.
        </p>
        {sabotadoresOrdenados.map(({ code, score }, idx) => {
          const cfg = SABOTADOR[code] ?? { nome: code, icon:'🔹', desc:'' };
          const cor = sabCor(score);
          const isPrincipal = idx === 0;
          return (
            <div key={code} style={{ ...C.cardSm, marginBottom:'.75rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.5rem' }}>
                <span style={{ fontSize:'1.4rem' }}>{cfg.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:'.9rem', color:'#e2e8f0' }}>
                      {isPrincipal && <span style={{ color:'#E53E3E', fontSize:'.7rem', marginRight:'4px' }}>● Principal</span>}
                      {cfg.nome}
                    </span>
                    <span style={{ fontWeight:700, color:cor, fontSize:'.9rem' }}>{score.toFixed(1)}</span>
                  </div>
                  <div style={{ height:'6px', background:'#1e2a3a', borderRadius:'99px',
                    marginTop:'.35rem', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(score/10)*100}%`,
                      background:cor, borderRadius:'99px' }}/>
                  </div>
                </div>
              </div>
              <p style={{ color:'#64748b', fontSize:'.78rem', lineHeight:1.5, marginLeft:'2rem' }}>{cfg.desc}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Aba Insights ─────────────────────────────────────────────────────────────
function AbaInsights({ analysis }) {
  if (!analysis) {
    return (
      <div style={{ ...C.card, textAlign:'center' }}>
        <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>📊</div>
        <p style={{ color:'#64748b', fontSize:'.9rem' }}>
          Insights detalhados serão exibidos após a próxima análise.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Correlações */}
      {analysis.correlations?.length > 0 && (
        <div style={C.card}>
          <div style={C.secTitle}>Correlações DISC × PQ</div>
          <p style={{ color:'#64748b', fontSize:'.8rem', marginBottom:'1rem' }}>
            Padrões identificados pela combinação do perfil comportamental com os sabotadores ativos.
          </p>
          {analysis.correlations.map((corr, i) => {
            const texto = typeof corr === 'string'
              ? corr
              : `O perfil **${corr.disc}** interage com o sabotador **${corr.sabotador}**: ${corr.insight}`;
            return (
              <div key={i} style={{ display:'flex', gap:'1rem', padding:'1rem', background:'#0f172a',
                borderRadius:'10px', marginBottom:'.75rem', borderLeft:'3px solid #e94560' }}>
                <span style={{ color:'#e94560', fontSize:'1.1rem', flexShrink:0, marginTop:'2px' }}>◆</span>
                <p style={{ color:'#94a3b8', fontSize:'.85rem', lineHeight:1.6, margin:0 }}>
                  <Bold>{texto}</Bold>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recomendações */}
      {analysis.recommendations?.length > 0 && (
        <div style={C.card}>
          <div style={C.secTitle}>Recomendações Práticas</div>
          <p style={{ color:'#64748b', fontSize:'.8rem', marginBottom:'1rem' }}>
            Ações concretas baseadas no seu perfil único.
          </p>
          {analysis.recommendations.map((rec, i) => {
            const texto = typeof rec === 'string'
              ? rec
              : `**${rec.category}** — ${rec.action}`;
            return (
              <div key={i} style={{ display:'flex', gap:'1rem', padding:'1rem', background:'#0f172a',
                borderRadius:'10px', marginBottom:'.75rem' }}>
                <div style={{ minWidth:'28px', height:'28px', borderRadius:'50%',
                  background:'#e9456022', border:'1px solid #e9456044',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#e94560', fontWeight:800, fontSize:'.8rem', flexShrink:0 }}>
                  {i + 1}
                </div>
                <p style={{ color:'#94a3b8', fontSize:'.85rem', lineHeight:1.6, margin:0 }}>
                  <Bold>{texto}</Bold>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Insights Aprofundados — gerados pelo motor local ou enriquecidos pela IA */}
      {analysis.deepInsights?.length > 0 && (
        <div style={C.card}>
          <div style={C.secTitle}>Insights Aprofundados</div>
          <p style={{ color:'#64748b', fontSize:'.8rem', marginBottom:'1rem' }}>
            Padrões comportamentais identificados com base na combinação do seu perfil DISC e sabotadores ativos.
          </p>
          {analysis.deepInsights.map((insight, i) => (
            <div key={i} style={{ display:'flex', gap:'1rem', padding:'1rem', background:'#0f172a',
              borderRadius:'10px', marginBottom:'.75rem', borderLeft:'3px solid #6366f1' }}>
              <span style={{ color:'#6366f1', fontSize:'1rem', flexShrink:0, marginTop:'2px' }}>💡</span>
              <p style={{ color:'#94a3b8', fontSize:'.85rem', lineHeight:1.6, margin:0 }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Perguntas de Coaching — reflexivas, em 2ª pessoa */}
      {analysis.coachingQuestions?.length > 0 && (
        <div style={{ ...C.card, marginBottom:0 }}>
          <div style={C.secTitle}>Perguntas de Coaching</div>
          <p style={{ color:'#64748b', fontSize:'.8rem', marginBottom:'1rem' }}>
            Perguntas reflexivas para aprofundar o autoconhecimento e acelerar seu desenvolvimento.
          </p>
          {analysis.coachingQuestions.map((q, i) => (
            <div key={i} style={{ display:'flex', gap:'1rem', padding:'1rem', background:'#0f172a',
              borderRadius:'10px', marginBottom:'.75rem' }}>
              <div style={{ minWidth:'28px', height:'28px', borderRadius:'50%',
                background:'#6366f122', border:'1px solid #6366f144',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#818cf8', fontWeight:800, fontSize:'.8rem', flexShrink:0 }}>
                {i + 1}
              </div>
              <p style={{ color:'#c7d2fe', fontSize:'.875rem', lineHeight:1.7, margin:0,
                fontStyle:'italic' }}>
                {q}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ResultsDashboard({
  resultado,
  relatorio,
  analysis,
  proximaAvaliacao,
  onReavaliar,
  onExportarPDF,
  onVoltar,
}) {
  const [aba, setAba] = useState('visao-geral');

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

  const pqScore        = resultado?.pq_score          ?? 0;
  const perfilPrimario = resultado?.perfil_primario    ?? '';
  const perfilSecundario = resultado?.perfil_secundario ?? '';
  const subtipo        = resultado?.subtipo_disc       ?? '';
  const completadoEm   = resultado?.completed_at ? formatData(resultado.completed_at) : null;

  const bloqueado = proximaAvaliacao && new Date() < new Date(proximaAvaliacao);
  const diasRestantes = proximaAvaliacao
    ? Math.ceil((new Date(proximaAvaliacao) - new Date()) / 86400000)
    : 0;

  const handleExportar = useCallback(() => {
    if (onExportarPDF) onExportarPDF(typeof relatorio === 'string' ? relatorio : relatorio?.relatorio_completo ?? '');
  }, [onExportarPDF, relatorio]);

  if (!resultado) return (
    <div style={{ ...C.wrap, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <p style={{ color:'#64748b' }}>Nenhum resultado encontrado.</p>
    </div>
  );

  const ABAS = [
    { id:'visao-geral', label:'Visão Geral' },
    { id:'disc',        label:'DISC' },
    { id:'pq',          label:'PQ & Sabotadores' },
    { id:'insights',    label:'Insights' },
  ];

  return (
    <div style={C.wrap}>
      {/* Header */}
      <div style={{ background:'#0f0f23', borderBottom:'1px solid #1e2a3a', padding:'1rem 0' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'0 1rem',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
            {onVoltar && (
              <button onClick={onVoltar} style={{ background:'transparent', border:'1px solid #1e2a3a',
                color:'#94a3b8', borderRadius:'8px', padding:'.4rem .8rem', cursor:'pointer',
                fontSize:'.8rem', fontWeight:600 }}>← Início</button>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px',
                background:'linear-gradient(135deg,#e94560,#c0392b)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'.9rem', fontWeight:900, color:'#fff' }}>P</div>
              <span style={{ fontWeight:800, fontSize:'1rem', letterSpacing:'-.02em' }}>
                Perfil<span style={{ color:'#e94560' }}>Master</span>
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
            {completadoEm && (
              <span style={{ color:'#475569', fontSize:'.75rem' }}>{completadoEm}</span>
            )}
            <button onClick={handleExportar}
              style={{ background:'transparent', border:'1px solid #1e2a3a', color:'#94a3b8',
                borderRadius:'8px', padding:'.4rem .8rem', cursor:'pointer', fontSize:'.8rem', fontWeight:600 }}>
              ↓ PDF
            </button>
            <button onClick={() => { if (!bloqueado && onReavaliar) onReavaliar(); }}
              disabled={bloqueado}
              style={{ background: bloqueado ? '#1e2a3a' : '#e94560', color: bloqueado ? '#64748b' : '#fff',
                border:'none', borderRadius:'8px', padding:'.4rem .8rem',
                cursor: bloqueado ? 'not-allowed' : 'pointer', fontSize:'.8rem', fontWeight:600 }}>
              {bloqueado ? `🔒 ${diasRestantes}d` : '↺ Reavaliar'}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={C.inner}>
        {/* Tabs */}
        <div style={C.tabs}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={C.tabBtn(aba === a.id)}>
              {a.label}
            </button>
          ))}
        </div>

        {aba === 'visao-geral' && (
          <AbaVisaoGeral
            discScores={discScores} pqScore={pqScore} analysis={analysis}
            subtipo={subtipo} perfilPrimario={perfilPrimario} perfilSecundario={perfilSecundario}
          />
        )}
        {aba === 'disc' && (
          <AbaDisc discScores={discScores} perfilPrimario={perfilPrimario} perfilSecundario={perfilSecundario}/>
        )}
        {aba === 'pq' && (
          <AbaPQ pqScore={pqScore} sabotadoresOrdenados={sabotadoresOrdenados}
            top3={resultado?.top_sabotadores ?? []}/>
        )}
        {aba === 'insights' && <AbaInsights analysis={analysis}/>}

        {/* Rodapé */}
        <div style={{ textAlign:'center', marginTop:'2.5rem', paddingTop:'1.5rem',
          borderTop:'1px solid #1e2a3a', color:'#334155', fontSize:'.75rem' }}>
          Gerado por <strong style={{ color:'#e94560' }}>PerfilMaster</strong> · Motor local v2.0
        </div>
      </div>
    </div>
  );
}
