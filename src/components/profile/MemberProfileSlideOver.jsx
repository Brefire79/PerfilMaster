import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getProfile, updateProfile, updateUser, getAssessmentsByUser, getAvaliadoByEmail } from '@/firebase/firestore.js';
import { generateAnalysis, loadApiKey } from '@/lib/apiKeyManager.js';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';
import ProfileBadge from '@/components/profile/ProfileBadge.jsx';
import ProfileDetail from '@/components/profile/ProfileDetail.jsx';

const TOTAL_DISC = 28;
const TOTAL_QUESTIONS = 78; // 28 DISC + 50 sabotadores

// Recalcula scores DISC a partir das respostas brutas armazenadas na avaliação
function calcularScoresFromAnswers(answers) {
  const questions = Array.isArray(SAMPLE_QUESTIONS) ? SAMPLE_QUESTIONS.slice(0, TOTAL_QUESTIONS) : [];
  const acc = { D: [], I: [], S: [], C: [] };
  for (const q of questions) {
    const dim = q.dimension;
    if (!dim || !acc[dim]) continue;
    const valor = answers?.[q.id];
    if (valor != null) acc[dim].push(Number(valor));
  }
  const scores = {};
  for (const dim of ['D', 'I', 'S', 'C']) {
    const arr = acc[dim];
    scores[dim] = arr.length === 0 ? 0 : Math.round((arr.reduce((s, v) => s + v, 0) / arr.length / 5) * 100);
  }
  return scores;
}

