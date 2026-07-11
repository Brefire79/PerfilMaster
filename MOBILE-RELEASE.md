# Preparação Android e iOS — Perfil Master

## Identidade definida

- Nome: `Perfil Master`
- Application ID: `ai.vianexx.perfilmaster`
- Web app: `https://perfilmaster.netlify.app`
- Android: prioridade atual
- iOS: preparação futura

O `appId` torna-se difícil de alterar depois da primeira publicação. Confirme que a Vianexx AI será a proprietária definitiva antes de criar o app na Play Console.

## Dependências nativas necessárias

Quando iniciar o build Android, instalar versões compatíveis com Capacitor 6:

```bash
npm install -D @capacitor/cli@^6
npm install @capacitor/android@^6
npx cap add android
npm run build
npx cap sync android
```

Para iOS, futuramente e em um Mac com Xcode:

```bash
npm install @capacitor/ios@^6
npx cap add ios
npm run build
npx cap sync ios
```

## Google Play

- Criar conta de desenvolvedor e perfil comercial.
- Gerar keystore fora do repositório e manter backup seguro.
- Configurar assinatura do app e Play App Signing.
- Produzir Android App Bundle `.aab`.
- Definir versão, `versionCode` e notas da versão.
- Preencher Data Safety de acordo com Supabase, Netlify, DeepSeek e dados comportamentais.
- Informar URLs públicas: `/privacidade`, `/termos` e `/suporte`.
- Definir e-mail público de suporte antes da submissão.
- Preparar ícone 512×512, feature graphic 1024×500 e screenshots de celular.
- Fazer teste interno, depois fechado, antes da produção.

## Cuidados mobile obrigatórios

- Não embutir `service_role`, chave DeepSeek ou secrets no APK.
- Testar links universais/app links para convite, avaliação, resultado e recuperação.
- Testar teclado, safe areas, rotação bloqueada e botão voltar do Android.
- Confirmar que PDFs e compartilhamento funcionam no WebView.
- Testar atualização de PWA/web assets após nova versão nativa.
- Revisar cache: dados do Supabase com PII não devem permanecer offline indefinidamente.

## iOS futuro

- Conta Apple Developer e organização legal.
- Bundle ID igual ao Application ID, se disponível.
- Certificados, provisioning e App Store Connect.
- Privacy Nutrition Labels e declaração do uso de dados.
- Universal Links com arquivo `apple-app-site-association`.
- Revisão específica de login, exclusão de conta, conteúdo gerado por IA e coleta de identificadores.

## Bloqueadores atuais

- Definir e-mail público de suporte/privacidade.
- Produzir arte final de loja em alta resolução.
- Validar exclusão de conta em produção.
- Instalar plataforma Android e gerar primeiro build de teste.
- Revisar política de retenção e Data Safety com orientação jurídica.

