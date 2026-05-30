import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

// ─── Países suportados ────────────────────────────────────────────────────────
export const COUNTRIES = [
  { code: 'BR', flag: '🇧🇷', name: 'Brasil',     dial: '55',  placeholder: '(11) 99999-9999', maxDigits: 11 },
  { code: 'US', flag: '🇺🇸', name: 'EUA',        dial: '1',   placeholder: '(555) 555-5555',  maxDigits: 10 },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal',   dial: '351', placeholder: '912 345 678',      maxDigits:  9 },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina',  dial: '54',  placeholder: '11 9999-9999',     maxDigits: 10 },
  { code: 'MX', flag: '🇲🇽', name: 'México',     dial: '52',  placeholder: '55 9999 9999',     maxDigits: 10 },
  { code: 'ES', flag: '🇪🇸', name: 'Espanha',    dial: '34',  placeholder: '612 345 678',      maxDigits:  9 },
  { code: 'CO', flag: '🇨🇴', name: 'Colômbia',   dial: '57',  placeholder: '300 123 4567',     maxDigits: 10 },
  { code: 'CL', flag: '🇨🇱', name: 'Chile',      dial: '56',  placeholder: '9 1234 5678',      maxDigits:  9 },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguai',    dial: '598', placeholder: '091 234 567',      maxDigits:  9 },
  { code: 'PY', flag: '🇵🇾', name: 'Paraguai',   dial: '595', placeholder: '0981 234 567',     maxDigits:  9 },
  { code: 'PE', flag: '🇵🇪', name: 'Peru',       dial: '51',  placeholder: '912 345 678',      maxDigits:  9 },
  { code: 'BO', flag: '🇧🇴', name: 'Bolívia',    dial: '591', placeholder: '7123 4567',        maxDigits:  8 },
  { code: 'VE', flag: '🇻🇪', name: 'Venezuela',  dial: '58',  placeholder: '412 123 4567',     maxDigits: 10 },
  { code: 'EC', flag: '🇪🇨', name: 'Equador',    dial: '593', placeholder: '99 123 4567',      maxDigits:  9 },
];

// ─── Formatação BR: (XX) XXXXX-XXXX ──────────────────────────────────────────
function formatBR(digits) {
  if (!digits) return '';
  const d = digits.slice(0, 11);
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/**
 * PhoneInput — campo de telefone com seletor de país.
 *
 * Props:
 *   value: string            — número completo com DDI (ex: "5511999999999")
 *   onChange: (v: string) => void — retorna DDI + dígitos (sem formatação)
 *   label?: string
 *   required?: boolean
 *   error?: string
 *   className?: string
 */
export default function PhoneInput({
  value = '',
  onChange,
  label,
  required,
  error,
  className,
}) {
  // Detecta país a partir do value inicial
  const detectCountry = (v) => {
    if (!v) return COUNTRIES[0];
    const digits = v.replace(/\D/g, '');
    // Tenta do mais específico (3 dígitos) para o menos (1 dígito)
    return (
      COUNTRIES.find((c) => c.dial.length === 3 && digits.startsWith(c.dial)) ||
      COUNTRIES.find((c) => c.dial.length === 2 && digits.startsWith(c.dial)) ||
      COUNTRIES.find((c) => c.dial.length === 1 && digits.startsWith(c.dial)) ||
      COUNTRIES[0]
    );
  };

  const [country, setCountry]   = useState(() => detectCountry(value));
  const [rawDigits, setRawDigits] = useState(() => {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith(country.dial) ? digits.slice(country.dial.length) : digits;
  });
  const [open, setOpen]         = useState(false);
  const dropRef                 = useRef(null);
  const inputRef                = useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits);
    setRawDigits(digits);
    onChange?.(country.dial + digits);
  };

  const handleCountrySelect = (c) => {
    setCountry(c);
    setOpen(false);
    onChange?.(c.dial + rawDigits);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const displayValue = country.code === 'BR' ? formatBR(rawDigits) : rawDigits;
  const fullNumber   = rawDigits ? `+${country.dial} ${displayValue}` : '';

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-[#F7F8FC]">
          {label}{required && <span className="text-[#6366F1] ml-0.5">*</span>}
        </label>
      )}

      <div
        className={clsx(
          'flex items-stretch rounded-lg border bg-[#1A1D2E] transition-colors overflow-visible',
          error
            ? 'border-[#E53E3E]'
            : 'border-[#2D3047] focus-within:border-[#6366F1] focus-within:ring-2 focus-within:ring-[#6366F1]/20'
        )}
      >
        {/* ── Seletor de país ──────────────────────────────────────────────── */}
        <div className="relative shrink-0" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-full px-3 flex items-center gap-1.5 border-r border-[#2D3047] hover:bg-[#242736] transition-colors rounded-l-lg"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-sm text-[#A0A3B1] font-mono">+{country.dial}</span>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={clsx('w-3 h-3 text-[#A0A3B1] transition-transform', open && 'rotate-180')}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 z-[100] mt-1 w-60 bg-[#1A1D2E] border border-[#2D3047] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                      country.code === c.code
                        ? 'bg-[#6366F1]/20 text-[#F7F8FC]'
                        : 'text-[#A0A3B1] hover:bg-[#242736] hover:text-[#F7F8FC]'
                    )}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[#6366F1] font-mono text-xs">+{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Campo de número ───────────────────────────────────────────────── */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleNumberChange}
          placeholder={country.placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-sm text-[#F7F8FC] placeholder:text-[#A0A3B1]/50 outline-none"
        />
      </div>

      {/* Mensagens */}
      {error && <p className="text-xs text-[#E53E3E]">{error}</p>}
      {!error && fullNumber && (
        <p className="text-xs text-[#A0A3B1]">
          Número para WhatsApp: <span className="font-mono text-[#6366F1]">{fullNumber}</span>
        </p>
      )}
    </div>
  );
}
