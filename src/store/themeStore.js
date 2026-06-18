import { create } from 'zustand';

// Tema claro/escuro. O app é dark-first; o tema claro é aplicado via classe
// `light` no <html> (ver overrides em index.css). Persistido em localStorage.
const STORAGE_KEY = 'pm-theme';

function lerInicial() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === 'light' || salvo === 'dark') return salvo;
  } catch { /* ignore */ }
  return 'dark';
}

function aplicar(tema) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('light', tema === 'light');
}

const temaInicial = lerInicial();
// Aplica imediatamente no carregamento do módulo (evita flash do tema errado)
aplicar(temaInicial);

const useThemeStore = create((set, get) => ({
  theme: temaInicial,
  setTheme: (tema) => {
    try { localStorage.setItem(STORAGE_KEY, tema); } catch { /* ignore */ }
    aplicar(tema);
    set({ theme: tema });
  },
  toggle: () => {
    const proximo = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(proximo);
  },
}));

export default useThemeStore;
