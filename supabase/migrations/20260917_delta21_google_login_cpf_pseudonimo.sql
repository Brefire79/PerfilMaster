-- ============================================================================
-- DELTA 21 (17/09/2026) — Login com Google por convite no banco + CPF pseudonimizado
--
-- Parte A — Convite por e-mail ativado pelo BANCO
--   O facilitador registra o e-mail do convidado em app_invites.email. Quando
--   essa pessoa entra pela primeira vez (Google ou e-mail/senha), o trigger em
--   auth.users encontra o convite pendente pelo e-mail, cria a linha em
--   app_users (role/grupo/adminuid vindos do CONVITE), entra no grupo e queima
--   o convite — tudo dentro do Postgres, sem passar pelo cliente.
--
-- Parte B — CPF nunca mais em claro
--   O CPF só serve como CHAVE DE IDENTIDADE (ligar avaliação avulsa ↔ conta).
--   Ninguém precisa lê-lo de volta. Então o banco guarda apenas:
--     cpf      = HMAC-SHA256(cpf, pepper)  → 64 hex, determinístico (matching continua igual)
--     cpf_mask = '***.***.*89-09'          → só para exibição
--   O pepper mora no Supabase Vault (grátis, chave fora do banco). Sem o pepper
--   um dump do banco não permite reverter nem enumerar CPFs por força bruta.
--   Trigger BEFORE INSERT/UPDATE em app_users, app_avaliados e app_identity_links
--   faz a troca — o app e as Edge Functions continuam enviando os 11 dígitos.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- ─── A1. Coluna de e-mail no convite ────────────────────────────────────────
ALTER TABLE public.app_invites ADD COLUMN IF NOT EXISTS email text NULL;

CREATE INDEX IF NOT EXISTS idx_app_invites_email_pendente
  ON public.app_invites (lower(email))
  WHERE email IS NOT NULL AND used = false;

-- ─── A2. Ativação do convite na criação do usuário no Auth ──────────────────
CREATE OR REPLACE FUNCTION public.perfilmaster_ativar_convite_por_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email   text := lower(trim(NEW.email));
  v_invite  public.app_invites%ROWTYPE;
  v_nome    text;
  v_foto    text;
  v_role    text;
  v_agora   timestamptz := now();
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  -- Só provedores OAuth (Google) provam a posse do e-mail. Cadastro por
  -- e-mail/senha (provider = 'email') não confirma o endereço, então alguém
  -- poderia se cadastrar com o e-mail de outra pessoa e ficar com o convite.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email' THEN
    RETURN NEW;
  END IF;

  -- Convite pendente mais recente para este e-mail
  SELECT * INTO v_invite
    FROM public.app_invites
   WHERE lower(email) = v_email
     AND used = false
     AND (expiresat IS NULL OR expiresat > v_agora)
   ORDER BY createdat DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_nome := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_foto := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture');
  v_role := CASE WHEN v_invite.role = 'admin' THEN 'admin' ELSE 'student' END;

  -- Linha do usuário (role/grupo/adminuid vêm do CONVITE, nunca do cliente).
  -- Roda como owner (postgres) → o trigger protect_user_privileges libera a role.
  INSERT INTO public.app_users (uid, role, email, displayname, photourl, groupid, adminuid, invitedby, createdat, updatedat)
  VALUES (
    NEW.id::text,
    v_role,
    NEW.email,
    left(v_nome, 120),
    v_foto,
    CASE WHEN v_role = 'admin' THEN NULL ELSE v_invite.groupid END,
    CASE WHEN v_role = 'admin' THEN NULL ELSE v_invite.adminuid END,
    CASE WHEN v_role = 'admin' THEN v_invite.adminuid ELSE NULL END,
    v_agora, v_agora
  )
  ON CONFLICT (uid) DO UPDATE
    SET email     = EXCLUDED.email,
        displayname = COALESCE(public.app_users.displayname, EXCLUDED.displayname),
        photourl  = COALESCE(public.app_users.photourl, EXCLUDED.photourl),
        groupid   = COALESCE(public.app_users.groupid, EXCLUDED.groupid),
        adminuid  = COALESCE(public.app_users.adminuid, EXCLUDED.adminuid),
        updatedat = v_agora;

  -- Entra no grupo (memberids é text[] em produção)
  IF v_role = 'student' AND v_invite.groupid IS NOT NULL THEN
    UPDATE public.app_groups
       SET memberids = array_append(COALESCE(memberids, '{}'), NEW.id::text),
           updatedat = v_agora
     WHERE id = v_invite.groupid
       AND NOT (NEW.id::text = ANY(COALESCE(memberids, '{}')));
  END IF;

  -- Convite com e-mail é PESSOAL → uso único, mesmo quando tem grupo.
  UPDATE public.app_invites
     SET used = true, usedat = v_agora, usedby = NEW.id::text
   WHERE id = v_invite.id;

  -- Trilha de auditoria (best-effort)
  BEGIN
    INSERT INTO public.audit_log (adminuid, action, actor_id, actor_role, target_type, target_id, metadata)
    VALUES (v_invite.adminuid, 'invite_used', NEW.id::text, v_role, 'invite', v_invite.token,
            jsonb_build_object('groupid', v_invite.groupid, 'via', 'email_trigger', 'provider',
                               COALESCE(NEW.raw_app_meta_data->>'provider', 'email')));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[perfilmaster] audit_log falhou: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impedir a criação do usuário no Auth por causa do convite.
  RAISE WARNING '[perfilmaster] ativação de convite por e-mail falhou para %: %', v_email, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.perfilmaster_ativar_convite_por_email() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_perfilmaster ON auth.users;
