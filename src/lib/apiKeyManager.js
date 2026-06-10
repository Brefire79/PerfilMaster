/**
 * ProfileAI — Sistema Genérico de API Key
 * Detecta o provider a partir do formato da key e orquestra a geração de análises.
 */

import { generateLocalAnalysis } from './localEngine.js';

const API_KEY_STORAGE = 'profileai_api_key';

// ─── Detect Provider ──────────────────────────────────────────────────────────
// D5: Gemini é o único provider suportado (PRD §4.3). Outros prefixes retornam null.
export function detectApiProvider(apiKey) {
  if (!apiKey || apiKey.trim().length === 0) return null;
  const key = apiKey.trim();
  if (key.startsWith('AIza')) return 'google';
  return null; // provider não reconhecido como Gemini
}

// ─── API Caller ───────────────────────────────────────────────────────────────
// D5: Suporta apenas Google Gemini 2.0 Flash (PRD §4.3).
export async function callAiApi(apiKey, prompt, provider) {
  const key = apiKey.trim();

  if (provider === 'google') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Google API: ${res.status} ${res.statusText}${errBody ? ` — ${errBody.slice(0, 120)}` : ''}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  // D5: Outros providers removidos. Somente Gemini (AIza...) é aceito.
  throw new Error('Chave de IA inválida. Use uma chave Gemini do Google AI Studio (prefixo AIza...).');
}

// ─── Build Prompt ─────────────────────────────────────────────────────────────
export function buildAnalysisPrompt(discScores, sabotadorScores, localAnalysis) {
  const discLabels = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };
  const sabLabels = {
    judge: 'Juiz', stickler: 'Insistente', pleaser: 'Prestativo',
    hyperAchiever: 'Hiper-Realizador', victim: 'Vítima',
    hyperRational: 'Hiper-Racional', hyperVigilant: 'Hiper-Vigilante',
    restless: 'Inquieto', controller: 'Controlador', avoider: 'Esquivo',
  };

  const discFormatted = Object.entries(discScores)
    .map(([k, v]) => `${discLabels[k]} (${k}): ${v}/5`)
    .join(', ');

  const sabFormatted = Object.entries(sabotadorScores)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${sabLabels[k] || k}: ${v}/10`)
    .join(', ');

  return `Você é um especialista em psicologia comportamental e coaching executivo. Analise o perfil comportamental abaixo e forneça insights profundos e personalizados.

## DADOS DO PERFIL

**Scores DISC:** ${discFormatted}
**Perfil Primário:** ${discLabels[localAnalysis.disc.primary]} (${localAnalysis.disc.primary})
**Perfil Secundário:** ${discLabels[localAnalysis.disc.secondary]} (${localAnalysis.disc.secondary})
**Subtipo:** ${localAnalysis.disc.subtype}

**Scores Sabotadores PQ:** ${sabFormatted}
**Top 3 Sabotadores:** ${localAnalysis.sabotadores.top3.map(k => sabLabels[k] || k).join(', ')}
**PQ Score:** ${localAnalysis.sabotadores.pqScore}/100
**Nível de Risco:** ${localAnalysis.sabotadores.riskLevel}

## ANÁLISE BASE CALCULADA

${localAnalysis.summary}

## TAREFA

Com base nesses dados, forneça uma análise aprofundada e personalizada. Responda APENAS com um JSON válido (sem markdown, sem texto antes/depois) com esta estrutura exata:

{"enrichedSummary":"Parágrafo rico de 150-200 palavras sobre o perfil completo, linguagem empática e profissional","deepInsights":["Insight 1 sobre a combinação DISC específica","Insight 2 sobre sabotadores em contexto profissional","Insight 3 sobre padrões sob pressão","Insight 4 sobre relacionamentos e comunicação","Insight 5 sobre liderança e tomada de decisão"],"personalizedRecommendations":[{"category":"categoria","action":"ação específica e detalhada","priority":"alta"},{"category":"categoria","action":"ação específica e detalhada","priority":"média"},{"category":"categoria","action":"ação específica e detalhada","priority":"média"},{"category":"categoria","action":"ação específica e detalhada","priority":"baixa"},{"category":"categoria","action":"ação específica e detalhada","priority":"baixa"}],"coachingQuestions":["Pergunta reflexiva 1 para autoconhecimento","Pergunta reflexiva 2 sobre padrões limitantes","Pergunta reflexiva 3 sobre pontos cegos","Pergunta reflexiva 4 sobre potencial de crescimento"]}

Responda apenas em português brasileiro. Seja específico, empático e baseado nos dados fornecidos.`;
}

// ─── Persist API Key ──────────────────────────────────────────────────────────
export async function loadApiKey() {
  try {
    const { supabase } = await import('./supabase.js');
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'ai_api_key')
      .maybeSingle();
    if (data?.value) return data.value;
  } catch {
    // Supabase indisponível
  }
  return localStorage.getItem(API_KEY_STORAGE) || null;
}

export async function saveApiKey(apiKey) {
  try {
    const { supabase } = await import('./supabase.js');
    if (apiKey) {
      await supabase.from('settings').upsert({ key: 'ai_api_key', value: apiKey });
    } else {
      await supabase.from('settings').delete().eq('key', 'ai_api_key');
    }
  } catch {
    // Supabase indisponível
  }
  if (apiKey) {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
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
export async function generateAnalysis(discScores, sabotadorScores, apiKey = null) {
  const localAnalysis = generateLocalAnalysis(discScores, sabotadorScores);

  // 1. Usuário configurou chave Gemini (AIza...) → usa diretamente (D5: único provider)
  if (apiKey) {
    const provider = detectApiProvider(apiKey);
    if (provider !== 'google') {
      // D5: Chave não é Gemini; ignora e cai para fallback sem erro ao usuário
      console.warn('[generateAnalysis] Chave não é Gemini (AIza...) — provider ignorado, usando fallback.');
    } else {
      const prompt = buildAnalysisPrompt(discScores, sabotadorScores, localAnalysis);
      try {
        const aiText = await callAiApi(apiKey, prompt, provider);
        let aiData;
        try {
          const cleaned = aiText.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
          aiData = JSON.parse(cleaned);
        } catch {
          return { ...localAnalysis, source: provider, rawAiText: aiText };
        }
        return mergeAiData(localAnalysis, aiData, provider);
      } catch (err) {
        console.warn('[generateAnalysis] Chave Gemini falhou, tentando backend:', err.message);
        // Cai para o backend se a chave do usuário falhar
      }
    }
  }

  // 2. Sem chave do usuário (ou falhou) → backend seguro via Netlify Function
  //    (proxy DeepSeek — a chave fica só no servidor, nunca no bundle)
  try {
    const aiData = await callAiBackend(discScores, sabotadorScores, localAnalysis);
    return mergeAiData(localAnalysis, aiData, 'ai');
  } catch (err) {
    console.warn('[generateAnalysis] Backend de IA indisponível, usando análise local:', err.message);
    // 3. Fallback final: motor local sem IA
    return { ...localAnalysis, source: 'local', apiError: err.message };
  }
}
