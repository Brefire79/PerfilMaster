// DELTA 23 — Janela de horário da avaliação (app_groups.janela_inicio/fim).
//
// A janela governa o INÍCIO: antes dela a pessoa vê a contagem regressiva;
// depois dela, "encerrada". O servidor ainda aceita o envio até fim + 2 h
// (TOLERANCIA_MS) para quem começou dentro da janela — espelhado em
// janela_permite_envio() no banco e em atualizarStatus.

export const TOLERANCIA_MS = 2 * 60 * 60 * 1000;

function paraDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @returns {{ estado: 'sem_janela'|'antes'|'aberta'|'depois', inicio: Date|null, fim: Date|null, abreEm: number, fechaEm: number }}
 *   abreEm/fechaEm em ms a partir de `agora` (negativo = já passou).
 */
export function estadoJanela(inicio, fim, agora = new Date()) {
  const i = paraDate(inicio);
  const f = paraDate(fim);
  const t = agora.getTime();
  const base = { inicio: i, fim: f, abreEm: i ? i.getTime() - t : 0, fechaEm: f ? f.getTime() - t : 0 };
  if (!i && !f) return { estado: 'sem_janela', ...base };
  if (i && t < i.getTime()) return { estado: 'antes', ...base };
  if (f && t > f.getTime()) return { estado: 'depois', ...base };
  return { estado: 'aberta', ...base };
}

/** "2d 03h 15min", "45min", "0min" */
export function formatarContagem(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}min`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

export function formatarDataHora(v) {
  const d = paraDate(v);
  if (!d) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Date → valor de <input type="datetime-local"> (horário local, sem segundos). */
export function paraInputLocal(v) {
  const d = paraDate(v);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** valor de <input type="datetime-local"> → ISO (UTC) ou null. */
export function deInputLocal(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Frase curta para o facilitador. */
export function resumoJanela(inicio, fim, agora = new Date()) {
  const j = estadoJanela(inicio, fim, agora);
  switch (j.estado) {
    case 'antes': return `Abre em ${formatarContagem(j.abreEm)} (${formatarDataHora(j.inicio)})`;
    case 'aberta': return j.fim ? `Aberta — fecha em ${formatarContagem(j.fechaEm)} (${formatarDataHora(j.fim)})` : 'Aberta';
    case 'depois': return `Encerrada em ${formatarDataHora(j.fim)}`;
    default: return 'Sem janela — pode responder a qualquer momento';
  }
}