/**
 * MemberProfileSlideOver — painel lateral com perfil completo de um membro
 *
 * @param {object} member  - objeto do usuário (app_users row)
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
// ─── Constrói adminStrategy a partir da análise do motor local ────────────────
function buildAdminStrategy(analysis) {
  const { disc, sabotadores, correlations, recommendations, strengths, watchouts, summary } = analysis;
  const prim = disc?.primary ?? 'I';
  const top3Names = sabotadores?.topNames ?? [];
  const pq = sabotadores?.pqScore ?? 0;

  const APPROACH = {
    D: 'Seja direto e objetivo. Foque em resultados e desafios. Evite rodeios — este perfil valoriza eficiência e autonomia.',
    I: 'Use linguagem entusiasta e reconheça publicamente. Este perfil se energiza com conexão social e ideias novas. Mantenha reuniões dinâmicas.',
    S: 'Crie um ambiente seguro e previsível. Seja consistente, mostre que valoriza o processo e dê tempo para processamento emocional.',
    C: 'Apresente dados e lógica. Seja preciso, respeite a necessidade de análise antes de decidir. Evite pressão por respostas rápidas.',
  };
  const FEEDBACK = {
    D: 'Feedback direto e orientado a impacto nos resultados. Evite exposição pública — prefira 1:1 assertivo.',
    I: 'Comece pelo reconhecimento, contextualize o desenvolvimento como oportunidade de crescimento visível.',
    S: 'Feedback gentil e privado. Dê tempo para absorver. Mostre que há suporte disponível na mudança.',
    C: 'Feedback baseado em dados e evidências concretas. Seja específico, lógico e dê tempo para análise.',
  };
  const DELEG = {
    D: ['tomada de decisão rápida e projetos de alta visibilidade', 'tarefas repetitivas sem impacto claro'],
    I: ['comunicação, persuasão e articulação com pessoas', 'trabalho isolado e detalhado por longos períodos'],
    S: ['processos que requerem consistência e suporte contínuo', 'mudanças bruscas sem aviso ou justificativa'],
    C: ['análise detalhada, qualidade e revisão de processos', 'decisões sob alta pressão sem dados suficientes'],
  };
  const COMPAT = {
    D: { D:'Alta competitividade — útil em desafios mútuos.', I:'Complementar — D executa, I engaja.', S:'D pode pressionar S; calibrar ritmo.', C:'Tensão velocidade vs. precisão — negociar prazos.' },
    I: { D:'Complementar — I motiva, D direciona.', I:'Alta energia, mas pode faltar foco.', S:'Parceria harmoniosa — I inspira, S sustenta.', C:'C pode frear I — alinhar comunicação.' },
    S: { D:'S prefere estabilidade; comunicar mudanças com antecedência.', I:'Parceria eficaz — S ancora, I energiza.', S:'Alta harmonia, mas pode evitar conflitos necessários.', C:'Parceria sólida para projetos detalhados.' },
    C: { D:'Negociar ritmo — C precisa de dados, D quer ação.', I:'Alinhar profundidade — C acha I superficial.', S:'Parceria estável para processos rigorosos.', C:'Alta precisão, mas risco de paralisia por análise.' },
  };

  const recTextos = (recommendations ?? []).slice(0, 4).map(r =>
    typeof r === 'string' ? r : `[${(r.priority ?? 'MÉDIA').toUpperCase()}] ${r.action}`
  );
  const coachQs = correlations?.slice(0, 3).map(c =>
    typeof c === 'string'
      ? `Como você percebe: "${c.substring(0, 80)}..."?`
      : `Como você percebe a interação entre seu perfil **${c.disc}** e o sabotador **${c.sabotador}** no seu dia a dia?`
  ) ?? [];

  const d = DELEG[prim] ?? DELEG.I;
  return {
    executiveBrief: `${summary ?? ''}\n\nPerfil primário: ${prim} (${disc?.label ?? ''}). PQ Score: ${pq}/100. Sabotadores principais: ${top3Names.slice(0, 2).join(' e ') || '—'}.`,
    approachStyle: APPROACH[prim] ?? APPROACH.I,
    coachingQuestions: coachQs.length ? coachQs : ['O que está funcionando bem para você ultimamente?', 'Onde você sente mais resistência ou dificuldade?', 'Que tipo de suporte seria mais útil agora?'],
    feedbackApproach: FEEDBACK[prim] ?? FEEDBACK.I,
    motivationLevers: (strengths ?? []).slice(0, 4),
    redFlags: (watchouts ?? []).slice(0, 4),
    nextAssessmentFocus: recTextos[0] ?? 'Reavaliar após 90 dias de desenvolvimento.',
    actionPlan: recTextos,
    compatibilityMap: COMPAT[prim] ?? COMPAT.I,
    delegationGuide: `Delegue tarefas que envolvam ${d[0]}. Evite sobrecarregá-lo com ${d[1]}.`,
    stretchAreas: (watchouts ?? []).slice(0, 3),
  };
}

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
      // 1. Tenta usar scores salvos no perfil
      let discScores = {
        D: Number(profileData?.scores?.D ?? profileObj?.scores?.D ?? 0),
        I: Number(profileData?.scores?.I ?? profileObj?.scores?.I ?? 0),
        S: Number(profileData?.scores?.S ?? profileObj?.scores?.S ?? 0),
        C: Number(profileData?.scores?.C ?? profileObj?.scores?.C ?? 0),
      };

      // 2. Se perfil sem scores, tenta recalcular a partir das fontes disponíveis
      const hasAnyScore = Object.values(discScores).some((v) => v > 0);
      if (!hasAnyScore) {
        let resolved = false;

        // 2a. Fluxo AssessmentWizard: busca respostas em app_assessments
        const assessments = await getAssessmentsByUser(memberUid);
        const completedAssessment = assessments.find(
          (a) => (a.status === 'completed' || a.status === 'analyzed' || a.status === 'submitted') && a.answers
        );
        if (completedAssessment?.answers && Object.keys(completedAssessment.answers).length > 0) {
          const recalculated = calcularScoresFromAnswers(completedAssessment.answers);
          if (Object.values(recalculated).some((v) => v > 0)) {
            discScores = recalculated;
            resolved = true;
          }
        }

        // 2b. Fluxo AvaliacaoPublica: busca perfil calculado em app_avaliados por email
        if (!resolved && member?.email) {
          const avaliado = await getAvaliadoByEmail(member.email);
          if (avaliado?.perfil) {
            const p = avaliado.perfil;
            // app_avaliados.perfil usa { dominante, influente, estavel, analitico }
            discScores = {
              D: Number(p.dominante ?? p.D ?? 0),
              I: Number(p.influente ?? p.I ?? 0),
              S: Number(p.estavel   ?? p.S ?? 0),
              C: Number(p.analitico ?? p.C ?? 0),
            };
            if (Object.values(discScores).some((v) => v > 0)) resolved = true;
          }
        }

        if (!resolved) {
          setRegenError('Sem dados de avaliação encontrados. O aluno precisa completar a avaliação primeiro.');
          return;
        }

        // Salva scores recalculados no perfil para não buscar de novo
        await updateProfile(memberUid, { scores: discScores });
        await updateUser(memberUid, { assessmentStatus: 'completed' });
      }

      // 3. Gera análise com motor local
      const emptySabScores = {
        judge: 0, stickler: 0, pleaser: 0, hyperAchiever: 0, victim: 0,
        hyperRational: 0, hyperVigilant: 0, restless: 0, controller: 0, avoider: 0,
      };
      const apiKey = await loadApiKey();
      const analysis = await generateAnalysis(discScores, emptySabScores, apiKey);

      // 4. Constrói e salva adminStrategy
      const adminStrategy = buildAdminStrategy(analysis);
      await updateProfile(memberUid, { adminStrategy });

      // 5. Recarrega o profile
      const fresh = await getProfile(memberUid);
      setProfileData(fresh || null);
    } catch (err) {
      setRegenError(err?.message || 'Falha ao gerar painel estratégico.');
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
                        <p className="text-xs text-[#EF4444] mt-2">{regenError}</p>
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
