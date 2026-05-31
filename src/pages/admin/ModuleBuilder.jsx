import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import { getModule, createModule, updateModule } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Input from '@/components/ui/Input.jsx';

// ─── Constants ─────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { key: 'pt-BR', label: 'PT' },
  { key: 'en',   label: 'EN' },
  { key: 'es',   label: 'ES' },
];

const PROFILE_MODELS = ['DiSC', 'Social Style', 'OCAI', 'Custom'];

const DIMENSIONS = [
  { key: 'D', color: '#EF4444', label: 'Dominance' },
  { key: 'I', color: '#F59E0B', label: 'Influence' },
  { key: 'S', color: '#22C55E', label: 'Steadiness' },
  { key: 'C', color: '#6366F1', label: 'Conscientiousness' },
];

const QUESTION_TYPES = [
  { key: 'likert5',         label: 'Likert 5' },
  { key: 'forced_choice',  label: 'Escolha forçada' },
  { key: 'scenario',       label: 'Cenário' },
];

const DIFFICULTIES = [
  { key: 1, label: 'Básico' },
  { key: 2, label: 'Intermediário' },
  { key: 3, label: 'Avançado' },
];

const AUTO_SAVE_DELAY = 1500; // ms

// ─── Language tab bar ──────────────────────────────────────────────────────────
function LangTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.key}
          type="button"
          onClick={() => onChange(lang.key)}
          className={clsx(
            'h-7 px-3 text-xs font-medium rounded-lg transition-colors',
            active === lang.key
              ? 'bg-[#6366F1] text-white'
              : 'text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047]'
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

// ─── Dimension selector ────────────────────────────────────────────────────────
function DimensionSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {DIMENSIONS.map((d) => (
        <button
          key={d.key}
          type="button"
          title={d.label}
          onClick={() => onChange(d.key)}
          className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-mono transition-all border-2',
            value === d.key ? 'border-current scale-110' : 'border-transparent opacity-50 hover:opacity-80'
          )}
          style={{
            backgroundColor: `${d.color}20`,
            color: d.color,
            borderColor: value === d.key ? d.color : 'transparent',
          }}
        >
          {d.key}
        </button>
      ))}
    </div>
  );
}

// ─── Option editor ─────────────────────────────────────────────────────────────
function OptionEditor({ options = [], lang, onChange }) {
  const { t } = useTranslation();

  const handleTextChange = (idx, val) => {
    const next = options.map((o, i) =>
      i === idx ? { ...o, text: { ...o.text, [lang]: val } } : o
    );
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...options, { id: crypto.randomUUID(), text: { 'pt-BR': '', en: '', es: '' } }]);
  };

  const handleRemove = (idx) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <div key={opt.id || idx} className="flex items-center gap-2">
          <span className="w-5 h-5 rounded flex items-center justify-center text-xs text-[#A0A3B1] flex-shrink-0 font-mono">
            {String.fromCharCode(65 + idx)}
          </span>
          <input
            type="text"
            value={opt.text?.[lang] || ''}
            onChange={(e) => handleTextChange(idx, e.target.value)}
            placeholder={`${t('module.option', 'Opção')} ${String.fromCharCode(65 + idx)}`}
            className="flex-1 h-9 px-3 rounded-lg bg-[#0F1117] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/50 focus:border-[#6366F1] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex-shrink-0"
            aria-label="Remover opção"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors mt-1"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('module.addOption', 'Adicionar opção')}
      </button>
    </div>
  );
}

