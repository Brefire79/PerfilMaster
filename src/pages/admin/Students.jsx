import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import { getGroupsByAdmin, getUsersByGroup } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge, { ProfileBadge, StatusBadge } from '@/components/ui/Badge.jsx';
import Input from '@/components/ui/Input.jsx';

const PROFILE_COLORS = { D: '#E53E3E', I: '#D69E2E', S: '#38A169', C: '#3182CE' };
const PAGE_SIZE = 10;

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

function getStatusVariant(status) {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'warning';
    case 'pending': return 'pending';
    default: return 'neutral';
  }
}

function getStatusLabel(t, status) {
  switch (status) {
    case 'completed': return t('assessment.completed', 'Concluída');
    case 'in_progress': return t('assessment.inProgress', 'Em andamento');
    case 'pending': return t('assessment.pending', 'Pendente');
    default: return t('assessment.notStarted', 'Não iniciada');
  }
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-2 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[#2D3047] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-[#2D3047]" />
        <div className="h-3 w-48 rounded bg-[#2D3047]" />
      </div>
      <div className="h-5 w-16 rounded bg-[#2D3047]" />
      <div className="h-5 w-14 rounded bg-[#2D3047]" />
      <div className="h-5 w-20 rounded bg-[#2D3047]" />
    </div>
  );
}

export default function Students() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, setGroups } = useGroupStore();

  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [page, setPage] = useState(1);

  // Load groups then their members
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const fetchedGroups = await getGroupsByAdmin(user.uid);
        if (cancelled) return;
        setGroups(fetchedGroups);

        // Fetch members for all groups in parallel
        const membersByGroup = await Promise.all(
          fetchedGroups.map(async (g) => {
            const members = await getUsersByGroup(g.id);
            return members.map((m) => ({ ...m, groupId: g.id, groupName: g.name, groupColor: g.color }));
          })
        );
        if (!cancelled) {
          // Deduplicate by user id (student can only be in one group but just in case)
          const seen = new Set();
          const flat = membersByGroup.flat().filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
          setAllStudents(flat);
        }
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.uid, setGroups]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, groupFilter, profileFilter]);

  const filtered = useMemo(() => {
    let list = allStudents;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          (s.displayName || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q)
      );
    }
    if (groupFilter) {
      list = list.filter((s) => s.groupId === groupFilter);
    }
    if (profileFilter === 'none') {
      list = list.filter((s) => !s.profile);
    } else if (profileFilter) {
      list = list.filter((s) => s.profile === profileFilter);
    }
    return list;
  }, [allStudents, search, groupFilter, profileFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            {t('admin.students.title', 'Alunos')}
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            {t('students.subtitle', 'Todos os alunos em todos os grupos')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          disabled
          leftIcon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        >
          {t('app.export', 'Exportar')}
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={`${t('app.search', 'Buscar')} por nome ou e-mail...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors min-w-[160px]"
          aria-label={t('admin.students.group', 'Grupo')}
        >
          <option value="">{t('group.allGroups', 'Todos os grupos')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value)}
          className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors min-w-[160px]"
          aria-label={t('admin.students.profileType', 'Perfil')}
        >
          <option value="">{t('profiles.allProfiles', 'Todos os perfis')}</option>
          {['D', 'I', 'S', 'C'].map((p) => (
            <option key={p} value={p}>{p} — {t(`profiles.${p}.name`, p)}</option>
          ))}
          <option value="none">{t('group.noProfile', 'Sem perfil')}</option>
        </select>
      </div>

      {/* Table / list */}
      <Card variant="default" bodyClassName="p-0">
        {/* Column headers — desktop only */}
        <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#2D3047] text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
          <span>{t('admin.students.name', 'Nome')}</span>
          <span>{t('admin.students.email', 'E-mail')}</span>
          <span>{t('admin.students.group', 'Grupo')}</span>
          <span>{t('admin.students.profileType', 'Perfil')}</span>
          <span>{t('admin.students.status', 'Avaliação')}</span>
          <span></span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="divide-y divide-[#2D3047] px-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && allStudents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-[#A0A3B1] text-sm font-medium">
              {t('admin.students.noStudents', 'Nenhum aluno encontrado.')}
            </p>
            <p className="text-[#A0A3B1] text-xs mt-1">
              {t('students.inviteHint', 'Convide alunos através de um link de grupo.')}
            </p>
          </div>
        )}

        {/* No filter results */}
        {!loading && allStudents.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center px-5">
            <p className="text-[#A0A3B1] text-sm">{t('app.noData', 'Nenhum resultado.')}</p>
          </div>
        )}

        {/* Rows */}
        {!loading && paginated.length > 0 && (
          <div className="divide-y divide-[#2D3047]">
            {paginated.map((student) => (
              <div
                key={student.id}
                className="group flex flex-col md:grid md:grid-cols-[2fr_2fr_1fr_auto_auto_auto] items-start md:items-center gap-2 md:gap-4 px-5 py-3.5 hover:bg-[#1A1D2E]/50 transition-colors"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: student.profile ? `${PROFILE_COLORS[student.profile]}20` : '#2D3047',
                      color: student.profile ? PROFILE_COLORS[student.profile] : '#A0A3B1',
                    }}
                    aria-hidden="true"
                  >
                    {getInitials(student.displayName || student.name)}
                  </div>
                  <span className="text-sm text-[#F7F8FC] font-medium truncate">
                    {student.displayName || student.name || '—'}
                  </span>
                </div>

                {/* Email */}
                <span className="text-sm text-[#A0A3B1] truncate pl-12 md:pl-0">
                  {student.email || '—'}
                </span>

                {/* Group */}
                <div className="pl-12 md:pl-0">
                  {student.groupName ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#A0A3B1]">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: student.groupColor || '#6366F1' }}
                        aria-hidden="true"
                      />
                      <span className="truncate max-w-[100px]">{student.groupName}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#A0A3B1]">—</span>
                  )}
                </div>

                {/* Profile */}
                <div className="pl-12 md:pl-0">
                  {student.profile ? (
                    <ProfileBadge type={student.profile} size="sm" />
                  ) : (
                    <Badge variant="neutral" size="sm">{t('group.noProfile', 'Sem perfil')}</Badge>
                  )}
                </div>

                {/* Status */}
                <div className="pl-12 md:pl-0">
                  <StatusBadge
                    status={getStatusVariant(student.assessmentStatus)}
                    label={getStatusLabel(t, student.assessmentStatus)}
                    size="sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pl-12 md:pl-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors"
                    aria-label={t('app.view', 'Ver perfil')}
                    title={t('app.view', 'Ver perfil')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#D69E2E] hover:bg-[#D69E2E]/10 transition-colors"
                    aria-label={t('students.sendReminder', 'Enviar lembrete')}
                    title={t('students.sendReminder', 'Enviar lembrete')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2D3047]">
            <p className="text-xs text-[#A0A3B1]">
              {t('app.of', 'de')} {filtered.length}{' '}
              {t('admin.students.title', 'alunos').toLowerCase()} —{' '}
              {t('pagination.page', 'Página')} {page} {t('app.of', 'de')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('app.previous', 'Anterior')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('app.next', 'Próximo')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
