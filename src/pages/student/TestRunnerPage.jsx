/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * TestRunnerPage.jsx — Aluno responde o teste
 * Rota pública: /teste/:studentId
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase }            from '../../lib/supabase.js';
import { saveAnswers, saveResult, updateStudentStatus } from '../../lib/mentorApi.js';

const primary = '#6366f1';
const darkBg  = '#0f172a';

export default function TestRunnerPage() {
  const { studentId } = useParams();
  const navigate      = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [student,   setStudent]   = useState(null);
  const [test,      setTest]      = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [submitting,setSubmitting]= useState(false);
  const [touched,   setTouched]   = useState(false);  // mostrou warning de obrigatório

  const autoSaveTimer = useRef(null);

  /* ─── Carregamento inicial ──────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data: s, error: se } = await supabase
          .from('test_students')
          .select('*, tests(*, questions(*))')
          .eq('id', studentId)
          .single();

        if (se || !s) throw new Error('Cadastro não encontrado.');
        if (s.status === 'completed') {
          navigate(`/conclusao/${studentId}`, { replace: true });
          return;
        }

        // Marcar como em progresso
        await updateStudentStatus(studentId, 'in_progress');

        const qs = (s.tests?.questions ?? [])
          .sort((a, b) => a.order_index - b.order_index);

        setStudent(s);
        setTest(s.tests ?? {});
        setQuestions(qs);

        // Carregar respostas já salvas para retomada
        const { data: saved } = await supabase
          .from('test_answers')
          .select('question_id, answer_value')
          .eq('student_id', studentId);
        if (saved?.length) {
          const map = {};
          saved.forEach(a => { map[a.question_id] = a.answer_value; });
          setAnswers(map);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  /* ─── Auto-salvar rascunho a cada 30s ──────────────────────── */
  useEffect(() => {
    if (!student) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveAnswers(test?.id, studentId, answers).catch(() => {});
    }, 30_000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [answers]);

  /* ─── Navegar entre questões ────────────────────────────────── */
  function goNext() {
    const q = questions[current];
    if (q?.required && !answers[q.id]) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setCurrent(c => Math.min(c + 1, questions.length - 1));
  }
  function goPrev() { setTouched(false); setCurrent(c => Math.max(c - 1, 0)); }

  /* ─── Submeter ──────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    const unanswered = questions.filter(q => q.required && !answers[q.id]);
    if (unanswered.length > 0) {
      setCurrent(questions.indexOf(unanswered[0]));
      setTouched(true);
      return;
    }
    setSubmitting(true);
    try {
      await saveAnswers(test.id, studentId, answers);
      await saveResult(test.id, studentId, answers);
      await updateStudentStatus(studentId, 'completed');
      // Disparar e-mail de resultado
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke('send-result-email', {
          body: { student_id: studentId, test_id: test.id },
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
      } catch (_) { /* ignorar falha de e-mail */ }
      navigate(`/conclusao/${studentId}`, { replace: true });
    } catch (e) {
      setError('Erro ao enviar respostas: ' + e.message);
      setSubmitting(false);
    }
  }, [answers, questions, test, studentId, navigate]);

  /* ─── Render helpers ─────────────────────────────────────────── */
  const q = questions[current];
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const isLast   = current === questions.length - 1;

  function renderInput(q) {
    if (!q) return null;
    const val = answers[q.id] ?? '';

    if (q.type === 'likert') {
      const labels = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => { setAnswers(a => ({ ...a, [q.id]: String(n) })); setTouched(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: val === String(n) ? `2px solid ${primary}` : '2px solid #e2e8f0',
                background: val === String(n) ? '#eef2ff' : '#fff',
                fontFamily: 'inherit', transition: 'all .15s',
              }}
            >
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background: val===String(n)?primary:'#f1f5f9', color: val===String(n)?'#fff':'#64748b', fontWeight:700, fontSize:13, flexShrink:0 }}>{n}</span>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: val===String(n)?600:400 }}>{labels[n - 1]}</span>
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'multiple_choice') {
      const opts = Array.isArray(q.options) ? q.options : (q.options?.options ?? []);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {opts.map((opt, i) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            return (
              <button
                key={i}
                onClick={() => { setAnswers(a => ({ ...a, [q.id]: optVal })); setTouched(false); }}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: val === optVal ? `2px solid ${primary}` : '2px solid #e2e8f0',
                  background: val === optVal ? '#eef2ff' : '#fff',
                  fontFamily: 'inherit', fontSize: 13, color: '#374151',
                  fontWeight: val === optVal ? 600 : 400, transition: 'all .15s',
                }}
              >
                {typeof opt === 'string' ? opt : opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    // Text / dissertativa
    return (
      <textarea
        value={val}
        onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); setTouched(false); }}
        placeholder="Escreva sua resposta aqui…"
        rows={5}
        style={{
          width: '100%', boxSizing: 'border-box', marginTop: 8,
          border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px',
          fontSize: 14, color: '#1e293b', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
          outline: 'none',
        }}
      />
    );
  }

  /* ─── Estados de tela ────────────────────────────────────────── */
  const wrapper = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: darkBg, padding: 20,
    backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%)',
  };

  if (loading) return (
    <div style={wrapper}><div style={{ color: '#94a3b8', fontSize: 16 }}>Carregando avaliação…</div></div>
  );

  if (error) return (
    <div style={wrapper}>
      <div style={{ background:'#fff', borderRadius:16, padding:36, maxWidth:420, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Ocorreu um erro</h2>
        <p style={{ color:'#64748b', fontSize:14 }}>{error}</p>
      </div>
    </div>
  );

  if (questions.length === 0) return (
    <div style={wrapper}>
      <div style={{ background:'#fff', borderRadius:16, padding:36, maxWidth:420, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Teste sem questões</h2>
        <p style={{ color:'#64748b', fontSize:14 }}>Este teste ainda não possui questões configuradas.</p>
      </div>
    </div>
  );

  /* ─── Interface principal ────────────────────────────────────── */
  return (
    <div style={wrapper}>
      <div style={{ width: '100%', maxWidth: 620 }}>

        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            {test?.title}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Olá, <strong style={{ color: '#c7d2fe' }}>{student?.name}</strong></div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 6, marginBottom: 20 }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${primary}, #8b5cf6)`, transition: 'width .4s ease' }} />
        </div>

        {/* Card da questão */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

          {/* Número + obrigatoriedade */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding:'4px 10px', borderRadius: 20 }}>
              Questão {current + 1} de {questions.length}
            </span>
            {q?.required && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>* obrigatória</span>
            )}
          </div>

          {/* Enunciado */}
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 4, lineHeight: 1.5 }}>
            {q?.content}
          </h2>

          {/* Warning de não respondida */}
          {touched && q?.required && !answers[q?.id] && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding:'8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>
              ⚠️ Esta questão é obrigatória.
            </div>
          )}

          {/* Input da resposta */}
          {renderInput(q)}

          {/* Navegação */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={goPrev}
              disabled={current === 0}
              style={{
                padding: '10px 18px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: current===0?'not-allowed':'pointer',
                background: '#f8fafc', color: '#64748b', fontSize: 13, fontFamily:'inherit', opacity: current===0?0.5:1,
              }}
            >← Anterior</button>

            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {Math.round(progress)}% completo
            </span>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none', cursor: submitting?'not-allowed':'pointer',
                  background: submitting ? '#c7d2fe' : `linear-gradient(135deg, ${primary}, #8b5cf6)`,
                  color: '#fff', fontSize: 13, fontWeight: 700, fontFamily:'inherit',
                }}
              >{submitting ? 'Enviando…' : '✅ Concluir'}</button>
            ) : (
              <button
                onClick={goNext}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${primary}, #8b5cf6)`,
                  color: '#fff', fontSize: 13, fontWeight: 700, fontFamily:'inherit',
                }}
              >Próxima →</button>
            )}
          </div>
        </div>

        {/* Contador de respondidas */}
        <div style={{ textAlign:'center', marginTop: 16 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {Object.keys(answers).length} de {questions.length} questões respondidas
          </span>
        </div>
      </div>
    </div>
  );
}