// ─── Question form ─────────────────────────────────────────────────────────────
function QuestionForm({ question, onSave, onCancel }) {
  const { t } = useTranslation();
  const [lang, setLang] = useState('pt-BR');
  const [form, setForm] = useState(() => ({
    id: question?.id || crypto.randomUUID(),
    dimension: question?.dimension || 'D',
    difficulty: question?.difficulty || 1,
    type: question?.type || 'likert5',
    text: question?.text || { 'pt-BR': '', en: '', es: '' },
    options: question?.options || [],
    weight: question?.weight ?? 1.0,
  }));
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.text?.['pt-BR']?.trim()) {
      errs.text = t('errors.requiredField', 'Campo obrigatório.');
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  };

  const dim = DIMENSIONS.find((d) => d.key === form.dimension);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-[#1A1D2E] rounded-2xl border border-[#6366F1]/30">
      {/* Dimension + Difficulty + Type */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2 block">
            {t('module.dimension', 'Dimensão')}
          </label>
          <DimensionSelector value={form.dimension} onChange={(v) => setForm((f) => ({ ...f, dimension: v }))} />
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2 block">
            {t('module.difficulty', 'Dificuldade')}
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, difficulty: d.key }))}
                className={clsx(
                  'h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                  form.difficulty === d.key
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#242736] text-[#A0A3B1] hover:text-[#F7F8FC]'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2 block">
            {t('module.type', 'Tipo')}
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="h-9 w-full px-3 rounded-lg bg-[#242736] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt.key} value={qt.key}>{qt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question text */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
            {t('module.questionText', 'Enunciado')}
          </label>
          <LangTabs active={lang} onChange={setLang} />
        </div>
        <textarea
          value={form.text?.[lang] || ''}
          onChange={(e) => {
            setForm((f) => ({ ...f, text: { ...f.text, [lang]: e.target.value } }));
            if (errors.text && lang === 'pt-BR') setErrors({});
          }}
          placeholder={t('module.questionPlaceholder', 'Digite o enunciado da questão...')}
          rows={3}
          className={clsx(
            'w-full px-4 py-3 rounded-lg bg-[#0F1117] border text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/50 focus:border-[#6366F1] outline-none resize-none transition-colors',
            errors.text ? 'border-[#EF4444]' : 'border-[#2D3047]'
          )}
        />
        {errors.text && <p className="text-xs text-[#EF4444] mt-1">{errors.text}</p>}
      </div>

      {/* Options */}
      <div>
        <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2 block">
          {t('module.options', 'Opções')}
        </label>
        <OptionEditor
          options={form.options}
          lang={lang}
          onChange={(opts) => setForm((f) => ({ ...f, options: opts }))}
        />
      </div>

      {/* Weight */}
      <div>
        <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-2 block">
          {t('module.weight', 'Peso')}: <span className="text-[#F7F8FC]">{form.weight}</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.5}
          value={form.weight}
          onChange={(e) => setForm((f) => ({ ...f, weight: parseFloat(e.target.value) }))}
          className="w-full accent-[#6366F1]"
        />
        <div className="flex justify-between text-xs text-[#A0A3B1] mt-1">
          <span>0.5</span><span>1.0</span><span>1.5</span><span>2.0</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          {t('app.cancel', 'Cancelar')}
        </Button>
        <Button variant="primary" size="sm" type="submit">
          {question ? t('app.save', 'Salvar') : t('module.addQuestion', 'Adicionar questão')}
        </Button>
      </div>
    </form>
  );
}

