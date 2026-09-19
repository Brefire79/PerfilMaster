import React, { useEffect, useMemo, useState } from 'react';
import { getAuditLog } from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';

// Mestre v2 — perguntas que o chat não entendeu, agora no servidor
// (audit_log, ação `mestre_miss`). Superadmin vê as de todos os facilitadores;
// admin vê só as suas. Agrupadas por pergunta normalizada: é o insumo para
// enriquecer palavras-chave e a base de conhecimento (src/lib/mestreIntencao.js
// e CONVERSAS em mestreLocal.js).

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function MestreMisses({ isSuperadmin }) {
  const user = useAuthStore((s) => s.user);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    getAuditLog({ adminUid: isSuperadmin ? null : user?.uid, action: 'mestre_miss', limit: 300 })
      .then((rows) => { if (ativo) setLinhas(rows || []); })
      .catch(() => { if (ativo) setLinhas([]); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [user?.uid, isSuperadmin]);

  const agrupadas = useMemo(() => {
    const mapa = new Map();
    for (const r of linhas) {
      const pergunta = r.metadata?.pergunta || '(vazia)';
      const tipo = r.target_id || 'sem_resposta';
      const chave = `${tipo}|${pergunta}`;
      const atual = mapa.get(chave);
      const quando = r.created_at;
      if (atual) {
        atual.vezes += 1;
        if (quando > atual.ultimo) atual.ultimo = quando;
        atual.facilitadores.add(r.adminuid);
      } else {
        mapa.set(chave, { pergunta, tipo, vezes: 1, ultimo: quando, facilitadores: new Set([r.adminuid]) });
      }
    }
    return [...mapa.values()].sort((a, b) => b.vezes - a.vezes || (b.ultimo > a.ultimo ? 1 : -1));
  }, [linhas]);

  return (
    <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-heading font-semibold text-[#F7F8FC]">Perguntas que o Mestre não entendeu</h3>
        <span className="text-xs text-[#6B6F80]">
          {isSuperadmin ? 'todos os facilitadores' : 'seu escopo'} · {agrupadas.length} distintas
        </span>
      </div>
      {carregando ? (
        <div className="h-10 mt-3 rounded-xl bg-[#242736] animate-pulse" />
      ) : agrupadas.length === 0 ? (
        <p className="text-sm text-[#6B6F80] mt-2">Nenhuma pergunta sem resposta registrada — o vocabulário está dando conta.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#2D3047]">
          {agrupadas.slice(0, 30).map((m) => (
            <li key={`${m.tipo}|${m.pergunta}`} className="py-2 flex items-center gap-3 text-sm">
              <span className="text-[#F7F8FC] flex-1 min-w-0 truncate" title={m.pergunta}>“{m.pergunta}”</span>
              {m.tipo === 'erro' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444]">erro</span>}
              <span className="text-xs text-[#A0A3B1] tabular-nums">{m.vezes}×</span>
              {isSuperadmin && m.facilitadores.size > 1 && <span className="text-[10px] text-[#6B6F80]">{m.facilitadores.size} facilit.</span>}
              <span className="text-xs text-[#6B6F80]">{fmt(m.ultimo)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-[#6B6F80] mt-3">
        Para ensinar o Mestre: acrescente palavras-chave em <code>src/lib/mestreIntencao.js</code> ou uma resposta em <code>CONVERSAS</code> (<code>mestreLocal.js</code>).
      </p>
    </div>
  );
}
