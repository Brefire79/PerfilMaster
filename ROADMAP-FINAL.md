# Planejamento de consolidação final — Perfil Master

## Estado atual

As abas visíveis possuem implementação real: Painel, Central, Grupos, Alunos, Módulos DiSC, Relatórios e Configurações. Sessões e Pessoas foram incorporadas a Alunos, Grupos, Relatórios e Central; não devem voltar como telas duplicadas.

**19/09/2026 — Plano de evolução entregue** (`PLANO-EVOLUCAO-2026-09-19.md`): histórico de avaliações por ciclo com linha do tempo; motor de abordagem + 7 testes dirigidos aplicáveis por conta, link ou turma, com auditoria por trigger; Mestre v2 (intenção + entidades, pessoas pelo nome, miss-log no servidor, aprofundamento opcional com IA anonimizada); Social Style derivado do DISC; lembretes por e-mail com cron semanal; DISC‑V2 com 8 itens invertidos; hotfix de segurança no bypass de triggers SECURITY DEFINER (DELTA 27). A Fase 3 abaixo foi parcialmente cumprida (Social Style como lente); OCAI e construtor Custom seguem adiados.

## Fase 1 — Release segura

- Publicar migração de hardening e Edge `deleteAccount`.
- Republicar `atualizarStatus`, `generateRecoveryLink`, `convertAvaliado` e `consumeInvite`.
- Executar smoke test completo do `DEPLOY-READY.md`.
- Definir e-mail público de suporte e privacidade.
- Rodar Supabase Security/Performance Advisors.

Critério de conclusão: build/testes verdes, fluxos críticos validados em produção e nenhuma ação apresentada ao usuário sem backend ativo.

## Fase 2 — Produto comercial

- Onboarding guiado do facilitador: empresa → primeiro grupo → primeiro convite.
- Planos e limites comerciais: teste, profissional e equipe.
- Tela de consentimento/aceite vinculada à versão dos termos.
- Exportação e exclusão assistida de dados LGPD.
- Monitoramento externo de erros e disponibilidade sem PII.
- Métricas de ativação: cadastro, primeiro grupo, primeiro envio e primeira conclusão.

## Fase 3 — Modelos além de DiSC

Social Style e OCAI não devem ser apenas opções visuais. Cada modelo exige:

1. banco de questões versionado;
2. fórmula e testes de scoring próprios;
3. schema de resultado específico;
4. relatório e nomenclatura próprios;
5. validação técnica/metodológica;
6. migração e compatibilidade com avaliações antigas.

Ordem recomendada: Social Style → OCAI → construtor Custom com regras configuráveis. Até cada motor estar validado, a interface deve continuar mostrando apenas DiSC como publicável.

## Fase 4 — Mobile e distribuição

- Android interno → teste fechado → produção gradual.
- iOS somente depois da validação comercial e operacional no Android.
- Landing page pública e funil de aquisição.
- Central de ajuda e suporte com SLA definido.

## Indicadores de prontidão

- Taxa de conclusão de avaliação acima de 75%.
- Tempo até primeira avaliação enviada abaixo de 10 minutos.
- Erros críticos abaixo de 1% das sessões.
- Nenhum incidente de isolamento entre facilitadores.
- Política de privacidade, termos, suporte e exclusão disponíveis publicamente.
- Retenção mensal de facilitadores e conversão teste → pago acompanhadas.

