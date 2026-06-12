/**
 * Perfil Master — Status do serviço de IA
 * A IA é gerenciada 100% no servidor (DeepSeek). Não há chave para o usuário
 * configurar — nenhuma credencial trafega no navegador.
 */

const S = {
  card: {
    background: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    gap: '0.9rem',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: '1.5rem',
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#F7F8FC',
    margin: 0,
  },
  text: {
    fontSize: '0.85rem',
    color: '#A0A3B1',
    margin: '0.4rem 0 0',
    lineHeight: 1.5,
  },
};

export default function ApiKeySection() {
  return (
    <div style={S.card}>
      <span style={S.icon} aria-hidden="true">🤖</span>
      <div>
        <p style={S.title}>IA gerenciada pelo servidor</p>
        <p style={S.text}>
          As análises de perfil são geradas automaticamente pelo serviço de IA
          (DeepSeek) hospedado no servidor — nenhuma configuração é necessária.
          Caso o serviço esteja indisponível, o sistema usa o motor de análise
          local como fallback.
        </p>
      </div>
    </div>
  );
}
