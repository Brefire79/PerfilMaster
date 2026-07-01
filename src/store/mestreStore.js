import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Chave do localStorage — limpa no logout (authStore.clearUser), então o
// contexto da conversa sobrevive a navegação/reload mas não vaza entre contas.
export const MESTRE_CHAT_KEY = 'profileai.mestre.chat';

const MAX_MENSAGENS = 80;

/**
 * mestreStore — estado do chat flutuante do Mestre.
 * mensagens: [{ autor:'user'|'ia', texto, dados?, queryUsada?, modo?, pergunta? }]
 */
const useMestreStore = create(
  persist(
    (set) => ({
      aberto: false,
      mensagens: [],

      abrir: () => set({ aberto: true }),
      fechar: () => set({ aberto: false }),
      alternar: () => set((s) => ({ aberto: !s.aberto })),

      addMensagem: (msg) =>
        set((s) => ({ mensagens: [...s.mensagens, msg].slice(-MAX_MENSAGENS) })),

      limparConversa: () => set({ mensagens: [] }),
    }),
    {
      name: MESTRE_CHAT_KEY,
      // Persiste a conversa e o estado aberto/fechado (contexto até o logout).
      partialize: (s) => ({ aberto: s.aberto, mensagens: s.mensagens }),
    }
  )
);

export default useMestreStore;
