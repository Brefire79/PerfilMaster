/**
 * Perfil Master — Utilitários de CPF (Fase 2: Convergência de Identidade)
 *
 * CPF é OPCIONAL em todo o app. Quando informado, vira a chave de identidade
 * que liga avaliações de sessão a contas de aluno (matching feito pelo admin).
 *
 * Privacidade (LGPD): armazenar SEMPRE só dígitos (11 chars). Exibir mascarado
 * na UI; valor completo apenas no Relatório Oficial (admin).
 *
 * Funções puras — sem efeitos colaterais, sem fetch.
 */

/** Remove tudo que não for dígito. Retorna string só com números. */
export function cleanCpf(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Valida CPF pelos dígitos verificadores (algoritmo oficial da Receita).
 * Rejeita: tamanho ≠ 11, sequências repetidas (000…, 111…), DV inválido.
 */
export function isValidCpf(value) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (11111111111, etc.) — passam no DV mas são inválidas
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (sliceLen) => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) {
      sum += Number(cpf[i]) * (sliceLen + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const dv1 = calcDigit(9);
  if (dv1 !== Number(cpf[9])) return false;

  const dv2 = calcDigit(10);
  if (dv2 !== Number(cpf[10])) return false;

  return true;
}

/**
 * Formata CPF completo: 12345678909 → 123.456.789-09
 * Se incompleto, formata o que tiver (útil para máscara em digitação).
 */
export function formatCpf(value) {
  const cpf = cleanCpf(value).slice(0, 11);
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/**
 * Máscara de exibição segura (LGPD): 12345678909 → ***.***.*89-09
 * Mostra só os últimos dígitos significativos; oculta o miolo.
 * Para CPF inválido/vazio, retorna string vazia.
 */
export function maskCpf(value) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11) return '';
  return `***.***.*${cpf.slice(8, 9)}-${cpf.slice(9)}`;
}

/**
 * Handler de input com máscara progressiva — use no onChange dos campos.
 * Retorna { masked, digits } para exibir o formatado e guardar os dígitos.
 */
export function handleCpfInput(rawValue) {
  const digits = cleanCpf(rawValue).slice(0, 11);
  return { masked: formatCpf(digits), digits };
}

/**
 * Normaliza nome para COMPARAÇÃO (Central de Pessoas — sugestão por nome).
 * minúsculas · sem acento · sem pontuação · espaços colapsados.
 * "José  da Silva-Júnior" → "jose da silva junior".
 *
 * ATENÇÃO: usar SÓ para gerar sugestão de duplicata — nome NUNCA auto-unifica
 * (só CPF idêntico unifica automaticamente). Ver PRD Central de Pessoas §4.
 */
export function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')    // pontuação/hífen → espaço
    .replace(/\s+/g, ' ')            // colapsa espaços
    .trim();
}
