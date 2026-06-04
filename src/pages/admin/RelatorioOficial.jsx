/**
 * RelatorioOficial — Documento oficial de perfil comportamental DISC
 * Acessível via /admin/relatorio/:token
 * Inclui: dados completos, flags clínicas (admin), observações, print/PDF/WhatsApp
 */
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { insightPerfil, therapyFlag, buscarPorToken } from '@/firebase/functions.js';
import useAuthStore from '@/store/authStore.js';
import { formatCpf } from '@/lib/cpf.js';

// ─── Configuração DISC ────────────────────────────────────────────────────────
const DISC = {
  D: { nome: 'Dominante',  cor: '#DC2626', bg: '#FEF2F2', campo: 'dominante'  },
  I: { nome: 'Influente',  cor: '#D97706', bg: '#FFFBEB', campo: 'influente'  },
  S: { nome: 'Estável',   cor: '#16A34A', bg: '#F0FDF4', campo: 'estavel'    },
  C: { nome: 'Analítico', cor: '#4F46E5', bg: '#EEF2FF', campo: 'analitico'  },
};

const DESC_DISC = {
  D: 'Orientado a resultados, decisivo, direto e competitivo. Assume riscos e gosta de desafios. Tende a ser assertivo e focado em metas.',
  I: 'Comunicativo, entusiasta, persuasivo e otimista. Inspira pessoas e cria conexões com facilidade. Motivado por reconhecimento e interação.',
  S: 'Paciente, confiável, colaborativo e leal. Constrói relações sólidas e mantém ambientes harmônicos. Valoriza estabilidade e previsibilidade.',
  C: 'Preciso, analítico, organizado e criterioso. Busca qualidade, detalhes e soluções bem fundamentadas. Valoriza procedimentos e acurácia.',
};

