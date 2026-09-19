import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import PhoneInput from '@/components/ui/PhoneInput.jsx';
import { validateInviteToken, consumeInviteAvulso, consumeInvite } from '@/firebase/functions.js';
import useAuthStore from '@/store/authStore.js';
import { isBackendDown, mensagemDeRede } from '@/firebase/http.js';
import { reportClientError } from '@/lib/clientErrors.js';
import { resumoJanela } from '@/lib/janela.js';

// DELTA 22 — porta de entrada do link /join/:token.
//
// Convite de EMPRESA (grupo, com vagas) oferece duas portas:
//   • "Tenho e-mail"  → /register?token= (conta; fluxo clássico + Google)
//   • "Não tenho e-mail" → nome + celular → consumeInviteAvulso → /avaliacao/:token
//     (avaliado de sessão do grupo, sem conta — o relatório fica atrelado à empresa)
// Convite pessoal (e-mail), avulso sem grupo ou de admin: vai direto ao cadastro,
// como sempre foi.

const MENSAGENS = {
  used: 'Este convite já foi utilizado.',
  expired: 'Este convite expirou. Peça um novo a quem enviou o link.',
  paused: 'Este convite está pausado. Fale com quem enviou o link.',
  closed: 'Este convite foi encerrado.',
  full: 'As vagas deste convite se esgotaram. Fale com quem enviou o link.',
  not_found: 'Convite não encontrado. Confira o link recebido.',
};

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#0F1117] flex flex-col">
      <header className="py-4 px-5 border-b border-[#1E2030] flex items-center justify-center">
        <h1 className="text-base font-heading font-bold text-[#F7F8FC]">
          Perfil <span className="text-[#6366F1]">Master</span>
        </h1>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

function Aviso({ titulo, texto }) {
  return (
    <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-6 text-center space-y-2">
      <div className="mx-auto w-12 h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] text-xl">!</div>
      <h2 className="text-lg font-heading font-bold text-[#F7F8FC]">{titulo}</h2>
      <p className="text-sm text-[#A0A3B1]">{texto}</p>
    </div>
  );
}