CREATE TRIGGER on_auth_user_created_perfilmaster
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.perfilmaster_ativar_convite_por_email();

-- ─── B1. Pepper no Vault (criado uma única vez) ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'perfilmaster_cpf_pepper') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'perfilmaster_cpf_pepper',
      'Pepper do HMAC que pseudonimiza o CPF (DELTA 21). Perder = perder o matching por CPF.'
    );
  END IF;
END $$;

-- ─── B2. Função de pseudonimização (só o banco executa) ──────────────────────
CREATE OR REPLACE FUNCTION public.perfilmaster_cpf_pseudonimo(p_cpf text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_pepper text;
BEGIN
  IF v_digits = '' THEN RETURN NULL; END IF;
  -- Já pseudonimizado (64 hex) → devolve como está (idempotente)
  IF p_cpf ~ '^[0-9a-f]{64}$' THEN RETURN p_cpf; END IF;
  SELECT decrypted_secret INTO v_pepper
    FROM vault.decrypted_secrets WHERE name = 'perfilmaster_cpf_pepper' LIMIT 1;
  IF v_pepper IS NULL THEN
    RAISE EXCEPTION 'perfilmaster_cpf_pepper ausente no Vault';
  END IF;
  RETURN encode(extensions.hmac(v_digits::bytea, v_pepper::bytea, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.perfilmaster_cpf_pseudonimo(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.perfilmaster_cpf_mascara(p_cpf text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g') ~ '^\d{11}$'
      THEN '***.***.*' || substr(regexp_replace(p_cpf, '\D', '', 'g'), 9, 1) || '-' || substr(regexp_replace(p_cpf, '\D', '', 'g'), 10, 2)
    ELSE NULL
  END
$$;

-- ─── B3. Colunas de exibição ────────────────────────────────────────────────
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf_mask text NULL;
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf_mask text NULL;

-- ─── B4. Trigger: troca os 11 dígitos pelo pseudônimo antes de gravar ───────
CREATE OR REPLACE FUNCTION public.perfilmaster_trg_cpf_pseudonimo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits text;
BEGIN
  IF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    NEW.cpf := NULL;
    IF TG_TABLE_NAME <> 'app_identity_links' THEN NEW.cpf_mask := NULL; END IF;
    RETURN NEW;
  END IF;
  IF NEW.cpf ~ '^[0-9a-f]{64}$' THEN
    RETURN NEW; -- já pseudonimizado (ex.: cópia de outra tabela)
  END IF;
  v_digits := regexp_replace(NEW.cpf, '\D', '', 'g');
  IF v_digits !~ '^\d{11}$' THEN
    -- CPF inválido: não guarda nada (o app e as Edge já validam antes)
    NEW.cpf := NULL;
    IF TG_TABLE_NAME <> 'app_identity_links' THEN NEW.cpf_mask := NULL; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME <> 'app_identity_links' THEN
    NEW.cpf_mask := public.perfilmaster_cpf_mascara(v_digits);
  END IF;
  NEW.cpf := public.perfilmaster_cpf_pseudonimo(v_digits);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpf_pseudonimo ON public.app_users;
CREATE TRIGGER trg_cpf_pseudonimo
  BEFORE INSERT OR UPDATE OF cpf ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.perfilmaster_trg_cpf_pseudonimo();

DROP TRIGGER IF EXISTS trg_cpf_pseudonimo ON public.app_avaliados;
CREATE TRIGGER trg_cpf_pseudonimo
  BEFORE INSERT OR UPDATE OF cpf ON public.app_avaliados
  FOR EACH ROW EXECUTE FUNCTION public.perfilmaster_trg_cpf_pseudonimo();

DROP TRIGGER IF EXISTS trg_cpf_pseudonimo ON public.app_identity_links;
CREATE TRIGGER trg_cpf_pseudonimo
  BEFORE INSERT OR UPDATE OF cpf ON public.app_identity_links
  FOR EACH ROW EXECUTE FUNCTION public.perfilmaster_trg_cpf_pseudonimo();

-- ─── B5. Backfill: CPFs já gravados em claro ────────────────────────────────
UPDATE public.app_users
   SET cpf_mask = public.perfilmaster_cpf_mascara(cpf),
       cpf      = public.perfilmaster_cpf_pseudonimo(cpf)
 WHERE cpf IS NOT NULL AND cpf !~ '^[0-9a-f]{64}$';

UPDATE public.app_avaliados
   SET cpf_mask = public.perfilmaster_cpf_mascara(cpf),
       cpf      = public.perfilmaster_cpf_pseudonimo(cpf)
 WHERE cpf IS NOT NULL AND cpf !~ '^[0-9a-f]{64}$';

UPDATE public.app_identity_links
   SET cpf = public.perfilmaster_cpf_pseudonimo(cpf)
 WHERE cpf IS NOT NULL AND cpf !~ '^[0-9a-f]{64}$';

-- ─── Verificação ────────────────────────────────────────────────────────────
-- SELECT count(*) FILTER (WHERE cpf !~ '^[0-9a-f]{64}$') AS em_claro FROM public.app_users WHERE cpf IS NOT NULL;
-- SELECT count(*) FILTER (WHERE cpf !~ '^[0-9a-f]{64}$') AS em_claro FROM public.app_avaliados WHERE cpf IS NOT NULL;