// ─── Question card (list item) ─────────────────────────────────────────────────
function QuestionItem({ question, index, total, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const { t } = useTranslation();
  const dim = DIMENSIONS.find((d) => d.key === question.dimension);
  const type = QUESTION_TYPES.find((qt) => qt.key === question.type);
  const diff = DIFFICULTIES.find((d) => d.key === question.difficulty);
  const text = question.text?.['pt-BR'] || question.text?.en || '';

  return (
    <div className="group flex items-start gap-3 p-4 bg-[#1A1D2E] rounded-xl border border-[#2D3047] hover:border-[#6366F1]/30 transition-all">
      {/* Up/down arrows */}
      <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="w-6 h-6 rounded flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] disabled:opacity-25 transition-colors"
          aria-label="Mover para cima"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="w-6 h-6 rounded flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] disabled:opacity-25 transition-colors"
          aria-label="Mover para baixo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Number */}
      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-[#242736] text-xs font-mono text-[#A0A3B1] flex items-center justify-center mt-0.5">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F7F8FC] line-clamp-2">{text || t('app.noData', '—')}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {dim && (
            <span
              className="inline-flex items-center h-5 px-2 rounded text-xs font-bold font-mono"
              style={{ backgroundColor: `${dim.color}20`, color: dim.color }}
            >
              {dim.key}
            </span>
          )}
          {diff && (
            <Badge variant="neutral" size="sm">{diff.label}</Badge>
          )}
          {type && (
            <Badge variant="accent" size="sm">{type.label}</Badge>
          )}
          <span className="text-xs text-[#A0A3B1]">
            {t('module.weight', 'Peso')}: {question.weight ?? 1}
          </span>
        </div>
      </div>

      {/* Edit / delete */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(index)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors"
          aria-label={t('app.edit', 'Editar')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          aria-label={t('app.delete', 'Excluir')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ModuleBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autoSaveTimerRef = useRef(null);

  // ─── Module meta ────────────────────────────────────────────────────────────
  const [langMeta, setLangMeta] = useState('pt-BR');
  const [title, setTitle] = useState({ 'pt-BR': '', en: '', es: '' });
  const [description, setDescription] = useState({ 'pt-BR': '', en: '', es: '' });
  const [objective, setObjective] = useState('');
  const [profileModel, setProfileModel] = useState('DiSC');
  const [status, setStatus] = useState('draft');

  // ─── Questions ──────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [moduleId, setModuleId] = useState(id === 'new' ? null : id);

  // ─── Load existing module ────────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const mod = await getModule(id);
        if (cancelled || !mod) return;
        setTitle(mod.title || { 'pt-BR': '', en: '', es: '' });
        setDescription(mod.description || { 'pt-BR': '', en: '', es: '' });
        setObjective(mod.objective || '');
        setProfileModel(mod.profileModel || 'DiSC');
        setStatus(mod.status || 'draft');
        setQuestions(mod.questions || []);
        setModuleId(mod.id);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isNew]);

  // ─── Auto-save ───────────────────────────────────────────────────────────────
  const getPayload = useCallback(() => ({
    title, description, objective, profileModel, questions, status,
    adminUid: user?.uid,
  }), [title, description, objective, profileModel, questions, status, user?.uid]);

  const persist = useCallback(async (payload) => {
    setSaveStatus('saving');
    try {
      if (moduleId) {
        await updateModule(moduleId, payload);
      } else {
        const newId = await createModule(payload);
        setModuleId(newId);
        navigate(`/admin/modules/${newId}`, { replace: true });
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  }, [moduleId, navigate]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persist(getPayload());
    }, AUTO_SAVE_DELAY);
  }, [persist, getPayload]);

  useEffect(() => {
    if (!loading && !isNew) scheduleAutoSave();
  }, [title, description, objective, profileModel, questions, loading, isNew, scheduleAutoSave]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  const handleSaveNow = () => persist(getPayload());
  const handlePublish = () => {
    setStatus('published');
    persist({ ...getPayload(), status: 'published' });
  };

  // ─── Question management ─────────────────────────────────────────────────────
  const handleAddQuestion = (q) => {
    setQuestions((prev) => [...prev, q]);
    setAddingQuestion(false);
  };

  const handleEditQuestion = (q) => {
    setQuestions((prev) => prev.map((item, i) => (i === editingIndex ? q : item)));
    setEditingIndex(null);
  };

  const handleDeleteQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleMoveDown = (idx) => {
    setQuestions((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-[#242736]" />
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-4">
            {[0,1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-[#242736]" />)}
          </div>
          <div className="h-96 rounded-2xl bg-[#242736]" />
        </div>
      </div>
    );
  }

  const titleDisplay = title?.['pt-BR'] || title?.en || t('admin.modules.name', 'Módulo sem nome');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate('/admin/modules')}
            className="p-2 rounded-xl text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors flex-shrink-0"
            aria-label={t('app.back', 'Voltar')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {/* Editable title */}
          <input
            value={title?.['pt-BR'] || ''}
            onChange={(e) => setTitle((t) => ({ ...t, 'pt-BR': e.target.value }))}
            placeholder={t('admin.modules.name', 'Nome do módulo')}
            className="flex-1 min-w-0 bg-transparent text-2xl font-heading font-bold text-[#F7F8FC] focus:outline-none border-b-2 border-transparent focus:border-[#6366F1] transition-colors placeholder:text-[#2D3047]"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          <span className={clsx(
            'text-xs flex items-center gap-1.5 transition-opacity',
            saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
          )}>
            {saveStatus === 'saving' && (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-[#A0A3B1]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-[#A0A3B1]">{t('app.saving', 'Salvando...')}</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-3.5 h-3.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-[#22C55E]">{t('module.saved', 'Salvo')}</span>
              </>
            )}
          </span>

          <Button variant="secondary" size="sm" onClick={handleSaveNow} loading={saveStatus === 'saving'}>
            {t('app.save', 'Salvar')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={status === 'published'}
          >
            {status === 'published' ? t('admin.modules.published', 'Publicado') : t('module.publish', 'Publicar')}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Left panel: module settings ── */}
        <div className="space-y-4">
          <Card variant="default">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#F7F8FC] flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                {t('module.settings', 'Configurações do Módulo')}
              </h3>

              {/* Title per lang */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
                    {t('admin.modules.name', 'Título')}
                  </label>
                  <LangTabs active={langMeta} onChange={setLangMeta} />
                </div>
                <input
                  value={title?.[langMeta] || ''}
                  onChange={(e) => setTitle((v) => ({ ...v, [langMeta]: e.target.value }))}
                  placeholder={t('module.titlePlaceholder', 'Título do módulo')}
                  className="w-full h-9 px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] placeholder:text-[#A0A3B1]/50 focus:border-[#6366F1] outline-none transition-colors"
                />
              </div>

              {/* Description per lang */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider">
                    {t('admin.modules.description', 'Descrição')}
                  </label>
                </div>
                <textarea
                  value={description?.[langMeta] || ''}
                  onChange={(e) => setDescription((v) => ({ ...v, [langMeta]: e.target.value }))}
                  placeholder={t('module.descriptionPlaceholder', 'Descrição...')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] placeholder:text-[#A0A3B1]/50 focus:border-[#6366F1] outline-none resize-none transition-colors"
                />
              </div>

              {/* Objective */}
              <div>
                <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-1.5 block">
                  {t('module.objective', 'Objetivo (para IA)')}
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder={t('module.objectivePlaceholder', 'Ex: Identificar perfil de liderança...')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] placeholder:text-[#A0A3B1]/50 focus:border-[#6366F1] outline-none resize-none transition-colors"
                />
              </div>

              {/* Profile model */}
              <div>
                <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-1.5 block">
                  {t('module.profileModel', 'Modelo de Perfil')}
                </label>
                <select
                  value={profileModel}
                  onChange={(e) => setProfileModel(e.target.value)}
                  className="h-9 w-full px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
                >
                  {PROFILE_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card variant="default">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider">
                {t('module.stats', 'Estatísticas')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {DIMENSIONS.map((d) => {
                  const count = questions.filter((q) => q.dimension === d.key).length;
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded font-bold font-mono text-xs flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${d.color}20`, color: d.color }}
                      >
                        {d.key}
                      </span>
                      <span className="text-sm text-[#F7F8FC]">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-[#2D3047]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A0A3B1]">{t('module.total', 'Total de questões')}</span>
                  <span className="text-[#F7F8FC] font-semibold">{questions.length}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right panel: question builder ── */}
        <div className="space-y-4">
          {/* Add question button */}
          {!addingQuestion && editingIndex === null && (
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setAddingQuestion(true)}
              leftIcon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              {t('module.addQuestion', 'Adicionar questão')}
            </Button>
          )}

          {/* Add question form */}
          {addingQuestion && (
            <QuestionForm
              onSave={handleAddQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          )}

          {/* Question list */}
          {questions.length === 0 && !addingQuestion ? (
            <Card variant="default">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#242736] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-6 h-6" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-[#A0A3B1] text-sm">
                  {t('module.noQuestions', 'Nenhuma questão adicionada ainda.')}
                </p>
                <p className="text-[#A0A3B1] text-xs mt-1">
                  {t('module.addFirstQuestion', 'Clique em "Adicionar questão" para começar.')}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) =>
                editingIndex === idx ? (
                  <QuestionForm
                    key={q.id || idx}
                    question={q}
                    onSave={handleEditQuestion}
                    onCancel={() => setEditingIndex(null)}
                  />
                ) : (
                  <QuestionItem
                    key={q.id || idx}
                    question={q}
                    index={idx}
                    total={questions.length}
                    onEdit={setEditingIndex}
                    onDelete={handleDeleteQuestion}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
