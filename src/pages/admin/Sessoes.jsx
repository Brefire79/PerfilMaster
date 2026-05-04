import React, { useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import useSessaoStore from '@/store/sessaoStore.js';
import { SiglaProvider, SiglaComSignificado } from '@/constants/siglas.jsx';
import SessionCreator from '@/components/sessao/SessionCreator.jsx';
import AvaliadoForm from '@/components/sessao/AvaliadoForm.jsx';

// ─── Helpers visuais ──────────────────────────────────────────────────────────
const STATUS_AVALIADO = {
  pendente:     { label: 'Pendente',     cor: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
  em_andamento: { label: 'Em andamento', cor: 'bg-[#6366F1]/20 text-[#6366F1]' },
  concluido:    { label: 'Concluído',    cor: 'bg-[#22C55E]/20 text-[#22C55E]' },
};

const PERFIL_COR = { D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1' };
const PERFIL_NOME = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

// ─── Sub-componente: card de avaliado ─────────────────────────────────────────
function AvaliadoCard({ avaliado, onWhatsApp, onCopiarLink }) {
  const info = STATUS_AVALIADO[avaliado.status] || STATUS_AVALIADO.pendente;
  const perfil = avaliado.perfil;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1C2A] hover:bg-[#1E2030] transition-colors">
      {/* Avatar inicial */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: perfil
            ? `${PERFIL_COR[perfil.perfilPrimario]}20`
            : '#2D3047',
          color: perfil ? PERFIL_COR[perfil.perfilPrimario] : '#A0A3B1',
        }}
      >
        {perfil
          ? perfil.perfilPrimario
          : avaliado.nome.charAt(0).toUpperCase()}
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F7F8FC] truncate">{avaliado.nome}</p>
        <p className="text-xs text-[#4A4D6A] truncate">{avaliado.telefone}</p>
        {perfil && (
          <p className="text-xs mt-0.5" style={{ color: PERFIL_COR[perfil.perfilPrimario] }}>
            {PERFIL_NOME[perfil.perfilPrimario]}
            {perfil.perfilSecundario ? ` · ${PERFIL_NOME[perfil.perfilSecundario]}` : ''}
          </p>
        )}
      </div>

      {/* Badge status */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${info.cor}`}>
        {info.label}
      </span>

      {/* Ações */}
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onCopiarLink(avaliado.token)}
          title="Copiar link de avaliação"
          className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </button>
        <button
          onClick={() => onWhatsApp(avaliado)}
          title="Enviar via WhatsApp"
          className="p-1.5 rounded-lg hover:bg-[#25D366]/20 transition-colors"
          style={{ color: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Painel principal ─────────────────────────────────────────────────────────
export default function Sessoes() {
  const { user } = useAuthStore();
  const {
    sessoes,
    sessaoAtiva,
    avaliadosBySessao,
    loadingAvaliados,
    iniciarListenerSessoes,
    pararListenerSessoes,
    selecionarSessao,
    getLinkWhatsApp,
    getLinkAvaliacao,
  } = useSessaoStore();

  const [modalSessao, setModalSessao] = useState(false);
  const [modalAvaliado, setModalAvaliado] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState('');

  useEffect(() => {
    if (user?.uid) iniciarListenerSessoes(user.uid);
    return () => pararListenerSessoes();
  }, [user?.uid]);

  const avaliadosDaSessao = sessaoAtiva
    ? avaliadosBySessao[sessaoAtiva.id] || []
    : [];

  const estatisticas = {
    total: avaliadosDaSessao.length,
    pendentes: avaliadosDaSessao.filter((a) => a.status === 'pendente').length,
    andamento: avaliadosDaSessao.filter((a) => a.status === 'em_andamento').length,
    concluidos: avaliadosDaSessao.filter((a) => a.status === 'concluido').length,
  };

  function handleWhatsApp(avaliado) {
    const link = getLinkWhatsApp(avaliado);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function handleCopiarLink(token) {
    const link = getLinkAvaliacao(token);
    await navigator.clipboard.writeText(link);
    setLinkCopiado(token);
    setTimeout(() => setLinkCopiado(''), 2000);
  }

  return (
    <SiglaProvider>
      <div className="flex flex-col h-full gap-6 p-6 max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
              Sessões de Avaliação
            </h1>
            <p className="text-sm text-[#A0A3B1] mt-1">
              Gerencie avaliações <SiglaComSignificado id="DISC" /> enviadas via WhatsApp
            </p>
          </div>
          <button
            onClick={() => setModalSessao(true)}
            className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span> Nova Sessão
          </button>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row flex-1 min-h-0">
          {/* ── Coluna esquerda: lista de sessões ─────────────────────────── */}
          <div className="lg:w-72 shrink-0 flex flex-col gap-3">
            <p className="text-xs font-semibold text-[#4A4D6A] uppercase tracking-wider">
              Suas sessões ({sessoes.length})
            </p>

            {sessoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#1A1C2A] flex items-center justify-center text-2xl">
                  📋
                </div>
                <p className="text-sm text-[#A0A3B1]">Nenhuma sessão criada ainda.</p>
                <button
                  onClick={() => setModalSessao(true)}
                  className="text-xs text-[#6366F1] hover:underline"
                >
                  Criar primeira sessão
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto">
                {sessoes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selecionarSessao(s)}
                    className={`
                      text-left p-3 rounded-xl border transition-colors
                      ${sessaoAtiva?.id === s.id
                        ? 'border-[#6366F1] bg-[#6366F1]/10'
                        : 'border-[#2D3047] bg-[#1A1C2A] hover:border-[#4A4D6A]'}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#F7F8FC] truncate">{s.titulo}</p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                          s.status === 'ativa'
                            ? 'bg-[#22C55E]/20 text-[#22C55E]'
                            : 'bg-[#4A4D6A]/30 text-[#A0A3B1]'
                        }`}
                      >
                        {s.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    {s.descricao && (
                      <p className="text-xs text-[#4A4D6A] mt-1 truncate">{s.descricao}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Coluna direita: avaliados da sessão ──────────────────────── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {!sessaoAtiva ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-[#1A1C2A] flex items-center justify-center text-3xl">
                  👈
                </div>
                <p className="text-[#A0A3B1] text-sm">Selecione uma sessão para ver os avaliados</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho da sessão */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F7F8FC]">
                      {sessaoAtiva.titulo}
                    </h2>
                    {sessaoAtiva.descricao && (
                      <p className="text-xs text-[#A0A3B1]">{sessaoAtiva.descricao}</p>
                    )}
                  </div>
                  {sessaoAtiva.status === 'ativa' && (
                    <button
                      onClick={() => setModalAvaliado(true)}
                      className="px-3 py-2 rounded-xl bg-[#1A1C2A] border border-[#2D3047] hover:border-[#6366F1] text-[#F7F8FC] text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>+</span> Adicionar avaliado
                    </button>
                  )}
                </div>

                {/* Cards de estatísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total',        valor: estatisticas.total,     cor: '#6366F1' },
                    { label: 'Pendentes',    valor: estatisticas.pendentes, cor: '#F59E0B' },
                    { label: 'Em andamento', valor: estatisticas.andamento, cor: '#818CF8' },
                    { label: 'Concluídos',   valor: estatisticas.concluidos,cor: '#22C55E' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-[#1A1C2A] rounded-xl p-3 border border-[#2D3047]"
                    >
                      <p className="text-2xl font-bold" style={{ color: stat.cor }}>
                        {stat.valor}
                      </p>
                      <p className="text-xs text-[#A0A3B1] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Lista de avaliados */}
                {loadingAvaliados ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
                  </div>
                ) : avaliadosDaSessao.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-[#1A1C2A] rounded-2xl border border-dashed border-[#2D3047]">
                    <p className="text-[#A0A3B1] text-sm">Nenhum avaliado cadastrado nesta sessão.</p>
                    {sessaoAtiva.status === 'ativa' && (
                      <button
                        onClick={() => setModalAvaliado(true)}
                        className="text-xs text-[#6366F1] hover:underline"
                      >
                        Adicionar primeiro avaliado
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {avaliadosDaSessao.map((a) => (
                      <AvaliadoCard
                        key={a.id}
                        avaliado={a}
                        onWhatsApp={handleWhatsApp}
                        onCopiarLink={handleCopiarLink}
                      />
                    ))}
                  </div>
                )}

                {/* Toast de link copiado */}
                {linkCopiado && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#22C55E] text-white text-sm px-4 py-2 rounded-full shadow-xl z-50 pointer-events-none">
                    Link copiado!
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {modalSessao && (
        <SessionCreator
          onFechar={() => setModalSessao(false)}
          onCriado={(id) => {
            const nova = sessoes.find((s) => s.id === id);
            if (nova) selecionarSessao(nova);
          }}
        />
      )}

      {modalAvaliado && sessaoAtiva && (
        <AvaliadoForm
          sessaoId={sessaoAtiva.id}
          onFechar={() => setModalAvaliado(false)}
        />
      )}
    </SiglaProvider>
  );
}
