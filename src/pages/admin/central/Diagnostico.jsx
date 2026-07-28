import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { getClientErrorsLog } from '@/firebase/firestore.js';
import { useSuperadmin } from '@/hooks/useSuperadmin.js';
import { isBackendDown, mensagemDeRede } from '@/firebase/http.js';

/**
 * Diagnóstico — erros que aconteceram no navegador dos usuários (M2, DELTA 20).
 *
 * Existe porque até 27/07/2026 esses erros morriam em sessionStorage: quando um
 * avaliado travava no meio das 78 questões, ninguém ficava sabendo. Toda a
 * operação dependia de alguém reclamar no WhatsApp.
 *
 * A leitura é escopada pelo RLS. O superadmin também enxerga os registros
 * anônimos (origem "publico"), que são os do link de avaliação — normalmente
 * os mais graves, porque ali a pessoa simplesmente desiste.
 */

const ORIGEM_META = {
  publico: { label: 'Avaliação pública', cor: '#EF4444', dica: 'Avaliado sem conta — maior risco de desistência' },
  aluno:   { label: 'Aluno',             cor: '#F59E0B', dica: 'Área logada do aluno' },
  admin:   { label: 'Facilitador',       cor: '#6366F1', dica: 'Área administrativa' },
};

const FILTROS = [
  { valor: null,        label: 'Todos' },
  { valor: 'publico',   label: 'Avaliação pública' },
  { valor: 'aluno',     label: 'Aluno' },
  { valor: 'admin',     label: 'Facilitador' },
];

function formatarData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function Diagnostico() {
  const { isSuperadmin } = useSuperadmin();
  const [registros, setRegistros] = useState([]);
  const [origem, setOrigem] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    getClientErrorsLog({ origem, limit: 200 })
      .then((linhas) => { if (!cancelado) setRegistros(linhas); })
      .catch((e) => {
        if (cancelado) return;
        setErro(isBackendDown(e) ? mensagemDeRede(e) : 'Não foi possível carregar o diagnóstico.');
      })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [origem]);

  // Agrupa por mensagem: 40 ocorrências do mesmo erro são UM problema, não 40.
  const agrupados = useMemo(() => {
    const mapa = new Map();
    for (const r of registros) {
      // firestore.js converte colunas do Postgres para camelCase (criadoem →
      // criadoEm) via CAMEL_TO_DB. Aceita as duas formas por segurança.
      const quando = r.criadoEm || r.criadoem;
      const chave = `${r.origem}|${r.mensagem}`;
      const atual = mapa.get(chave);
      if (atual) {
        atual.ocorrencias += 1;
        if (quando > atual.ultimoEm) atual.ultimoEm = quando;
      } else {
        mapa.set(chave, {
          chave,
          origem: r.origem,
          mensagem: r.mensagem,
          codigo: r.codigo,
          rota: r.rota,
          fonte: r.fonte,
          versao: r.versao,
          ultimoEm: quando,
          ocorrencias: 1,
        });
      }
    }
    return [...mapa.values()].sort((a, b) => {
      if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
      return String(b.ultimoEm).localeCompare(String(a.ultimoEm));
    });
  }, [registros]);

  const totalPublico = registros.filter((r) => r.origem === 'publico').length;

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-heading font-bold text-[#F7F8FC]">Diagnóstico</h2>
        <p className="text-sm text-[#A0A3B1]">
          Erros que aconteceram no navegador dos usuários nos últimos 30 dias.
          {isSuperadmin && ' Como superadmin, você também vê os do fluxo público (sem conta).'}
        </p>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4">
          <p className="text-xs text-[#A0A3B1] uppercase tracking-wider">Registros</p>
          <p className="text-2xl font-bold text-[#F7F8FC] mt-1">{registros.length}</p>
        </div>
        <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4">
          <p className="text-xs text-[#A0A3B1] uppercase tracking-wider">Problemas distintos</p>
          <p className="text-2xl font-bold text-[#F7F8FC] mt-1">{agrupados.length}</p>
        </div>
        <div className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4">
          <p className="text-xs text-[#A0A3B1] uppercase tracking-wider">Na avaliação pública</p>
          <p className={clsx('text-2xl font-bold mt-1', totalPublico > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
            {totalPublico}
          </p>
        </div>
      </div>

      {/* Filtro por origem */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setOrigem(f.valor)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              origem === f.valor
                ? 'bg-[#6366F1]/15 border-[#6366F1]/40 text-[#F7F8FC]'
                : 'bg-transparent border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {carregando && (
        <p className="text-sm text-[#A0A3B1] py-8 text-center">Carregando...</p>
      )}

      {!carregando && erro && (
        <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4">
          <p className="text-sm text-[#F7F8FC]">{erro}</p>
          <p className="text-xs text-[#A0A3B1] mt-1">
            Se a tabela <code>app_client_errors</code> ainda não existe, rode o DELTA 20 no SQL Editor.
          </p>
        </div>
      )}

      {!carregando && !erro && agrupados.length === 0 && (
        <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-6 text-center">
          <p className="text-2xl mb-2" aria-hidden="true">✅</p>
          <p className="text-sm text-[#F7F8FC] font-medium">Nenhum erro registrado</p>
          <p className="text-xs text-[#A0A3B1] mt-1">
            Ou está tudo bem, ou a versão com telemetria ainda não chegou aos usuários.
          </p>
        </div>
      )}

      {!carregando && !erro && agrupados.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {agrupados.map((g) => {
            const meta = ORIGEM_META[g.origem] || ORIGEM_META.publico;
            return (
              <li
                key={g.chave}
                className="rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: `${meta.cor}20`, color: meta.cor }}
                    title={meta.dica}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-[#A0A3B1]">
                    {g.ocorrencias > 1 && (
                      <strong className="text-[#F7F8FC]">{g.ocorrencias}× · </strong>
                    )}
                    último em {formatarData(g.ultimoEm)}
                  </span>
                </div>

                <p className="text-sm text-[#F7F8FC] font-medium break-words">{g.mensagem}</p>

                <div className="flex gap-3 flex-wrap text-xs text-[#4A4D6A]">
                  {g.codigo && <span>código: <code className="text-[#A0A3B1]">{g.codigo}</code></span>}
                  {g.fonte && <span>origem: <code className="text-[#A0A3B1]">{g.fonte}</code></span>}
                  {g.rota && <span>rota: <code className="text-[#A0A3B1]">{g.rota}</code></span>}
                  {g.versao && <span>versão: <code className="text-[#A0A3B1]">{g.versao}</code></span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
