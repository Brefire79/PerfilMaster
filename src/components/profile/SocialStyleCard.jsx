import React, { useMemo } from 'react';
import { derivarSocialStyle, ESTILOS } from '@/lib/socialStyle.js';

// Social Style como lente do DISC (Fase 4). `estilo="relatorio"` = inline
// styles claros (Relatório Oficial, imprime); qualquer outro = classes dark.

const FONT = 'Arial, sans-serif';
const NOME_EIXO = { assertividade: 'assertividade', responsividade: 'responsividade' };

function Eixo({ label, esquerda, direita, valor, cor }) {
  // −100..100 → 0..100% da barra
  const pct = Math.round(((Number(valor) || 0) + 100) / 2);
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280', fontFamily: FONT }}>
        <span>{esquerda}</span><span style={{ fontWeight: 700, color: '#374151' }}>{label} {valor > 0 ? '+' : ''}{valor}</span><span>{direita}</span>
      </div>
      <div style={{ position: 'relative', height: '8px', background: '#E5E7EB', borderRadius: '4px', marginTop: '3px' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#9CA3AF' }} />
        <div style={{ position: 'absolute', left: `calc(${pct}% - 6px)`, top: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: cor, border: '2px solid #fff', boxShadow: '0 0 0 1px #9CA3AF' }} />
      </div>
    </div>
  );
}

export default function SocialStyleCard({ perfil, estilo = 'relatorio' }) {
  const ss = useMemo(() => derivarSocialStyle(perfil), [perfil]);
  if (!ss) return null;
  const sec = ss.secundario ? ESTILOS[ss.secundario] : null;
  const avisoCentral = ss.zonaCentral.length
    ? `Eixo${ss.zonaCentral.length > 1 ? 's' : ''} de ${ss.zonaCentral.map((z) => NOME_EIXO[z]).join(' e ')} na zona central: o estilo é pouco marcado${sec ? ` e se aproxima de ${sec.nome}` : ''}. Leia como tendência, não como rótulo.`
    : null;

  if (estilo !== 'relatorio') {
    return (
      <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-4 space-y-2">
        <p className="text-xs text-[#6B6F80] uppercase tracking-wide">Social Style (lente do DISC)</p>
        <p className="text-lg font-semibold" style={{ color: ss.cor }}>{ss.nome}{sec ? <span className="text-sm text-[#A0A3B1] font-normal"> · tende a {sec.nome}</span> : null}</p>
        <p className="text-sm text-[#A0A3B1]">{ss.resumo}</p>
        <p className="text-xs text-[#A0A3B1]"><span className="text-[#F7F8FC]">Como interagir:</span> {ss.comoTratar}</p>
        <p className="text-xs text-[#A0A3B1]"><span className="text-[#F7F8FC]">Sob pressão:</span> {ss.tensao}</p>
        {avisoCentral && <p className="text-[11px] text-[#F59E0B]">{avisoCentral}</p>}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: FONT, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
        § 2.1. Social Style — lente do DISC
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: '700', color: ss.cor, fontFamily: FONT, margin: '0 0 4px' }}>
            {ss.nome}{sec ? <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}> · tende a {sec.nome}</span> : null}
          </p>
          <p style={{ fontSize: '11px', color: '#374151', fontFamily: FONT, margin: '0 0 6px', lineHeight: 1.5 }}>{ss.resumo}</p>
          <p style={{ fontSize: '11px', color: '#374151', fontFamily: FONT, margin: '0 0 4px', lineHeight: 1.5 }}><strong>Como interagir:</strong> {ss.comoTratar}</p>
          <p style={{ fontSize: '11px', color: '#374151', fontFamily: FONT, margin: 0, lineHeight: 1.5 }}><strong>Sob pressão:</strong> {ss.tensao}</p>
        </div>
        <div>
          <Eixo label="Assertividade" esquerda="pergunta" direita="afirma" valor={ss.assertividade} cor={ss.cor} />
          <Eixo label="Responsividade" esquerda="controla" direita="expressa" valor={ss.responsividade} cor={ss.cor} />
          {avisoCentral && <p style={{ fontSize: '10px', color: '#B45309', fontFamily: FONT, margin: '4px 0 0', lineHeight: 1.4 }}>{avisoCentral}</p>}
        </div>
      </div>
      <p style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: FONT, margin: '8px 0 0', fontStyle: 'italic' }}>
        Derivado dos mesmos quatro scores DISC (assertividade = D+I − S+C; responsividade = I+S − D+C), sem questionário adicional. Versatilidade não é medida.
      </p>
    </div>
  );
}
