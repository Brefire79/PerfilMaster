import React, { forwardRef, useId } from 'react';
import clsx from 'clsx';

/**
 * Input — reusable styled form input
 *
 * @param {string} label - Label shown above the input
 * @param {string} error - Error message; triggers red border state
 * @param {React.ReactNode} icon - Icon rendered on the left side
 * @param {string} hint - Helper text shown below the input
 * @param {string} className - Extra classes on the wrapper div
 * @param {object} inputProps - Any native input props (type, placeholder, etc.)
 */
const Input = forwardRef(function Input(
  { label, error, icon, hint, className, id: idProp, ...inputProps },
  ref
) {
  const generatedId = useId();
  const id = idProp || generatedId;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-[#F7F8FC] select-none"
        >
          {label}
          {inputProps.required && (
            <span className="ml-0.5 text-[#E53E3E]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <span
            className="absolute left-3 flex items-center pointer-events-none text-[#A0A3B1]"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          className={clsx(
            'w-full h-11 rounded-lg bg-[#1A1D2E] border text-[#F7F8FC] text-sm',
            'placeholder:text-[#A0A3B1]/60',
            'transition-colors duration-150 outline-none',
            'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon ? 'pl-10 pr-4' : 'px-4',
            error
              ? 'border-[#E53E3E] focus:border-[#E53E3E] focus:ring-[#E53E3E]/20'
              : 'border-[#2D3047]'
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...inputProps}
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-[#E53E3E] flex items-center gap-1"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-3.5 h-3.5 flex-shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-[#A0A3B1]">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
