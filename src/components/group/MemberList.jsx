import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Badge, { ProfileBadge, StatusBadge } from '@/components/ui/Badge.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';

/**
 * Returns initials from a display name
 * @param {string} name
 * @returns {string}
 */
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

const PROFILE_COLORS = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };

/**
 * MemberList — displays and manages group members
 *
 * @param {Array<{id: string, displayName?: string, email?: string, profile?: string, assessmentStatus?: string}>} members
 * @param {string} groupId
 * @param {(uid: string) => Promise<void>} onRemove - called with member uid
 */
export default function MemberList({ members = [], groupId, onRemove }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [confirmUid, setConfirmUid] = useState(null);
  const [removing, setRemoving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.displayName || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  const memberToRemove = members.find((m) => m.id === confirmUid);

  const handleConfirmRemove = async () => {
    if (!confirmUid) return;
    setRemoving(true);
    try {
      await onRemove?.(confirmUid);
    } finally {
      setRemoving(false);
      setConfirmUid(null);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'pending';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return t('assessment.completed', 'Concluída');
      case 'in_progress': return t('assessment.inProgress', 'Em andamento');
      case 'pending': return t('assessment.pending', 'Pendente');
      default: return t('assessment.notStarted', 'Não iniciada');
    }
  };

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <Input
          placeholder={t('app.search', 'Buscar') + '...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="w-4 h-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A0A3B1"
              strokeWidth={1.5}
              className="w-7 h-7"
              aria-hidden="true"
            >
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
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[#A0A3B1] text-sm">
            {t('app.noData', 'Nenhum resultado encontrado')}
          </p>
        </div>
      ) : (
        /* Member list */
        <div className="divide-y divide-[#2D3047]">
          {/* Header row (hidden on mobile) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-1 pb-2 text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
            <span>{t('admin.students.name', 'Nome')}</span>
            <span>{t('admin.students.email', 'E-mail')}</span>
            <span>{t('admin.students.profileType', 'Perfil')}</span>
            <span>{t('admin.students.status', 'Status')}</span>
            <span></span>
          </div>

          {filtered.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] items-start sm:items-center gap-2 sm:gap-4 py-3 px-1 hover:bg-[#1A1D2E]/40 rounded-xl transition-colors group"
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: member.profile
                      ? `${PROFILE_COLORS[member.profile]}20`
                      : '#2D3047',
                    color: member.profile
                      ? PROFILE_COLORS[member.profile]
                      : '#A0A3B1',
                  }}
                  aria-hidden="true"
                >
                  {getInitials(member.displayName || member.name)}
                </div>
                <span className="text-sm text-[#F7F8FC] font-medium truncate">
                  {member.displayName || member.name || t('app.noData', '—')}
                </span>
              </div>

              {/* Email */}
              <span className="text-sm text-[#A0A3B1] truncate pl-11 sm:pl-0">
                {member.email || '—'}
              </span>

              {/* Profile badge */}
              <div className="pl-11 sm:pl-0">
                {member.profile ? (
                  <ProfileBadge
                    type={member.profile}
                    name={t(`profiles.${member.profile}.name`, member.profile)}
                  />
                ) : (
                  <Badge variant="neutral" size="sm">
                    {t('group.noProfile', 'Sem perfil')}
                  </Badge>
                )}
              </div>

              {/* Assessment status */}
              <div className="pl-11 sm:pl-0">
                <StatusBadge
                  status={getStatusVariant(member.assessmentStatus)}
                  label={getStatusLabel(member.assessmentStatus)}
                  size="sm"
                />
              </div>

              {/* Remove button */}
              <button
                onClick={() => setConfirmUid(member.id)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 ml-auto sm:ml-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                aria-label={t('admin.students.removeConfirm', 'Remover membro')}
                title={t('admin.students.removeConfirm', 'Remover membro')}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total count */}
      {members.length > 0 && (
        <p className="mt-4 text-xs text-[#A0A3B1] text-right">
          {t('group.membersCount', { count: members.length })}
          {filtered.length !== members.length && (
            <span className="ml-1">
              ({t('app.filter', 'filtrado')}: {filtered.length})
            </span>
          )}
        </p>
      )}

      {/* Confirm remove modal */}
      <ConfirmModal
        isOpen={!!confirmUid}
        onClose={() => setConfirmUid(null)}
        onConfirm={handleConfirmRemove}
        title={t('admin.students.removeConfirm', 'Remover membro')}
        description={`${t('group.removeWarning', 'Tem certeza que deseja remover')} ${
          memberToRemove?.displayName || memberToRemove?.email || ''
        }?`}
        confirmLabel={t('app.delete', 'Remover')}
        cancelLabel={t('app.cancel', 'Cancelar')}
        variant="danger"
        loading={removing}
      />
    </>
  );
}
