import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyRecoverySession, verifyRecoveryToken, changePassword, signOut } from '@/firebase/auth.js';
import Button from '@/components/ui/Button.jsx';

// Lê os tokens do hash do link de recuperação (#access_token=...&type=recovery).
function lerHashRecuperacao() {
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  const p = new URLSearchParams(hash);
  return {
    accessToken: p.get('access_token'),
    refreshToken: p.get('refresh_token'),
    type: p.get('type'),
    errorDescription: p.get('error_description'),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [fase, setFase] = useState('verificando'); // verificando | pronto | invalido | salvo
  const [erro, setErro] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    document.title = 'Definir nova senha — Perfil Master';
    return () => { document.title = 'Perfil Master'; };
  }, []);

  useEffect(() => {
    const limparUrl = () => window.history.replaceState(null, '', window.location.pathname);
    const { accessToken, refreshToken, type, errorDescription } = lerHashRecuperacao();
    if (errorDescription) {
      setErro(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      setFase('invalido');
      return;
    }

    // Fluxo robusto (não consumido por preview do WhatsApp): link traz
    // ?token_hash=...&type=recovery e a troca por sessão acontece só agora.
    const query = new URLSearchParams(window.location.search);
    const tokenHash = query.get('token_hash');
    if (tokenHash && query.get('type') === 'recovery') {
      verifyRecoveryToken(tokenHash)
        .then(() => { limparUrl(); setFase('pronto'); })
        .catch(() => setFase('invalido'));
      return;
    }

    // Fluxo legado: tokens vêm no hash (#access_token=...&type=recovery).
    if (!accessToken || type !== 'recovery') {
      setFase('invalido');
      return;
    }
    applyRecoverySession(accessToken, refreshToken)
      .then(() => { limparUrl(); setFase('pronto'); })
      .catch(() => setFase('invalido'));
  }, []);

  const salvar = async () => {
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (senha !== confirma) { setErro('As senhas não conferem.'); return; }
    setSalvando(true);
    try {
      await changePassword('', senha);
      // Encerra a sessão de recuperação e manda para o login com a nova senha.
      await signOut().catch(() => {});
      setFase('salvo');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (e) {
      setErro(e?.message || 'Não foi possível atualizar a senha. Solicite um novo link.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117] px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6366F1] shadow-[0_0_32px_rgba(99,102,241,0.4)] mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">Definir nova senha</h1>
        </div>

        <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {fase === 'verificando' && (
            <div className="text-center py-6 text-[#A0A3B1] text-sm">Validando o link de recuperação…</div>
          )}

          {fase === 'invalido' && (
            <div className="text-center py-4">
              <p className="text-[#EF4444] font-medium mb-2">Link inválido ou expirado</p>
              <p className="text-[#A0A3B1] text-sm mb-6">
                {erro || 'Solicite um novo link de recuperação de senha.'}
              </p>
              <Link to="/forgot-password">
                <Button variant="secondary" fullWidth>Solicitar novo link</Button>
              </Link>
            </div>
          )}

          {fase === 'pronto' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A0A3B1] mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0F1117] border border-[#2D3047] rounded-xl px-4 py-3 text-sm text-[#F7F8FC] placeholder-[#6B6F80] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#A0A3B1] mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }}
                  placeholder="Repita a senha"
                  className="w-full bg-[#0F1117] border border-[#2D3047] rounded-xl px-4 py-3 text-sm text-[#F7F8FC] placeholder-[#6B6F80] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              {erro && <p className="text-[#EF4444] text-sm">{erro}</p>}
              <Button onClick={salvar} fullWidth disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </div>
          )}

          {fase === 'salvo' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/25 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-7 h-7">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[#F7F8FC] font-heading font-semibold mb-1">Senha atualizada!</p>
              <p className="text-[#A0A3B1] text-sm">Redirecionando para o login…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
