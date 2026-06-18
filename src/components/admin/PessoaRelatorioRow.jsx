import React, { useMemo, useState } from 'react';
import { getReportMeta } from '@/firebase/firestore.js';

// Cores DISC (CLAUDE.md): D vermelho · I âmbar · S verde · C índigo
const DISC_COR = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };

function iniciais(nome = '') {
  return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

function fmtData(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}

/**
 * PessoaRelatorioRow — linha de "Relatórios individuais" com:
 *  - #2: contagem de quantas vezes a pessoa foi avaliada (relatórios concluídos)
 *  - #4: histórico expansível dos relatórios com data + a anotação salva (DELTA 13)
 *
 * Com 1 relatório: clica e navega direto (comportamento anterior).
 * Com 2+: clica e expande o histórico; busca a observação de cada relatório
 * sob demanda (getReportMeta) — sem N requisições no carregamento da lista.
 */
export default function PessoaRelatorioRow({ pessoa, adminUid, onNavigate }) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState(null);   // { [ref]: observacao } | null = ainda não buscado
  const [loadingNotas, setLoadingNotas] = useState(false);

  // Monta a lista de relatórios da pessoa (sessão por token + conta por uid).
  const relatorios = useMemo(() => {
    const lista = [];
    for (const a of pessoa.avaliacoes || []) {
      if (a.diagnostico && a.token) {
        lista.push({
          ref: a.token,
          rota: `/admin/relatorio/${a.token}`,
          data: a.concluidoEm || a.criadoEm || null,
          diag: a.diagnostico,
          rotulo: a.sessaoTitulo || 'Avaliação',
        });
      }
    }
    if (pessoa.conta?.diagnostico && pessoa.conta?.uid) {
      lista.push({
        ref: pessoa.conta.uid,
        rota: `/admin/relatorio/aluno/${pessoa.conta.uid}`,
        data: null,
        diag: pessoa.conta.diagnostico,
        rotulo: 'Conta de aluno',
      });
    }
    return lista.sort((x, y) => new Date(y.data || 0) - new Date(x.data || 0));
  }, [pessoa]);

  const diag = pessoa.diagnostico;
  const cor = DISC_COR[diag?.perfilPrimario] || '#A0A3B1';
  const total = relatorios.length;
  const multiplos = total > 1;
  const rotaPrincipal = relatorios[0]?.rota || null;
  if (!rotaPrincipal) return null;

  async function buscarNotas() {
    if (notas || loadingNotas) return;
    setLoadingNotas(true);
    try {
      const entradas = await Promise.all(
        relatorios.map(async (r) => {
          const meta = await getReportMeta(adminUid, r.ref);
          return [r.ref, meta?.observacao || ''];
        })
      );
      setNotas(Object.fromEntries(entradas));
    } catch {
      setNotas({});
    } finally {
      setLoadingNotas(false);
    }
  }

  function handleClickPrincipal() {
    if (multiplos) {
      const next = !aberto;
      setAberto(next);
      if (next) buscarNotas();
    } else {
      onNavigate(rotaPrincipal);
    }
  }

  return (
    <div>
      {/* Linha principal */}
      <button
        onClick={handleClickPrincipal}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[#1A1D2E]/50 transition-colors group"
        aria-expanded={multiplos ? aberto : undefined}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: `${cor}20`, color: cor }}
          aria-hidden="true"
        >
          {iniciais(pessoa.nome)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-[#F7F8FC] font-medium truncate">{pessoa.nome}</span>
          <span className="block text-xs" style={{ color: cor }}>
            {diag?.perfilPrimarioNome}{diag?.pqScore != null && ` · PQ ${diag.pqScore}`}
          </span>
        </span>

        {/* #2: contagem de avaliações */}
        <span
          className="text-2xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
          style={{
            color: multiplos ? '#818CF8' : '#A0A3B1',
            borderColor: multiplos ? '#6366F133' : '#2D3047',
            background: multiplos ? '#6366F110' : 'transparent',
          }}
          title={`${total} ${total > 1 ? 'avaliações concluídas' : 'avaliação concluída'}`}
        >
          {total} {total > 1 ? 'avaliações' : 'avaliação'}
        </span>

        {multiplos ? (
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className={`w-4 h-4 text-[#A0A3B1] group-hover:text-[#6366F1] flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <span className="text-xs font-medium text-[#A0A3B1] group-hover:text-[#6366F1] flex-shrink-0">Ver relatório →</span>
        )}
      </button>

      {/* #4: histórico expandido com data + anotação */}
      {multiplos && aberto && (
        <div className="bg-[#13151F] border-t border-[#2D3047] px-4 py-2">
          {relatorios.map((r, i) => {
            const rc = DISC_COR[r.diag?.perfilPrimario] || '#A0A3B1';
            const nota = notas?.[r.ref];
            return (
              <div key={r.ref + i} className="flex items-start gap-3 py-2 border-b border-[#2D3047]/60 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: rc }} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#F7F8FC] font-medium">{fmtData(r.data)}</span>
                    <span className="text-2xs" style={{ color: rc }}>{r.diag?.perfilPrimarioNome}</span>
                    <span className="text-2xs text-[#A0A3B1] truncate">· {r.rotulo}</span>
                  </div>
                  {/* Anotação de acompanhamento salva (DELTA 13) */}
                  {loadingNotas ? (
                    <p className="text-2xs text-[#4A4D6A] mt-0.5 italic">carregando anotação…</p>
                  ) : nota ? (
                    <p className="text-2xs text-[#A0A3B1] mt-0.5 line-clamp-2">
                      <span className="text-[#818CF8]">✎ </span>{nota}
                    </p>
                  ) : notas ? (
                    <p className="text-2xs text-[#4A4D6A] mt-0.5 italic">sem anotação</p>
                  ) : null}
                </div>
                <button
                  onClick={() => onNavigate(r.rota)}
                  className="text-2xs font-medium text-[#A0A3B1] hover:text-[#6366F1] flex-shrink-0 mt-0.5"
                >
                  Ver →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
