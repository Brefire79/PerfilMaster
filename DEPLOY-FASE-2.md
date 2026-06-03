# 🚀 Guia de Deploy — Fase 1 + Fase 2 (Convergência CPF)

> Ordem importa. Faça de cima para baixo. Tudo é **idempotente** (seguro repetir).

---

## PASSO 1 — SQL no Supabase (você faz)

Abra: **app.supabase.com → projeto MentoriaX → SQL Editor → New query**

Cole e rode **os dois blocos** abaixo (pode rodar os dois de uma vez).

### Bloco A — DELTA 6 (aluno avulso sem grupo)
```sql
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS adminuid text NULL;

ALTER TABLE public.app_invites
  ALTER COLUMN groupid DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_adminuid
  ON public.app_users (adminuid);

UPDATE public.app_users u
   SET adminuid = g.adminuid
  FROM public.app_groups g
 WHERE u.groupid = g.id
   AND u.adminuid IS NULL
   AND u.role = 'student';
```

### Bloco B — DELTA 7 (CPF + convergência de identidade)
```sql
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf text NULL;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf text NULL;
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf_consent    boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf_consent_at timestamptz NULL;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf_consent    boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf_consent_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_app_avaliados_cpf ON public.app_avaliados (cpf);
CREATE INDEX IF NOT EXISTS idx_app_users_cpf     ON public.app_users (cpf);

CREATE TABLE IF NOT EXISTS public.app_identity_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         text NOT NULL,
  avaliado_id uuid NULL REFERENCES public.app_avaliados(id) ON DELETE SET NULL,
  user_uid    text NULL,
  linked_by   text NOT NULL,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_identity_links_cpf      ON public.app_identity_links (cpf);
CREATE INDEX IF NOT EXISTS idx_identity_links_admin    ON public.app_identity_links (linked_by);
CREATE INDEX IF NOT EXISTS idx_identity_links_avaliado ON public.app_identity_links (avaliado_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_user     ON public.app_identity_links (user_uid);
ALTER TABLE public.app_identity_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "identity_links_admin_all" ON public.app_identity_links;
CREATE POLICY "identity_links_admin_all"
  ON public.app_identity_links
  FOR ALL
  USING (linked_by::text = auth.uid()::text)
  WITH CHECK (linked_by::text = auth.uid()::text);
```

### Verificação (opcional — só leitura)
```sql
SELECT
  count(*) FILTER (WHERE cpf IS NOT NULL) AS avaliados_com_cpf,
  count(*) AS avaliados_total
FROM public.app_avaliados;
```

**✅ Quando terminar o SQL, me avise** — eu faço os passos 2 e 3 por você (CLI).

---

## PASSO 2 — Edge Function (eu faço via CLI)

A função `atualizarStatus` mudou (valida CPF no servidor). Eu rodo:
```
supabase functions deploy atualizarStatus
```

## PASSO 3 — App no Netlify (eu faço)

```
npm run deploy   # bump versão → build → netlify deploy --prod
```
+ `git push origin main` para sincronizar os commits da Fase 2.

---

## ⚠️ Importante saber

- **CPF é OPCIONAL** — quem não preencher, tudo funciona como antes. Zero risco de quebrar fluxo existente.
- **`app_identity_links`** é criada agora mas **só será usada na F2.3** (painel de vínculos). Criá-la antes não causa efeito nenhum.
- Após o deploy, a coleta de CPF já aparece em: cadastro de avaliado (admin), cadastro de conta, e avaliação pública.

---

## ✅ Como testar depois do deploy

1. Admin → Sessões → Adicionar avaliado → ver campo **CPF (opcional)** + consentimento
2. Preencher CPF inválido → deve bloquear; válido sem consentimento → deve bloquear
3. Deixar CPF vazio → deve funcionar normalmente (avaliado criado)
4. Abrir link de avaliação de um avaliado SEM cpf → ver campo CPF na boas-vindas
5. Cadastro de conta (/register?token=...) → ver campo CPF opcional
