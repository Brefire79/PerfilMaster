import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import PhoneInput from '@/components/ui/PhoneInput.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import {
  getInvite, getInviteUses, updateInvite, getUsersByGroup, getAvaliadosByAdmin, getAssessmentsByGroupIds,
} from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';

// DELTA 22 — painel do convite empresarial: vagas em tempo real, quem entrou,
// ajustar/pausar/encerrar, contato da empresa. Renderizado dentro da aba
// Convite (InviteLink) quando existe um convite ativo.
//
// "Tempo real" = polling a cada 30 s com a aba visível (o app não usa realtime
// do Supabase; 1 leitura leve por meio minuto não pesa no Free tier).

const POLL_MS = 30_000;

const STATUS_LABEL = {
  ativo: { texto: 'Ativo', variant: 'success' },
  pausado: { texto: 'Pausado', variant: 'warning' },
  encerrado: { texto: 'Encerrado', variant: 'inactive' },
};

function formatarData(d) {
  const dt = d?.toDate ? d.toDate() : (d ? new Date(d) : null);
  if (!dt || Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatarTelefone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  const local = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return d;
}

// Situação da avaliação de quem entrou — o que conta é a avaliação DESTA turma
// (app_assessments.groupid = grupo do convite). Quem já tinha perfil de antes
// (conta antiga) aparece como "Perfil anterior", não como concluído: para a
// empresa, ele ainda não respondeu. Avulso → app_avaliados.status.
function situacao(uso, mapaContas, mapaAvaliados) {
  if (uso.kind === 'conta') {
    const s = mapaContas.get(uso.uid);
    if (s === 'concluiu') return { texto: 'Concluiu', variant: 'success' };
    if (s === 'em_andamento') return { texto: 'Em andamento', variant: 'info' };
    if (s === 'anterior') return { texto: 'Perfil anterior', variant: 'warning' };
    return { texto: 'Não iniciou', variant: 'neutral' };
  }
  const s = mapaAvaliados.get(uso.avaliadoToken);
  if (s === 'concluido') return { texto: 'Concluiu', variant: 'success' };
  if (s === 'em_andamento') return { texto: 'Em andamento', variant: 'info' };
  return { texto: 'Não iniciou', variant: 'neutral' };
}

export default function InviteSeats({ token, groupId, onInviteChange }) {
  const { user } = useAuthStore();
  const [invite, setInvite] = useState(null);
  const [usos, setUsos] = useState([]);
  const [mapaContas, setMapaContas] = useState(new Map());
  const [mapaAvaliados, setMapaAvaliados] = useState(new Map());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [editandoContato, setEditandoContato] = useState(false);
  const [contato, setContato] = useState({ contactName: '', contactEmail: '', contactPhone: '' });
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const timer = useRef(null);

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    if (!token) return;
    if (!silencioso) setCarregando(true);
    try {
      const inv = await getInvite(token);
      setInvite(inv);
      if (inv?.id) {
        const [lista, membros, avaliados, porGrupo] = await Promise.all([
          getInviteUses(inv.id).catch(() => []),
          groupId ? getUsersByGroup(groupId).catch(() => []) : [],
          user?.uid ? getAvaliadosByAdmin(user.uid).catch(() => []) : [],
          groupId ? getAssessmentsByGroupIds([groupId]).catch(() => new Map()) : new Map(),
        ]);
        setUsos(lista);
        // Avaliações feitas NESTE grupo decidem; o status geral da conta só
        // distingue "perfil anterior" de "não iniciou".
        const doGrupo = porGrupo.get(groupId) || [];
        const porUid = new Map();
        for (const a of doGrupo) {
          const fez = ['submitted', 'analyzed', 'completed'].includes(a.status);
          const atual = porUid.get(a.uid);
          if (fez) porUid.set(a.uid, 'concluiu');
          else if (atual !== 'concluiu') porUid.set(a.uid, 'em_andamento');
        }
        for (const m of membros || []) {
          if (!porUid.has(m.uid) && m.assessmentStatus === 'completed') porUid.set(m.uid, 'anterior');
        }
        setMapaContas(porUid);
        setMapaAvaliados(new Map((avaliados || []).map((a) => [a.token, a.status])));
      }
      setAtualizadoEm(new Date());
      setErro('');
    } catch (e) {
      setErro(e?.message || 'Não foi possível carregar o convite.');
    } finally {
      setCarregando(false);
    }
  }, [token, groupId, user?.uid]);

  // Primeira carga + polling só com a aba visível
  useEffect(() => {
    carregar();
    const tick = () => { if (document.visibilityState === 'visible') carregar({ silencioso: true }); };
    timer.current = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer.current); document.removeEventListener('visibilitychange', tick); };
  }, [carregar]);

  useEffect(() => {
    if (!invite) return;
    setContato({
      contactName: invite.contactName || '',
      contactEmail: invite.contactEmail || '',
      contactPhone: invite.contactPhone || '',
    });
  }, [invite?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const usadas = Number(invite?.useCount ?? 0);
  const limite = invite?.maxUses ?? null;
  const restantes = limite == null ? null : Math.max(0, limite - usadas);
  const pct = limite ? Math.min(100, Math.round((usadas / limite) * 100)) : 0;
  const status = invite?.status || 'ativo';
  const empresarial = limite != null || !!invite?.label || !!invite?.contactName;

  const aplicar = async (patch) => {
    if (!invite || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await updateInvite(token, patch);
      await carregar({ silencioso: true });
      onInviteChange?.();
    } catch (e) {
      setErro(e?.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const ajustarVagas = (delta) => {
    const atual = limite == null ? usadas : limite;
    const novo = Math.max(usadas, atual + delta); // nunca abaixo do já usado
    aplicar({ maxUses: novo });
  };

  const concluidos = useMemo(
    () => usos.filter((u) => situacao(u, mapaContas, mapaAvaliados).texto === 'Concluiu').length,
    [usos, mapaContas, mapaAvaliados],
  );

  if (!token) return null;
  if (carregando && !invite) {
    return <Card variant="default"><p className="text-sm text-[#A0A3B1]">Carregando vagas…</p></Card>;
  }
  if (!invite) return null;

  return (
    <>
      {/* Vagas + status + controles */}
      <Card variant="default">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-[#F7F8FC]">
                  {invite.label || 'Vagas do convite'}
                </p>
                <Badge variant={STATUS_LABEL[status]?.variant || 'neutral'} size="sm" pill>
                  {STATUS_LABEL[status]?.texto || status}
                </Badge>
              </div>
              <p className="text-2xl font-heading font-bold text-[#F7F8FC] mt-1">
                {limite == null ? (
                  <>{usadas} <span className="text-sm font-normal text-[#A0A3B1]">cadastros · sem limite</span></>
                ) : (
                  <>{usadas} <span className="text-sm font-normal text-[#A0A3B1]">de {limite} vagas usadas</span></>
                )}
              </p>
              <p className="text-xs text-[#A0A3B1]">
                {concluidos} {concluidos === 1 ? 'concluiu' : 'concluíram'} a avaliação
                {limite != null && restantes === 0 && <span className="text-[#F59E0B]"> · esgotado</span>}
                {atualizadoEm && <span> · atualizado {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => carregar({ silencioso: true })}
              className="text-xs text-[#6366F1] hover:underline"
            >
              Atualizar agora
            </button>
          </div>

          {limite != null && (
            <div className="h-2 rounded-full bg-[#2D3047] overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-500', restantes === 0 ? 'bg-[#F59E0B]' : 'bg-[#6366F1]')}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {status !== 'encerrado' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#A0A3B1] mr-1">Vagas:</span>
              {[-5, -1, +1, +5].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={salvando || (d < 0 && (limite == null || limite + d < usadas))}
                  onClick={() => ajustarVagas(d)}
                  className="h-8 min-w-[2.5rem] px-2 rounded-lg text-xs font-semibold bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] hover:border-[#6366F1] disabled:opacity-40 disabled:hover:border-[#2D3047] transition-colors"
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
              <button
                type="button"
                disabled={salvando}
                onClick={() => aplicar({ maxUses: limite == null ? Math.max(usadas, 10) : null })}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-[#1A1D2E] border border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#6366F1] transition-colors"
              >
                {limite == null ? 'Definir limite' : 'Sem limite'}
              </button>
              <span className="flex-1" />
              {status === 'ativo' ? (
                <Button variant="outline" size="sm" onClick={() => aplicar({ status: 'pausado' })} disabled={salvando}>
                  Pausar
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => aplicar({ status: 'ativo' })} disabled={salvando}>
                  Reativar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setConfirmarEncerrar(true)} disabled={salvando}>
                Encerrar
              </Button>
            </div>
          )}

          {status === 'pausado' && (
            <p className="text-xs text-[#F59E0B]">Pausado: quem abrir o link vê "convite pausado" até você reativar.</p>
          )}
          {erro && <p className="text-xs text-[#EF4444]">{erro}</p>}
        </div>
      </Card>

      {/* Contato da empresa */}
      {(empresarial || editandoContato) && (
        <Card variant="default">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F7F8FC] mb-1">Contato na empresa</p>
              {!editandoContato ? (
                invite.contactName || invite.contactEmail || invite.contactPhone ? (
                  <div className="text-sm text-[#A0A3B1] space-y-0.5">
                    {invite.contactName && <p className="text-[#F7F8FC]">{invite.contactName}</p>}
                    {invite.contactEmail && <p className="truncate">{invite.contactEmail}</p>}
                    {invite.contactPhone && <p>{formatarTelefone(invite.contactPhone)}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-[#A0A3B1]">Nenhum contato registrado.</p>
                )
              ) : (
                <div className="space-y-3 mt-2">
                  <Input label="Nome" value={contato.contactName} onChange={(e) => setContato((c) => ({ ...c, contactName: e.target.value }))} />
                  <Input label="E-mail" type="email" value={contato.contactEmail} onChange={(e) => setContato((c) => ({ ...c, contactEmail: e.target.value }))} />
                  <PhoneInput label="Telefone" value={contato.contactPhone} onChange={(v) => setContato((c) => ({ ...c, contactPhone: v }))} />
                  <div className="flex gap-2">
                    <Button
                      variant="primary" size="sm" loading={salvando}
                      onClick={async () => {
                        await aplicar({
                          contactName: contato.contactName.trim() || null,
                          contactEmail: contato.contactEmail.trim().toLowerCase() || null,
                          contactPhone: contato.contactPhone.replace(/\D/g, '') || null,
                        });
                        setEditandoContato(false);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditandoContato(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
            {!editandoContato && (
              <button type="button" onClick={() => setEditandoContato(true)} className="text-xs text-[#6366F1] hover:underline flex-shrink-0">
                Editar
              </button>
            )}
          </div>
        </Card>
      )}
      {!empresarial && !editandoContato && (
        <p className="text-xs text-[#A0A3B1] text-center">
          Este é um convite simples.{' '}
          <button type="button" onClick={() => setEditandoContato(true)} className="text-[#6366F1] hover:underline">
            Registrar contato da empresa
          </button>
        </p>
      )}

      {/* Quem entrou */}
      <Card variant="default">
        <p className="text-sm font-medium text-[#F7F8FC] mb-3">
          Quem entrou pelo link{usos.length ? ` (${usos.length})` : ''}
        </p>
        {usos.length === 0 ? (
          <p className="text-sm text-[#A0A3B1]">Ninguém entrou ainda. Assim que alguém se cadastrar, aparece aqui.</p>
        ) : (
          <ul className="divide-y divide-[#2D3047]">
            {usos.map((u) => {
              const sit = situacao(u, mapaContas, mapaAvaliados);
              return (
                <li key={u.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F7F8FC] truncate">{u.nome || u.email || formatarTelefone(u.telefone) || '—'}</p>
                    <p className="text-xs text-[#A0A3B1] truncate">
                      {u.kind === 'conta' ? (u.email || 'conta') : (formatarTelefone(u.telefone) || 'celular')}
                      {' · '}{formatarData(u.usedAt)}
                    </p>
                  </div>
                  <Badge variant={u.kind === 'conta' ? 'accent' : 'info'} size="sm" pill>
                    {u.kind === 'conta' ? 'Conta' : 'Celular'}
                  </Badge>
                  <Badge variant={sit.variant} size="sm" pill>{sit.texto}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmModal
        isOpen={confirmarEncerrar}
        onClose={() => setConfirmarEncerrar(false)}
        onConfirm={async () => { await aplicar({ status: 'encerrado' }); setConfirmarEncerrar(false); }}
        title="Encerrar convite"
        description="O link deixa de aceitar cadastros. Quem já entrou continua normalmente. Para reabrir, gere um novo convite."
        confirmLabel="Encerrar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={salvando}
      />
    </>
  );
}
