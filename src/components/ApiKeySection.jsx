/**
 * ProfileAI — Componente de configuração de API Key
 * Detecta o provider automaticamente e permite testar a conexão antes de salvar.
 */

import { useState, useEffect } from 'react';
import { detectApiProvider, loadApiKey, saveApiKey, callAiApi } from '../lib/apiKeyManager.js';

// D5: Somente Gemini (PRD §4.3)
const PROVIDER_LABELS = {
  google: '✨ Gemini (Google AI)',
};

const PROVIDER_LINKS = [
  { name: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey', prefix: 'AIza...' },
];

const S = {
  warning: {
    background: 'rgba(255,193,7,0.08)',
    border: '1px solid rgba(255,193,7,0.25)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    color: '#ffc107',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#F7F8FC',
    marginBottom: '0.4rem',
    display: 'block',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    height: '44px',
    padding: '0 1rem',
    borderRadius: '10px',
    background: '#1A1D2E',
    border: '1px solid #2D3047',
    color: '#F7F8FC',
    fontSize: '0.875rem',
    outline: 'none',
  },
  badge: {
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    color: '#818cf8',
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  statusOk: { color: '#22C55E', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  statusErr: { color: '#e53e3e', fontSize: '0.85rem' },
  statusTest: { color: '#A0A3B1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  btnSecondary: (disabled) => ({
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    background: '#2D3047',
    border: '1px solid #3D4063',
    color: '#F7F8FC',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }),
  btnPrimary: (disabled) => ({
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    background: disabled ? '#2D3047' : '#6366F1',
    border: 'none',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }),
  linksBox: {
    background: '#1A1D2E',
    border: '1px solid #2D3047',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginTop: '0.5rem',
  },
  linkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
};

export default function ApiKeySection() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | testing | ok | error
  const [errorMsg, setErrorMsg] = useState('');
  const [showLinks, setShowLinks] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadApiKey().then(k => {
      if (k) {
        setSavedKey(k);
        setApiKey(k);
        setProvider(detectApiProvider(k));
        setStatus('ok');
      }
    });
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    setProvider(detectApiProvider(val));
    setStatus('idle');
    setErrorMsg('');
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setStatus('testing');
    setErrorMsg('');
    try {
      await callAiApi(apiKey.trim(), 'Responda apenas com a palavra: OK', provider);
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveApiKey(apiKey.trim() || null);
      setSavedKey(apiKey.trim());
    } catch (err) {
      console.error('[ApiKeySection] Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  const canSave = (status === 'ok' || apiKey.trim() === '') && !saving;
  const hasChanges = apiKey !== savedKey;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!apiKey.trim() && (
        <div style={S.warning}>
          <span>⚠️</span>
          <span>Sem API key configurada — análises serão geradas localmente (modo offline)</span>
        </div>
      )}

      <div>
        <label style={S.label}>API Key de IA</label>
        <div style={S.inputRow}>
          <input
            type="password"
            value={apiKey}
            onChange={handleChange}
          placeholder="Cole sua chave Gemini aqui (AIza...)"
            style={S.input}
          />
          {provider && (
            <span style={S.badge}>{PROVIDER_LABELS[provider]}</span>
          )}
        </div>
      </div>

      {status === 'ok' && (
        <div style={S.statusOk}><span>✅</span> Conexão OK</div>
      )}
      {status === 'error' && (
        <div style={S.statusErr}>
          <span>❌ Erro: </span>
          <span style={{ color: '#A0A3B1', marginLeft: '0.25rem', fontSize: '0.8rem' }}>{errorMsg}</span>
        </div>
      )}
      {status === 'testing' && (
        <div style={S.statusTest}><span>🔄</span> Testando conexão...</div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleTest}
          disabled={!apiKey.trim() || status === 'testing'}
          style={S.btnSecondary(!apiKey.trim() || status === 'testing')}
        >
          Testar Conexão
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || !hasChanges}
          style={S.btnPrimary(!canSave || !hasChanges)}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div>
        <button
          onClick={() => setShowLinks(v => !v)}
          style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          {showLinks ? '▲' : '▼'} Onde obter uma API key?
        </button>

        {showLinks && (
          <div style={S.linksBox}>
            {PROVIDER_LINKS.map(p => (
              <div key={p.name} style={S.linkRow}>
                <div>
                  <span style={{ color: '#F7F8FC', fontWeight: '500' }}>{p.name}</span>
                  <span style={{ color: '#A0A3B1', marginLeft: '0.5rem' }}>({p.prefix})</span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6366F1', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  Abrir Console →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
