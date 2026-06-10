import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import {
  getGroup,
  getUserByEmail,
  getUsersByGroup,
  getAssessmentsByGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  updateGroup,
  updateUser,
  deleteGroup,
} from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import MemberList from '@/components/group/MemberList.jsx';
import InviteLink from '@/components/group/InviteLink.jsx';
import ProgressRing from '@/components/ui/ProgressRing.jsx';
import ProfileBadge from '@/components/profile/ProfileBadge.jsx';
import ProfileDetail from '@/components/profile/ProfileDetail.jsx';

const COLOR_PRESETS = [
  '#6366F1', '#F43F5E', '#F59E0B', '#10B981', '#0EA5E9', '#8B5CF6',
];

// ─── Member Profile Slide-Over ──────────────────────────────────────────────
function MemberProfileSlideOver({ member, isOpen, onClose }) {
  const { t } = useTranslation();

  // Close on Escape
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

  // Build a profile object from the member data so ProfileDetail can render it
  const profileObj = member.profileData || {
    dominantProfile:     member.profile || member.dominantProfile,
    dominantProfileName: member.profileName || member.dominantProfileName,
    secondaryProfile:    member.secondaryProfile,
    secondaryProfileName:member.secondaryProfileName,
    scores:              member.scores || {},
    summary:             member.summary || '',
    strengths:           member.strengths || [],
    challenges:          member.challenges || [],
    roleRecommendation:  member.roleRecommendation || '',
    workStyleRecommendation: member.workStyleRecommendation || '',
    teamBehavior:        member.teamBehavior || '',
    communicationTips:   member.communicationTips || '',
    saboteurPatterns:    member.saboteurPatterns || [],
    derailmentRisks:     member.derailmentRisks || [],
    therapyIndicator:    member.therapyIndicator,
    userName:            member.displayName || member.name,
  };

  const hasProfile = !!(profileObj.dominantProfile);

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
          {hasProfile ? (
            <ProfileDetail profile={profileObj} isAdmin={true} compact={false} />
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

// ─── Enhanced Member Row ─────────────────────────────────────────────────────
function MemberRowWithProfile({ member, onViewProfile, onRemove, t }) {
  const PROFILE_COLORS = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };

  function getInitials(name = '') {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
      case 'analyzed':    return 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20';
      case 'submitted':
      case 'in_progress': return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
      case 'pending':     return 'bg-[#A0A3B1]/10 text-[#A0A3B1] border-[#A0A3B1]/20';
      default:            return 'bg-[#2D3047] text-[#A0A3B1] border-[#2D3047]';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
      case 'analyzed':    return t('assessment.completed', 'Concluída');
      case 'submitted':   return t('assessment.submitted', 'Enviada');
      case 'in_progress': return t('assessment.inProgress', 'Em andamento');
      case 'pending':     return t('assessment.pending', 'Pendente');
      default:            return t('assessment.notStarted', 'Não iniciada');
    }
  };

  const profile = member.profile || member.dominantProfile;

  return (
    <div className="flex items-center gap-3 py-3 px-1 hover:bg-[#1A1D2E]/40 rounded-xl transition-colors group">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          backgroundColor: profile ? `${PROFILE_COLORS[profile]}20` : '#2D3047',
          color: profile ? PROFILE_COLORS[profile] : '#A0A3B1',
        }}
        aria-hidden="true"
      >
        {getInitials(member.displayName || member.name)}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F7F8FC] font-medium truncate">
          {member.displayName || member.name || t('app.noData', '—')}
        </p>
        <p className="text-xs text-[#A0A3B1] truncate">{member.email || '—'}</p>
      </div>

      {/* Profile badge */}
      <div className="flex-shrink-0">
        {profile ? (
          <ProfileBadge profile={profile} size="sm" showLabel={false} />
        ) : (
          <span className="text-xs text-[#A0A3B1] px-2 py-0.5 rounded-md bg-[#2D3047]">—</span>
        )}
      </div>

      {/* Status */}
      <div className="hidden sm:block flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md border ${getStatusVariant(member.assessmentStatus)}`}>
          {getStatusLabel(member.assessmentStatus)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onViewProfile(member)}
          className="h-7 px-2 text-xs font-medium rounded-lg bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/20 transition-colors"
          title={t('group.viewProfile', 'Ver perfil')}
        >
          Ver perfil
        </button>
        <button
          onClick={() => onRemove(member.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
          aria-label={t('admin.students.removeConfirm', 'Remover membro')}
          title={t('admin.students.removeConfirm', 'Remover membro')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-150',
        active
          ? 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30'
          : 'text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736]'
      )}
    >
      {children}
    </button>
  );
}

