import React, { useMemo } from 'react';
import { sugerirAbordagem } from '@/lib/abordagem.js';

// Card "Próxima abordagem sugerida" — usado no Relatório Oficial (§ 3.3).
// Só leitura: roda o motor determinístico (src/lib/abordagem.js) sobre o
// perfil e mostra foco, teste dirigido, prazo e a regra que disparou
// (auditável). Nada é gravado aqui — a aplicação/aceite do ciclo é o próximo
// passo (app_ciclos).
//
// `estilo="relatorio"` usa inline styles claros como o resto do Relatório
// Oficial (imprime em A4); qualquer outro valor usa as classes dark do app.

const FONT = 'Arial, sans-serif';

export default function ProximaAbordagem({ perfil, jaAplicados = [], estilo = 'relatorio' }) {
  const sugestao = useMemo(() => (perfil ? sugerirAbordagem(perfil, { jaAplicados }) : null), [perfil, jaAplicados]);
  if (!sugestao?.modulo) return null;

  const { modulo, foco, prazoDias, justificativa, alternativas, alertas, regraId, versao } = sugestao;

  if (estilo !== 'relatorio') {
    return (
      <div className="rounded-xl bg-[#1A1D2E] border border-[#2D3047] p-4 space-y-2">
        <p className="text-xs text-[#6B6F80] uppercase tracking-wide">Próxima abordagem sugerida</p>
        <p className="text-[#F7F8FC] font-semibold">{modulo.titulo} <span className="text-[#6B6F80] font-normal text-xs">· {modulo.codigo} · {prazoDias} dias</span></p>
        <p className="text-sm text-[#A0A3B1]">{foco}</p>
        <ul className="text-xs text-[#A0A3B1] list-disc pl-4 space-y-0.5">
          {justificativa.map((j, i) => <li key={i}>{j}</li>)}
        </ul>
        {alternativas.length > 0 && (
          <p className="text-xs text-[#6B6F80]">Alternativas: {alternativas.map((a) => a.titulo).join(' · ')}</p>
        )}
        <p className="text-[10px] text-[#6B6F80]">regra {regraId} · motor v{versao}</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: FONT, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
        § 3.3. Próxima abordagem sugerida
      </h2>
      <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#3730A3', fontFamily: FONT, margin: 0 }}>
            {modulo.titulo}
            <span style={{ fontWeight: '400', color: '#6B7280', fontSize: '11px' }}> · {modulo.codigo}</span>
          </p>
          <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: FONT, margin: 0 }}>
            Reavaliar em ~{prazoDias} dias
          </p>
        </div>
        <p style={{ fontSize: '12px', color: '#374151', fontFamily: FONT, margin: '6px 0 8px', lineHeight: '1.5' }}>
          <strong>Foco:</strong> {foco}
        </p>
        <div style={{ fontSize: '11px', color: '#374151', fontFamily: FONT, lineHeight: '1.6' }}>
          {justificativa.map((j, i) => (
            <p key={i} style={{ margin: '0 0 2px', display: 'flex', gap: '6px' }}>
              <span style={{ color: alertas.length && i === justificativa.length - 1 && alertas.includes('aquiescencia') ? '#D97706' : '#4F46E5', fontWeight: '700', flexShrink: 0 }}>•</span>{j}
            </p>
          ))}
        </div>
        {alternativas.length > 0 && (
          <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: FONT, margin: '8px 0 0' }}>
            <strong>Alternativas:</strong> {alternativas.map((a) => `${a.titulo} (${a.codigo})`).join(' · ')}
          </p>
        )}
        <p style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: FONT, margin: '8px 0 0', fontStyle: 'italic' }}>
          Sugestão determinística do motor de abordagem (regra {regraId}, v{versao}), a partir do DISC e dos Sabotadores desta avaliação.
          O facilitador decide se aplica, adapta ou descarta.
        </p>
      </div>
    </div>
  );
}
