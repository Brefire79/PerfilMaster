/**
 * i18n local — substitui `i18next` + `react-i18next` (B3 da auditoria 27/07/2026).
 *
 * O app é PT-BR exclusivo: EN e ES já tinham saído do bundle, e o i18next
 * continuava embarcado (~40 KB) só para servir um único idioma estático.
 *
 * Este módulo mantém a MESMA interface (`useTranslation()` → `{ t }`), então
 * nenhuma das 25 telas precisou trocar `t('chave')` por texto direto — o que
 * seria 447 substituições manuais e um belo risco de regressão. Só o import
 * mudou de 'react-i18next' para '@/lib/i18n.js'.
 *
 * Suporta o que o projeto realmente usa:
 *   - chave aninhada por ponto:  t('admin.groups.title')
 *   - interpolação:              t('common.greeting', { name: 'Breno' })
 *   - plural _one/_other:        t('group.membersCount', { count: 3 })
 *
 * Tela NOVA não precisa passar por aqui: pode escrever o texto direto no JSX.
 * `pt-BR.json` continua sendo a fonte das strings que já existem.
 */

import ptBR from '@/i18n/locales/pt-BR.json';

const IDIOMA = 'pt-BR';

/** Caminha por 'a.b.c' no objeto de traduções. */
function resolver(chave) {
  if (!chave || typeof chave !== 'string') return undefined;
  let atual = ptBR;
  for (const parte of chave.split('.')) {
    if (atual == null || typeof atual !== 'object') return undefined;
    atual = atual[parte];
  }
  return typeof atual === 'string' ? atual : undefined;
}

/** Substitui {{variavel}} pelos valores passados em opts. */
function interpolar(texto, opts) {
  if (!opts) return texto;
  return texto.replace(/\{\{(\w+)\}\}/g, (original, nome) =>
    opts[nome] != null ? String(opts[nome]) : original
  );
}

/**
 * t — mesma assinatura do i18next para o subconjunto usado no projeto.
 * Fallback igual ao dele: chave não encontrada volta como a própria chave,
 * o que deixa o problema visível na tela em vez de virar um espaço em branco.
 */
export function t(chave, opts) {
  let texto;

  // Plural: i18next resolve chave_one / chave_other quando há `count`.
  if (opts && opts.count != null) {
    const sufixo = Number(opts.count) === 1 ? '_one' : '_other';
    texto = resolver(`${chave}${sufixo}`);
  }

  if (texto === undefined) texto = resolver(chave);
  if (texto === undefined) return opts?.defaultValue ?? chave;

  return interpolar(texto, opts);
}

/** Compatível com o objeto `i18n` que o react-i18next devolve. */
export const i18n = {
  language: IDIOMA,
  languages: [IDIOMA],
  // O app não troca de idioma; existe para não quebrar chamadas antigas.
  changeLanguage: () => Promise.resolve(),
  t,
};

export function useTranslation() {
  return { t, i18n, ready: true };
}

export default i18n;
