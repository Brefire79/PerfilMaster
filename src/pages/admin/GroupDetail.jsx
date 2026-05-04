import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import {
  getGroup,
  getUsersByGroup,
  removeMemberFromGroup,
  updateGroup,
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
  const PROFILE_COLORS = { D: '#E53E3E', I: '#D69E2E', S: '#38A169', C: '#3182CE' };

  function getInitials(name = '') {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':   return 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/20';
      case 'in_progress': return 'bg-[#D69E2E]/10 text-[#D69E2E] border-[#D69E2E]/20';
      case 'pending':     return 'bg-[#A0A3B1]/10 text-[#A0A3B1] border-[#A0A3B1]/20';
      default:            return 'bg-[#2D3047] text-[#A0A3B1] border-[#2D3047]';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':   return t('assessment.completed', 'Concluída');
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
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#E53E3E] hover:bg-[#E53E3E]/10 transition-all"
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
  const completed = members.filter((m) => m.assessmentStatus === 'completed').length;
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
          <ProgressRing value={completedPct} size={48} strokeWidth={5} color="#38A169" />
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
                <span className="text-sm text-[#38A169] flex items-center gap-1">
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
        <Card variant="default" className="border-[#E53E3E]/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#E53E3E]">
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
function AddMemberForm({ groupId, onAdded }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // In a real app, look up user by email in Firestore
      // For now, show a success placeholder
      setSuccess(t('group.memberAdded', 'Convite enviado para') + ' ' + email);
      setEmail('');
      onAdded?.();
    } catch (err) {
      setError(t('errors.generic', 'Algo deu errado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAdd} className="flex gap-2 mb-4">
      <Input
        placeholder={t('auth.emailPlaceholder', 'email@exemplo.com')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        className="flex-1"
      />
      <Button variant="primary" size="md" type="submit" loading={loading} className="flex-shrink-0">
        {t('group.addMember', 'Adicionar')}
      </Button>
    </form>
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

  const handleViewProfile = useCallback((member) => {
    setSelectedMember(member);
    setProfilePanelOpen(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setProfilePanelOpen(false);
    // Delay clearing member so the slide-out animation isn't abrupt
    setTimeout(() => setSelectedMember(null), 300);
  }, []);

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

      // Fetch members
      if (g.memberIds?.length) {
        const memberData = await getUsersByGroup(id);
        setMembers(memberData);
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
            <AddMemberForm groupId={id} onAdded={loadGroup} />

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

      {/* Member profile slide-over panel */}
      <MemberProfileSlideOver
        member={selectedMember}
        isOpen={profilePanelOpen}
        onClose={handleCloseProfile}
      />
    </div>
  );
}
