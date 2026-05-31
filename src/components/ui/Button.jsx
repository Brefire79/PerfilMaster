import React from 'react';
import clsx from 'clsx';

const variants = {
  primary:
    'bg-[#6366F1] hover:bg-[#4F46E5] text-white border border-transparent shadow-sm hover:shadow-[0_0_16px_rgba(99,102,241,0.4)] active:scale-[0.98]',
  secondary:
    'bg-[#242736] hover:bg-[#2D3047] text-[#F7F8FC] border border-[#2D3047] hover:border-[#6366F1]/40 active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-[#242736] text-[#A0A3B1] hover:text-[#F7F8FC] border border-transparent active:scale-[0.98]',
  danger:
    'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 hover:border-[#EF4444]/60 active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/50 hover:border-[#6366F1] active:scale-[0.98]',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  xl: 'h-14 px-8 text-base gap-3 rounded-2xl',
};

const Spinner = ({ size }) => (
  <svg
    className={clsx(
      'animate-spin',
      size === 'sm' ? 'w-3 h-3' : size === 'lg' || size === 'xl' ? 'w-5 h-5' : 'w-4 h-4'
    )}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Button component
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'|'outline'} variant
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {boolean} loading - shows spinner and disables interaction
 * @param {boolean} disabled
 * @param {boolean} fullWidth
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 * @param {string} className
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  type = 'button',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={clsx(
        // Base
        'inline-flex items-center justify-center font-medium font-body transition-all duration-150 select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
        // Variant
        variants[variant] || variants.primary,
        // Size
        sizes[size] || sizes.md,
        // Full width
        fullWidth && 'w-full',
        // Disabled
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size} />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
