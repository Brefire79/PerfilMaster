import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyOAuthCallback, takePendingInviteToken, signOut } from '@/firebase/auth.js';
import { getUser } from '@/firebase/firestore.js';
import { consumeInvite } from '@/firebase/functions.js';
import { isBackendDown, mensagemDeRede } from '@/firebase/http.js';
import { reportClientError } from '@/lib/clientErrors.js';
import useAuthStore from '@/store/authStore.js';
import Button from '@/components/ui/Button.jsx';
import DiscMark from '@/components/brand/DiscMark.jsx';

/**
 * /auth/callback — volta do login com Google (DELTA 21).
 *
 * Ordem de decisão, sempre no servidor:
 *   1. A conta já tem linha em app_users → entra no painel certo.
 *   2. Não tem, mas veio de /register?token= (token guardado antes do redirect)
 *      → consumeInvite({ token }).
 *   3. Não tem token, mas o facilitador registrou o e-mail no convite → o
 *      trigger do banco já criou app_users no primeiro login; se a conta no Auth
 *      é antiga (sem app_users), consumeInvite({ byEmail: true }) resolve.
 *   4. Nada disso → desloga e explica que o acesso é por convite.
 *
 * Fora do AlreadyAuthRoute de propósito: enquanto decidimos, a sessão já existe
 * e o redirect automático levaria um convidado sem convite ao painel de aluno.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [estado, setEstado] = useState({ tela: 'processando', mensagem: '' });

  useEffect(() => {
    document.title = 'Entrando… — Perfil Master';
    let cancelado = false;

    (async () => {
      try {
        const user = await applyOAuthCallback(window.location.hash);
        // Limpa os tokens da URL (não deixa access_token no histórico do navegador)
        window.history.replaceState(null, '', '/auth/callback');

        let doc = await getUser(user.uid).catch((err) => {
          if (isBackendDown(err)) throw err;
          return null;
        });

        if (!doc) {
          const token = takePendingInviteToken();
          const userData = { displayName: user.displayName, email: user.email };
          try {
            await consumeInvite(token ? { token, userData } : { byEmail: true, userData });
            doc = await getUser(user.uid);
          } catch (err) {
            if (isBackendDown(err)) throw err;
            await signOut().catch(() => {});
            if (!cancelado) {
              setEstado({
                tela: 'sem_convite',
                mensagem: err?.message || 'Esta conta Google não tem convite ativo.',
              });
            }
            return;
          }
        }

        const role = doc?.role || 'student';
        setUser({ ...user, displayName: user.displayName || doc?.displayName || null }, role);
        if (!cancelado) navigate(role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true });
      } catch (err) {
        reportClientError(err, { source: 'auth/oauth-callback' });
        if (!cancelado) {
          setEstado({
            tela: 'erro',
            mensagem: isBackendDown(err) ? mensagemDeRede(err) : (err?.message || 'Não foi possível concluir o login.'),
          });
        }
      }
    })();

    return () => { cancelado = true; document.title = 'Perfil Master'; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (estado.tela === 'processando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
        <div className="flex flex-col items-center gap-4">
          <DiscMark size={56} />
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <p className="text-[#A0A3B1] text-sm">Confirmando sua conta Google…</p>
        </div>
      </div>
    );
  }

  const semConvite = estado.tela === 'sem_convite';
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117] px-4">
      <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} className="w-7 h-7">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-heading font-bold text-[#F7F8FC] mb-2">
          {semConvite ? 'Esta conta ainda não tem convite' : 'Não foi possível entrar'}
        </h1>
        <p className="text-sm text-[#A0A3B1] mb-6">
          {semConvite
            ? 'O Perfil Master funciona por convite. Peça ao seu facilitador um link de convite ou que registre o e-mail desta conta Google — depois é só entrar de novo.'
            : estado.mensagem}
        </p>
        <Link to="/login">
          <Button variant="secondary" fullWidth>Voltar ao login</Button>
        </Link>
      </div>
    </div>
  );
}
