import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import { getGroupsByAdmin, createGroup, updateGroup as updateGroupFirestore, getModules } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import GroupCard from '@/components/group/GroupCard.jsx';

// ─── Preset group colors ───────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { value: '#6366F1', label: 'Índigo' },
  { value: '#F43F5E', label: 'Rosa' },
  { value: '#F59E0B', label: 'Âmbar' },
  { value: '#10B981', label: 'Esmeralda' },
  { value: '#0EA5E9', label: 'Céu' },
  { value: '#8B5CF6', label: 'Violeta' },
];

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#242736] border border-[#2D3047] rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#2D3047]" />
        <div className="h-4 w-32 rounded bg-[#2D3047]" />
      </div>
      <div className="h-3 w-full rounded bg-[#2D3047]" />
      <div className="h-3 w-2/3 rounded bg-[#2D3047]" />
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-[#2D3047] border-2 border-[#242736]"
            />
          ))}
        </div>
        <div className="h-5 w-20 rounded bg-[#2D3047]" />
      </div>
    </div>
  );
}

// ─── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ isOpen, onClose, onCreated, modules }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    description: '',
    moduleId: '',
    color: COLOR_PRESETS[0].value,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();

  const reset = () => {
    setForm({ name: '', description: '', moduleId: '', color: COLOR_PRESETS[0].value });
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = t('errors.requiredField', 'Este campo é obrigatório.');
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const newId = await createGroup({
        name: form.name.trim(),
        description: form.description.trim(),
        moduleId: form.moduleId || null,
        color: form.color,
        adminUid: user?.uid,
      });
      onCreated?.({ id: newId, ...form, adminUid: user?.uid, memberIds: [] });
      handleClose();
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('admin.groups.create', 'Novo Grupo')}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
            {t('app.cancel', 'Cancelar')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            type="submit"
          >
            {t('admin.groups.create', 'Criar Grupo')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('admin.groups.name', 'Nome do Grupo')}
          placeholder="Ex: Turma A - Marketing"
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }));
            if (errors.name) setErrors((er) => ({ ...er, name: '' }));
          }}
          error={errors.name}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.groups.description', 'Descrição')}{' '}
            <span className="text-xs text-[#A0A3B1]">
              ({t('app.optional', 'Opcional')})
            </span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descreva o objetivo deste grupo..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/60 focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors resize-none"
          />
        </div>

        {/* Module selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.modules.title', 'Módulo')}{' '}
            <span className="text-xs text-[#A0A3B1]">
              ({t('app.optional', 'Opcional')})
            </span>
          </label>
          <select
            value={form.moduleId}
            onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
            className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors"
          >
            <option value="">
              {t('group.noModule', '— Sem módulo —')}
            </option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title?.['pt-BR'] || m.title?.en || m.title || m.id}
              </option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('group.color', 'Cor do grupo')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: preset.value }))}
                className={clsx(
                  'w-8 h-8 rounded-full transition-all border-2',
                  form.color === preset.value
                    ? 'border-[#F7F8FC] scale-110 shadow-lg'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
                style={{ backgroundColor: preset.value }}
                aria-label={preset.label}
                title={preset.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Group Modal ──────────────────────────────────────────────────────────
function EditGroupModal({ isOpen, onClose, group, onUpdated, modules }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', description: '', moduleId: '', color: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        moduleId: group.moduleId || '',
        color: group.color || COLOR_PRESETS[0].value,
      });
      setErrors({});
    }
  }, [group]);

  const { updateGroup: updateGroupStore } = useGroupStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: t('errors.requiredField') });
      return;
    }
    setLoading(true);
    try {
      const updates = {
        name: form.name.trim(),
        description: form.description.trim(),
        moduleId: form.moduleId || null,
        color: form.color,
      };
      await updateGroupFirestore(group.id, updates);
      updateGroupStore(group.id, updates);
      onUpdated?.({ ...group, ...updates });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('app.edit', 'Editar') + ' — ' + group.name}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {t('app.cancel', 'Cancelar')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            {t('app.save', 'Salvar')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('admin.groups.name', 'Nome do Grupo')}
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }));
            if (errors.name) setErrors({});
          }}
          error={errors.name}
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.modules.title', 'Módulo')}
          </label>
          <select
            value={form.moduleId}
            onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
            className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
          >
            <option value="">{t('group.noModule', '— Sem módulo —')}</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title?.['pt-BR'] || m.title?.en || m.id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('group.color', 'Cor do grupo')}
          </label>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: preset.value }))}
                className={clsx(
                  'w-8 h-8 rounded-full transition-all border-2',
                  form.color === preset.value
                    ? 'border-[#F7F8FC] scale-110'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
                style={{ backgroundColor: preset.value }}
                aria-label={preset.label}
                title={preset.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Groups() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, setGroups, addGroup, updateGroup: updateGroupStore } = useGroupStore();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [modules, setModules] = useState([]);

  // Fetch groups and modules on mount
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedGroups, fetchedModules] = await Promise.all([
          getGroupsByAdmin(user.uid),
          getModules(null).catch(() => []),
        ]);
        if (!cancelled) {
          setGroups(fetchedGroups);
          setModules(Array.isArray(fetchedModules) ? fetchedModules : []);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [user?.uid, setGroups]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, search]);

  const handleCreated = (newGroup) => {
    addGroup(newGroup);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            {t('admin.groups.title', 'Grupos')}
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            {t('admin.groups.subtitle', 'Gerencie seus grupos de alunos')}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateOpen(true)}
          leftIcon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          {t('admin.groups.create', 'Criar grupo')}
        </Button>
      </div>

      {/* Search bar */}
      <Input
        placeholder={`${t('app.search', 'Buscar')} grupos...`}
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

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <Card variant="default">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366F1"
                strokeWidth={1.5}
                className="w-8 h-8"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            </div>
            <h3 className="text-base font-heading font-semibold text-[#F7F8FC] mb-2">
              {t('admin.groups.noGroups', 'Nenhum grupo criado ainda.')}
            </h3>
            <p className="text-sm text-[#A0A3B1] max-w-xs mb-6">
              {t(
                'admin.groups.createFirst',
                'Crie seu primeiro grupo para organizar os alunos e iniciar as avaliações.'
              )}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateOpen(true)}
            >
              {t('admin.groups.create', 'Criar primeiro grupo')}
            </Button>
          </div>
        </Card>
      )}

      {/* No search results */}
      {!loading && groups.length > 0 && filtered.length === 0 && (
        <Card variant="default">
          <div className="py-12 text-center">
            <p className="text-[#A0A3B1] text-sm">
              {t('app.noData', 'Nenhum resultado encontrado')}
            </p>
          </div>
        </Card>
      )}

      {/* Groups grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={(g) => setEditGroup(g)}
              onDeleted={() => {}}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateGroupModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        modules={modules}
      />

      {/* Edit modal */}
      <EditGroupModal
        isOpen={!!editGroup}
        onClose={() => setEditGroup(null)}
        group={editGroup}
        onUpdated={(updated) => updateGroupStore(updated.id, updated)}
        modules={modules}
      />
    </div>
  );
}