export default function JoinConvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  // Quem já tem conta (ex.: fez uma avaliação antes) entra na turma com ela —
  // /register recusaria a sessão ativa e a pessoa cairia no painel sem vínculo.
  const { user, role, initialized } = useAuthStore();
  const logado = initialized && !!user;
  const [estado, setEstado] = useState({ tela: 'carregando' }); // carregando | invalido | escolha | avulso | entrando
  const [convite, setConvite] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroServidor, setErroServidor] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }
    let cancelado = false;
    (async () => {
      try {
        const res = await validateInviteToken({ token });
        if (cancelado) return;
        if (!res?.valid) {
          setEstado({ tela: 'invalido', mensagem: MENSAGENS[res?.reason] || 'Link inválido ou expirado.' });
          return;
        }
        // Sem a porta "sem e-mail" não há escolha a fazer — segue direto ao cadastro.
        if (!res.avulsoDisponivel) {
          navigate(`/register?token=${encodeURIComponent(token)}`, { replace: true });
          return;
        }
        setConvite(res);
        setEstado({ tela: 'escolha' });
      } catch (err) {
        if (cancelado) return;
        // not_found vem como 404 → callFunction lança; o corpo ainda traz { valid:false, reason }
        const corpo = err?.details;
        if (corpo && corpo.valid === false) {
          setEstado({ tela: 'invalido', mensagem: MENSAGENS[corpo.reason] || 'Link inválido ou expirado.' });
          return;
        }
        reportClientError(err, { source: 'join/validar' });
        setEstado({
          tela: 'invalido',
          mensagem: isBackendDown(err) ? mensagemDeRede(err) : 'Não foi possível validar o convite. Confira o link e sua conexão.',
        });
      }
    })();
    return () => { cancelado = true; };
  }, [token, navigate]);

  const validar = () => {
    const e = {};
    if (form.nome.trim().length < 2) e.nome = 'Informe seu nome.';
    const digitos = form.telefone.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 13) e.telefone = 'Informe um celular válido com DDD.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const entrarComConta = async () => {
    if (enviando) return;
    setEnviando(true);
    setErroServidor('');
    try {
      await consumeInvite({ token, userData: { displayName: user?.displayName, email: user?.email } });
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      reportClientError(err, { source: 'join/conta' });
      const code = err?.code || '';
      const motivo = code.startsWith('invite/') ? code.slice(7) : null;
      setErroServidor(isBackendDown(err) ? mensagemDeRede(err) : (MENSAGENS[motivo] || err?.message || 'Não foi possível entrar na turma.'));
    } finally {
      setEnviando(false);
    }
  };

  const entrarSemEmail = async () => {
    if (enviando || !validar()) return;
    setEnviando(true);
    setErroServidor('');
    try {
      const res = await consumeInviteAvulso({ token, nome: form.nome.trim(), telefone: form.telefone });
      if (!res?.avaliadoToken) throw new Error('Resposta inesperada do servidor.');
      // Entrou → já cai na avaliação (a tela de abertura tem o botão Iniciar).
      navigate(`/avaliacao/${res.avaliadoToken}`, { replace: true });
    } catch (err) {
      reportClientError(err, { source: 'join/avulso' });
      const code = err?.code || '';
      const motivo = code.startsWith('invite/') ? code.slice(7) : null;
      setErroServidor(
        isBackendDown(err) ? mensagemDeRede(err)
          : (MENSAGENS[motivo] || err?.message || 'Não foi possível concluir. Tente novamente.'),
      );
    } finally {
      setEnviando(false);
    }
  };

  if (estado.tela === 'carregando') {
    return (
      <Shell>
        <p className="text-center text-sm text-[#A0A3B1]">Validando seu convite…</p>
      </Shell>
    );
  }

  if (estado.tela === 'invalido') {
    return <Shell><Aviso titulo="Convite indisponível" texto={estado.mensagem} /></Shell>;
  }

  const nomeConvite = convite?.label || convite?.groupName || 'Avaliação comportamental';
  const vagas = convite?.vagasRestantes;

  return (
    <Shell>
      <div className="space-y-5 animate-fade-in">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6366F1]">Você foi convidado(a)</p>
          <h2 className="text-2xl font-heading font-bold text-[#F7F8FC]">{nomeConvite}</h2>
          {convite?.adminName && (
            <p className="text-sm text-[#A0A3B1]">Facilitador: {convite.adminName}</p>
          )}
          {typeof vagas === 'number' && (
            <p className="text-xs text-[#A0A3B1]">
              {vagas === 1 ? 'Resta 1 vaga' : `Restam ${vagas} vagas`}
            </p>
          )}
          {convite?.janela && (
            <p className="text-xs text-[#6366F1] mt-1">
              Avaliação: {resumoJanela(convite.janela.inicio, convite.janela.fim).replace(/^Abre em/, 'abre em').replace(/^Aberta/, 'aberta').replace(/^Encerrada/, 'encerrada')}
            </p>
          )}
        </div>

        {estado.tela === 'escolha' && (
          <div className="space-y-3">
            {logado && role === 'admin' && (
              <p className="text-sm text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl px-3 py-2">
                Você está logado como facilitador. Para testar como participante, abra o link numa aba anônima ou em outro aparelho.
              </p>
            )}
            {logado && role !== 'admin' ? (
              <button
                type="button"
                disabled={enviando}
                onClick={entrarComConta}
                className="w-full text-left bg-[#1A1D2E] border border-[#6366F1] rounded-2xl p-5 transition-colors disabled:opacity-60"
              >
                <p className="text-base font-semibold text-[#F7F8FC]">Entrar nesta turma com minha conta</p>
                <p className="text-sm text-[#A0A3B1] mt-1">
                  Você já está logado como {user?.email || user?.displayName}. Sua conta passa a fazer parte desta turma.
                </p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/register?token=${encodeURIComponent(token)}`)}
                className="w-full text-left bg-[#1A1D2E] border border-[#2D3047] hover:border-[#6366F1] rounded-2xl p-5 transition-colors"
              >
                <p className="text-base font-semibold text-[#F7F8FC]">Tenho e-mail — criar minha conta</p>
                <p className="text-sm text-[#A0A3B1] mt-1">
                  Com conta você acompanha seu perfil no app e pode entrar com Google. Recomendado.
                </p>
              </button>
            )}
            {erroServidor && (
              <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl px-3 py-2">{erroServidor}</p>
            )}
            <button
              type="button"
              onClick={() => setEstado({ tela: 'avulso' })}
              className="w-full text-left bg-[#1A1D2E] border border-[#2D3047] hover:border-[#6366F1] rounded-2xl p-5 transition-colors"
            >
              <p className="text-base font-semibold text-[#F7F8FC]">Não tenho e-mail — responder pelo celular</p>
              <p className="text-sm text-[#A0A3B1] mt-1">
                Só nome e celular. A avaliação abre em seguida e o resultado fica com o facilitador.
              </p>
            </button>
          </div>
        )}

        {estado.tela === 'avulso' && (
          <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-5 space-y-4">
            <Input
              label="Seu nome"
              placeholder="Nome e sobrenome"
              value={form.nome}
              onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setErros((x) => ({ ...x, nome: '' })); }}
              error={erros.nome}
              autoComplete="name"
            />
            <PhoneInput
              label="Celular (WhatsApp)"
              value={form.telefone}
              onChange={(v) => { setForm((f) => ({ ...f, telefone: v })); setErros((x) => ({ ...x, telefone: '' })); }}
              error={erros.telefone}
              required
            />
            {erroServidor && (
              <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl px-3 py-2">{erroServidor}</p>
            )}
            <Button variant="primary" size="lg" fullWidth onClick={entrarSemEmail} loading={enviando}>
              Começar a avaliação
            </Button>
            <button
              type="button"
              onClick={() => { setEstado({ tela: 'escolha' }); setErroServidor(''); }}
              className="w-full text-sm text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}

        <p className="text-center text-xs text-[#6B7280]">
          Respostas confidenciais · 15 a 20 minutos · sem certo ou errado
        </p>
      </div>
    </Shell>
  );
}
