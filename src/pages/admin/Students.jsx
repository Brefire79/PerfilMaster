import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import { getGroupsByAdmin, getUsersByGroup, getAssessmentsByGroup, getModules, createAssessment, getAvaliadosByAdmin, getSessoesByAdmin, getAvulsosByAdmin, deleteStudent, deleteAvaliado, addMemberToGroup, removeMemberFromGroup, updateUser } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge, { ProfileBadge, StatusBadge } from '@/components/ui/Badge.jsx';
import Input from '@/components/ui/Input.jsx';
import MemberProfileSlideOver from '@/components/profile/MemberProfileSlideOver.jsx';
import { getPublicBaseUrl } from '@/lib/appUrl.js';
import InviteStudentModal from '@/components/group/InviteStudentModal.jsx';
import IdentityLinkPanel from '@/components/admin/IdentityLinkPanel.jsx';
import NovoAvaliadoTrigger from '@/components/sessao/NovoAvaliadoTrigger.jsx';

const PROFILE_COLORS = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };
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
    case 'completed':
    case 'analyzed':
    case 'submitted': return 'success';
    case 'in_progress': return 'warning';
    case 'pending': return 'pending';
    default: return 'neutral';
  }
}

function getStatusLabel(t, status) {
  switch (status) {
    case 'completed':
    case 'analyzed':
    case 'submitted': return t('assessment.completed', 'Concluída');
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
  const location = useLocation();
  const navigate = useNavigate();

  // Abre o Relatório Oficial: avaliado de sessão usa token; conta de aluno usa uid.
  const abrirRelatorio = (student) => {
    if (student.isAvaliado && student.token) {
      navigate(`/admin/relatorio/${student.token}`);
    } else {
      navigate(`/admin/relatorio/aluno/${student.uid || student.id}`);
    }
  };
  const podeVerRelatorio = (student) =>
    student.assessmentStatus === 'completed' || student.assessmentStatus === 'analyzed';

  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Auto-open invite modal when navigated with ?invite=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('invite') === 'true') setInviteOpen(true);
  }, [location.search]);

  // Assign assessment modal
  const [assignStudent, setAssignStudent] = useState(null);
  const [assignModules, setAssignModules] = useState([]);
  const [assignModuleId, setAssignModuleId] = useState('default');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSending, setAssignSending] = useState(false);
  const [assignDone, setAssignDone] = useState(false);
  const [assignError, setAssignError] = useState('');

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  // Load groups then their members
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const load = async () => {
      if (refreshTick > 0) setRefreshing(true);
      else setLoading(true);
      try {
        const fetchedGroups = await getGroupsByAdmin(user.uid);
        if (cancelled) return;
        setGroups(fetchedGroups);

        // Fetch members for all groups in parallel
        const membersByGroup = await Promise.all(
          fetchedGroups.map(async (g) => {
            const [members, assessments] = await Promise.all([
              getUsersByGroup(g.id),
              getAssessmentsByGroup(g.id),
            ]);

            // Cruza com assessments reais para descobrir status atual
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

            return members.map((m) => {
              // Status vindo dos assessments deste grupo (pode ser null se assessment foi criado com groupId diferente)
              const fromAssessment = bestStatus[m.id] ?? bestStatus[m.uid] ?? null;
              // Status diretamente no registro do usuário (atualizado pelo wizard ao concluir)
              const fromUser = m.assessmentStatus ?? null;
              // Toma o status de maior rank entre os dois — evita que 'pending' de assessment
              // sobrescreva 'completed' já gravado em app_users.assessmentstatus
              const rankA = STATUS_RANK[fromAssessment] ?? 0;
              const rankB = STATUS_RANK[fromUser] ?? 0;
              const resolvedStatus = rankA >= rankB ? (fromAssessment ?? fromUser) : fromUser;

              return {
                ...m,
                groupId: g.id,
                groupName: g.name,
                groupColor: g.color,
                assessmentStatus: resolvedStatus,
              };
            });
          })
        );
        if (!cancelled) {
          // Deduplicate registered users by id
          const seen = new Set();
          const flat = membersByGroup.flat().filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });

          // DELTA 6: alunos avulsos (cadastrados sem grupo, vinculados via adminuid).
          // try/catch para degradar graciosamente caso a migração SQL (coluna adminuid)
          // ainda não tenha sido aplicada no Supabase.
          let avulsosNorm = [];
          try {
            const avulsos = await getAvulsosByAdmin(user.uid);
            avulsosNorm = avulsos
              .filter((u) => !seen.has(u.id) && !seen.has(u.uid))
              .map((u) => {
                seen.add(u.id);
                return {
                  ...u,
                  groupId: null,
                  groupName: null,
                  groupColor: '#A0A3B1',
                  assessmentStatus: u.assessmentStatus ?? null,
                };
              });
          } catch (e) {
            console.warn('[Students] getAvulsosByAdmin falhou (migração DELTA-6 pendente?):', e.message);
          }

          // Merge avaliados de sessão (app_avaliados), deduplicando por token
          const [avaliados, sessoes] = await Promise.all([
            getAvaliadosByAdmin(user.uid),
            getSessoesByAdmin(user.uid),
          ]);
          const sessaoMap = Object.fromEntries(sessoes.map((s) => [s.id, s]));
          const avaliadosNorm = avaliados
            .filter((a) => !seen.has(a.id)) // evita duplicar se mesmo uid
            .map((a) => ({
              id: a.id,
              token: a.token || a.id, // token = credencial p/ abrir o Relatório Oficial
              displayName: a.nome,
              email: a.email || null,
              groupName: sessaoMap[a.sessaoId]?.titulo || 'Sessão',
              groupColor: '#818CF8',
              profile: a.perfil?.perfilPrimario || null,
              assessmentStatus: a.status === 'concluido' ? 'completed'
                : a.status === 'em_andamento' ? 'in_progress'
                : 'pending',
              isAvaliado: true, // flag para exibição diferenciada
            }));

          setAllStudents([...flat, ...avulsosNorm, ...avaliadosNorm]);
        }
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        if (!cancelled) { setLoading(false); setRefreshing(false); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.uid, setGroups, refreshTick]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, groupFilter, profileFilter]);

  const handleExport = () => {
    const STATUS_LABELS = { completed: 'Concluída', analyzed: 'Concluída', submitted: 'Enviada', in_progress: 'Em andamento', pending: 'Pendente' };
    const rows = [
      ['Nome', 'E-mail', 'Grupo', 'Perfil', 'Status'],
      ...filtered.map((s) => [
        s.displayName || s.name || '',
        s.email || '',
        s.groupName || '',
        s.primaryType || s.dominantProfile || '',
        STATUS_LABELS[s.assessmentStatus] || 'Pendente',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    if (groupFilter === '__none__') {
      // Avulsos: sem grupo e que não são avaliados de sessão
      list = list.filter((s) => !s.groupId && !s.isAvaliado);
    } else if (groupFilter) {
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

  const handleOpenAssign = async (student) => {
    setAssignStudent(student);
    setAssignModuleId('default');
    setAssignDone(false);
    setAssignLoading(true);
    try {
      const mods = student.groupId ? await getModules(student.groupId) : [];
      setAssignModules(mods.filter((m) => m.status !== 'archived'));
    } catch {
      setAssignModules([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCloseAssign = () => {
    setAssignStudent(null);
    setAssignModules([]);
    setAssignModuleId('default');
    setAssignDone(false);
    setAssignError('');
  };

  const handleAssign = async () => {
    if (!assignStudent || !assignModuleId) return;
    const isDefault = assignModuleId === 'default';
    const mod = isDefault ? null : assignModules.find((m) => m.id === assignModuleId);
    setAssignSending(true);
    setAssignError('');
    try {
      await createAssessment({
        uid: assignStudent.id,
        groupId: assignStudent.groupId,
        moduleId: isDefault ? null : assignModuleId,
        moduleName: isDefault ? 'Avaliação DISC Padrão' : (mod?.title || mod?.name || 'Avaliação DISC'),
        moduleObjective: isDefault ? 'Avaliação comportamental DISC + Sabotadores' : (mod?.objective || ''),
        assignedBy: user?.uid,
      });
      setAssignDone(true);
      setAllStudents((prev) =>
        prev.map((s) => s.id === assignStudent.id ? { ...s, assessmentStatus: 'pending' } : s)
      );
      const nome = assignStudent.displayName || assignStudent.name || 'aluno(a)';
      const appUrl = `${getPublicBaseUrl()}/student/dashboard`;
      const isReeval = assignStudent.assessmentStatus === 'completed' || assignStudent.assessmentStatus === 'analyzed';
      const subject = encodeURIComponent(
        isReeval ? 'Nova reavaliação disponível no Perfil Master' : 'Você tem uma nova avaliação no Perfil Master'
      );
      const body = encodeURIComponent(
        `Olá, ${nome}!\n\n` +
        (isReeval
          ? `Uma nova avaliação comportamental DISC foi gerada para você no Perfil Master — desta vez para atualizar seu perfil.\n\n`
          : `Uma nova avaliação comportamental DISC foi atribuída para você no Perfil Master.\n\n`) +
        `Acesse o link abaixo para entrar no app e responder:\n` +
        `${appUrl}\n\n` +
        `⏱️ Tempo estimado: 10–15 minutos.\n` +
        `📊 Seus resultados são confidenciais.\n\n` +
        `Qualquer dúvida, é só responder este e-mail.\n\n` +
        `Abraços,\n${user?.displayName || 'Instrutor'}`
      );
      if (assignStudent.email) {
        window.open(`mailto:${assignStudent.email}?subject=${subject}&body=${body}`);
      }
    } catch (err) {
      console.error('Erro ao atribuir avaliação:', err);
      setAssignError(err?.message || 'Erro ao atribuir avaliação. Tente novamente.');
    } finally {
      setAssignSending(false);
    }
  };

  // Mover aluno para outro grupo (#1) — só contas de aluno (têm uid/groupId);
  // avaliados de sessão pertencem a um grupo via sessão, não via app_users.
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveGroupId, setMoveGroupId] = useState('');
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');

  const handleOpenMove = (student) => {
    setMoveError('');
    setMoveGroupId(student.groupId || '');
    setMoveTarget(student);
  };

  const handleConfirmMove = async () => {
    if (!moveTarget) return;
    const uid = moveTarget.uid || moveTarget.id;
    const novoGrupo = moveGroupId || null;       // '' → avulso (sem grupo)
    const antigoGrupo = moveTarget.groupId || null;
    if (novoGrupo === antigoGrupo) { setMoveTarget(null); return; }
    setMoving(true);
    setMoveError('');
    try {
      if (antigoGrupo) await removeMemberFromGroup(antigoGrupo, uid);
      if (novoGrupo) await addMemberToGroup(novoGrupo, uid);
      // app_users.groupid é a fonte de verdade da listagem de membros
      await updateUser(uid, { groupId: novoGrupo });
      const g = groups.find((x) => x.id === novoGrupo);
      setAllStudents((prev) =>
        prev.map((s) =>
          s.id === moveTarget.id
            ? { ...s, groupId: novoGrupo, groupName: g?.name || null, groupColor: g?.color || '#A0A3B1' }
            : s
        )
      );
      setMoveTarget(null);
    } catch (err) {
      console.error('Erro ao mover aluno:', err);
      setMoveError(err?.message || 'Não foi possível mover o aluno. Tente novamente.');
    } finally {
      setMoving(false);
    }
  };

  // Exclusão de aluno/avaliado (limpeza de testes e registros com erro)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    // Guarda dupla: nunca excluir a si mesmo nem outro admin
    if ((deleteTarget.uid || deleteTarget.id) === user?.uid || deleteTarget.role === 'admin') {
      setDeleteError('Não é possível excluir a própria conta nem outro administrador.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      if (deleteTarget.isAvaliado) {
        await deleteAvaliado(deleteTarget.id);
      } else {
        await deleteStudent(deleteTarget.uid || deleteTarget.id, deleteTarget.groupId || null);
      }
      setAllStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setDeleteError(err?.message || 'Erro ao excluir. Verifique se o DELTA 8.1 foi aplicado no Supabase.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendReminder = (student) => {
    if (!student?.email) return;
    const nome = student.displayName || student.name || 'aluno(a)';
    const status = student.assessmentStatus;
    const appUrl = `${getPublicBaseUrl()}/student/dashboard`;
    const subject = status === 'completed'
      ? 'Perfil Master — Sobre sua avaliação'
      : 'Lembrete: complete sua avaliação Perfil Master';
    const body = status === 'completed'
      ? (
        `Olá, ${nome}!\n\n` +
        `Espero que esteja bem. Estou entrando em contato sobre sua avaliação no Perfil Master.\n\n` +
        `Você pode acessar seus resultados aqui:\n${appUrl}\n\n` +
        `Abraços,\n${user?.displayName || ''}`
      )
      : (
        `Olá, ${nome}!\n\n` +
        `Vi que sua avaliação no Perfil Master ainda não foi concluída. Quando puder, acesse o link abaixo e responda — leva uns 10 minutos.\n\n` +
        `👉 ${appUrl}\n\n` +
        `⏱️ Tempo estimado: 10–15 minutos.\n` +
        `📊 Seus resultados são confidenciais.\n\n` +
        `Qualquer dúvida, é só responder este e-mail.\n\n` +
        `Abraços,\n${user?.displayName || ''}`
      );
    window.open(`mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title={t('admin.students.refreshList', 'Atualizar lista')}
            className="w-9 h-9 rounded-xl border border-[#2D3047] bg-[#1A1C2A] flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#6366F1] transition-colors disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExport}
            disabled={allStudents.length === 0}
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
          {/* Avaliação avulsa por WhatsApp (sem conta) — função migrada da antiga aba Sessões */}
          <NovoAvaliadoTrigger
            label="Avaliação avulsa"
            onClosed={handleRefresh}
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => setInviteOpen(true)}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            }
          >
            Convidar Aluno
          </Button>
        </div>
      </div>

      {/* Filters row — busca em cima, selects sempre lado a lado */}
      <div className="flex flex-col gap-2">
        <Input
          placeholder={`${t('app.search', 'Buscar')} por nome ou e-mail...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors truncate"
            aria-label={t('admin.students.group', 'Grupo')}
          >
            <option value="">{t('group.allGroups', 'Todos os grupos')}</option>
            <option value="__none__">{t('group.noGroupFilter', 'Sem grupo (avulsos)')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors truncate"
            aria-label={t('admin.students.profileType', 'Perfil')}
          >
            <option value="">{t('profiles.allProfiles', 'Todos os perfis')}</option>
            {['D', 'I', 'S', 'C'].map((p) => (
              <option key={p} value={p}>{p} — {t(`profiles.${p}.name`, p)}</option>
            ))}
            <option value="none">{t('group.noProfile', 'Sem perfil')}</option>
          </select>
        </div>
      </div>

      {/* Painel de vínculos sugeridos por CPF (F2.3) — some se não houver sugestões */}
      <IdentityLinkPanel adminUid={user?.uid} onLinked={handleRefresh} />

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
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#A0A3B1]/70 italic">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#4A4D6A]" aria-hidden="true" />
                      {t('group.noGroupShort', 'Sem grupo')}{/* i18n: group.noGroupShort */}
                    </span>
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

                {/* Actions — sempre visíveis (no celular não há hover) com label de texto */}
                <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                  <button
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors"
                    aria-label={t('app.view', 'Ver perfil')}
                    title={t('app.view', 'Ver perfil')}
                    onClick={() => { setSelectedStudent(student); setProfilePanelOpen(true); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="hidden sm:inline">Ver perfil</span>
                  </button>
                  {podeVerRelatorio(student) && (
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors"
                      aria-label="Relatório oficial"
                      title="Relatório oficial DISC"
                      onClick={() => abrirRelatorio(student)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="hidden sm:inline">Relatório</span>
                    </button>
                  )}
                  {(() => {
                    const concluido = student.assessmentStatus === 'completed' || student.assessmentStatus === 'analyzed';
                    const label = concluido ? 'Reavaliar' : t('students.assignAssessment', 'Atribuir avaliação');
                    return (
                      <button
                        className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          concluido
                            ? 'text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10'
                            : 'text-[#A0A3B1] hover:text-[#22C55E] hover:bg-[#22C55E]/10'
                        }`}
                        aria-label={label}
                        title={label}
                        onClick={() => handleOpenAssign(student)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    );
                  })()}
                  {!student.isAvaliado && student.role !== 'admin' && (
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors"
                      aria-label="Mover para outro grupo"
                      title="Mover para outro grupo"
                      onClick={() => handleOpenMove(student)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        <polyline points="13 11 16 14 13 17" />
                        <line x1="8" y1="14" x2="16" y2="14" />
                      </svg>
                      <span className="hidden sm:inline">Mover</span>
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('students.sendReminder', 'Enviar lembrete')}
                    title={t('students.sendReminder', 'Enviar lembrete')}
                    onClick={() => handleSendReminder(student)}
                    disabled={!student.email}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span className="hidden sm:inline">Lembrete</span>
                  </button>
                  {/* Lixeira: nunca para a própria conta nem para outros admins
                      (evita auto-exclusão e perda de acesso). Avaliados de sessão
                      e alunos comuns podem ser excluídos. */}
                  {!((student.uid || student.id) === user?.uid) && student.role !== 'admin' && (
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      aria-label={t('app.delete', 'Excluir')}
                      title={t('students.deleteStudent', 'Excluir aluno e seus dados')}
                      onClick={() => { setDeleteError(''); setDeleteTarget(student); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  )}
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

      {/* ── Assign Assessment Modal ─────────────────────────────────── */}
      {assignStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-assign">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3047]">
              <div>
                <h2 id="dlg-assign" className="text-base font-heading font-semibold text-[#F7F8FC]">
                  {assignStudent.assessmentStatus === 'completed' || assignStudent.assessmentStatus === 'analyzed'
                    ? 'Reavaliar aluno'
                    : t('students.assignAssessment', 'Atribuir avaliação')}
                </h2>
                <p className="text-xs text-[#A0A3B1] mt-0.5">
                  {assignStudent.displayName || assignStudent.name}
                  {assignStudent.email && ` · ${assignStudent.email}`}
                  {(assignStudent.assessmentStatus === 'completed' || assignStudent.assessmentStatus === 'analyzed') && (
                    <span className="ml-1 text-[#6366F1]">· já avaliado anteriormente</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleCloseAssign}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {assignDone ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-6 h-6">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#F7F8FC]">
                    {t('students.assignSuccess', 'Avaliação atribuída com sucesso!')}
                  </p>
                  <p className="text-xs text-[#A0A3B1]">
                    {t('students.assignEmailNote', 'O e-mail de notificação foi aberto no seu cliente de e-mail.')}
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleCloseAssign}>
                    {t('app.close', 'Fechar')}
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#A0A3B1] mb-2">
                      {t('students.selectModule', 'Selecione a avaliação')}
                    </label>
                    {assignLoading ? (
                      <div className="h-11 rounded-lg bg-[#242736] animate-pulse" />
                    ) : (
                      <select
                        value={assignModuleId}
                        onChange={(e) => setAssignModuleId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg bg-[#242736] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
                      >
                        {/* FIX M4: são 28 perguntas DISC, não 24 */}
                        <option value="default">{t('students.defaultModule', '⭐ Avaliação DISC Padrão (28 + 50 perguntas)')}</option>
                        {assignModules.length > 0 && (
                          <optgroup label="Módulos do grupo">
                            {assignModules.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title || m.name}{m.status === 'draft' ? ' (rascunho)' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    )}
                    {assignModules.length === 0 && !assignLoading && (
                      <p className="text-xs text-[#A0A3B1] mt-2">
                        {t('students.noCustomModules', 'Este grupo não tem módulos customizados. A avaliação DISC padrão será atribuída.')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-[#A0A3B1] leading-relaxed">
                    {t('students.assignNote', 'A avaliação aparecerá no dashboard do aluno assim que for atribuída. Um e-mail de notificação será aberto automaticamente.')}
                  </p>
                </>
              )}
            </div>

            {assignError && !assignDone && (
              <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                {assignError}
              </div>
            )}

            {!assignDone && (
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
                <Button variant="secondary" size="sm" onClick={handleCloseAssign}>
                  {t('app.cancel', 'Cancelar')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAssign}
                  disabled={!assignModuleId || assignSending || assignLoading}
                >
                  {assignSending
                    ? t('app.saving', 'Atribuindo...')
                    : t('students.assign', 'Atribuir avaliação')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal mover aluno para outro grupo (#1) ─────────────────── */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-move">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3047]">
              <div>
                <h2 id="dlg-move" className="text-base font-heading font-semibold text-[#F7F8FC]">
                  Mover para outro grupo
                </h2>
                <p className="text-xs text-[#A0A3B1] mt-0.5">
                  {moveTarget.displayName || moveTarget.name}
                  {moveTarget.groupName ? ` · atualmente em ${moveTarget.groupName}` : ' · sem grupo'}
                </p>
              </div>
              <button
                onClick={() => setMoveTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <label className="block text-xs font-medium text-[#A0A3B1]">Grupo de destino</label>
              <select
                value={moveGroupId}
                onChange={(e) => setMoveGroupId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-[#242736] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
              >
                <option value="">Sem grupo (avulso)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {moveError && (
                <p className="text-xs text-[#EF4444] px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">{moveError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <Button variant="secondary" size="sm" onClick={() => setMoveTarget(null)} disabled={moving}>
                {t('app.cancel', 'Cancelar')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmMove} loading={moving}>
                {moving ? 'Movendo...' : 'Mover'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmação de exclusão ───────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-del-aluno">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-del-aluno" className="text-base font-heading font-semibold text-[#F7F8FC]">
                Excluir {deleteTarget.isAvaliado ? 'avaliado' : 'aluno'}
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#A0A3B1]">
                Tem certeza que deseja excluir{' '}
                <strong className="text-[#F7F8FC]">{deleteTarget.displayName || deleteTarget.name || deleteTarget.email}</strong>?
              </p>
              <p className="text-xs text-[#A0A3B1] mt-2">
                {deleteTarget.isAvaliado
                  ? 'As respostas, o perfil e o token de avaliação serão apagados permanentemente.'
                  : 'As avaliações, o perfil DISC e o registro do aluno serão apagados permanentemente. Esta ação não pode ser desfeita.'}
              </p>
              {deleteError && (
                <p className="text-xs text-[#EF4444] mt-3 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
                  {deleteError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EF4444] hover:bg-[#C53030] text-white transition-colors disabled:opacity-60"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberProfileSlideOver
        member={selectedStudent}
        isOpen={profilePanelOpen}
        onClose={() => setProfilePanelOpen(false)}
      />

      <InviteStudentModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groups={groups}
        adminUid={user?.uid}
      />
    </div>
  );
}
