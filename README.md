# Perfil Master

SaaS da Vianexx AI para avaliações comportamentais DISC + PQ/Sabotadores, com atendimento individual, grupos, avaliações avulsas por WhatsApp, relatórios profissionais e inteligência agregada.

- Produção: https://perfilmaster.netlify.app
- Repositório: https://github.com/Brefire79/PerfilMaster
- Frontend: React 18 + Vite + Tailwind + Zustand
- Backend: Supabase Auth, PostgreSQL, RLS e Edge Functions
- IA: DeepSeek exclusivamente server-side, com fallback determinístico local
- Distribuição: PWA e preparação Capacitor para Android/iOS

## Rodar localmente

```bash
npm install
npm run dev
```

Configure somente variáveis públicas do frontend a partir de `.env.example`. Secrets de IA e `service_role` pertencem ao Netlify/Supabase e nunca devem entrar no bundle.

## Validar

```bash
npm test
npm run build
```

Os contratos verificam as 78 questões, scoring DISC/PQ, sincronização frontend/Edge e invariantes básicas de segurança. O GitHub Actions executa testes e build em pushes e pull requests.

## Arquitetura importante

A pasta `src/firebase/` não usa Firebase: é a camada REST legada sobre Supabase. Novas colunas precisam ser registradas no mapa `CAMEL_TO_DB` de `firestore.js`.

Fluxos públicos por token passam por Edge Functions com `service_role`; o cliente anônimo não acessa diretamente tabelas `app_*`. O isolamento de dados é por facilitador (`adminuid`).

## Documentação

- [Manual oficial de uso](MANUAL-OFICIAL.md)
- [Manual técnico](manual_tecnico.md)
- [PRD](PRD.md)
- [Roadmap de consolidação](ROADMAP-FINAL.md)
- [Preparação Android e iOS](MOBILE-RELEASE.md)
- [Marketing e prompts da landing page](MARKETING-LANDING-PROMPTS.md)
- [Checklist de publicação](DEPLOY-READY.md)

Documentos públicos do aplicativo:

- `/privacidade`
- `/termos`
- `/suporte`

## Publicação

Não publique o frontend antes das Edge Functions das quais ele depende. Siga a ordem documentada em `DEPLOY-READY.md`: testes → build → migração → Edge Functions → preview → smoke test → produção.

## Mobile

Identidade preparada:

- Nome: `Perfil Master`
- Application ID: `ai.vianexx.perfilmaster`

Antes de criar o app na Google Play, confirme a propriedade definitiva desse identificador e defina o e-mail público de suporte/privacidade.

---

Perfil Master © 2026 — Vianexx AI · Breno Luis
