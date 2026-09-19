// ─────────────────────────────────────────────────────────────────────────────
// Social Style — LENTE derivada do DISC (Fase 4, veredito da AUDITORIA-2026-09-17 §5:
// sem questionário próprio; é uma releitura dos mesmos 4 scores).
//
// Modelo Merrill/Reid: dois eixos comportamentais.
//   Assertividade  (pergunta ↔ afirma)   = (D + I) − (S + C)   → "afirma" quando > 0
//   Responsividade (controla ↔ expressa) = (I + S) − (D + C)   → "expressa" quando > 0
// Quadrantes: Condutor (afirma+controla) · Expressivo (afirma+expressa)
//             · Amigável (pergunta+expressa) · Analítico (pergunta+controla)
//
// Cada eixo vai de −100 a +100 (scores DISC 0–100 → soma/2). |valor| ≤ 10 é
// "zona central" (estilo pouco marcado) e é avisado — não force um rótulo.
// Versatilidade NÃO é derivável do DISC e não é inventada aqui.
// Puro, sem I/O; travado por scripts/verify-social-style-contract.mjs.
// ─────────────────────────────────────────────────────────────────────────────

export const SOCIAL_STYLE_VERSAO = 1;
export const ZONA_CENTRAL = 10;

export const ESTILOS = {
  condutor: {
    nome: 'Condutor',
    resumo: 'Afirma e controla a emoção: foco em resultado, ritmo rápido, decide e segue.',
    comoTratar: 'Seja objetivo, traga opções e resultados; evite rodeios e detalhes que não mudam a decisão.',
    tensao: 'Sob pressão tende a impor. Vale checar se ouviu antes de decidir.',
    cor: '#EF4444',
  },
  expressivo: {
    nome: 'Expressivo',
    resumo: 'Afirma e expressa emoção: entusiasmo, ideias, pessoas e ritmo alto.',
    comoTratar: 'Dê espaço para falar e visão do todo; combine o "como" e os prazos por escrito.',
    tensao: 'Sob pressão tende a atacar ou dispersar. Ajuda fechar um compromisso concreto.',
    cor: '#F59E0B',
  },
  amigavel: {
    nome: 'Amigável',
    resumo: 'Pergunta e expressa emoção: relação, cooperação, ritmo constante.',
    comoTratar: 'Comece pela pessoa, garanta segurança e apoio; peça a opinião de verdade, sem pressa.',
    tensao: 'Sob pressão tende a ceder e guardar. Vale abrir espaço para o "não".',
    cor: '#22C55E',
  },
  analitico: {
    nome: 'Analítico',
    resumo: 'Pergunta e controla a emoção: dados, precisão, cautela, ritmo ponderado.',
    comoTratar: 'Traga fatos, critérios e tempo para analisar; evite pressão por resposta imediata.',
    tensao: 'Sob pressão tende a evitar e se fechar. Ajuda combinar prazos e critérios de "bom o bastante".',
    cor: '#6366F1',
  },
};

const n = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/**
 * @param {{D:number,I:number,S:number,C:number}|{scores:object}|{dominante,influente,estavel,analitico}} perfil
 * @returns {{ versao, assertividade, responsividade, estilo, nome, resumo, comoTratar, tensao, cor, zonaCentral: string[], secundario: string|null } | null}
 */
export function derivarSocialStyle(perfil) {
  if (!perfil) return null;
  const s = perfil.scores || perfil;
  const D = n(s.D ?? perfil.dominante), I = n(s.I ?? perfil.influente), S = n(s.S ?? perfil.estavel), C = n(s.C ?? perfil.analitico);
  if (D + I + S + C === 0) return null;

  const assertividade = Math.round(((D + I) - (S + C)) / 2);   // −100..100
  const responsividade = Math.round(((I + S) - (D + C)) / 2);  // −100..100
  const afirma = assertividade >= 0;
  const expressa = responsividade >= 0;

  const estilo = afirma ? (expressa ? 'expressivo' : 'condutor') : (expressa ? 'amigavel' : 'analitico');
  const zonaCentral = [];
  if (Math.abs(assertividade) <= ZONA_CENTRAL) zonaCentral.push('assertividade');
  if (Math.abs(responsividade) <= ZONA_CENTRAL) zonaCentral.push('responsividade');

  // Estilo vizinho mais próximo (o eixo menos marcado é o que "vira").
  let secundario = null;
  if (zonaCentral.length > 0) {
    const eixo = Math.abs(assertividade) <= Math.abs(responsividade) ? 'assertividade' : 'responsividade';
    const viz = eixo === 'assertividade'
      ? (!afirma ? (expressa ? 'expressivo' : 'condutor') : (expressa ? 'amigavel' : 'analitico'))
      : (!expressa ? (afirma ? 'expressivo' : 'amigavel') : (afirma ? 'condutor' : 'analitico'));
    secundario = viz;
  }

  return { versao: SOCIAL_STYLE_VERSAO, assertividade, responsividade, estilo, ...ESTILOS[estilo], zonaCentral, secundario };
}
