import React from 'react';
import clsx from 'clsx';

const variants = {
  default: 'bg-[#242736] border border-[#2D3047]',
  elevated: 'bg-[#242736] border border-[#2D3047] shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
  glass: 'glass',
  outline: 'bg-transparent border border-[#2D3047] hover:border-[#6366F1]/40',
  accent: 'bg-[#6366F1]/5 border border-[#6366F1]/20',
};

/**
 * Card component
 *
 * @param {'default'|'elevated'|'glass'|'outline'|'accent'} variant
 * @param {boolean} hoverable - adds hover transition effect
 * @param {boolean} clickable - adds cursor-pointer
 * @param {React.ReactNode} header - optional header slot
 * @param {React.ReactNode} footer - optional footer slot
 * @param {string} className
 * @param {string} headerClassName
 * @param {string} bodyClassName
 * @param {string} footerClassName
 */
export default function Card({
  children,
  variant = 'default',
  hoverable = false,
  clickable = false,
  header,
  footer,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  onClick,
  ...props
}) {
  return (
    <div
      role={clickable || onClick ? 'button' : undefined}
      tabIndex={clickable || onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={clsx(
        'rounded-2xl overflow-hidden transition-all duration-200',
        variants[variant] || variants.default,
        hoverable && 'card-glow',
        (clickable || onClick) && 'cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {/* Header slot */}
      {header && (
        <div
          className={clsx(
            'px-5 py-4 border-b border-[#2D3047]',
            headerClassName
          )}
        >
          {header}
        </div>
      )}

      {/* Body */}
      <div className={clsx('p-5', bodyClassName)}>
        {children}
      </div>

      {/* Footer slot */}
      {footer && (
        <div
          className={clsx(
            'px-5 py-4 border-t border-[#2D3047] bg-[#1A1D2E]/40',
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * CardTitle — convenience heading inside a card
 */
export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={clsx(
        'text-base font-heading font-semibold text-[#F7F8FC]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * CardDescription — convenience description text
 */
export function CardDescription({ children, className, ...props }) {
  return (
    <p
      className={clsx('text-sm text-[#A0A3B1] mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}
