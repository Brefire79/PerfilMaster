-- DELTA 28 — Lembrete de Teste Dirigido por e-mail (Fase 4, 19/09/2026)
-- Edge enviarLembretesCiclos (cron semanal via GitHub Actions com CRON_TOKEN, ou o
-- facilitador pelo app) manda e-mail a quem tem teste `aplicado` com prazo em até
-- 7 dias ou vencido há até 30, e grava aqui para não repetir em menos de 7 dias.
-- Aplicado em produção via conector em 19/09/2026.
ALTER TABLE public.app_ciclos ADD COLUMN IF NOT EXISTS lembrete_em timestamptz;
COMMENT ON COLUMN public.app_ciclos.lembrete_em IS 'Último lembrete por e-mail enviado (enviarLembretesCiclos). Evita repetir em menos de 7 dias.';
