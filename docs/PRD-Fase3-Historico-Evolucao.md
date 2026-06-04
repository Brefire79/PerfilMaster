# PRD — Fase 3: Histórico de Evolução do Avaliado
**ProfileAI · Épico de Evolução Comportamental** · Versão 0.1 · 2026-06-04

## 1. Problema

Uma pessoa pode ser avaliada várias vezes ao longo do tempo (workshops, processos, reavaliações). Hoje cada avaliação é um ponto isolado — não há como ver **como o perfil DISC dela evoluiu**. A Fase 2 (vínculos por CPF) criou a base para identificar "a mesma pessoa"; a Fase 3 transforma isso em **valor visível**: a trajetória comportamental.

## 2. Objetivo

Exibir, no **Relatório Oficial** (admin), uma seção de **Evolução** que mostra como o perfil DISC da pessoa mudou entre suas avaliações vinculadas — incluindo o gráfico de linha (já existente) e a **narrativa de mudança de perfil dominante**.

## 3. Decisões tomadas (Breno, 2026-06-04)

| # | Decisão | Valor |
|---|---------|-------|
| D1 | Onde aparece | **Relatório Oficial** (nova §6 Evolução, admin-only) |
| D2 | Fonte do histórico | **Você decide** → ver §4 |
| D3 | Destaque além do gráfico | **Mudança de perfil dominante** (narrativa da virada) |

## 4. Fonte do histórico (decisão técnica)

**Estratégia: vínculos confirmados como base, CPF como descoberta.**

- O histórico de uma pessoa = todas as avaliações concluídas ligadas a ela por **`app_identity_links`** (vínculos que o admin confirmou na Fase 2.3).
- Isso mantém a **auditabilidade** (PRD Fase 2): só entra no histórico o que o admin validou ser a mesma pessoa.
- **Fallback**: se o avaliado atual tem CPF mas ainda não há vínculos confirmados, o relatório mostra só a avaliação atual (1 ponto) + um aviso "Há outras avaliações com este CPF — confirme o vínculo na tela de Alunos para ver a evolução completa". Isso evita histórico silenciosamente incompleto e induz o admin ao fluxo correto.

> Por que não "CPF direto"? Porque juntar automaticamente sem confirmação quebra a rastreabilidade que a Fase 2 estabeleceu (dois CPFs digitados errado, ou homônimos, poluiriam o histórico). Vínculo confirmado = fonte da verdade.

## 5. Modelo de dados

**Nenhuma migração nova.** Tudo já existe:
- `app_avaliados`: `perfil` (jsonb com scores D/I/S/C + perfilPrimario), `concluidoEm`, `cpf`
- `app_identity_links`: liga avaliações pelo CPF (Fase 2.3)
- `EvolutionChart` (componente) já espera `{ moduleTitle, completedAt, scores, dominantProfile }[]`

## 6. Mudanças de código

### 6.1 firestore.js — `getHistoricoEvolucao(token, adminUid)`
- Busca o avaliado atual pelo token → pega seu CPF
- Busca vínculos confirmados desse CPF em `app_identity_links`
- Reúne todas as avaliações concluídas vinculadas (via `avaliado_id`) + a atual
- Ordena por `concluidoEm` ascendente
- Retorna `{ pontos: [{moduleTitle, completedAt, scores, dominantProfile}], temOutrasNaoVinculadas: bool }`

### 6.2 RelatorioOficial.jsx — nova §6 Evolução
- Renderiza só se houver CPF no avaliado
- Reusa `EvolutionChart` com os pontos do histórico
- **Narrativa de mudança de perfil dominante** (D3): compara primeiro vs último ponto
  - Ex: "Na primeira avaliação (12/03), o perfil dominante era **Dominante**. Na avaliação atual (04/06), passou a **Influente**." 
  - Se não mudou: "O perfil dominante manteve-se **Analítico** ao longo das N avaliações."
- Aviso de fallback se `temOutrasNaoVinculadas`
- Respeita `@media print` (entra no PDF) e fica **admin-only** (já é, a página toda é)

## 7. Fora de escopo
- Evolução para o aluno logado (MyProfile) — fase futura
- Análise de IA sobre a evolução (interpretação textual automática)
- Comparação entre pessoas / médias de grupo ao longo do tempo
- Edição/remoção manual de pontos do histórico

## 8. Regras invioláveis
DISC/PQ intocado · cores canônicas · clínico admin-only/.no-print · CPF mascarado fora do Relatório (no Relatório é completo, já tratado na F2.4) · build verde · 100% pt-BR · lazy loading

## 9. Riscos
| Risco | Mitigação |
|-------|-----------|
| Histórico vazio (sem vínculos) | Fallback: mostra avaliação atual + induz a vincular |
| Avaliação vinculada sem `perfil`/scores | Filtra pontos sem scores válidos antes de plotar |
| Performance (muitas avaliações) | Limite prático; ordena e plota só concluídas com perfil |
| Pessoa com 1 só avaliação | EvolutionChart já trata (mostra ponto único + msg) |

## 10. Critérios de aceite
1. §6 Evolução aparece no Relatório Oficial quando o avaliado tem CPF
2. Gráfico mostra todas as avaliações vinculadas, ordenadas no tempo
3. Narrativa de mudança de perfil dominante (mudou / manteve)
4. Fallback quando há CPF mas sem vínculos confirmados
5. Entra no PDF (print); admin-only; pt-BR; build verde
6. Nenhuma regra inviolável quebrada; sem migração nova

## 11. Plano de implementação
- **F3.1** `getHistoricoEvolucao` no firestore.js + teste de agrupamento
- **F3.2** §6 Evolução no RelatorioOficial (gráfico + narrativa + fallback)
- **F3.3** Validação E2E (criar 2 avaliações vinculadas, ver evolução no relatório) + deploy

---

*Sem migração de banco. Reusa EvolutionChart e app_identity_links da Fase 2.*
