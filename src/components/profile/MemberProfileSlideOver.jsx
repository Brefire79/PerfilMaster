import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getProfile, getAssessmentsByUser } from '@/firebase/firestore.js';
import { buildProfile as buildProfileAI } from '@/firebase/functions.js';
import ProfileBadge from '@/components/profile/ProfileBadge.jsx';
import ProfileDetail from '@/components/profile/ProfileDetail.jsx';

/**
 * MemberProfileSlideOver — painel lateral com perfil completo de um membro
 *
 * @param {object} member  - objeto do usuário (app_users row)
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
export default function MemberProfileSlideOver({ member, isOpen, onClose }) {
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  // uid pode vir como 'uid' OU 'id' dependendo da origem (app_users tem uid, mas
  // getUsersByGroup retorna { id: row.id || row.uid, ...row }). Cobre os dois.
  const memberUid = member?.uid || member?.id;

  // Busca perfil real de app_profiles quando o painel abre
  useEffect(() => {
    if (!isOpen || !memberUid) return;
    setProfileData(null);
    setLoadingProfile(true);
    getProfile(memberUid)
      .then((p) => setProfileData(p || null))
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[MemberProfileSlideOver] getProfile falhou:', err);
        }
        setProfileData(null);
      })
      .finally(() => setLoadingProfile(false));
  }, [isOpen, memberUid]);

  // Fecha com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  // Monta profileObj: prefere dados de app_profiles, cai para campos de app_users
  const dominantFromUser = member.profile || member.dominantProfile;
  const profileObj = profileData || (dominantFromUser ? {
    dominantProfile: dominantFromUser,
    secondaryProfile: member.secondaryProfile || null,
    scores: member.scores || {},
    summary: member.summary || '',
    strengths: member.strengths || [],
    challenges: member.challenges || [],
  } : null);

  const hasProfile = !!(profileObj?.dominantProfile);
  const needsAiEnrichment = hasProfile && !profileObj?.adminStrategy;

  async function handleRegenerate() {
    if (!memberUid || regenerating) return;
    setRegenerating(true);
    setRegenError('');
    try {
      // Busca a avaliação mais recente do usuário para passar à Edge Function
      const assessments = await getAssessmentsByUser(memberUid);
      const latest = assessments.find((a) => a.status === 'analyzed' || a.status === 'completed' || a.status === 'submitted');
      if (!latest) {
        setRegenError('Nenhuma avaliação concluída encontrada para este aluno.');
        return;
      }
      await buildProfileAI({ assessmentId: latest.id, uid: memberUid, language: 'ptBR' });
      // Recarrega o profile com os novos dados
      const fresh = await getProfile(memberUid);
      setProfileData(fresh || null);
    } catch (err) {
      setRegenError(err?.message || 'Falha ao regenerar perfil.');
      console.error('[MemberProfileSlideOver] regenerate error:', err);
    } finally {
      setRegenerating(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-[#1A1D2E] border-l border-[#2D3047] flex flex-col shadow-2xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3047] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {hasProfile && (
              <ProfileBadge profile={profileObj.dominantProfile} size="sm" showLabel={false} />
            )}
            <div className="min-w-0">
              <h2 className="text-base font-heading font-semibold text-[#F7F8FC] truncate">
                {member.displayName || member.name || t('app.noData', '—')}
              </h2>
              <p className="text-xs text-[#A0A3B1] truncate">{member.email || ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors flex-shrink-0"
            aria-label={t('app.back', 'Fechar')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-[#242736]" />
              <div className="h-3 w-32 bg-[#2D3047] rounded-full" />
              <div className="h-3 w-48 bg-[#2D3047] rounded-full" />
            </div>
          ) : hasProfile ? (
            <>
              {/* Banner de regenerar AI quando não tem adminStrategy */}
              {needsAiEnrichment && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#6366F1]/15 to-[#8B5CF6]/10 border border-[#6366F1]/30">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">✨</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#F7F8FC]">
                        Painel estratégico não disponível
                      </p>
                      <p className="text-xs text-[#A0A3B1] mt-1 leading-relaxed">
                        Este perfil foi gerado antes do upgrade do briefing estratégico. Clique abaixo para enriquecer com IA — gera plano de ação, perguntas de coaching, sinais de alerta e mapa de compatibilidade.
                      </p>
                      {regenError && (
                        <p className="text-xs text-[#E53E3E] mt-2">{regenError}</p>
                      )}
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6366F1] hover:bg-[#5558E3] text-white transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        {regenerating ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Gerando estratégia...
                          </>
                        ) : (
                          <>🚀 Gerar Painel Estratégico</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <ProfileDetail profile={profileObj} isAdmin={true} compact={false} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <p className="text-[#A0A3B1] text-sm font-medium">
                {t('group.noProfile', 'Perfil não gerado ainda')}
              </p>
              <p className="text-[#A0A3B1] text-xs mt-1">
                {t('assessment.pending', 'O participante ainda não completou uma avaliação.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
