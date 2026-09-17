import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DiscMark from '@/components/brand/DiscMark.jsx';
import { linkDeContato, CONTATO_EXTERNO } from '@/constants/landing.js';

// Landing pública do Perfil Master (rota "/" para quem não está logado).
// Sem depoimentos, números de clientes ou empresas: tudo aqui é descrição do
// produto ou dado de exemplo marcado como fictício.

const CORES = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };

// Perfil de exemplo do hero — valores inventados, sinalizados na UI.
const EXEMPLO = [
  { k: 'D', nome: 'Dominante', valor: 71 },
  { k: 'I', nome: 'Influente', valor: 46 },
  { k: 'S', nome: 'Estável', valor: 38 },
  { k: 'C', nome: 'Analítico', valor: 84 },
];

const PASSOS = [
  {
    titulo: 'Crie o grupo ou a pessoa',
    texto: 'Cadastre a turma, o mentorado ou apenas o nome de quem vai responder. Não é preciso que a pessoa tenha conta.',
  },
  {
    titulo: 'Envie o link pelo WhatsApp',
    texto: 'Cada avaliado recebe um link único. Ele responde as 78 questões no celular, no seu tempo, e pode retomar de onde parou.',
  },
  {
    titulo: 'Receba o perfil pronto',
    texto: 'DISC e PQ/Sabotadores calculados no servidor, relatório oficial para você e um resumo para quem respondeu.',
  },
];

const MODOS = [
  {
    cor: CORES.C,
    titulo: 'Grupos e turmas',
    texto: 'Convide alunos por link, acompanhe quem já concluiu e compare o perfil coletivo com agregados anonimizados.',
  },
  {
    cor: CORES.I,
    titulo: 'Atendimento individual',
    texto: 'Mentorado ou coachee com conta própria, histórico de avaliações e evolução ao longo do processo.',
  },
  {
    cor: CORES.S,
    titulo: 'Avaliação avulsa',
    texto: 'Sem cadastro: o link no WhatsApp é a credencial. Ideal para triagens, workshops e primeiros contatos.',
  },
];

const RECURSOS = [
  ['DISC + PQ/Sabotadores em uma só aplicação', '28 questões DISC e 50 de Sabotadores, todas em escala de 5 pontos, com pontuação calculada no servidor.'],
  ['Relatório oficial do facilitador', 'Perfil, gráficos, sabotadores predominantes e espaço para a sua observação. Exportável em PDF.'],
  ['Análise assistida por IA', 'Um texto de leitura do perfil gerado a partir dos resultados, para apoiar a conversa de devolutiva.'],
  ['Inteligência de grupos', 'Distribuição de perfis e médias por turma, com supressão automática de grupos pequenos.'],
  ['Convites e senhas sem e-mail', 'Links de convite e de redefinição de senha prontos para enviar pelo WhatsApp.'],
  ['Funciona no celular', 'Interface pensada para a tela do telefone, onde o avaliado realmente responde.'],
];

const FAQ = [
  ['O Perfil Master faz diagnóstico psicológico?', 'Não. DISC e Sabotadores são instrumentos de autoconhecimento e desenvolvimento. Os resultados não constituem diagnóstico clínico e não devem ser a única base para decisões de contratação ou desligamento.'],
  ['Quem responde precisa criar conta?', 'Não. Na avaliação avulsa o link enviado por WhatsApp é a credencial. Contas são opcionais e servem para acompanhar a pessoa ao longo do tempo.'],
  ['Quem vê os dados dos meus avaliados?', 'Só você. Cada facilitador enxerga apenas os próprios grupos, alunos e avaliações. Não existe visão cruzada entre facilitadores.'],
  ['A IA recebe dados pessoais?', 'A análise é gerada no servidor a partir das pontuações. Chaves de IA nunca vão para o navegador e nada é vendido a terceiros.'],
  ['Como começo?', 'O acesso de facilitador é liberado pela Vianexx. Fale com a gente pelo botão desta página e mostramos a plataforma com dados de exemplo.'],
];

