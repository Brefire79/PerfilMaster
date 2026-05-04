import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import {
  getGroupsByAdmin,
  createModule,
  deleteModule,
  getModule,
} from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Modal, { ConfirmModal } from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonModuleCard() {
  return (
    <div className="bg-[#242736] border border-[#2D3047] rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 rounded bg-[#2D3047]" />
          <div className="h-3 w-full rounded bg-[#2D3047]" />
        </div>
        <div className="w-16 h-5 rounded bg-[#2D3047]" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded bg-[#2D3047]" />
        <div className="h-5 w-24 rounded bg-[#2D3047]" />
      </div>
    </div>
  );
}

// ─── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({ module, groupsUsing, onDelete, onClick }) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const title =
    module.title?.['pt-BR'] ||
    module.title?.en ||
    module.title?.es ||
    module.title ||
    t('admin.modules.name', 'Módulo sem nome');

  const description =
    module.description?.['pt-BR'] ||
    module.description?.en ||
    module.description ||
    '';

  const questionCount = module.questions?.length ?? 0;
  const isPublished = module.status === 'published';
  const canDelete = groupsUsing === 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteModule(module.id);
      onDelete?.(module.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Card
        variant="default"
        hoverable
        className="cursor-pointer hover:border-[#6366F1]/30 transition-all duration-200 group"
        onClick={() => onClick?.(module.id)}
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[#F7F8FC] font-heading truncate">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-[#A0A3B1] mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            <Badge variant={isPublished ? 'active' : 'neutral'} size="sm" dot className="flex-shrink-0">
              {isPublished
                ? t('admin.modules.published', 'Publicado')
                : t('admin.modules.draft', 'Rascunho')}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" size="sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mr-1" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {questionCount} {t('module.questions', 'questões')}
            </Badge>

            {groupsUsing > 0 && (
              <Badge variant="neutral" size="sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mr-1" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {groupsUsing} {t('admin.groups.title', 'grupos')}
              </Badge>
            )}

            {module.profileModel && (
              <Badge variant="info" size="sm">
                {module.profileModel}
              </Badge>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2D3047]">
            <span className="text-xs text-[#A0A3B1]">
              {module.createdAt?.toDate
                ? module.createdAt.toDate().toLocaleDateString('pt-BR')
                : t('app.noData', '—')}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(module.id);
                }}
              >
                {t('app.edit', 'Editar')}
              </Button>

              <Button
                variant="danger"
                size="sm"
                disabled={!canDelete}
                title={
                  !canDelete
                    ? t('module.inUse', 'Este módulo está em uso por grupos')
                    : t('app.delete', 'Excluir')
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDelete) setConfirmDelete(true);
                }}
              >
                {t('app.delete', 'Excluir')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('module.deleteConfirm', 'Excluir módulo?')}
        description={t(
          'module.deleteWarning',
          'Esta ação não pode ser desfeita. O módulo e todas as questões serão removidos.'
        )}
        confirmLabel={t('app.delete', 'Excluir')}
        cancelLabel={t('app.cancel', 'Cancelar')}
        variant="danger"
        loading={deleting}
      />
    </>
  );
}

// ─── Create Module Modal ───────────────────────────────────────────────────────
function CreateModuleModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ title: '', description: '', profileModel: 'DiSC' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm({ title: '', description: '', profileModel: 'DiSC' });
    setErrors({});
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: t('errors.requiredField', 'Campo obrigatório.') });
      return;
    }
    setLoading(true);
    try {
      const newId = await createModule({
        title: { 'pt-BR': form.title.trim(), en: form.title.trim(), es: form.title.trim() },
        description: {
          'pt-BR': form.description.trim(),
          en: form.description.trim(),
          es: form.description.trim(),
        },
        profileModel: form.profileModel,
        questions: [],
        status: 'draft',
        adminUid: user?.uid,
      });
      onCreated?.({ id: newId, title: { 'pt-BR': form.title.trim() }, status: 'draft', questions: [] });
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('admin.modules.create', 'Novo Módulo')}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
            {t('app.cancel', 'Cancelar')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            {t('admin.modules.create', 'Criar Módulo')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('admin.modules.name', 'Nome do Módulo')}
          placeholder={t('module.titlePlaceholder', 'Ex: Avaliação DISC 2025')}
          value={form.title}
          onChange={(e) => {
            setForm((f) => ({ ...f, title: e.target.value }));
            if (errors.title) setErrors({});
          }}
          error={errors.title}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.modules.description', 'Descrição')}{' '}
            <span className="text-xs text-[#A0A3B1]">({t('app.optional', 'Opcional')})</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('module.descriptionPlaceholder', 'Objetivo do módulo...')}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/60 focus:border-[#6366F1] outline-none resize-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('module.profileModel', 'Modelo de Perfil')}
          </label>
          <select
            value={form.profileModel}
            onChange={(e) => setForm((f) => ({ ...f, profileModel: e.target.value }))}
            className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
          >
            {['DiSC', 'Social Style', 'OCAI', 'Custom'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Modules() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { groups, setGroups } = useGroupStore();

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Load groups to know which modules are in use
        const fetchedGroups = await getGroupsByAdmin(user.uid);
        if (cancelled) return;
        setGroups(fetchedGroups);

        // Load modules by the unique moduleIds referenced in groups
        const moduleIds = [...new Set(fetchedGroups.map((g) => g.moduleId).filter(Boolean))];
        let fetchedModules = [];
        if (moduleIds.length) {
          const results = await Promise.all(moduleIds.map((id) => getModule(id)));
          fetchedModules = results.filter(Boolean);
        }

        if (!cancelled) setModules(fetchedModules);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.uid, setGroups]);

  const groupsUsingModule = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      if (g.moduleId) map[g.moduleId] = (map[g.moduleId] || 0) + 1;
    });
    return map;
  }, [groups]);

  const handleCreated = (newModule) => {
    setModules((prev) => [newModule, ...prev]);
  };

  const handleDeleted = (moduleId) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  const handleNavigateToBuilder = (moduleId) => {
    navigate(`/admin/modules/${moduleId}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            {t('admin.modules.title', 'Módulos')}
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            {t('modules.subtitle', 'Crie e gerencie os questionários de perfil')}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateOpen(true)}
          leftIcon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          {t('admin.modules.create', 'Criar módulo')}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonModuleCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && modules.length === 0 && (
        <Card variant="default">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.5} className="w-8 h-8" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="12" y1="8" x2="16" y2="8" />
                <line x1="12" y1="12" x2="16" y2="12" />
                <line x1="12" y1="16" x2="14" y2="16" />
              </svg>
            </div>
            <h3 className="text-base font-heading font-semibold text-[#F7F8FC] mb-2">
              {t('admin.modules.noModules', 'Nenhum módulo criado ainda.')}
            </h3>
            <p className="text-sm text-[#A0A3B1] max-w-xs mb-6">
              {t('modules.createFirst', 'Crie seu primeiro módulo para atribuir aos grupos e iniciar as avaliações.')}
            </p>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              {t('admin.modules.create', 'Criar primeiro módulo')}
            </Button>
          </div>
        </Card>
      )}

      {/* Modules grid */}
      {!loading && modules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              groupsUsing={groupsUsingModule[mod.id] || 0}
              onDelete={handleDeleted}
              onClick={handleNavigateToBuilder}
            />
          ))}
        </div>
      )}

      <CreateModuleModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
