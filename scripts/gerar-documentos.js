/**
 * ProfileAI — Gerador de Documentos DOCX
 * Gera MANUAL_ProfileAI_v2.docx e PRD_ProfileAI_v2.docx
 *
 * Uso: node scripts/gerar-documentos.js
 * Saída: docs/MANUAL_ProfileAI_v2.docx  docs/PRD_ProfileAI_v2.docx
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  ImageRun,
} from 'docx';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_DIR = join(ROOT, 'docs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '6366F1' },
    },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 80 },
  });
}

function heading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

function para(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, ...options })],
    spacing: { after: 120 },
  });
}

function bold(text) {
  return new TextRun({ text, bold: true, size: 22 });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    numbering: { reference: 'numbered-list', level },
    spacing: { after: 80 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' } },
    spacing: { before: 200, after: 200 },
  });
}

function noteBox(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: '📝 ', size: 22 }),
      new TextRun({ text, size: 22, italics: true, color: '4B5563' }),
    ],
    shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' },
    border: {
      left: { style: BorderStyle.SINGLE, size: 8, color: '6366F1' },
    },
    indent: { left: 360 },
    spacing: { before: 160, after: 160 },
  });
}

function tableFromRows(headers, rows, colWidths) {
  const headerCells = headers.map((h, i) =>
    new TableCell({
      children: [new Paragraph({ children: [bold(h)], alignment: AlignmentType.CENTER })],
      width: { size: colWidths ? colWidths[i] : Math.floor(9000 / headers.length), type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: 'EEF2FF' },
    })
  );

  const dataRows = rows.map((row) =>
    new TableRow({
      children: row.map((cell, i) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })] })],
          width: { size: colWidths ? colWidths[i] : Math.floor(9000 / headers.length), type: WidthType.DXA },
        })
      ),
    })
  );

  return new Table({
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  });
}

function codeBlock(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: '1F2937' })],
    shading: { type: ShadingType.CLEAR, fill: 'F9FAFB' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
    },
    indent: { left: 360 },
    spacing: { before: 120, after: 120 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function footerPara(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, color: '6B7280' })],
    alignment: AlignmentType.CENTER,
  });
}

// ─── MANUAL ──────────────────────────────────────────────────────────────────

function buildManual() {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const children = [
    // Capa
    new Paragraph({
      children: [new TextRun({ text: 'ProfileAI', bold: true, size: 72, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1440, after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Manual de Uso', bold: true, size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Versão 2.0 · Maio 2026', size: 24, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'AmbFusi AI / Vianexx AI', size: 22, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1440 },
    }),
    divider(),

    // Visão Geral
    heading1('Visão Geral'),
    para('O ProfileAI é uma plataforma de avaliação comportamental baseada no modelo DISC, potencializada por Inteligência Artificial (Google Gemini). Permite que instrutores, coaches e profissionais de RH realizem avaliações individuais ou em grupo, gerem relatórios oficiais rastreáveis e compartilhem resultados com os avaliados de forma segura e profissional.'),
    new Paragraph({ spacing: { after: 160 } }),
    tableFromRows(
      ['Perfil', 'Função Principal'],
      [
        ['Admin', 'Criar sessões, gerenciar avaliados, analisar com IA, emitir relatórios oficiais'],
        ['Aluno', 'Responder avaliação DISC, visualizar perfil, acessar resultado público'],
      ],
      [2000, 7000]
    ),
    new Paragraph({ spacing: { after: 160 } }),
    para('Acesso: https://profileai.netlify.app'),
    para('Idioma: Português do Brasil (PT-BR)'),

    pageBreak(),

    // PARTE 1 — ADMIN
    new Paragraph({
      children: [new TextRun({ text: 'PARTE 1 — GUIA DO ADMINISTRADOR', bold: true, size: 32, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    }),

    heading1('1. Primeiro Acesso como Admin'),
    heading2('1.1 Login'),
    numbered('Acesse https://profileai.netlify.app'),
    numbered('Digite seu e-mail e senha cadastrados'),
    numbered('Clique em Entrar'),
    numbered('Você será redirecionado automaticamente para /admin/dashboard'),
    new Paragraph({ spacing: { after: 120 } }),
    noteBox('Atenção: Se você for redirecionado para o dashboard de aluno, sua conta não tem role = admin. Veja a seção Troubleshooting ao final deste manual.'),

    heading2('1.2 Estrutura do Painel Admin'),
    para('O menu lateral esquerdo contém:'),
    bullet('Dashboard — Visão geral e estatísticas'),
    bullet('Grupos — Turmas e equipes'),
    bullet('Alunos — Lista de alunos cadastrados'),
    bullet('Módulos — Questionários personalizados'),
    bullet('Sessões — Avaliações públicas via WhatsApp (módulo principal)'),
    bullet('Relatórios — Análise de grupos'),
    bullet('Configurações — Perfil e integrações de IA'),

    pageBreak(),

    heading1('2. Configurar Chave de API do Google Gemini'),
    noteBox('Passo obrigatório para que as análises de IA funcionem. A chave gratuita do servidor pode esgotar — use a sua própria.'),
    numbered('Acesse Configurações no menu lateral'),
    numbered('Role até a seção Integrações de IA'),
    numbered('No campo Chave de API, cole sua chave do Google AI Studio'),
    para('A chave começa com AIza... — obtenha gratuitamente em: https://aistudio.google.com/apikey'),
    numbered('Clique em Salvar'),
    new Paragraph({ spacing: { after: 120 } }),
    para('A chave é salva localmente no seu navegador e no banco de dados da plataforma. Ela será usada automaticamente em todas as análises de IA que você gerar.'),
    noteBox('Segurança: A chave nunca é enviada para o avaliado nem aparece no relatório do aluno.'),

    pageBreak(),

    heading1('3. Módulo de Sessões — Fluxo Completo'),
    para('O módulo de Sessões é o coração do ProfileAI para uso externo. Permite avaliar pessoas sem que precisem criar conta no sistema — ideal para workshops, processos seletivos, treinamentos e dinâmicas de equipe.'),

    heading2('3.1 Criar uma Sessão'),
    numbered('No menu lateral, clique em Sessões'),
    numbered('Clique em Nova Sessão'),
    numbered('Preencha: Nome da sessão e Descrição (opcional)'),
    numbered('Confirme a criação'),

    heading2('3.2 Adicionar Avaliados'),
    numbered('Dentro da sessão criada, clique em Adicionar Avaliado'),
    numbered('Preencha: Nome completo (obrigatório), Telefone (obrigatório), E-mail (opcional)'),
    numbered('Clique em Adicionar'),
    new Paragraph({ spacing: { after: 120 } }),
    para('O sistema gera automaticamente um token único por avaliado. Esse token identifica o avaliado sem exigir login e compõe o link público de avaliação.'),

    heading2('3.3 Enviar Link de Avaliação por WhatsApp'),
    numbered('Localize o avaliado na lista da sessão'),
    numbered('Clique no botão 📤 WhatsApp ao lado do nome'),
    numbered('Uma janela do WhatsApp abrirá com a mensagem pré-formatada'),
    numbered('Selecione o contato e envie'),

    heading2('3.4 Acompanhar Status em Tempo Real'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Status', 'Cor', 'Significado'],
      [
        ['Pendente', 'Cinza', 'Link enviado, avaliado ainda não iniciou'],
        ['Em Andamento', 'Amarelo', 'Avaliado abriu o link e está respondendo'],
        ['Concluído', 'Verde', 'Avaliação finalizada com sucesso'],
      ],
      [2000, 2000, 5000]
    ),

    heading2('3.5 Visualizar Resultado e Gerar Análise IA'),
    para('Quando o status do avaliado for Concluído, dois botões aparecem:'),
    new Paragraph({ spacing: { after: 120 } }),
    new Paragraph({ children: [bold('Botão 👁 (Modal de Análise):')], spacing: { after: 80 } }),
    numbered('Clique no ícone 👁 no card do avaliado'),
    numbered('O modal abre com duas abas:'),
    para('• Aba Admin: perfil DISC, análise IA completa (insight, forças, carreiras, desafios), indicadores de bem-estar internos'),
    para('• Aba Aluno: prévia da mensagem WhatsApp que será enviada (sem dados clínicos)'),
    numbered('Clique em Liberar para Aluno para enviar via WhatsApp'),
    new Paragraph({ spacing: { after: 120 } }),
    new Paragraph({ children: [bold('Botão 📄 (Relatório Oficial):')], spacing: { after: 80 } }),
    para('Abre o Relatório Oficial em tela cheia — ver seção 4 deste manual.'),

    pageBreak(),

    heading1('4. Relatório Oficial — Documento Legal'),
    para('O Relatório Oficial é um documento de identificação única destinado a uso profissional e, quando necessário, em processos periciais ou solicitações oficiais.'),

    heading2('4.1 Acessar o Relatório'),
    bullet('Clique no botão 📄 no card do avaliado (sessão)'),
    bullet('Ou acesse diretamente: /admin/relatorio/:token'),

    heading2('4.2 Estrutura do Documento'),
    new Paragraph({ children: [bold('§ 1 — Identificação')], spacing: { before: 160, after: 80 } }),
    bullet('Nome do avaliado, telefone, e-mail'),
    bullet('Nome da sessão, data da avaliação'),
    bullet('ID do Documento: DISC-2026-XXXXXXXX (único e rastreável)'),

    new Paragraph({ children: [bold('§ 2 — Perfil DISC')], spacing: { before: 160, after: 80 } }),
    bullet('Gráfico de barras com as 4 dimensões (D, I, S, C)'),
    bullet('Tabela oficial com valores absolutos e percentuais'),
    bullet('Interpretação dos perfis dominante e secundário'),

    new Paragraph({ children: [bold('§ 3 — Análise por Inteligência Artificial')], spacing: { before: 160, after: 80 } }),
    bullet('Insight narrativo do perfil'),
    bullet('Forças identificadas'),
    bullet('Áreas de desenvolvimento'),
    bullet('Carreiras e posições sugeridas'),
    bullet('Estilo de comunicação recomendado'),

    new Paragraph({ children: [bold('§ 4 — Indicadores de Bem-Estar (exclusivo admin — não impresso)')], spacing: { before: 160, after: 80 } }),
    bullet('Nível de atenção: Nenhum / Observar / Suporte Sugerido'),
    bullet('Nota interna discreta (quando aplicável)'),
    bullet('Disclaimer ético: análise não diagnóstica'),

    new Paragraph({ children: [bold('§ 5 — Observações do Instrutor')], spacing: { before: 160, after: 80 } }),
    bullet('Campo de texto livre para o admin registrar observações'),
    bullet('Incluído na impressão/PDF'),

    new Paragraph({ children: [bold('Rodapé Legal')], spacing: { before: 160, after: 80 } }),
    bullet('Conformidade LGPD (Lei 13.709/2018)'),
    bullet('Aviso de uso em processos periciais/policiais quando solicitado'),
    bullet('Assinatura digital do admin (nome e e-mail)'),

    heading2('4.3 Gerar Análise IA no Relatório'),
    numbered('Clique em 🤖 Gerar Análise IA na barra de controles'),
    numbered('Aguarde (~5–15 segundos)'),
    numbered('As seções § 3 são preenchidas automaticamente'),
    noteBox('Se aparecer mensagem sobre cota esgotada, acesse Configurações → Integrações de IA e insira sua chave do Google AI Studio.'),

    heading2('4.4 Imprimir / Exportar como PDF'),
    numbered('Clique em 🖨️ Imprimir / PDF na barra de controles'),
    numbered('A janela de impressão do navegador abre'),
    numbered('Para salvar como PDF: selecione "Destino: Salvar como PDF" no Chrome/Edge'),
    numbered('O documento é formatado automaticamente para A4 na impressão'),
    noteBox('Controles da tela e indicadores clínicos (§ 4) são automaticamente ocultados no PDF impresso.'),

    pageBreak(),

    // PARTE 2 — ALUNO
    new Paragraph({
      children: [new TextRun({ text: 'PARTE 2 — GUIA DO ALUNO', bold: true, size: 32, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    }),

    heading1('5. Cadastro e Primeiro Acesso'),
    heading2('5.1 Cadastro via Convite'),
    numbered('Receba o link de convite do admin (https://profileai.netlify.app/join/TOKEN)'),
    numbered('Acesse o link'),
    numbered('Preencha: nome completo, e-mail, senha (mínimo 8 caracteres)'),
    numbered('Clique em Criar Conta'),
    numbered('Você será direcionado automaticamente para o dashboard'),

    heading1('6. Responder à Avaliação DISC'),
    numbered('No dashboard, clique em Iniciar Avaliação'),
    numbered('O wizard guia você pelas 28 perguntas (escala 1–5)'),
    numbered('Ao responder todas as perguntas, o resultado é calculado automaticamente'),
    numbered('Seu perfil DISC é exibido e salvo'),

    heading1('7. Avaliação Pública (Via WhatsApp — Sem Login)'),
    numbered('Toque no link recebido no WhatsApp: https://profileai.netlify.app/avaliacao/TOKEN'),
    numbered('A página abre com seu nome pré-carregado'),
    numbered('Responda as 28 perguntas do questionário DISC'),
    numbered('Clique em Finalizar Avaliação'),
    numbered('Você é automaticamente redirecionado para ver seu resultado'),

    heading1('8. Página de Resultado Público'),
    para('Após finalizar, você acessa sua página de resultado em /resultado/:token, que exibe:'),
    bullet('Banner do perfil dominante (D, I, S ou C)'),
    bullet('Gráfico DISC com barras animadas'),
    bullet('Insight narrativo do perfil (gerado por IA)'),
    bullet('Forças comportamentais identificadas'),
    bullet('Carreiras e posições sugeridas'),
    bullet('Áreas para desenvolvimento'),
    bullet('Estilo de comunicação ideal'),
    noteBox('A página pode ser salva como favorito para consulta futura. O link é único para você.'),

    pageBreak(),

    // Referência DISC
    new Paragraph({
      children: [new TextRun({ text: 'PARTE 3 — REFERÊNCIA DISC', bold: true, size: 32, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    }),

    heading1('9. Os 4 Perfis DISC'),
    new Paragraph({ spacing: { after: 160 } }),
    tableFromRows(
      ['Perfil', 'Nome', 'Características', 'Motivação'],
      [
        ['D', 'Dominante', 'Direto, decisivo, orientado a resultados', 'Desafios, conquistas, autonomia'],
        ['I', 'Influente', 'Comunicativo, entusiasta, persuasivo', 'Reconhecimento, interação social'],
        ['S', 'Estável', 'Paciente, confiável, empático, leal', 'Segurança, harmonia, relacionamentos'],
        ['C', 'Consciente', 'Analítico, preciso, meticuloso', 'Exatidão, expertise, qualidade'],
      ],
      [500, 1500, 4000, 3000]
    ),

    pageBreak(),

    // Troubleshooting
    new Paragraph({
      children: [new TextRun({ text: 'PARTE 4 — TROUBLESHOOTING', bold: true, size: 32, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 },
    }),

    heading1('10. Problemas Comuns e Soluções'),

    heading2('"Fui redirecionado para o dashboard de aluno sendo admin"'),
    para('Sua conta não tem role = admin no banco de dados.'),
    para('Solução — Execute no Supabase SQL Editor:'),
    codeBlock("UPDATE app_users SET role = 'admin' WHERE email = 'seu@email.com';"),
    para('Depois faça logout e login novamente.'),

    heading2('"Erro ao gerar análise IA / Cota da API esgotada"'),
    numbered('Obtenha sua chave gratuita em https://aistudio.google.com/apikey'),
    numbered('Acesse Configurações → Integrações de IA'),
    numbered('Cole a chave no campo e salve'),

    heading2('"Link de convite expirado ou inválido"'),
    para('Tokens expiram após 7 dias e são de uso único. Gere um novo link no painel do grupo.'),

    heading2('"O relatório não imprime corretamente"'),
    numbered('Use Google Chrome ou Microsoft Edge para melhor compatibilidade'),
    numbered('Na janela de impressão, selecione Papel A4 e Margens: padrão'),
    numbered('Para PDF: selecione Destino: Salvar como PDF'),
    numbered('Marque Imprimir plano de fundo nas configurações avançadas'),

    divider(),

    // Rodapé
    footerPara('ProfileAI © 2026 — AmbFusi AI / Vianexx AI'),
    footerPara(`Manual elaborado por Breno Luis · Versão 2.0 · ${today}`),
  ];

  return new Document({
    numbering: {
      config: [
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          run: { bold: true, size: 32, color: '1F2937' },
          paragraph: { spacing: { before: 480, after: 160 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          run: { bold: true, size: 26, color: '374151' },
          paragraph: { spacing: { before: 320, after: 120 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          run: { bold: true, size: 24, color: '4B5563' },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
          },
        },
        footers: {
          default: new Footer({
            children: [footerPara('ProfileAI © 2026 — AmbFusi AI | Manual de Uso v2.0')],
          }),
        },
        children,
      },
    ],
  });
}

// ─── PRD ─────────────────────────────────────────────────────────────────────

function buildPRD() {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const children = [
    // Capa
    new Paragraph({
      children: [new TextRun({ text: 'ProfileAI', bold: true, size: 72, color: '6366F1' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1440, after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Documento de Requisitos de Produto (PRD)', bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Versão 2.0 · Maio 2026 · CONFIDENCIAL', size: 24, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Breno Luis — AmbFusi AI / Vianexx AI', size: 22, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1440 },
    }),
    divider(),

    heading1('1. Visão Geral do Produto'),
    para('ProfileAI é uma plataforma SaaS de avaliação comportamental baseada no modelo DISC. Administradores (instrutores, coaches, RH) criam sessões de avaliação, enviam links públicos via WhatsApp sem exigir login dos avaliados, acompanham resultados em tempo real, geram relatórios oficiais com rastreabilidade legal (LGPD / uso pericial) e obtêm análises enriquecidas por IA (Google Gemini).'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Atributo', 'Valor'],
      [
        ['Plataforma', 'PWA web (mobile-first), Vite + React, deploy Netlify'],
        ['Backend', 'Supabase (REST API + Edge Functions Deno)'],
        ['IA', 'Google Gemini 2.0 Flash'],
        ['Idioma', 'PT-BR (Português do Brasil)'],
        ['Papéis', 'Admin | Aluno (Student)'],
      ],
      [2500, 6500]
    ),

    pageBreak(),

    heading1('2. Objetivos de Negócio'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['#', 'Objetivo', 'Métrica de Sucesso'],
      [
        ['1', 'Simplificar avaliação comportamental para instrutores', 'Tempo de criação de sessão < 2 min'],
        ['2', 'Maximizar taxa de resposta dos avaliados', 'Link público sem cadastro; acesso em 1 clique'],
        ['3', 'Fornecer insights profissionais acionáveis', 'Relatório oficial gerado em < 30 s'],
        ['4', 'Garantir rastreabilidade legal dos dados', 'Documento com ID único + LGPD compliance'],
        ['5', 'Reduzir custo de IA', 'Admin usa própria chave Gemini (zero custo no servidor)'],
      ],
      [500, 4500, 4000]
    ),

    pageBreak(),

    heading1('3. Arquitetura Técnica'),
    heading2('3.1 Stack'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Camada', 'Tecnologia'],
      [
        ['Frontend', 'React 18, Vite 5, TailwindCSS 3, React Router v6'],
        ['Estado', 'Zustand 4 (authStore, profileStore, groupStore, assessmentStore, sessaoStore)'],
        ['Backend', 'Supabase REST API (via fetch em src/firebase/)'],
        ['Auth', 'Supabase Auth (email/senha)'],
        ['Edge Functions', 'Deno (Supabase Functions) — IA e lógica server-side'],
        ['IA', 'Google Gemini 2.0 Flash (generativelanguage.googleapis.com/v1beta)'],
        ['Charts', 'Recharts 2'],
      ],
      [2500, 6500]
    ),

    heading2('3.2 Fluxo de Chave de API'),
    para('Admin → Settings → Integrações de IA → digita chave Google AI Studio'),
    para('↓'),
    para('localStorage(profileai_api_key) + Supabase settings table'),
    para('↓'),
    para('functions.js: callFunction() → injeta { geminiKey } em todas as chamadas de IA'),
    para('↓'),
    para('Edge Function recebe geminiKey → usa como Authorization para Gemini API'),
    para('↓'),
    para('Fallback: GEMINI_API_KEY (env var do servidor) se geminiKey não fornecida'),

    pageBreak(),

    heading1('4. Módulos Funcionais'),

    heading2('4.1 Autenticação'),
    bullet('Login / Cadastro / Recuperação de senha via Supabase Auth'),
    bullet('Redirecionamento automático por role (admin → /admin/dashboard, aluno → /student/dashboard)'),
    bullet('Proteção de rotas via ProtectedRoute + Zustand authStore'),

    heading2('4.2 Sessões Públicas (Módulo Principal)'),
    bullet('Admin cria sessão e adiciona avaliados (nome + telefone obrigatórios)'),
    bullet('Sistema gera token único por avaliado'),
    bullet('Admin envia link via WhatsApp: https://dominio.com/avaliacao/:token'),
    bullet('Avaliado responde sem criar conta'),
    bullet('Status atualiza em tempo real: pending → in_progress → completed'),
    bullet('Admin aciona IA diretamente no painel'),

    heading2('4.3 Resultado Público (/resultado/:token)'),
    bullet('Página pública sem login para o avaliado ver seu perfil'),
    bullet('Carrega dados via buscarPorToken'),
    bullet('Auto-chama insightPerfil para análise enriquecida'),
    bullet('Exibe: banner, barras DISC animadas, forças, desenvolvimento, carreiras'),
    bullet('Não exibe nenhum dado clínico ou de bem-estar'),

    heading2('4.4 Relatório Oficial (/admin/relatorio/:token)'),
    bullet('Documento oficial com ID único: DISC-{ANO}-{8 hex chars do token}'),
    bullet('Protegido: requer role admin'),
    bullet('§ 1 Identificação, § 2 Perfil DISC, § 3 Análise IA, § 4 Indicadores (admin only), § 5 Observações'),
    bullet('Botões: Gerar IA, Verificar Indicadores, WhatsApp (link limpo), Imprimir/PDF'),
    bullet('CSS @media print: A4, indicadores clínicos omitidos, assinatura do admin'),
    bullet('Rodapé legal: LGPD art. 7° e 11°, uso pericial/policial, assinatura'),

    heading2('4.5 IA — Edge Functions'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Função', 'Input', 'Output'],
      [
        ['insightPerfil', '{ perfil, nome, geminiKey? }', '{ insight, forcas, desafios, carreiras, comunicacao, desenvolvimento }'],
        ['therapyFlag', '{ profileData, answers?, geminiKey? }', '{ flagged, level, note }'],
        ['buildProfile', '{ answers, geminiKey? }', 'Perfil DISC completo'],
        ['buscarPorToken', '{ token }', '{ nome, status, sessaoid, perfil }'],
        ['atualizarStatus', '{ token, status, perfil? }', 'Confirmação'],
      ],
      [2000, 3000, 4000]
    ),

    pageBreak(),

    heading1('5. Segurança e Privacidade'),

    heading2('5.1 LGPD (Lei 13.709/2018)'),
    bullet('Dados coletados com finalidade explícita (desenvolvimento profissional)'),
    bullet('Acesso a dados sensíveis restrito ao admin responsável'),
    bullet('Indicadores de bem-estar (§ 4) são de uso exclusivamente interno'),
    bullet('Não há diagnósticos clínicos — apenas indicadores de atenção para suporte'),
    bullet('Rodapé de conformidade LGPD em todos os relatórios oficiais'),

    heading2('5.2 Rastreabilidade Legal'),
    bullet('Cada relatório tem ID único: DISC-{ANO}-{8-hex-chars-do-token}'),
    bullet('Token derivado do UUID do avaliado — imutável e auditável no banco'),
    bullet('Documento válido para processos periciais e solicitações de autoridade'),
    bullet('Assinatura digital do admin (nome/email) em cada documento'),

    heading2('5.3 Chave de API'),
    bullet('Chave Gemini do admin nunca é exposta ao avaliado'),
    bullet('Armazenada no localStorage + sincronizada no Supabase settings'),
    bullet('Nunca exposta em respostas públicas das Edge Functions'),

    pageBreak(),

    heading1('6. Rotas da Aplicação'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Rota', 'Acesso', 'Componente'],
      [
        ['/', 'Público', 'RootRedirect'],
        ['/login', 'Público', 'Login'],
        ['/register', 'Público', 'Register'],
        ['/avaliacao/:token', 'Público (sem login)', 'AvaliacaoPublica'],
        ['/resultado/:token', 'Público (sem login)', 'ResultadoPublico'],
        ['/admin/dashboard', 'Admin', 'AdminDashboard'],
        ['/admin/sessoes', 'Admin', 'Sessoes'],
        ['/admin/relatorio/:token', 'Admin', 'RelatorioOficial'],
        ['/admin/settings', 'Admin', 'Settings'],
        ['/student/dashboard', 'Aluno', 'StudentDashboard'],
        ['/student/profile', 'Aluno', 'MyProfile'],
      ],
      [3000, 2000, 4000]
    ),

    pageBreak(),

    heading1('7. Design System'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Token', 'Valor', 'Uso'],
      [
        ['bg-primary', '#0F1117', 'Background global'],
        ['bg-card', '#1A1D2E', 'Cards e painéis'],
        ['accent', '#6366F1', 'Botões primários, destaques, links'],
        ['text-primary', '#F7F8FC', 'Texto principal'],
        ['text-muted', '#A0A3B1', 'Texto secundário e placeholders'],
        ['success', '#22C55E', 'Status OK, nível none'],
        ['warning', '#F59E0B', 'Avisos, nível watch/suggest'],
        ['error', '#EF4444', 'Erros críticos'],
      ],
      [2000, 2000, 5000]
    ),

    pageBreak(),

    heading1('8. Histórico de Versões'),
    new Paragraph({ spacing: { after: 120 } }),
    tableFromRows(
      ['Versão', 'Data', 'Mudanças Principais'],
      [
        ['1.0', 'Mai 2026', 'DISC wizard, grupos, convites, sessões básicas'],
        ['1.1', 'Mai 2026', 'Auditoria autônoma — documentação de arquitetura'],
        ['2.0', 'Mai 2026', 'Google Gemini, insightPerfil, therapyFlag com chave do usuário, RelatorioOficial (ID único + LGPD), ResultadoPublico, configuração de API key, erros humanizados'],
      ],
      [1000, 1500, 6500]
    ),

    divider(),
    footerPara('ProfileAI © 2026 — AmbFusi AI / Vianexx AI'),
    footerPara(`PRD elaborado por Breno Luis · Versão 2.0 · ${today} · CONFIDENCIAL`),
  ];

  return new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
          },
        },
        footers: {
          default: new Footer({
            children: [footerPara('ProfileAI © 2026 — AmbFusi AI | PRD v2.0 — CONFIDENCIAL')],
          }),
        },
        children,
      },
    ],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(DOCS_DIR, { recursive: true });

  console.log('📄 Gerando MANUAL_ProfileAI_v2.docx...');
  const manual = buildManual();
  const manualBuffer = await Packer.toBuffer(manual);
  writeFileSync(join(DOCS_DIR, 'MANUAL_ProfileAI_v2.docx'), manualBuffer);
  console.log('   ✅ docs/MANUAL_ProfileAI_v2.docx gerado com sucesso!');

  console.log('📋 Gerando PRD_ProfileAI_v2.docx...');
  const prd = buildPRD();
  const prdBuffer = await Packer.toBuffer(prd);
  writeFileSync(join(DOCS_DIR, 'PRD_ProfileAI_v2.docx'), prdBuffer);
  console.log('   ✅ docs/PRD_ProfileAI_v2.docx gerado com sucesso!');

  console.log('\n🎉 Documentos gerados em: ' + DOCS_DIR);
}

main().catch((err) => {
  console.error('❌ Erro ao gerar documentos:', err);
  process.exit(1);
});