function Cta({ primario = true, className = '', children }) {
  const href = linkDeContato();
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]';
  const estilo = primario
    ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-glow-sm'
    : 'border border-[#2D3047] bg-[#1A1D2E] text-[#F7F8FC] hover:border-[#6366F1]';
  if (CONTATO_EXTERNO) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${estilo} ${className}`}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={`${base} ${estilo} ${className}`}>
      {children}
    </Link>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="font-mono text-2xs uppercase tracking-[0.2em] text-[#818CF8]">{children}</p>
  );
}

// Assinatura do hero: mensagem de WhatsApp → resultado. É o mecanismo real do
// produto (link único → perfil calculado), com dados fictícios.
function DemoFluxo() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisivel(true), 250);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="Exemplo do fluxo: link no WhatsApp e resultado do perfil">
      <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4 shadow-card">
        <div className="flex items-center gap-2 text-2xs font-mono uppercase tracking-widest text-[#A0A3B1]">
          <span className="h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
          Mensagem enviada
        </div>
        <div className="mt-3 rounded-2xl rounded-tl-sm bg-[#242736] px-4 py-3 text-sm leading-6 text-[#F7F8FC]">
          Oi, Ana! Aqui está a sua avaliação. Leva uns 15 minutos e você pode pausar quando quiser:
          <span className="mt-1 block font-mono text-xs text-[#818CF8] break-all">perfilmaster.netlify.app/avaliacao/…</span>
        </div>
      </div>

      <div className="my-3 flex justify-center" aria-hidden="true">
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none" className="text-[#2D3047]">
          <path d="M10 0v24M3 18l7 7 7-7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div className={`rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-5 shadow-card transition-opacity duration-500 ${visivel ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-base font-bold">Perfil de Ana</p>
            <p className="text-xs text-[#A0A3B1]">Analítico com Dominante · 78 respostas</p>
          </div>
          <span className="rounded-full border border-[#2D3047] px-2 py-0.5 font-mono text-2xs uppercase tracking-widest text-[#A0A3B1]">exemplo fictício</span>
        </div>

        <div className="mt-5 space-y-3">
          {EXEMPLO.map(({ k, nome, valor }, i) => (
            <div key={k} className="score-row">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F7F8FC]">{nome}</span>
                <span className="font-mono text-[#A0A3B1]">{valor}</span>
              </div>
              <div className="score-track">
                {visivel && (
                  <div
                    className={`score-fill score-fill--${k}`}
                    style={{ width: `${valor}%`, animationDelay: `${i * 90}ms` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-[#2D3047] bg-[#0F1117] px-4 py-3">
          <div>
            <p className="text-xs text-[#A0A3B1]">PQ Score</p>
            <p className="font-heading text-2xl font-extrabold">62</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#A0A3B1]">Sabotadores em destaque</p>
            <p className="text-sm">Hiper-realizador · Controlador</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = 'Perfil Master — avaliação DISC + Sabotadores pelo WhatsApp';
    return () => { document.title = 'Perfil Master'; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#F7F8FC]">
      {/* Atmosfera — mesma da AuthLayout, para o login parecer continuação */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-[#EF4444] opacity-[0.06] blur-3xl" />
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-[#F59E0B] opacity-[0.05] blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#22C55E] opacity-[0.05] blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6366F1] opacity-[0.07] blur-3xl" />
      </div>

      <header className="relative">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6" aria-label="Principal">
          <Link to="/" className="flex items-center gap-2.5">
            <DiscMark size={34} glow={false} />
            <span className="font-heading text-lg font-bold tracking-tight">Perfil Master</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="#como-funciona" className="hidden text-sm text-[#A0A3B1] hover:text-[#F7F8FC] sm:inline">Como funciona</a>
            <a href="#seguranca" className="hidden text-sm text-[#A0A3B1] hover:text-[#F7F8FC] sm:inline">Segurança</a>
            <a href="#faq" className="hidden text-sm text-[#A0A3B1] hover:text-[#F7F8FC] sm:inline">Perguntas</a>
            <Link
              to="/login"
              className="rounded-xl border border-[#2D3047] px-4 py-2 text-sm font-medium text-[#F7F8FC] hover:border-[#6366F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
            >
              Entrar
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="animate-slide-up">
            <Eyebrow>Para coaches, mentores, instrutores e RH</Eyebrow>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A avaliação vai pelo WhatsApp.
              <br />
              <span className="text-[#818CF8]">O perfil volta pronto.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#A0A3B1] sm:text-lg">
              DISC e PQ/Sabotadores em uma única aplicação de 78 questões. Você envia um link, a pessoa responde no celular e o relatório aparece no seu painel — sem planilha, sem formulário solto, sem esperar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Cta>Solicitar demonstração</Cta>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-xl border border-[#2D3047] bg-[#1A1D2E] px-5 py-3 text-sm font-semibold hover:border-[#6366F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              >
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-[#A0A3B1]">Acesso de facilitador liberado pela Vianexx AI. Já tem conta? <Link to="/login" className="text-[#818CF8] hover:text-[#A5B4FC]">Entrar</Link>.</p>
          </div>
          <div className="animate-scale-in">
            <DemoFluxo />
          </div>
        </section>

        {/* Problema */}
        <section className="border-y border-[#2D3047] bg-[#1A1D2E]/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {[
              ['Respostas espalhadas', 'Formulário aqui, planilha ali, resultado calculado à mão. Cada turma vira um projeto.'],
              ['Devolutiva atrasada', 'O relatório chega dias depois, quando a conversa com a pessoa já esfriou.'],
              ['Dados sem dono', 'Avaliações de várias pessoas em ferramentas genéricas, sem controle de quem vê o quê.'],
            ].map(([t, d]) => (
              <div key={t}>
                <h2 className="font-heading text-lg font-bold">{t}</h2>
                <p className="mt-2 text-sm leading-6 text-[#A0A3B1]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona — sequência real, por isso numerada */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Três passos entre o convite e a devolutiva</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-6">
                <span className="font-mono text-sm text-[#818CF8]">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-heading text-lg font-bold">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-[#A0A3B1]">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Modos de atendimento */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Eyebrow>Formas de aplicar</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Turma, atendimento individual ou uma única pessoa</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {MODOS.map((m) => (
              <article key={m.titulo} className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-6">
                <span className="block h-1.5 w-10 rounded-full" style={{ background: m.cor }} aria-hidden="true" />
                <h3 className="mt-4 font-heading text-lg font-bold">{m.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-[#A0A3B1]">{m.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Recursos */}
        <section className="border-y border-[#2D3047] bg-[#1A1D2E]/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Eyebrow>O que vem na plataforma</Eyebrow>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map(([t, d]) => (
                <div key={t} className="border-l-2 border-[#2D3047] pl-4">
                  <h3 className="font-heading text-base font-bold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#A0A3B1]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Segurança e limites */}
        <section id="seguranca" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <Eyebrow>Privacidade e LGPD</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Cada facilitador vê só o que é seu</h2>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[#A0A3B1]">
              <li>Isolamento por facilitador no banco de dados: seus grupos e avaliados não aparecem para ninguém mais.</li>
              <li>O link público nunca expõe telefone ou CPF. CPF é opcional e só com consentimento explícito.</li>
              <li>Trilha de auditoria de quem convidou, quem concluiu e quem abriu cada histórico.</li>
              <li>Chaves de IA ficam no servidor. O navegador nunca as recebe.</li>
            </ul>
            <p className="mt-6 text-sm">
              <Link to="/privacidade" className="text-[#818CF8] hover:text-[#A5B4FC]">Política de privacidade</Link>
              <span className="mx-2 text-[#2D3047]">·</span>
              <Link to="/termos" className="text-[#818CF8] hover:text-[#A5B4FC]">Termos de uso</Link>
            </p>
          </div>
          <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-6">
            <h3 className="font-heading text-lg font-bold">O que o Perfil Master não é</h3>
            <p className="mt-3 text-sm leading-6 text-[#A0A3B1]">
              Não é diagnóstico psicológico, laudo clínico nem teste de admissão. DISC e Sabotadores descrevem tendências de comportamento para apoiar conversas de desenvolvimento. A leitura do resultado é sua, facilitador — a plataforma organiza, calcula e apresenta.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-[#2D3047]">
          <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
            <Eyebrow>Perguntas frequentes</Eyebrow>
            <div className="mt-6 divide-y divide-[#2D3047]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] rounded">
                    {q}
                    <span className="text-[#818CF8] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[#A0A3B1]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-3xl border border-[#2D3047] bg-gradient-to-br from-[#1A1D2E] to-[#0F1117] p-8 text-center sm:p-12">
            <DiscMark size={48} className="mx-auto" />
            <h2 className="mt-5 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Veja a plataforma com dados de exemplo</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#A0A3B1] sm:text-base">
              Uma conversa curta para entender como você aplica avaliações hoje e mostrar o Perfil Master funcionando.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Cta>Solicitar demonstração</Cta>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[#2D3047] bg-[#1A1D2E] px-5 py-3 text-sm font-semibold hover:border-[#6366F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              >
                Já tenho acesso
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-[#2D3047]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-[#A0A3B1] sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Perfil Master · Vianexx AI</p>
          <nav className="flex gap-5" aria-label="Legal">
            <Link to="/privacidade" className="hover:text-[#F7F8FC]">Privacidade</Link>
            <Link to="/termos" className="hover:text-[#F7F8FC]">Termos</Link>
            <Link to="/suporte" className="hover:text-[#F7F8FC]">Suporte</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
