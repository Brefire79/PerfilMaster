import React, { useEffect, useMemo, useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import { criarCiclo, getCiclosDaPessoa, descartarCiclo } from '@/firebase/firestore.js';
import { sugerirAbordagem } from '@/lib/abordagem.js';
import { TESTES_DIRIGIDOS, getTesteDirigido } from '@/constants/testesDirigidos.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';

// Aplicação INDIVIDUAL de um Teste Dirigido (DELTA 26) — barra de controles do
// Relatório Oficial (não imprime). Lê os ciclos já existentes da pessoa (para
// rotação do motor e para listar links/resultados), e cria um ciclo novo.
//   conta  → o aluno vê em /student/teste/:id (Início)
//   avulso → link /teste/:token para mandar por WhatsApp
// A auditoria (cycle_applied/completed/discarded) é do trigger no banco.

const FONT = 'Arial, sans-serif';
const STATUS_LABEL = { aplicado: 'aguardando resposta', concluido: 'concluído', descartado: 'descartado', sugerido: 'sugerido' };

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
}

export default function AplicarTesteDirigido({ perfil, pessoa, onCiclosChange }) {
  const user = useAuthStore((s) => s.user);
  const [ciclos, setCiclos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(null);

  const recarregar = async () => {
    const lista = await getCiclosDaPessoa(pessoa.tipo === 'conta' ? { uid: pessoa.uid } : { avaliadoId: pessoa.avaliadoId });
    setCiclos(lista);
    onCiclosChange?.(lista);
    return lista;
  };

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    recarregar().finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoa?.uid, pessoa?.avaliadoId]);

  const jaAplicados = useMemo(() => ciclos.filter((c) => c.status !== 'descartado').map((c) => c.moduloCodigo), [ciclos]);
  const sugestao = useMemo(() => (perfil ? sugerirAbordagem(perfil, { jaAplicados }) : null), [perfil, jaAplicados]);
  const codigoEfetivo = codigo || sugestao?.modulo?.codigo || TESTES_DIRIGIDOS[0].codigo;
  const teste = getTesteDirigido(codigoEfetivo);
  const pendente = ciclos.find((c) => c.status === 'aplicado' && c.moduloCodigo === codigoEfetivo);

  const aplicar = async () => {
    if (!user?.uid || !teste) return;
    setSalvando(true); setErro('');
    try {
      const ehSugerido = sugestao?.modulo?.codigo === teste.codigo;
      await criarCiclo({
        adminUid: user.uid,
        pessoaTipo: pessoa.tipo,
        uid: pessoa.uid,
        avaliadoId: pessoa.avaliadoId,
        pessoaNome: pessoa.nome,
        groupId: pessoa.groupId || null,
        moduloCodigo: teste.codigo,
        moduloVersao: teste.versao,
        regraId: ehSugerido ? sugestao.regraId : 'MANUAL',
        motorVersao: ehSugerido ? sugestao.versao : null,
        justificativa: ehSugerido ? sugestao.justificativa : [`Escolhido manualmente pelo facilitador: ${teste.titulo}`],
        perfilBaseId: pessoa.perfilBaseId || null,
        prazoDias: teste.prazoDias,
      });
      await recarregar();
      setCodigo('');
    } catch (e) {
      setErro(e?.message?.includes('app_ciclos') || /relation|does not exist/i.test(e?.message || '')
        ? 'Rode o DELTA 26 no Supabase para aplicar testes dirigidos.'
        : (e?.message || 'Não foi possível aplicar o teste.'));
    } finally { setSalvando(false); }
  };

  const descartar = async (c) => {
    if (!window.confirm(`Descartar o teste "${getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo}"? Ele fica registrado na trilha como descartado.`)) return;
    try { await descartarCiclo(c.id); await recarregar(); } catch (e) { setErro(e?.message || 'Não foi possível descartar.'); }
  };

  const linkDe = (c) => `${getPublicBaseUrl()}/teste/${c.token}`;
  const copiar = async (c) => {
    try { await navigator.clipboard.writeText(linkDe(c)); setCopiado(c.id); setTimeout(() => setCopiado(null), 2000); } catch { /* sem clipboard */ }
  };
  const whatsapp = (c) => {
    const numero = (pessoa.telefone || '').replace(/\D/g, '');
    const t = getTesteDirigido(c.moduloCodigo);
    const msg = encodeURIComponent(`Olá, ${(pessoa.nome || '').split(' ')[0]}! Como próximo passo do seu desenvolvimento, preparei um teste curto (12 perguntas, ~3 min): *${t?.titulo}*.\n\n🔗 ${linkDe(c)}\n\nDepois conversamos sobre o resultado.`);
    window.open(numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="no-print" style={{ marginBottom: '20px', background: '#F9FAFB', border: '1px dashed #C7D2FE', borderRadius: '8px', padding: '12px 14px', fontFamily: FONT }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '11px', color: '#374151', fontWeight: '700' }}>Aplicar teste:</label>
        <select
          value={codigoEfetivo}
          onChange={(e) => setCodigo(e.target.value)}
          style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff', color: '#111827', maxWidth: '100%' }}
        >
          {TESTES_DIRIGIDOS.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.titulo}{sugestao?.modulo?.codigo === t.codigo ? ' (sugerido)' : ''}{jaAplicados.includes(t.codigo) ? ' · já aplicado' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={aplicar}
          disabled={salvando || carregando || !!pendente}
          title={pendente ? 'Já existe uma aplicação deste teste aguardando resposta' : ''}
          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: pendente ? '#9CA3AF' : '#4F46E5', color: '#fff', fontWeight: '700', cursor: pendente ? 'not-allowed' : 'pointer' }}
        >
          {salvando ? 'Aplicando…' : pessoa.tipo === 'conta' ? 'Aplicar ao aluno' : 'Gerar link'}
        </button>
        <span style={{ fontSize: '10px', color: '#6B7280' }}>
          {pessoa.tipo === 'conta' ? 'O aluno vê o teste no Início ao entrar no app.' : 'Gera um link para enviar por WhatsApp.'}
        </span>
      </div>
      {erro && <p style={{ fontSize: '11px', color: '#B91C1C', margin: '8px 0 0' }}>{erro}</p>}

      {ciclos.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
          <p style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Testes aplicados a esta pessoa</p>
          {ciclos.map((c) => {
            const t = getTesteDirigido(c.moduloCodigo);
            return (
              <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '11px', color: '#374151', padding: '4px 0' }}>
                <span style={{ fontWeight: '700' }}>{t?.titulo || c.moduloCodigo}</span>
                <span style={{ color: c.status === 'concluido' ? '#15803D' : c.status === 'descartado' ? '#9CA3AF' : '#B45309' }}>{STATUS_LABEL[c.status] || c.status}</span>
                <span style={{ color: '#6B7280' }}>· aplicado em {fmt(c.criadoEm)}{c.prazoEm ? ` · prazo ${fmt(c.prazoEm)}` : ''}</span>
                {c.status === 'concluido' && c.resultado?.geral != null && (
                  <span style={{ color: '#111827' }}>· geral <strong>{c.resultado.geral}</strong>/100</span>
                )}
                <span style={{ color: '#9CA3AF' }}>· {c.regraId}</span>
                {c.pessoaTipo === 'avulso' && c.status === 'aplicado' && (
                  <>
                    <button type="button" onClick={() => whatsapp(c)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #25D366', background: '#fff', color: '#128C7E', cursor: 'pointer' }}>WhatsApp</button>
                    <button type="button" onClick={() => copiar(c)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff', color: '#374151', cursor: 'pointer' }}>{copiado === c.id ? 'Copiado ✓' : 'Copiar link'}</button>
                  </>
                )}
                {c.status === 'aplicado' && (
                  <button type="button" onClick={() => descartar(c)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCA5A5', background: '#fff', color: '#B91C1C', cursor: 'pointer' }}>Descartar</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
