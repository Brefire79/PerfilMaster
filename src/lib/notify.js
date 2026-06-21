/**
 * notify.js — som + notificação do navegador para o PWA (com o app ABERTO).
 *
 * Sem dependências e sem assets de áudio: o "som" é um ding curto gerado via
 * Web Audio. A notificação usa a Notification API (via Service Worker quando
 * disponível, mais confiável no PWA instalado). Push com o app FECHADO exige
 * Web Push (VAPID) + backend — fora do escopo desta fase.
 *
 * Tudo aqui é best-effort e silencioso em caso de falha (áudio bloqueado por
 * autoplay, permissão negada, API ausente): nunca lança.
 */

let _ctx = null;
function audioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
  return _ctx;
}

/** Toca um "ding" curto (duas notas). Silencioso se o áudio estiver bloqueado. */
export function playBeep() {
  try {
    const ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    /* áudio indisponível */
  }
}

export function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function notificationPermission() {
  return notificationSupported() ? Notification.permission : 'unsupported';
}

/** Pede permissão (precisa de gesto do usuário). Retorna o status resultante. */
export async function requestNotificationPermission() {
  if (!notificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

/**
 * Mostra uma notificação do SO (só com permissão concedida). Prefere o Service
 * Worker (PWA instalado); cai para a Notification direta. Retorna true se exibiu.
 */
export async function showOsNotification({ title, body, tag, url } = {}) {
  if (notificationPermission() !== 'granted') return false;
  const options = {
    body,
    tag,
    renotify: !!tag,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: url || '/' },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
