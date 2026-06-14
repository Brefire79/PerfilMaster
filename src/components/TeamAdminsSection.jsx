/**
 * TeamAdminsSection — convidar profissionais como administradores e gerenciá-los.
 * DELTA 12: admin independente (workspace próprio). Promoção/revogação via Edge
 * Functions com service_role (o trigger protege o app). Escopo: só os admins
 * que ESTE admin convidou (invitedby).
 */
import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { generateInviteLink, manageTeamAdmins } from '@/firebase/functions.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';
import Button from '@/components/ui/Button.jsx';

function fmtData(d) {
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '—'; }
}

export default function TeamAdminsSection() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busyUid, setBusyUid] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await manageTeamAdmins({ action: 'list' });
      setAdmins(Array.isArray(res?.admins) ? res.admins : []);
    } catch (err) {
      setError(err?.message || 'Falha ao carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setCopied(false);
    try {
      const res = await generateInviteLink({ role: 'admin', baseUrl: getPublicBaseUrl(), expiryDays: 7 });
      setInviteUrl(res?.inviteUrl || '');
    } catch (err) {
      setError(err?.message || 'Falha ao gerar o convite de administrador.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard indisponível */ }
  };

  const whatsappUrl = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `Olá! 👋\n\nVocê foi convidado(a) para acessar o *Perfil Master* como administrador.\n\nCadastre-se pelo link abaixo (válido por 7 dias):\n${inviteUrl}`
      )}`
    : null;

  const setRole = async (uid, role) => {
    setBusyUid(uid);
    setError('');
    try {
      await manageTeamAdmins({ action: 'setRole', targetUid: uid, role });
      await load();
    } catch (err) {
      setError(err?.message || 'Falha ao atualizar o acesso.');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Gerar convite */}
      <div className="rounded-xl border border-[#2D3047] p-4">
        <p className="text-sm font-medium text-[#F7F8FC]">Convidar profissional como administrador</p>
        <p className="text-xs text-[#A0A3B1] mt-0.5">
          O convidado cria a conta pelo link e já entra como <strong>administrador independente</strong>
          {' '}(com o próprio espaço — não acessa os seus grupos/alunos).
        </p>

        {!inviteUrl ? (
          <Button variant="primary" size="sm" className="mt-3" onClick={handleGenerate} loading={generating}>
            Gerar link de convite de admin
          </Button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 p-2.5 bg-[#1A1D2E] rounded-lg border border-[#2D3047]">
              <span className="text-xs text-[#A0A3B1] truncate flex-1 font-mono">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className={clsx(
                  'flex-shrink-0 h-7 px-3 rounded-lg text-xs font-medium transition-colors border',
                  copied
                    ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30'
                    : 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30 hover:bg-[#6366F1]/20'
                )}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#25D366] hover:underline"
              >
                Enviar via WhatsApp
              </a>
              <span className="text-[#2D3047]">·</span>
              <button onClick={() => { setInviteUrl(''); }} className="text-xs text-[#A0A3B1] hover:text-[#F7F8FC]">
                Gerar outro
              </button>
            </div>
            <p className="text-[11px] text-[#A0A3B1]">Convite de uso único, válido por 7 dias.</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      {/* Lista de admins convidados */}
      <div>
        <p className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2">
          Administradores convidados ({admins.length})
        </p>

        {loading ? (
          <p className="text-sm text-[#A0A3B1]">Carregando…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-[#A0A3B1] italic">Nenhum profissional convidado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {admins.map((a) => (
              <li key={a.uid} className="flex items-center justify-between gap-3 rounded-xl border border-[#2D3047] p-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#F7F8FC] truncate">{a.displayName}</p>
                  {a.email && <p className="text-xs text-[#A0A3B1] truncate">{a.email}</p>}
                  <p className="text-[11px] text-[#A0A3B1] mt-0.5">Convidado em {fmtData(a.criadoEm)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={clsx(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      a.ativo
                        ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30'
                        : 'text-[#A0A3B1] bg-[#A0A3B1]/10 border-[#A0A3B1]/30'
                    )}
                  >
                    {a.ativo ? 'Ativo' : 'Revogado'}
                  </span>
                  {a.ativo ? (
                    <button
                      onClick={() => setRole(a.uid, 'student')}
                      disabled={busyUid === a.uid}
                      className="text-xs font-medium text-[#EF4444] hover:underline disabled:opacity-50"
                    >
                      {busyUid === a.uid ? '...' : 'Revogar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setRole(a.uid, 'admin')}
                      disabled={busyUid === a.uid}
                      className="text-xs font-medium text-[#6366F1] hover:underline disabled:opacity-50"
                    >
                      {busyUid === a.uid ? '...' : 'Reativar'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
