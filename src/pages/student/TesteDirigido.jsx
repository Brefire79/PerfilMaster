import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import { getCiclo, responderCiclo } from '@/firebase/firestore.js';
import { getTesteDirigido } from '@/constants/testesDirigidos.js';
import { pontuarTesteDirigido, testeDirigidoCompleto } from '@/lib/testeDirigidoScoring.js';
import TesteDirigidoForm, { TesteDirigidoResultado } from '@/components/assessment/TesteDirigidoForm.jsx';

// Canal CONTA (DELTA 26): /student/teste/:id — o aluno logado responde um
// Teste Dirigido aplicado pelo facilitador. Scoring no cliente com o mesmo
// motor do contrato; a RLS + trigger só deixam gravar respostas/resultado.
// Rascunho em localStorage por ciclo (como o wizard e o fluxo público).

const draftKey = (id) => `profileai.td.respostas.${id}`;

export default function TesteDirigido() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [ciclo, setCiclo] = useState(null);
  const [teste, setTeste] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [estado, setEstado] = useState('carregando'); // carregando | respondendo | enviando | concluido | erro
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const c = await getCiclo(id);
        if (!ativo) return;
        if (!c) { setErro('Teste não encontrado.'); setEstado('erro'); return; }
        const t = getTesteDirigido(c.moduloCodigo);
        if (!t) { setErro('Este teste não está disponível nesta versão do app.'); setEstado('erro'); return; }
        setCiclo(c); setTeste(t);
        if (c.status === 'concluido') { setEstado('concluido'); return; }
        if (c.status === 'descartado') { setErro('Este teste foi cancelado pelo facilitador.'); setEstado('erro'); return; }
        try { setRespostas(JSON.parse(localStorage.getItem(draftKey(id)) || '{}')); } catch { /* sem rascunho */ }
        setEstado('respondendo');
      } catch (e) {
        if (!ativo) return;
        setErro(e?.message || 'Não foi possível carregar o teste.');
        setEstado('erro');
      }
    })();
    return () => { ativo = false; };
  }, [id]);

  const responder = (itemId, valor) => {
    setRespostas((r) => {
      const next = { ...r, [itemId]: valor };
      try { localStorage.setItem(draftKey(id), JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  };

  const enviar = async () => {
    if (!ciclo || !teste) return;
    if (!testeDirigidoCompleto(teste.codigo, respostas)) { setErro('Responda todas as perguntas antes de enviar.'); return; }
    setEstado('enviando'); setErro('');
    try {
      const r = pontuarTesteDirigido(teste.codigo, respostas);
      const resultado = { subescalas: r.subescalas, geral: r.geral, versao: r.versao };
      await responderCiclo(ciclo.id, { respostas, resultado });
      try { localStorage.removeItem(draftKey(id)); } catch { /* ok */ }
      setCiclo({ ...ciclo, status: 'concluido', resultado });
      setEstado('concluido');
    } catch (e) {
      setErro(e?.message?.includes('colunas_protegidas') ? 'Este teste não pode mais ser alterado.' : (e?.message || 'Não foi possível enviar. Tente novamente.'));
      setEstado('respondendo');
    }
  };

  if (estado === 'carregando') {
    return <div className="max-w-2xl mx-auto px-4 py-8 space-y-3 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#1A1D2E]" />)}</div>;
  }
  if (estado === 'erro') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-[#F7F8FC] font-medium">{erro}</p>
        <Link to="/student/dashboard" className="text-[#6366F1] text-sm">Voltar ao início</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <header>
        <p className="text-xs text-[#6B6F80] uppercase tracking-wide">Teste dirigido · {teste.codigo}</p>
        <h1 className="text-xl font-heading font-bold text-[#F7F8FC]">{teste.titulo}</h1>
        <p className="text-sm text-[#A0A3B1] mt-1">{teste.foco}</p>
        {user?.displayName && estado === 'respondendo' && (
          <p className="text-xs text-[#6B6F80] mt-2">Responda pensando em como você age na maior parte das vezes, não em como gostaria de agir. Leva cerca de 3 minutos.</p>
        )}
      </header>

      {estado === 'concluido' ? (
        <>
          <TesteDirigidoResultado teste={teste} resultado={ciclo.resultado} />
          <Link to="/student/dashboard" className="block text-center text-sm text-[#6366F1]">Voltar ao início</Link>
        </>
      ) : (
        <TesteDirigidoForm
          teste={teste}
          respostas={respostas}
          onResponder={responder}
          onEnviar={enviar}
          enviando={estado === 'enviando'}
          erro={erro}
        />
      )}
    </div>
  );
}
