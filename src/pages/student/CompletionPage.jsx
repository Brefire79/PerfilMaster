/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * CompletionPage.jsx — Tela de conclusão do teste
 * Rota pública: /conclusao/:studentId
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

const primary = '#6366f1';
const darkBg  = '#0f172a';

export default function CompletionPage() {
  const { studentId } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase
          .from('test_students')
          .select('name, email, tests(title, completion_message)')
          .eq('id', studentId)
          .single();
        if (s) setData(s);
      } catch (_) { /* ignora */ }
      finally { setLoading(false); }
    })();
  }, [studentId]);

  const completionMessage = data?.tests?.completion_message
    ?? 'Obrigado por concluir a avaliação! Você receberá o resultado por e-mail em breve.';

  const wrapper = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: darkBg, padding: 20,
    backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%)',
  };

  if (loading) return (
    <div style={wrapper}><div style={{ color: '#94a3b8' }}>Carregando…</div></div>
  );

  return (
    <div style={wrapper}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px',
        maxWidth: 480, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>

        {/* Ícone animado */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 80, height: 80, borderRadius: '50%', marginBottom: 20,
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
          fontSize: 40,
          animation: 'none',
          boxShadow: '0 0 0 12px #ecfdf5',
        }}>✅</div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
          Avaliação Concluída!
        </h1>

        {data?.name && (
          <p style={{ fontSize: 15, color: '#64748b', marginBottom: 8 }}>
            Parabéns, <strong style={{ color: '#1e293b' }}>{data.name}</strong>!
          </p>
        )}

        {data?.tests?.title && (
          <div style={{
            display: 'inline-block', background: '#f1f5f9', borderRadius: 20,
            padding: '5px 14px', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 20,
          }}>
            📋 {data.tests.title}
          </div>
        )}

        {/* Mensagem personalizada */}
        <div style={{
          background: '#f8fafc', borderRadius: 12, padding: '18px 20px',
          marginBottom: 24, borderLeft: `4px solid ${primary}`,
        }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            {completionMessage}
          </p>
        </div>

        {/* E-mail info */}
        {data?.email && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#eef2ff', borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          }}>
            <span style={{ fontSize: 16 }}>📧</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Resultados serão enviados para:</div>
              <div style={{ fontSize: 13, color: '#3730a3', fontWeight: 700 }}>{data.email}</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            O que acontece agora?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              { icon: '📊', text: 'Suas respostas foram salvas com segurança' },
              { icon: '🔍', text: 'O mentor irá analisar seu perfil' },
              { icon: '📧', text: 'Você receberá o resultado por e-mail' },
              { icon: '💬', text: 'Um feedback personalizado pode ser agendado' },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'#f8fafc', borderRadius:8 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: '#374151' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Você já pode fechar esta janela.
        </p>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 11, color: '#cbd5e1' }}>
            ProfileAI · AMB FUSI
          </p>
        </div>
      </div>
    </div>
  );
}
