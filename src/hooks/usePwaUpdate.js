/**
 * usePwaUpdate — detecta nova versão do app via /version.json e oferece reload.
 *
 * Estratégia híbrida (NÃO conflita com vite-plugin-pwa):
 *  - O Workbox (vite-plugin-pwa) já cuida de registrar e atualizar o SW automaticamente
 *  - Este hook apenas COMPARA a versão local (embutida no bundle) com /version.json (servido pelo Netlify)
 *  - Quando há diferença, mostra um banner; ao aceitar, força reload com cache-bust
 *
 * O reload garante que:
 *  1. O SW novo (já instalado pelo Workbox em background) seja ativado
 *  2. O HTML/JS novos sejam baixados (não o cache)
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchComTimeout } from '@/firebase/http.js';

// Versão "embutida" no bundle. Trocada a cada build pelo bump-version.mjs.
// Precisa bater com public/version.json.
const APP_VERSION = '1.0.56';
const CHECK_INTERVAL_MS = 60_000; // 1 minuto

async function fetchRemoteVersion() {
  try {
    // Cache-bust manual com query string + headers para garantir frescor
    const url = `/version.json?t=${Date.now()}`;
    // C1: prazo curto — é uma checagem de fundo a cada minuto; se demorar,
    // desiste em silêncio e tenta no próximo ciclo (nunca trava a UI).
    const res = await fetchComTimeout(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    }, 5000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteInfo, setRemoteInfo] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let intervalId;
    let cancelled = false;

    async function check() {
      const remote = await fetchRemoteVersion();
      if (cancelled || !remote?.version) return;

      if (remote.version !== APP_VERSION) {
        setRemoteInfo(remote);
        setUpdateAvailable(true);

        // Pede pro browser checar atualização do SW (não bloqueia)
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            await reg?.update();
          } catch {
            /* silencioso */
          }
        }
      }
    }

    // Checa imediatamente ao montar
    check();

    // Re-checa quando a aba volta a ficar visível
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Polling periódico
    intervalId = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Aplica o update: limpa caches do SW + reload forçado
  const applyUpdate = useCallback(async () => {
    try {
      // Tenta ativar o SW novo (waiting) — se houver
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }

      // Limpa caches do navegador relacionados ao app (Workbox precaches)
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) {
      console.warn('[PWA] applyUpdate cleanup falhou:', err);
    } finally {
      // Reload com cache-bust na URL para garantir HTML/JS novos
      // Sempre usa pathname limpo + ? para evitar URLs inválidas como /rota&_v=
      window.location.replace(`${window.location.pathname}?_v=${Date.now()}`);
    }
  }, []);

  return {
    updateAvailable,
    currentVersion: APP_VERSION,
    remoteVersion: remoteInfo?.version || null,
    notes: remoteInfo?.notes || null,
    buildDate: remoteInfo?.buildDate || null,
    applyUpdate,
  };
}
