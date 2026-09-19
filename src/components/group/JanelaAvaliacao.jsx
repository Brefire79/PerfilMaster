import React, { useEffect, useState } from 'react';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { getGroup, updateGroup } from '@/firebase/firestore.js';
import { estadoJanela, resumoJanela, paraInputLocal, deInputLocal } from '@/lib/janela.js';

// DELTA 23 — Janela de horário da avaliação (aba Convite do grupo).
// "Todos respondem ao mesmo tempo": o facilitador marca abertura e fechamento;
// antes disso o participante vê a contagem regressiva, depois vê "encerrada".
// Quem começou dentro da janela pode terminar (tolerância de 2 h no servidor).

const ESTADO_BADGE = {
  sem_janela: { texto: 'Sem janela', variant: 'neutral' },
  antes: { texto: 'Agendada', variant: 'info' },
  aberta: { texto: 'Aberta', variant: 'success' },
  depois: { texto: 'Encerrada', variant: 'inactive' },
};

export default function JanelaAvaliacao({ groupId, onChange }) {
  const [grupo, setGrupo] = useState(null);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [, setTick] = useState(0);

  const carregar = async () => {
    if (!groupId) return;
    try {
      const g = await getGroup(groupId);
      setGrupo(g);
      setInicio(paraInputLocal(g?.janelaInicio));
      setFim(paraInputLocal(g?.janelaFim));
    } catch (e) {
      setErro(e?.message || 'Não foi possível carregar a janela.');
    }
  };

  useEffect(() => { carregar(); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Relógio de 1 min para a frase "abre em…" andar sozinha
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const salvar = async () => {
    setErro('');
    const i = deInputLocal(inicio);
    const f = deInputLocal(fim);
    if (i && f && new Date(f) <= new Date(i)) { setErro('O fechamento precisa ser depois da abertura.'); return; }
    setSalvando(true);
    try {
      await updateGroup(groupId, { janelaInicio: i, janelaFim: f });
      await carregar();
      setEditando(false);
      onChange?.({ janelaInicio: i, janelaFim: f });
    } catch (e) {
      setErro(e?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const limpar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await updateGroup(groupId, { janelaInicio: null, janelaFim: null });
      await carregar();
      setEditando(false);
      onChange?.({ janelaInicio: null, janelaFim: null });
    } catch (e) {
      setErro(e?.message || 'Não foi possível limpar.');
    } finally {
      setSalvando(false);
    }
  };

  if (!grupo) return null;
  const j = estadoJanela(grupo.janelaInicio, grupo.janelaFim);
  const badge = ESTADO_BADGE[j.estado];

  return (
    <Card variant="default">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>Janela da avaliação</CardTitle>
            <Badge variant={badge.variant} size="sm" pill>{badge.texto}</Badge>
          </div>
          <CardDescription>
            Para a turma responder junta: fora da janela ninguém inicia. Quem começou dentro pode terminar (até 2 h após o fim).
          </CardDescription>
          {!editando && (
            <p className="mt-2 text-sm text-[#F7F8FC]">{resumoJanela(grupo.janelaInicio, grupo.janelaFim)}</p>
          )}
        </div>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className="text-xs text-[#6366F1] hover:underline flex-shrink-0">
            {j.estado === 'sem_janela' ? 'Definir' : 'Editar'}
          </button>
        )}
      </div>

      {editando && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#F7F8FC]">Abre em</span>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="h-11 px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none [color-scheme:dark]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#F7F8FC]">Fecha em</span>
              <input
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="h-11 px-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none [color-scheme:dark]"
              />
            </label>
          </div>
          <p className="text-xs text-[#A0A3B1]">Horário do seu aparelho. Deixe um campo vazio para não limitar aquele lado.</p>
          {erro && <p className="text-xs text-[#EF4444]">{erro}</p>}
          <div className="flex gap-2 flex-wrap">
            <Button variant="primary" size="sm" onClick={salvar} loading={salvando}>Salvar</Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditando(false); setErro(''); carregar(); }} disabled={salvando}>Cancelar</Button>
            {j.estado !== 'sem_janela' && (
              <Button variant="outline" size="sm" onClick={limpar} disabled={salvando}>Remover janela</Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
