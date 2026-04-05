/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * QuestionEditor.jsx — Editor de perguntas para o TestEditorPage
 */
import { useState } from 'react';
import { Btn } from './MentorLayout.jsx';

const QUESTION_TYPES = [
  { value: 'text',            label: 'Dissertativa',        icon: '✏️' },
  { value: 'multiple_choice', label: 'Múltipla Escolha',    icon: '☑️' },
  { value: 'likert',          label: 'Escala Likert (1–5)', icon: '📊' },
];

const LIKERT_LABELS = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

export default function QuestionEditor({ questions, onChange }) {
  function addQuestion() {
    onChange([...questions, { id: `tmp_${Date.now()}`, type: 'text', content: '', options: [], required: true }]);
  }

  function updateQuestion(idx, patch) {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function removeQuestion(idx) {
    onChange(questions.filter((_, i) => i !== idx));
  }

  function moveUp(idx) {
    if (idx === 0) return;
    const next = [...questions];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx) {
    if (idx === questions.length - 1) return;
    const next = [...questions];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div>
      {questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', border: '2px dashed #e2e8f0', borderRadius: 12, color: '#94a3b8', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>❓</div>
          <div style={{ fontSize: 14 }}>Nenhuma pergunta ainda. Clique em "Adicionar Pergunta".</div>
        </div>
      )}

      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id ?? idx}
          question={q}
          index={idx}
          total={questions.length}
          onUpdate={patch => updateQuestion(idx, patch)}
          onRemove={() => removeQuestion(idx)}
          onMoveUp={() => moveUp(idx)}
          onMoveDown={() => moveDown(idx)}
        />
      ))}

      <Btn onClick={addQuestion} variant="secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
        + Adicionar Pergunta
      </Btn>
    </div>
  );
}

function QuestionCard({ question, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }) {
  const [optionInput, setOptionInput] = useState('');

  function addOption() {
    const val = optionInput.trim();
    if (!val) return;
    onUpdate({ options: [...(question.options ?? []), val] });
    setOptionInput('');
  }

  function removeOption(i) {
    onUpdate({ options: question.options.filter((_, idx) => idx !== i) });
  }

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px',
      marginBottom: 12, background: '#fff',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#6366f115', borderRadius: 6, padding: '2px 8px' }}>
          Pergunta {index + 1}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Btn variant="ghost" onClick={onMoveUp}   disabled={index === 0}     title="Mover para cima" style={{ padding: '4px 8px', fontSize: 12 }}>↑</Btn>
          <Btn variant="ghost" onClick={onMoveDown} disabled={index === total - 1} title="Mover para baixo" style={{ padding: '4px 8px', fontSize: 12 }}>↓</Btn>
          <Btn variant="danger" onClick={onRemove} style={{ padding: '4px 10px', fontSize: 12 }}>✕</Btn>
        </div>
      </div>

      {/* Tipo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {QUESTION_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => onUpdate({ type: t.value, options: t.value === 'multiple_choice' ? (question.options ?? []) : [] })}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${question.type === t.value ? '#6366f1' : '#e2e8f0'}`,
              background: question.type === t.value ? '#6366f115' : '#fff',
              color: question.type === t.value ? '#6366f1' : '#64748b',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <textarea
        value={question.content}
        onChange={e => onUpdate({ content: e.target.value })}
        placeholder="Digite o texto da pergunta..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '10px 12px', fontSize: 13, color: '#1e293b',
          resize: 'vertical', fontFamily: 'inherit', outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />

      {/* Opções (múltipla escolha) */}
      {question.type === 'multiple_choice' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Opções:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(question.options ?? []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{opt}</span>
                <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={optionInput}
              onChange={e => setOptionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
              placeholder="Adicionar opção..."
              style={{
                flex: 1, border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '7px 12px', fontSize: 13, outline: 'none',
              }}
            />
            <Btn onClick={addOption} variant="secondary" style={{ flexShrink: 0 }}>+ Opção</Btn>
          </div>
        </div>
      )}

      {/* Preview Likert */}
      {question.type === 'likert' && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1,2,3,4,5].map(v => (
            <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#94a3b8' }}>{v}</div>
              <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>{v === 1 ? 'Discordo' : v === 5 ? 'Concordo' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Obrigatória */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input
          type="checkbox"
          id={`req_${question.id ?? index}`}
          checked={question.required}
          onChange={e => onUpdate({ required: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor={`req_${question.id ?? index}`} style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
          Resposta obrigatória
        </label>
      </div>
    </div>
  );
}
