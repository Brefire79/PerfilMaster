import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const documents = {
  '/privacidade': {
    title: 'Política de Privacidade',
    updated: '10 de julho de 2026',
    sections: [
      ['Quem somos', 'O Perfil Master é uma plataforma da Vianexx AI para avaliações comportamentais DISC e PQ/Sabotadores, utilizada por facilitadores, coaches, instrutores e profissionais de RH.'],
      ['Dados tratados', 'Podemos tratar nome, e-mail, telefone, respostas da avaliação, resultados comportamentais, vínculo com grupos e, quando fornecido com consentimento, CPF. Dados técnicos mínimos também podem ser processados para autenticação, segurança e diagnóstico de falhas.'],
      ['Finalidades', 'Os dados são usados para autenticar usuários, aplicar avaliações, calcular perfis, gerar relatórios, permitir acompanhamento pelo facilitador responsável, proteger a plataforma contra abuso e cumprir obrigações legais.'],
      ['Base legal e consentimento', 'O tratamento ocorre conforme execução do serviço, legítimo interesse, cumprimento de obrigação legal e consentimento quando exigido. O CPF é opcional e depende de consentimento específico.'],
      ['Compartilhamento', 'A infraestrutura utiliza Supabase e Netlify. A IA DeepSeek recebe somente os dados necessários à geração de análises, por chamadas server-side. Chaves e credenciais nunca são enviadas ao navegador. Não vendemos dados pessoais.'],
      ['Segurança e retenção', 'Aplicamos isolamento por facilitador, Row Level Security, funções server-side e registros de auditoria. Os dados são mantidos enquanto necessários ao serviço ou às obrigações aplicáveis.'],
      ['Direitos do titular', 'Você pode solicitar confirmação, acesso, correção, portabilidade, anonimização, revogação de consentimento e exclusão. Contas administrativas com dados de terceiros exigem tratamento assistido para evitar perda indevida.'],
      ['Contato', 'Solicitações de privacidade devem ser encaminhadas ao facilitador responsável ou ao canal oficial de suporte informado na ficha do aplicativo. Antes da publicação nas lojas, a Vianexx AI definirá um e-mail público exclusivo de privacidade.'],
    ],
  },
  '/termos': {
    title: 'Termos de Uso',
    updated: '10 de julho de 2026',
    sections: [
      ['Objeto', 'O Perfil Master fornece ferramentas de avaliação comportamental, organização de grupos, relatórios e apoio ao desenvolvimento pessoal e profissional.'],
      ['Uso adequado', 'O usuário deve fornecer informações verdadeiras, proteger suas credenciais, respeitar a privacidade dos avaliados e usar os relatórios de maneira ética e compatível com a legislação.'],
      ['Limites da avaliação', 'Os resultados são instrumentos de autoconhecimento e desenvolvimento. Não constituem diagnóstico médico, psicológico ou psiquiátrico e não devem ser usados isoladamente para decisões clínicas, demissões ou discriminação.'],
      ['Responsabilidade do facilitador', 'O facilitador é responsável por possuir base legal para cadastrar participantes, explicar a finalidade da avaliação, controlar o acesso aos relatórios e atender solicitações dos titulares.'],
      ['Disponibilidade', 'Buscamos manter o serviço estável e seguro, mas manutenções, integrações externas ou eventos fora do controle podem causar indisponibilidade temporária.'],
      ['Propriedade intelectual', 'Marca, interface, textos, motores e materiais do Perfil Master pertencem à Vianexx AI ou aos respectivos licenciantes.'],
      ['Encerramento', 'O uso indevido pode resultar em suspensão. A exclusão de contas com dados de terceiros pode exigir procedimento assistido para preservar obrigações e direitos de outras pessoas.'],
    ],
  },
  '/suporte': {
    title: 'Suporte e ajuda',
    updated: '10 de julho de 2026',
    sections: [
      ['Acesso', 'Se você recebeu uma avaliação por WhatsApp, use exatamente o link enviado pelo facilitador. Alunos com conta devem usar o e-mail cadastrado.'],
      ['Senha', 'O facilitador pode gerar um link seguro de definição ou recuperação de senha para envio por WhatsApp. O link é de uso único.'],
      ['Avaliação interrompida', 'No fluxo público, as respostas são preservadas no aparelho durante o preenchimento. Abra novamente o mesmo link para continuar.'],
      ['Resultado e relatório', 'O resultado público apresenta uma visão resumida. O relatório oficial e as orientações completas ficam com o facilitador responsável.'],
      ['Contato', 'Procure primeiro o facilitador que enviou seu convite ou avaliação. Para publicação nas lojas, será disponibilizado nesta página o e-mail público de suporte da Vianexx AI.'],
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const document = documents[pathname] || documents['/suporte'];

  return (
    <main className="min-h-screen bg-[#0F1117] text-[#F7F8FC] px-5 py-10">
      <article className="mx-auto max-w-3xl">
        <Link to="/login" className="text-sm text-[#818CF8] hover:text-[#A5B4FC]">← Voltar ao Perfil Master</Link>
        <h1 className="mt-6 text-3xl font-heading font-bold">{document.title}</h1>
        <p className="mt-2 text-sm text-[#A0A3B1]">Última atualização: {document.updated}</p>
        <div className="mt-8 space-y-7">
          {document.sections.map(([title, body]) => (
            <section key={title} className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#C7C9D4]">{body}</p>
            </section>
          ))}
        </div>
        <nav className="mt-8 flex flex-wrap gap-4 border-t border-[#2D3047] pt-6 text-sm">
          <Link className="text-[#818CF8]" to="/privacidade">Privacidade</Link>
          <Link className="text-[#818CF8]" to="/termos">Termos</Link>
          <Link className="text-[#818CF8]" to="/suporte">Suporte</Link>
        </nav>
      </article>
    </main>
  );
}
