import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cicloPorToken, cicloResponder } from '@/firebase/functions.js';
import { isBackendDown, mensagemDeRede } from '@/firebase/http.js';
import TesteDirigidoForm, { TesteDirigidoResultado } from '@/components/assessment/TesteDirigidoForm.jsx';

// Canal LINK (DELTA 26): /teste/:token — quem recebeu o link (WhatsApp) responde
// sem conta. Dados e envio só pelas Edge públicas cicloPorToken / cicloResponder
// (token = credencial, scoring no servidor). Rascunho em localStorage por token.

const draftKey = (t) => `profileai.td.publico.${t}`;

export default function TesteDirigidoPublico() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [estado, setEstado] = useState('carregando'); // carregando | respondendo | enviando | concluido | invalido | offline
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const d = await cicloPorToken({ token });
        if (!ativo) return;
        setDados(d);
        if (d.status === 'concluido') { setEstado('concluido'); return; }
        try { setRespostas(JSON.parse(localStorage.getItem(draftKey(token)) || '{}')); } catch { /* sem rascunho */ }
        setEstado('respondendo');
      } catch (e) {
        if (!ativo) return;
        if (isBackendDown(e)) { setErro(mensagemDeRede(e)); setEstado('offline'); return; }
        setErro(e?.message || 'Link inválido ou expirado.');
        setEstado('invalido');
      }
    })();
    return () => { ativo = false; };
  }, [token]);

  const responder = (itemId, valor) => {
    setRespostas((r) => {
      const next = { ...r, [itemId]: valor };
      try { localStorage.setItem(draftKey(token), JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  };

  const enviar = async () => {
    setEstado('enviando'); setErro('');
    try {
      const r = await cicloResponder({ token, respostas });
      try { localStorage.removeItem(draftKey(token)); } catch { /* ok */ }
      setDados((d) => ({ ...d, status: 'concluido', resultado: r?.resultado || null }));
      setEstado('concluido');
    } catch (e) {
      if (isBackendDown(e)) setErro(mensagemDeRede(e));
      else if (/já foi respondido/i.test(e?.message || '')) { setEstado('concluido'); return; }
      else setErro(e?.message || 'Não foi possível enviar. Tente novamente.');
      setEstado('respondendo');
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-[#0F1117] text-[#F7F8FC]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">{children}</div>
    </div>
  );

  if (estado === 'carregando') {
    return <Shell><div className="space-y-3 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#1A1D2E]" />)}</div></Shell>;
  }
  if (estado === 'invalido' || estado === 'offline') {
    return (
      <Shell>
        <div className="py-12 text-center space-y-2">
          <p className="text-2xl">{estado === 'offline' ? '📡' : '🔗'}</p>
          <p className="font-medium">{estado === 'offline' ? 'Sem conexão com o servidor' : 'Link inválido ou expirado'}</p>
          <p className="text-sm text-[#A0A3B1]">{erro}</p>
          {estado === 'offline' && (
            <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-xl bg-[#6366F1] px-4 py-2 text-sm font-semibold">Tentar novamente</button>
          )}
        </div>
      </Shell>
    );
  }

  const teste = dados.teste;
  return (
    <Shell>
      <header>
        <p className="text-xs text-[#6B6F80] uppercase tracking-wide">Perfil Master · Teste dirigido</p>
        <h1 className="text-xl font-heading font-bold">{teste.titulo}</h1>
        <p className="text-sm text-[#A0A3B1] mt-1">{teste.foco}</p>
        {estado === 'respondendo' && (
          <p className="text-xs text-[#6B6F80] mt-2">
            {dados.nome ? `${dados.nome}, responda` : 'Responda'} pensando em como você age na maior parte das vezes, não em como gostaria de agir. Leva cerca de 3 minutos.
          </p>
        )}
      </header>

      {estado === 'concluido' ? (
        <>
          <div className="rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 p-4 text-sm">
            ✅ Respostas enviadas. Obrigado{dados.nome ? `, ${dados.nome}` : ''}! Seu facilitador vai conversar com você sobre o resultado.
          </div>
          <TesteDirigidoResultado teste={teste} resultado={dados.resultado} />
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
      <p className="text-[10px] text-[#6B6F80] text-center">Suas respostas são usadas apenas para o seu desenvolvimento, conforme a política de privacidade do Perfil Master.</p>
    </Shell>
  );
}
