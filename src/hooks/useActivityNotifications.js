/**
 * useActivityNotifications — avisos proativos (som + notificação) com o app
 * ABERTO. Faz polling leve das avaliações e dos alunos do facilitador e dispara
 * notificação quando há NOVO evento desde a última checagem:
 *   • avaliação/teste concluído  (pref: assessmentComplete)
 *   • novo membro/cadastro       (pref: newMember)
 *
 * Estratégia anti-spam:
 *   • snapshot por usuário em localStorage; na 1ª carga só estabelece baseline
 *     (não notifica eventos pré-existentes);
 *   • 1 notificação-resumo por categoria por ciclo (com contagem);
 *   • com a aba visível → toast in-app; com a aba oculta → notificação do SO.
 *
 * Respeita as preferências de `app_users.notifications` e o toggle de som.
 * É montado no AdminLayout (rota só-admin). Tudo best-effort/silencioso.
 */
import { useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore.js';
import { getAvaliadosByAdmin, getStudentsByAdmin, getUser } from '@/firebase/firestore.js';
import { playBeep, showOsNotification } from '@/lib/notify.js';
import { useToast } from '@/context/ToastContext.jsx';

const POLL_MS = 60_000;

function snapKey(uid) {
  return `pm.notif.snap.${uid}`;
}
function loadSnapshot(uid) {
  try {
    return JSON.parse(localStorage.getItem(snapKey(uid)) || 'null');
  } catch {
    return null;
  }
}
function saveSnapshot(uid, snap) {
  try {
    localStorage.setItem(snapKey(uid), JSON.stringify(snap));
  } catch {
    /* storage cheio/indisponível */
  }
}

export default function useActivityNotifications() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const toast = useToast();
  const prefsRef = useRef({ assessmentComplete: true, newMember: true, sound: true });
  const uid = user?.uid;

  // Carrega as preferências de notificação do facilitador (uma vez por sessão).
  useEffect(() => {
    if (!uid || role !== 'admin') return;
    getUser(uid)
      .then((doc) => {
        const n = doc?.notifications;
        if (n && typeof n === 'object') {
          prefsRef.current = {
            assessmentComplete: n.assessmentComplete !== false,
            newMember: n.newMember !== false,
            sound: n.sound !== false,
          };
        }
      })
      .catch(() => {});
  }, [uid, role]);

  useEffect(() => {
    if (!uid || role !== 'admin') return;
    let cancelled = false;
    let timer;

    const disparar = ({ titulo, corpo, tag }) => {
      const prefs = prefsRef.current;
      if (prefs.sound) playBeep();
      if (typeof document !== 'undefined' && document.hidden) {
        showOsNotification({ title: titulo, body: corpo, tag, url: '/admin/central' });
      } else {
        try { toast.info(`${titulo} — ${corpo}`, 6000); } catch { /* sem provider */ }
      }
    };

    const checar = async () => {
      try {
        const [avaliados, alunos] = await Promise.all([
          getAvaliadosByAdmin(uid).catch(() => []),
          getStudentsByAdmin(uid).catch(() => []),
        ]);
        if (cancelled) return;

        const concluidos = avaliados
          .filter((a) => a?.status === 'concluido')
          .map((a) => String(a.token || a.id));
        const membros = alunos.map((s) => String(s.uid || s.id)).filter(Boolean);

        const snap = loadSnapshot(uid);
        // 1ª carga: estabelece baseline silenciosamente (sem notificar histórico).
        if (!snap) {
          saveSnapshot(uid, { concluidos, membros });
          return;
        }

        const novosConcluidos = concluidos.filter((id) => !snap.concluidos.includes(id));
        const novosMembros = membros.filter((id) => !snap.membros.includes(id));

        if (prefsRef.current.assessmentComplete && novosConcluidos.length > 0) {
          const n = novosConcluidos.length;
          let nome = '';
          if (n === 1) {
            const a = avaliados.find((x) => String(x.token || x.id) === novosConcluidos[0]);
            nome = a?.nome || a?.displayName || a?.email || '';
          }
          disparar({
            titulo: n === 1 ? 'Avaliação concluída' : `${n} avaliações concluídas`,
            corpo: n === 1 ? (nome ? `${nome} finalizou a avaliação.` : 'Uma avaliação foi finalizada.') : 'Veja os resultados na Central.',
            tag: 'pm-assessment',
          });
        }

        if (prefsRef.current.newMember && novosMembros.length > 0) {
          const n = novosMembros.length;
          let nome = '';
          if (n === 1) {
            const s = alunos.find((x) => String(x.uid || x.id) === novosMembros[0]);
            nome = s?.displayName || s?.name || s?.email || '';
          }
          disparar({
            titulo: n === 1 ? 'Novo cadastro' : `${n} novos cadastros`,
            corpo: n === 1 ? (nome ? `${nome} entrou.` : 'Um novo aluno entrou.') : 'Novos alunos vinculados a você.',
            tag: 'pm-member',
          });
        }

        saveSnapshot(uid, { concluidos, membros });
      } catch {
        /* rede/back-off silencioso */
      }
    };

    checar();
    timer = setInterval(checar, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [uid, role, toast]);
}
