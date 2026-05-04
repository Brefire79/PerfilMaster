# Deploy das Edge Functions (Supabase)

## 1) Pré-requisitos
- Supabase CLI instalado
- Projeto Supabase linkado (`supabase link --project-ref <PROJECT_REF>`)

## 2) Secrets obrigatórios
```bash
supabase secrets set OPENAI_API_KEY=seu_token
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

## 3) Deploy das funções
```bash
supabase functions deploy analyzeResponse
supabase functions deploy buildProfile
supabase functions deploy groupInsights
supabase functions deploy buscarPorToken
supabase functions deploy atualizarStatus
supabase functions deploy therapyFlag
supabase functions deploy generateInviteLink
supabase functions deploy validateInviteToken
supabase functions deploy generateReport
```

## 4) Teste rápido
```bash
supabase functions invoke buscarPorToken --data '{"token":"TOKEN_AQUI"}'
```

## 5) Observações
- As funções de IA agora usam OpenAI (`OPENAI_API_KEY`).
- As funções usam as tabelas:
  - `app_users`
  - `app_assessments`
  - `app_profiles`
  - `app_sessoes`
  - `app_avaliados`
  - `app_sessao_respostas`
