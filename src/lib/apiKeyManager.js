/**
 * Perfil Master — Orquestrador de geração de análises de IA
 * Provider único: DeepSeek, server-side (Netlify Function /api/generate-profile-analysis).
 * Nenhuma chave de IA trafega no navegador, no bundle, no localStorage ou na URL.
 * Fallback determinístico: localEngine.
 */

import { generateLocalAnalysis } from './localEngine.js';

// Migração leve: remove qualquer chave de IA legada que tenha ficado no navegador
// (versões antigas guardavam a chave Gemini do usuário em localStorage).
try {
  localStorage.removeItem('profileai_api_key');
} catch {
  // localStorage indisponível (SSR/modo privado) — ignora
}

// ─── Backend de IA proxy (DeepSeek; chave fica no servidor, nunca no bundle) ──
async function callAiBackend(discScores, sabotadorScores, localAnalysis) {
  const res = await fetch('/api/generate-profile-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discScores, sabScores: sabotadorScores, localAnalysis }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Backend retornou ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Resposta inválida do backend');
  return data.analysis;
}

// ─── Merge AI response into base analysis ────────────────────────────────────
function mergeAiData(localAnalysis, aiData, source) {
  return {
    ...localAnalysis,
    summary:           aiData.enrichedSummary             || localAnalysis.summary,
    recommendations:   aiData.personalizedRecommendations || localAnalysis.recommendations,
    // T2: IA tem prioridade quando vem preenchida; caso contrário preserva o conteúdo local
    deepInsights:      aiData.deepInsights?.length      ? aiData.deepInsights      : localAnalysis.deepInsights,
    coachingQuestions: aiData.coachingQuestions?.length ? aiData.coachingQuestions : localAnalysis.coachingQuestions,
    source,
  };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
// IA gerenciada pelo servidor (DeepSeek). Sem parâmetro de chave.
export async function generateAnalysis(discScores, sabotadorScores) {
  const localAnalysis = generateLocalAnalysis(discScores, sabotadorScores);

  // Backend seguro via Netlify Function (proxy DeepSeek — chave só no servidor)
  try {
    const aiData = await callAiBackend(discScores, sabotadorScores, localAnalysis);
    return mergeAiData(localAnalysis, aiData, 'ai');
  } catch (err) {
    console.warn('[generateAnalysis] Backend de IA indisponível, usando análise local:', err.message);
    // Fallback final: motor local sem IA
    return { ...localAnalysis, source: 'local', apiError: err.message };
  }
}
