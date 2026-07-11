# Checklist de publicação — correções de julho/2026

Estas mudanças ficam prontas no código, mas só entram em produção depois dos passos abaixo.

## 1. Validação local

```bash
npm test
npm run build
```

## 2. Banco Supabase

Aplicar a migração `supabase/migrations/20260711014738_harden_security_definer.sql` e executar os Security/Performance Advisors. Confirmar que nenhuma RPC necessária perdeu permissão.

## 3. Edge Functions

```bash
supabase functions deploy deleteAccount --project-ref <ref>
supabase functions deploy atualizarStatus --project-ref <ref>
supabase functions deploy generateRecoveryLink --project-ref <ref>
supabase functions deploy convertAvaliado --project-ref <ref>
supabase functions deploy consumeInvite --project-ref <ref>
```

## 4. Frontend

Publicar primeiro em preview, validar os fluxos e depois promover para produção:

```bash
npm run deploy:preview
npm run deploy
```

## 5. Smoke test obrigatório

- Login e logout de admin.
- Avaliação completa de conta: 78 respostas, perfil DISC e PQ.
- Avaliação pública: retomada após refresh e conclusão.
- Convite de aluno e convite de administrador.
- Conversão de avaliado em conta e link de senha via WhatsApp.
- Exclusão de conta vazia em ambiente de teste.
- Bloqueio da exclusão de admin que tenha grupos/alunos/sessões.
- Falha simulada de carregamento de página exibindo “Tentar novamente”.

Não testar exclusão usando a conta produtiva do fundador.