/** Gera ID de documento único baseado no token */
function gerarDocId(token, data) {
  const ano = new Date(data || Date.now()).getFullYear();
  const hex = token ? token.replace(/-/g, '').slice(0, 8).toUpperCase() : '00000000';
  return `DISC-${ano}-${hex}`;
}

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function agora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Barra DISC (versão impressão) ───────────────────────────────────────────
function BarraDisc({ letra, valor, primario }) {
  const cfg = DISC[letra];
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: primario ? '700' : '500', color: primario ? cfg.cor : '#374151' }}>
          {letra} — {cfg.nome} {primario && '★'}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: cfg.cor }}>{valor}%</span>
      </div>
      <div style={{ height: '10px', background: '#E5E7EB', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${valor}%`, background: cfg.cor, borderRadius: '5px' }} />
      </div>
    </div>
  );
}

// ─── Print CSS global ─────────────────────────────────────────────────────────
const PRINT_STYLE = `
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; background: white !important; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    @page { size: A4; margin: 20mm 18mm; }
  }
  @media screen {
    .print-page { max-width: 820px; margin: 0 auto; background: white; }
  }
`;

export default function RelatorioOficial() {
  const { token } = useParams();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const obsRef    = useRef(null);

  // Estado: dados do avaliado (pode vir via state ou fetch)
  const [avaliado,    setAvaliado]    = useState(location.state?.avaliado || null);
  const [insight,     setInsight]     = useState(null);
  const [flagClinica, setFlagClinica] = useState(null);
  const [obs,         setObs]         = useState('');
  const [loading,     setLoading]     = useState(!avaliado);
  const [loadingIA,   setLoadingIA]   = useState(false);
  const [loadingFlag, setLoadingFlag] = useState(false);
  const [erroIA,      setErroIA]      = useState('');
  const [printMode,   setPrintMode]   = useState(false);
  const [liberado,    setLiberado]    = useState(false);

  // Busca dados se vieram via URL direta (sem state)
  useEffect(() => {
    if (avaliado || !token) { setLoading(false); return; }
    buscarPorToken({ token })
      .then((res) => { setAvaliado(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const perfil   = avaliado?.perfil;
  const nome     = avaliado?.nome || '';
  const telefone = avaliado?.telefone || '';
  // CPF completo só no documento oficial (rastreabilidade legal — PRD §6.8)
  const cpfFmt   = avaliado?.cpf ? formatCpf(avaliado.cpf) : null;
  const docId    = gerarDocId(token, avaliado?.criadoEm);
  const dataDoc  = hoje();
  const horaDoc  = agora();

  const barras = perfil
    ? Object.entries(DISC).map(([k, cfg]) => ({
        letra: k, valor: Math.round(perfil[cfg.campo] ?? 0),
        primario: k === perfil.perfilPrimario,
      })).sort((a, b) => b.valor - a.valor)
    : [];

  const primCfg = perfil ? DISC[perfil.perfilPrimario] : null;
  const secCfg  = perfil?.perfilSecundario ? DISC[perfil.perfilSecundario] : null;

  // Título dinâmico com ID do documento oficial
  useEffect(() => {
    if (docId) document.title = `${docId} — ProfileAI`;
    else document.title = 'Relatório Oficial — ProfileAI';
    return () => { document.title = 'ProfileAI'; };
  }, [docId]);

    // ── IA: gerar insight ──────────────────────────────────────────────────────
  const handleRefinarIA = async () => {
    if (!perfil) return;
    setLoadingIA(true); setErroIA('');
    try {
      const res = await insightPerfil({ perfil, nome });
      setInsight(res);
    } catch (err) {
      setErroIA(err.message || 'Erro ao gerar análise');
    } finally { setLoadingIA(false); }
  };

  // ── Flags clínicas ─────────────────────────────────────────────────────────
  const handleVerificarFlag = async () => {
    if (!perfil) return;
    setLoadingFlag(true);
    try {
      const res = await therapyFlag({
        profileData: {
          dominantProfile: perfil.perfilPrimario,
          secondaryProfile: perfil.perfilSecundario || null,
          scores: { D: perfil.dominante ?? 0, I: perfil.influente ?? 0, S: perfil.estavel ?? 0, C: perfil.analitico ?? 0 },
        },
      });
      setFlagClinica({ flagged: res?.flagged === true, level: res?.level || 'none', note: res?.note || '' });
    } catch { setFlagClinica({ flagged: false, level: 'erro', note: 'Não foi possível verificar.' }); }
    finally { setLoadingFlag(false); }
  };

  // ── Liberar via WhatsApp (versão limpa SEM flags) ──────────────────────────
  const handleLiberar = () => {
    const numero  = telefone.replace(/\D/g, '');
    const baseUrl = window.location.origin;
    const link    = `${baseUrl}/resultado/${token}`;
    const pct     = barras.map(b => `${b.letra}: ${b.valor}%`).join(' · ');
    const resumo  = insight?.insight ? `\n\n💡 ${insight.insight.slice(0, 280)}` : '';
    const msg = encodeURIComponent(
      `Olá, ${nome.split(' ')[0]}! 🎉\n\nSua avaliação *DISC* foi concluída!\n\n` +
      `🔷 *Perfil: ${primCfg?.nome}*${secCfg ? ` + ${secCfg.nome}` : ''}\n` +
      `📊 ${pct}${resumo}\n\n🔗 Relatório completo:\n${link}\n\nSeu facilitador pode aprofundar os resultados com você!`
    );
    window.open(`https://wa.me/${numero}?text=${msg}`, '_blank', 'noopener,noreferrer');
    setLiberado(true);
  };

  // ── Imprimir / Salvar como PDF ─────────────────────────────────────────────
  const handlePrint = () => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); };

  // ── Enviar relatório completo via WhatsApp (admin) ─────────────────────────
  const handleEnviarAdmin = () => {
    const numero  = user?.phoneNumber?.replace(/\D/g, '') || '';
    const baseUrl = window.location.origin;
    const link    = `${baseUrl}/admin/relatorio/${token}`;
    const msg = encodeURIComponent(
      `📋 *Relatório DISC — ${nome}*\n\n` +
      `Documento: ${docId}\nData: ${dataDoc}\n\n` +
      `Perfil: ${primCfg?.nome}${secCfg ? ` + ${secCfg.nome}` : ''}\n` +
      `Distribuição: ${barras.map(b => `${b.letra}:${b.valor}%`).join(' ')}\n\n` +
      `🔗 Relatório completo:\n${link}`
    );
    window.open(`https://wa.me/${numero || ''}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
        <div className="w-10 h-10 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
        <div className="text-center max-w-sm">
          <p className="text-[#F7F8FC] text-lg font-bold mb-2">Resultado não disponível</p>
          <p className="text-[#A0A3B1] text-sm">Avaliação não concluída ou token inválido.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-[#6366F1] text-sm underline">← Voltar</button>
        </div>
      </div>
    );
  }

  const flagColors = { none: '#16A34A', watch: '#D97706', suggest: '#D97706', erro: '#9CA3AF' };

  return (
    <>
      {/* Print CSS */}
      <style>{PRINT_STYLE}</style>

      {/* ── Barra de controle (não imprime) ─────────────────────────────── */}
      <div className="no-print sticky top-0 z-50 bg-[#1A1D2E]/95 backdrop-blur border-b border-[#2D3047] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <p className="text-xs font-semibold text-[#F7F8FC]">Relatório Oficial — {nome}</p>
              <p className="text-xs text-[#6366F1] font-mono">{docId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!insight && (
              <button onClick={handleRefinarIA} disabled={loadingIA}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#5558E3] text-white text-xs font-semibold transition-colors disabled:opacity-60">
                {loadingIA
                  ? <><div className="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin"/>Analisando...</>
                  : '✨ Gerar análise IA'}
              </button>
            )}
            {insight && !flagClinica && (
              <button onClick={handleVerificarFlag} disabled={loadingFlag}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10 text-xs font-semibold transition-colors disabled:opacity-60">
                {loadingFlag ? 'Verificando...' : '🔍 Indicadores clínicos'}
              </button>
            )}
            <button onClick={handleLiberar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: '#25D36620', border: '1px solid #25D36660', color: '#25D366' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {liberado ? '✓ Reenviar ao aluno' : 'Enviar resultado ao aluno'}
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1C2A] border border-[#2D3047] hover:border-[#6366F1] text-[#F7F8FC] text-xs font-semibold transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir / PDF
            </button>
          </div>
        </div>
        {erroIA && (
          <div className="max-w-4xl mx-auto mt-2 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
            <p className="text-xs text-[#EF4444]">⚠️ {erroIA}</p>
            <p className="text-xs text-[#A0A3B1] mt-0.5">
              Configure sua chave Gemini em{' '}
              <a href="/admin/settings" className="text-[#6366F1] underline">Configurações → Integrações de IA</a>
            </p>
          </div>
        )}
      </div>

      {/* ── Documento imprimível ─────────────────────────────────────────── */}
      <div className="print-page bg-white" style={{ minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#111827' }}>
        <div style={{ padding: '32px 40px', maxWidth: '820px', margin: '0 auto' }}>

          {/* ══ CABEÇALHO OFICIAL ══ */}
          <div style={{ borderBottom: '3px solid #4F46E5', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '28px', height: '28px', background: '#4F46E5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>P</span>
                  </div>
                  <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: '800', fontSize: '18px', color: '#4F46E5' }}>ProfileAI</span>
                </div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'Arial, sans-serif', margin: 0 }}>
                  Plataforma de Avaliação Comportamental DISC com Inteligência Artificial
                </p>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 2px' }}>DOCUMENTO OFICIAL</p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1F2937', margin: '0 0 2px', fontFamily: 'Courier New, monospace' }}>{docId}</p>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>Gerado em: {dataDoc} às {horaDoc}</p>
              </div>
            </div>
          </div>

          {/* ══ TÍTULO ══ */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Relatório de Perfil Comportamental DISC
            </h1>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, fontFamily: 'Arial, sans-serif' }}>
              Avaliação Psicométrica Comportamental — Uso Profissional / Confidencial
            </p>
          </div>

          {/* ══ SEÇÃO 1: IDENTIFICAÇÃO ══ */}
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
              § 1. Identificação do Avaliado
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'Arial, sans-serif' }}>
              <div><span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Nome completo</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{nome}</span></div>
              <div><span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Contato (WhatsApp)</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{telefone}</span></div>
              {cpfFmt && (
                <div><span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>CPF</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', fontFamily: 'Courier New, monospace' }}>{cpfFmt}</span></div>
              )}
              <div><span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Sessão de avaliação</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{avaliado?.sessaoTitulo || '—'}</span></div>
              <div><span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Número do documento</span><span style={{ fontSize: '14px', fontWeight: '700', color: '#4F46E5', fontFamily: 'Courier New, monospace' }}>{docId}</span></div>
            </div>
          </div>

          {/* ══ SEÇÃO 2: PERFIL DISC ══ */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
              § 2. Perfil Comportamental DISC
            </h2>

            {/* Badge primário */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '14px', background: primCfg.bg, border: `2px solid ${primCfg.cor}40`, borderRadius: '8px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: primCfg.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: '24px', fontWeight: '900', fontFamily: 'Arial, sans-serif' }}>{perfil.perfilPrimario}</span>
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontFamily: 'Arial, sans-serif', fontWeight: '700', fontSize: '16px', color: primCfg.cor }}>
                  Perfil {primCfg.nome}
                </p>
                {secCfg && <p style={{ margin: '0 0 4px', fontSize: '13px', color: secCfg.cor, fontFamily: 'Arial, sans-serif' }}>com tendência {secCfg.nome} (perfil secundário)</p>}
                <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontFamily: 'Arial, sans-serif', lineHeight: '1.5' }}>{DESC_DISC[perfil.perfilPrimario]}</p>
              </div>
            </div>

            {/* Barras */}
            <div style={{ marginBottom: '8px' }}>
              {barras.map(({ letra, valor, primario }) => (
                <BarraDisc key={letra} letra={letra} valor={valor} primario={primario} />
              ))}
            </div>

            {/* Tabela de pontuação */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Arial, sans-serif', marginTop: '12px' }}>
              <thead>
                <tr style={{ background: '#F3F4F6' }}>
                  {['Dimensão', 'Descrição', 'Pontuação', 'Nível'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barras.map(({ letra, valor }) => {
                  const nivel = valor >= 70 ? 'Alto' : valor >= 40 ? 'Moderado' : 'Baixo';
                  return (
                    <tr key={letra} style={{ borderTop: '1px solid #E5E7EB', background: letra === perfil.perfilPrimario ? DISC[letra].bg : 'white' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: DISC[letra].cor }}>{letra} — {DISC[letra].nome}</td>
                      <td style={{ padding: '6px 10px', color: '#6B7280' }}>{DESC_DISC[letra].slice(0, 70)}...</td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: DISC[letra].cor, fontFamily: 'Courier New, monospace' }}>{valor}%</td>
                      <td style={{ padding: '6px 10px', color: '#374151', fontWeight: '600' }}>{nivel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ══ SEÇÃO 3: ANÁLISE IA ══ */}
          {insight && (
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
                § 3. Análise Comportamental por Inteligência Artificial
              </h2>
              <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', lineHeight: '1.7', color: '#1F2937', margin: 0 }}>{insight.insight}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {insight.forcas?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 6px', textTransform: 'uppercase' }}>Pontos Fortes</p>
                    {insight.forcas.map((f, i) => (
                      <p key={i} style={{ fontSize: '11px', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 3px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#16A34A', fontWeight: '700', flexShrink: 0 }}>✓</span>{f}
                      </p>
                    ))}
                  </div>
                )}
                {insight.desafios?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 6px', textTransform: 'uppercase' }}>Áreas de Desenvolvimento</p>
                    {insight.desafios.map((d, i) => (
                      <p key={i} style={{ fontSize: '11px', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 3px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#4F46E5', fontWeight: '700', flexShrink: 0 }}>→</span>{d}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              {insight.carreiras?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 6px', textTransform: 'uppercase' }}>Áreas de Carreira Indicadas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {insight.carreiras.map((c, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '20px', color: '#4F46E5', fontFamily: 'Arial, sans-serif' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {insight.comunicacao && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 4px', textTransform: 'uppercase' }}>Estilo de Comunicação</p>
                  <p style={{ fontSize: '12px', color: '#374151', fontFamily: 'Arial, sans-serif', margin: 0, lineHeight: '1.6' }}>{insight.comunicacao}</p>
                </div>
              )}
            </div>
          )}
          {!insight && (
            <div className="no-print" style={{ marginBottom: '20px', padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
              <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>
                ⚠️ Análise de IA não gerada. Clique em "<strong>Gerar análise IA</strong>" na barra superior.
              </p>
            </div>
          )}

          {/* ══ SEÇÃO 4: INDICADORES CLÍNICOS (ADMIN ONLY) ══ */}
          {flagClinica && (
            // D1: no-print obrigatório — indicadores clínicos não devem aparecer no PDF/impressão (PRD §6.8, LGPD §8.1)
            <div className="no-print" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
                § 4. Indicadores de Atenção — USO EXCLUSIVO DO FACILITADOR
              </h2>
              <div style={{ background: flagColors[flagClinica.level] + '15', border: `1px solid ${flagColors[flagClinica.level]}40`, borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: flagColors[flagClinica.level], fontFamily: 'Arial, sans-serif' }}>
                    Nível: {flagClinica.level?.toUpperCase()} · {flagClinica.flagged ? '⚠️ Atenção recomendada' : '✓ Sem indicadores relevantes'}
                  </span>
                </div>
                {flagClinica.note && (
                  <p style={{ fontSize: '12px', color: '#374151', fontFamily: 'Arial, sans-serif', margin: 0, lineHeight: '1.6' }}>{flagClinica.note}</p>
                )}
                <p style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'Arial, sans-serif', margin: '8px 0 0', fontStyle: 'italic' }}>
                  ⚠️ Estas informações são de uso exclusivo do facilitador e não devem ser compartilhadas com o avaliado.
                  Não configuram diagnóstico clínico. Em caso de dúvida, consulte um profissional de saúde mental.
                </p>
              </div>
            </div>
          )}

          {/* ══ SEÇÃO 5: OBSERVAÇÕES DO ADMIN ══ */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', fontFamily: 'Arial, sans-serif', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #E5E7EB', paddingBottom: '6px' }}>
              § 5. Observações do Facilitador
            </h2>
            {printMode || obs ? (
              <div style={{ background: obs ? '#FAFAFA' : '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '14px', minHeight: '80px' }}>
                {obs ? (
                  <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: 'Arial, sans-serif', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>{obs}</p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Arial, sans-serif', margin: 0, fontStyle: 'italic' }}>Nenhuma observação registrada.</p>
                )}
              </div>
            ) : (
              <div className="no-print">
                <textarea
                  ref={obsRef}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Adicione observações do facilitador aqui (ex: contexto da avaliação, acompanhamento, encaminhamentos, etc.)&#10;&#10;Este campo será incluído no documento impresso."
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 resize-none"
                  rows={4}
                  style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}
                />
                <p className="text-xs text-gray-400 mt-1">Texto incluído na impressão/PDF. Não é enviado ao avaliado.</p>
              </div>
            )}
          </div>

          {/* ══ RODAPÉ LEGAL ══ */}
          <div style={{ borderTop: '2px solid #4F46E5', paddingTop: '16px', marginTop: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontFamily: 'Arial, sans-serif', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: '700' }}>Facilitador Responsável</p>
                <p style={{ fontSize: '12px', color: '#1F2937', margin: '0 0 12px' }}>{user?.displayName || user?.email || '—'}</p>
                <div style={{ borderTop: '1px solid #374151', paddingTop: '4px', marginTop: '4px', width: '180px' }}>
                  <p style={{ fontSize: '9px', color: '#9CA3AF', margin: 0 }}>Assinatura / Data</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: '700' }}>Identificador Digital</p>
                <p style={{ fontSize: '11px', color: '#4F46E5', fontFamily: 'Courier New, monospace', margin: '0 0 4px' }}>{docId}</p>
                <p style={{ fontSize: '10px', color: '#9CA3AF', margin: 0 }}>Verificável em: perfilmaster.netlify.app</p>
              </div>
            </div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px' }}>
              <p style={{ fontSize: '9px', color: '#9CA3AF', fontFamily: 'Arial, sans-serif', margin: 0, lineHeight: '1.6', textAlign: 'justify' }}>
                <strong style={{ color: '#6B7280' }}>CONFIDENCIALIDADE E USO LEGAL:</strong> Este documento é de caráter confidencial e de uso exclusivo do facilitador/organização solicitante.
                Os dados aqui contidos são protegidos pela Lei Geral de Proteção de Dados Pessoais (LGPD — Lei 13.709/2018) e pelo Código de Ética Profissional.
                O perfil DISC é uma ferramenta de autoconhecimento e desenvolvimento profissional, não constitui diagnóstico clínico ou psicológico.
                Este relatório pode ser solicitado como material de referência em processos de RH, coaching, mediação e, mediante autorização judicial, em perícias e inquéritos.
                O número <strong style={{ color: '#6B7280' }}>{docId}</strong> identifica unicamente este documento e pode ser usado para verificação de autenticidade junto à plataforma ProfileAI.
                Gerado automaticamente em {dataDoc} — ProfileAI © {new Date().getFullYear()}
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
