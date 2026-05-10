import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  criarSessao,
  criarAvaliado,
  subscribeToSessoes,
  subscribeToAvaliados,
  encerrarSessao,
  deleteAvaliado,
} from '@/firebase/firestore.js';

const APP_URL = 'https://profileai.netlify.app';

function montarMensagemWhatsApp(nome, token) {
  const link = `${APP_URL}/avaliacao/${token}`;
  return (
    `Olá, ${nome}! 👋\n\n` +
    `Você foi convidado(a) para realizar uma avaliação de perfil comportamental DISC — Dominante · Influente · Estável · Analítico.\n\n` +
    `Acesse o link abaixo para começar:\n${link}\n\n` +
    `⏱️ Tempo estimado: 10–15 minutos.\n` +
    `📊 Seus resultados são confidenciais.\n\n` +
    `Qualquer dúvida, fique à vontade para perguntar!`
  );
}

function gerarLinkWhatsApp(telefone, nome, token) {
  // Remove tudo que não for dígito
  const numero = telefone.replace(/\D/g, '');
  const mensagem = montarMensagemWhatsApp(nome, token);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

const useSessaoStore = create(
  devtools(
    (set, get) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      sessoes: [],
      avaliadosBySessao: {},  // sessaoId → Avaliado[]
      sessaoAtiva: null,      // sessao selecionada no painel
      loading: false,
      loadingAvaliados: false,
      erro: null,

      // Unsubscribe handles dos listeners em tempo real
      _unsubSessoes: null,
      _unsubAvaliados: null,

      // ─── Ações de sessão ──────────────────────────────────────────────────

      iniciarListenerSessoes(adminUid) {
        const { _unsubSessoes } = get();
        if (_unsubSessoes) _unsubSessoes();

        const unsub = subscribeToSessoes(adminUid, (sessoes) => {
          set({ sessoes }, false, 'sessao/setLista');
        });
        set({ _unsubSessoes: unsub }, false, 'sessao/initListener');
      },

      pararListenerSessoes() {
        const { _unsubSessoes } = get();
        if (_unsubSessoes) {
          _unsubSessoes();
          set({ _unsubSessoes: null }, false, 'sessao/stopListener');
        }
      },

      async criarNovaSessao(adminUid, dados) {
        set({ loading: true, erro: null }, false, 'sessao/criando');
        try {
          const id = await criarSessao(adminUid, dados);
          set({ loading: false }, false, 'sessao/criado');
          return id;
        } catch (e) {
          set({ loading: false, erro: e.message }, false, 'sessao/erro');
          throw e;
        }
      },

      async encerrarSessaoAtiva(sessaoId) {
        set({ loading: true, erro: null }, false, 'sessao/encerrando');
        try {
          await encerrarSessao(sessaoId);
          set({ loading: false }, false, 'sessao/encerrado');
        } catch (e) {
          set({ loading: false, erro: e.message }, false, 'sessao/erro');
          throw e;
        }
      },

      selecionarSessao(sessao) {
        const { _unsubAvaliados } = get();
        if (_unsubAvaliados) _unsubAvaliados();

        set({ sessaoAtiva: sessao, loadingAvaliados: true }, false, 'sessao/selecionada');

        if (!sessao) {
          set({ loadingAvaliados: false }, false, 'sessao/deselecionada');
          return;
        }

        const unsub = subscribeToAvaliados(sessao.id, (avaliados) => {
          set(
            (state) => ({
              avaliadosBySessao: { ...state.avaliadosBySessao, [sessao.id]: avaliados },
              loadingAvaliados: false,
            }),
            false,
            'sessao/avaliados'
          );
        });

        set({ _unsubAvaliados: unsub }, false, 'sessao/initAvaliadosListener');
      },

      // ─── Ações de avaliado ────────────────────────────────────────────────

      async cadastrarAvaliado(adminUid, sessaoId, dados) {
        set({ loading: true, erro: null }, false, 'avaliado/cadastrando');
        try {
          const token = await criarAvaliado(adminUid, sessaoId, dados);
          set({ loading: false }, false, 'avaliado/cadastrado');
          return token;
        } catch (e) {
          set({ loading: false, erro: e.message }, false, 'avaliado/erro');
          throw e;
        }
      },

      async removerAvaliado(sessaoId, avaliadoId) {
        set({ erro: null }, false, 'avaliado/removendo');
        try {
          await deleteAvaliado(avaliadoId);
          set(
            (state) => ({
              avaliadosBySessao: {
                ...state.avaliadosBySessao,
                [sessaoId]: (state.avaliadosBySessao[sessaoId] || []).filter(
                  (a) => a.id !== avaliadoId
                ),
              },
            }),
            false,
            'avaliado/removido'
          );
        } catch (e) {
          set({ erro: e.message }, false, 'avaliado/erro');
          throw e;
        }
      },

      // ─── Helpers de WhatsApp ──────────────────────────────────────────────

      getLinkWhatsApp(avaliado) {
        return gerarLinkWhatsApp(avaliado.telefone, avaliado.nome, avaliado.token);
      },

      getLinkAvaliacao(token) {
        return `${APP_URL}/avaliacao/${token}`;
      },

      limparErro() {
        set({ erro: null }, false, 'sessao/limparErro');
      },
    }),
    { name: 'SessaoStore' }
  )
);

export default useSessaoStore;