// ─── Stats row ─────────────────────────────────────────────────────────────────
function StatsRow({ members, group }) {
  const { t } = useTranslation();
  const totalMembers = members.length;
  const completed = members.filter((m) => m.assessmentStatus === 'completed' || m.assessmentStatus === 'analyzed').length;
  const completedPct = totalMembers > 0 ? Math.round((completed / totalMembers) * 100) : 0;

  const profileCounts = members.reduce((acc, m) => {
    if (m.profile) acc[m.profile] = (acc[m.profile] || 0) + 1;
    return acc;
  }, {});
  const profileTypes = Object.keys(profileCounts).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card variant="default">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-[#F7F8FC]">{totalMembers}</p>
          <p className="text-xs text-[#A0A3B1] mt-1">{t('group.members', 'Membros')}</p>
        </div>
      </Card>
      <Card variant="default">
        <div className="flex flex-col items-center gap-1">
          <ProgressRing value={completedPct} size={48} strokeWidth={5} color="#22C55E" />
          <p className="text-xs text-[#A0A3B1]">{t('assessment.completed', 'Concluídas')}</p>
        </div>
      </Card>
      <Card variant="default">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-[#F7F8FC]">{profileTypes}</p>
          <p className="text-xs text-[#A0A3B1] mt-1">{t('group.profileDistribution', 'Perfis')}</p>
        </div>
      </Card>
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ group, onUpdated, onDeleted }) {
  const { t } = useTranslation();
  const { updateGroup: updateGroupStore } = useGroupStore();
  const [form, setForm] = useState({
    name: group.name || '',
    description: group.description || '',
    color: group.color || '#6366F1',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updates = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
      };
      await updateGroup(group.id, updates);
      updateGroupStore(group.id, updates);
      onUpdated?.({ ...group, ...updates });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroup(group.id);
      onDeleted?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card variant="default">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#F7F8FC]">
              {t('group.groupSettings', 'Configurações do Grupo')}
            </h3>

            <Input
              label={t('admin.groups.name', 'Nome do Grupo')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#F7F8FC]">
                {t('admin.groups.description', 'Descrição')}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/60 focus:border-[#6366F1] outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#F7F8FC]">
                {t('group.color', 'Cor')}
              </label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={clsx(
                      'w-7 h-7 rounded-full transition-all border-2',
                      form.color === c ? 'border-[#F7F8FC] scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span className="text-sm text-[#22C55E] flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('app.success', 'Salvo')}
                </span>
              )}
              <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                {t('app.save', 'Salvar')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card variant="default" className="border-[#EF4444]/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#EF4444]">
                {t('group.dangerZone', 'Zona de Perigo')}
              </h3>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                {t('admin.groups.deleteWarning', 'Esta ação não pode ser desfeita.')}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              {t('app.delete', 'Excluir grupo')}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('admin.groups.deleteConfirm', 'Excluir grupo?')}
        description={t('admin.groups.deleteWarning', 'Esta ação não pode ser desfeita.')}
        confirmLabel={t('app.delete', 'Excluir')}
        cancelLabel={t('app.cancel', 'Cancelar')}
        variant="danger"
        loading={deleting}
      />
    </>
  );
}

// ─── Add Member by Email ───────────────────────────────────────────────────────
function AddMemberForm({ groupId, onAdded, onSwitchToInvite }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setNotFound(false);
    setSuccess('');
    try {
      const found = await getUserByEmail(email.trim().toLowerCase());
      if (!found) {
        setNotFound(true);
        return;
      }
      const uid = found.uid || found.id;
      await addMemberToGroup(groupId, uid);
      // A lista de membros é lida por app_users.groupid — sem este update o
      // aluno entrava em memberids mas não aparecia como membro do grupo.
      await updateUser(uid, { groupId });
      setSuccess(t('group.memberAdded', 'Membro adicionado:') + ' ' + (found.displayName || email));
      setEmail('');
      onAdded?.();
    } catch (err) {
      setError(err?.message || t('errors.generic', 'Algo deu errado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder={t('auth.emailPlaceholder', 'email@exemplo.com')}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setNotFound(false); setError(''); }}
          error={error}
          className="flex-1"
        />
        <Button variant="primary" size="md" type="submit" loading={loading} className="flex-shrink-0">
          {t('group.addMember', 'Adicionar')}
        </Button>
      </form>

      {/* Usuário não encontrado — orienta para o fluxo de convite */}
      {notFound && (
        <div className="mt-2 flex items-start gap-2.5 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#F7F8FC] font-medium">
              Usuário não encontrado
            </p>
            <p className="text-xs text-[#A0A3B1] mt-0.5 leading-relaxed">
              <strong className="text-[#F7F8FC]">{email}</strong> ainda não tem conta no ProfileAI.
              Envie o link de convite para que ele se cadastre e já entre no grupo automaticamente.
            </p>
            {onSwitchToInvite && (
              <button
                type="button"
                onClick={onSwitchToInvite}
                className="mt-2 text-xs font-semibold text-[#F59E0B] hover:text-[#FCD34D] transition-colors underline underline-offset-2"
              >
                Ir para aba Convite →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sucesso */}
      {success && (
        <p className="mt-2 text-sm text-[#22C55E] flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {success}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentGroup, setCurrentGroup, updateGroup: updateGroupStore } = useGroupStore();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [selectedMember, setSelectedMember] = useState(null);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  const closeTimerRef = useRef(null);

  const handleViewProfile = useCallback((member) => {
    clearTimeout(closeTimerRef.current);
    setSelectedMember(member);
    setProfilePanelOpen(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setProfilePanelOpen(false);
    // Delay clearing member so the slide-out animation isn't abrupt
    closeTimerRef.current = setTimeout(() => setSelectedMember(null), 300);
  }, []);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const loadGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const g = await getGroup(id);
      if (!g) {
        navigate('/admin/groups');
        return;
      }
      setGroup(g);
      setCurrentGroup(g);

      // Fetch members + cruza com assessments para status real
      if (g.memberIds?.length) {
        const [memberData, assessments] = await Promise.all([
          getUsersByGroup(id),
          getAssessmentsByGroup(id),
        ]);

        // Status por uid vindo de app_assessments
        const STATUS_RANK = { completed: 4, analyzed: 4, submitted: 3, in_progress: 2, pending: 1 };
        const bestStatus = {};
        for (const a of assessments) {
          const uid = a.uid;
          if (!uid) continue;
          const rank = STATUS_RANK[a.status] ?? 0;
          if (!bestStatus[uid] || rank > (STATUS_RANK[bestStatus[uid]] ?? 0)) {
            bestStatus[uid] = a.status;
          }
        }

        setMembers(memberData.map((m) => ({
          ...m,
          assessmentStatus: bestStatus[m.uid] ?? bestStatus[m.id] ?? m.assessmentStatus ?? null,
        })));
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, setCurrentGroup]);

  useEffect(() => {
    loadGroup();
    return () => setCurrentGroup(null);
  }, [loadGroup, setCurrentGroup]);

  const handleRemoveMember = async (uid) => {
    await removeMemberFromGroup(id, uid);
    setMembers((prev) => prev.filter((m) => m.id !== uid));
  };

  // Disparo para o grupo: cobra só os membros que ainda não concluíram a
  // avaliação, via modal com WhatsApp/e-mail por pessoa (estilo Convidar Aluno).
  // Quem entrar no grupo depois cai aqui no próximo disparo.
  const CONCLUIDOS = ['completed', 'analyzed', 'submitted'];
  const membrosPendentes = members.filter((m) => !CONCLUIDOS.includes(m.assessmentStatus));
  const [cobrarOpen, setCobrarOpen] = useState(false);

  const montarMensagemCobranca = (nome) => {
    const appUrl = `${window.location.origin}/student/dashboard`;
    return (
      `Olá${nome ? `, ${nome.split(' ')[0]}` : ''}! 👋\n\n` +
      `Sua avaliação comportamental DISC${group?.name ? ` do grupo ${group.name}` : ''} ainda está pendente.\n\n` +
      `Acesse o link abaixo para entrar no app e responder:\n${appUrl}\n\n` +
      `⏱️ Tempo estimado: 10–15 minutos.\n` +
      `📊 Seus resultados são confidenciais.`
    );
  };

  const handleCobrarWhatsApp = (membro) => {
    const msg = encodeURIComponent(montarMensagemCobranca(membro.displayName || membro.name));
    // Sem telefone cadastrado: o WhatsApp abre e o admin escolhe o contato
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleCobrarEmail = (membro) => {
    if (!membro.email) return;
    const subject = encodeURIComponent(`Lembrete: complete sua avaliação DISC — ${group?.name || 'Perfil Master'}`);
    const body = encodeURIComponent(montarMensagemCobranca(membro.displayName || membro.name));
    window.open(`mailto:${membro.email}?subject=${subject}&body=${body}`);
  };

  const handleCobrarTodosEmail = () => {
    const comEmail = membrosPendentes.filter((m) => m.email);
    if (comEmail.length === 0) return;
    const bcc = comEmail.map((m) => m.email).join(',');
    const subject = encodeURIComponent(`Lembrete: complete sua avaliação DISC — ${group?.name || 'Perfil Master'}`);
    const body = encodeURIComponent(montarMensagemCobranca(''));
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`);
  };

  const handleGroupUpdated = (updated) => {
    setGroup(updated);
    updateGroupStore(updated.id, updated);
  };

  const handleGroupDeleted = () => {
    navigate('/admin/groups');
  };

  const tabs = [
    { key: 'members', label: t('group.members', 'Membros') },
    { key: 'invite', label: t('group.invite', 'Convite') },
    { key: 'settings', label: t('navigation.settings', 'Configurações') },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#242736]" />
          <div className="h-7 w-48 rounded bg-[#242736]" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#242736]" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[#242736]" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/admin/groups')}
          className="mt-0.5 p-2 rounded-xl text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors flex-shrink-0"
          aria-label={t('app.back', 'Voltar')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-5 h-5"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: group.color || '#6366F1' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-heading font-bold text-[#F7F8FC] truncate">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-[#A0A3B1] text-sm mt-0.5 line-clamp-1">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <Badge variant="neutral" size="md" className="flex-shrink-0">
          {t('admin.groups.membersCount', { count: members.length })}
        </Badge>
      </div>

      {/* Stats row */}
      <StatsRow members={members} group={group} />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#1A1D2E] rounded-2xl border border-[#2D3047] w-fit">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'members' && (
          <Card variant="default">
            <AddMemberForm groupId={id} onAdded={loadGroup} onSwitchToInvite={() => setActiveTab('invite')} />

            {/* Disparo para o grupo: cobra os pendentes (modal WhatsApp/e-mail) */}
            {membrosPendentes.length > 0 && (
              <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                <p className="text-xs text-[#A0A3B1]">
                  <strong className="text-[#F59E0B]">{membrosPendentes.length}</strong>{' '}
                  membro{membrosPendentes.length > 1 ? 's' : ''} ainda não concluí
                  {membrosPendentes.length > 1 ? 'ram' : 'u'} a avaliação.
                </p>
                <Button variant="secondary" size="sm" onClick={() => setCobrarOpen(true)} className="flex-shrink-0">
                  📤 Cobrar pendentes ({membrosPendentes.length})
                </Button>
              </div>
            )}

            {/* Enhanced member list with ProfileBadge + "Ver perfil" button */}
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#1A1D2E] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                </div>
                <p className="text-[#A0A3B1] text-sm font-medium">
                  {t('group.noMembers', 'Nenhum membro ainda')}
                </p>
                <p className="text-[#A0A3B1] text-xs mt-1">
                  {t('group.inviteToAdd', 'Use o link de convite para adicionar membros')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2D3047]">
                {/* Column headers */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-1 pb-2 text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
                  <span>{t('admin.students.name', 'Nome')}</span>
                  <span>{t('admin.students.profileType', 'Perfil')}</span>
                  <span>{t('admin.students.status', 'Status')}</span>
                  <span></span>
                </div>
                {members.map((member) => (
                  <MemberRowWithProfile
                    key={member.id}
                    member={member}
                    onViewProfile={handleViewProfile}
                    onRemove={handleRemoveMember}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Member count footer */}
            {members.length > 0 && (
              <p className="mt-4 text-xs text-[#A0A3B1] text-right">
                {t('group.membersCount', { count: members.length })}
              </p>
            )}
          </Card>
        )}

        {activeTab === 'invite' && (
          <InviteLink
            groupId={id}
            inviteToken={group.inviteToken}
            onRegenerateToken={(token) =>
              handleGroupUpdated({ ...group, inviteToken: token })
            }
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            group={group}
            onUpdated={handleGroupUpdated}
            onDeleted={handleGroupDeleted}
          />
        )}
      </div>

      {/* ── Modal Cobrar Pendentes — estilo "Convidar Aluno" ───────────── */}
      {cobrarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-cobrar">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
            <div className="flex items-start justify-between px-5 py-4 border-b border-[#2D3047] shrink-0">
              <div>
                <h2 id="dlg-cobrar" className="text-base font-heading font-semibold text-[#F7F8FC]">
                  Cobrar pendentes
                </h2>
                <p className="text-xs text-[#A0A3B1] mt-0.5">
                  {membrosPendentes.length} membro{membrosPendentes.length > 1 ? 's' : ''} de{' '}
                  <strong className="text-[#F7F8FC]">{group.name}</strong> sem avaliação concluída
                </p>
              </div>
              <button
                onClick={() => setCobrarOpen(false)}
                className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors ml-3"
                aria-label={t('app.back', 'Fechar')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-2">
              {membrosPendentes.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-[#13151F] border border-[#2D3047] rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center text-xs font-bold shrink-0">
                    {(m.displayName || m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F7F8FC] truncate">{m.displayName || m.name || '—'}</p>
                    <p className="text-xs text-[#A0A3B1] truncate">{m.email || 'sem e-mail'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCobrarWhatsApp(m)}
                      title="Cobrar via WhatsApp (você escolhe o contato)"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-xs font-medium"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleCobrarEmail(m)}
                      disabled={!m.email}
                      title={m.email ? 'Cobrar por e-mail' : 'Membro sem e-mail cadastrado'}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#6366F1]/10 text-[#818CF8] hover:bg-[#6366F1]/20 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      E-mail
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-[#2D3047] shrink-0 flex flex-col gap-2">
              {membrosPendentes.some((m) => m.email) && (
                <button
                  onClick={handleCobrarTodosEmail}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  📧 E-mail para todos com e-mail (cópia oculta)
                </button>
              )}
              <button
                onClick={() => setCobrarOpen(false)}
                className="w-full py-2.5 rounded-xl border border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#4A4D6A] transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member profile slide-over panel */}
      <MemberProfileSlideOver
        member={selectedMember}
        isOpen={profilePanelOpen}
        onClose={handleCloseProfile}
      />
    </div>
  );
}
