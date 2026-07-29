/**
 * OBSOLETO — mantido só para não quebrar algum import antigo.
 *
 * Até 28/07/2026 este arquivo inicializava o `i18next`. A dependência foi
 * removida (B3 da auditoria): o app é PT-BR exclusivo, EN e ES já não entravam
 * no bundle, e carregar um framework de i18n para servir um único idioma
 * estático custava ~40 KB sem contrapartida.
 *
 * O substituto é `src/lib/i18n.js`, que lê o mesmo `pt-BR.json` e mantém a
 * interface `useTranslation()` → `{ t }`.
 *
 * Tela NOVA não precisa de `t()`: escreva o português direto no JSX.
 */

export { t, i18n, useTranslation, default } from '@/lib/i18n.js';
