import React from 'react';
import clsx from 'clsx';

// Profile type variants — use CSS custom properties
const profileVariants = {
  D: 'bg-[#E53E3E]/10 text-[#E53E3E] border border-[#E53E3E]/25',
  I: 'bg-[#D69E2E]/10 text-[#D69E2E] border border-[#D69E2E]/25',
  S: 'bg-[#38A169]/10 text-[#38A169] border border-[#38A169]/25',
  C: 'bg-[#3182CE]/10 text-[#3182CE] border border-[#3182CE]/25',
};

// Status variants
const statusVariants = {
  success: 'bg-[#38A169]/10 text-[#38A169] border border-[#38A169]/25',
  warning: 'bg-[#D69E2E]/10 text-[#D69E2E] border border-[#D69E2E]/25',
  error: 'bg-[#E53E3E]/10 text-[#E53E3E] border border-[#E53E3E]/25',
  info: 'bg-[#3182CE]/10 text-[#3182CE] border border-[#3182CE]/25',
  accent: 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/25',
  neutral: 'bg-[#242736] text-[#A0A3B1] border border-[#2D3047]',
  pending: 'bg-[#D69E2E]/10 text-[#D69E2E] border border-[#D69E2E]/25',
  active: 'bg-[#38A169]/10 text-[#38A169] border border-[#38A169]/25',
  inactive: 'bg-[#242736] text-[#A0A3B1] border border-[#2D3047]',
};

const allVariants = { ...profileVariants, ...statusVariants };

const sizes = {
  sm: 'h-5 px-1.5 text-2xs gap-1',
  md: 'h-6 px-2 text-xs gap-1.5',
  lg: 'h-7 px-2.5 text-sm gap-2',
};

/**
 * Badge component
 *
 * @param {'D'|'I'|'S'|'C'|'success'|'warning'|'error'|'info'|'accent'|'neutral'|'pending'|'active'|'inactive'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} dot - shows a leading dot indicator
 * @param {React.ReactNode} icon - leading icon
 * @param {boolean} pill - fully rounded vs default rounded-lg
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  pill = false,
  className,
  ...props
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium',
        allVariants[variant] || allVariants.neutral,
        sizes[size] || sizes.md,
        pill ? 'rounded-full' : 'rounded-lg',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'rounded-full flex-shrink-0',
            size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'
          )}
          style={{ backgroundColor: 'currentColor' }}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * ProfileBadge — specialized badge for DISC profiles
 *
 * Shows the profile letter + full name
 */
export function ProfileBadge({ type, name, size = 'md', showLetter = true, className }) {
  if (!type || !profileVariants[type]) return null;

  return (
    <Badge variant={type} size={size} className={className}>
      {showLetter && (
        <span className="font-bold font-mono">{type}</span>
      )}
      {name && <span>{name}</span>}
    </Badge>
  );
}

/**
 * StatusBadge — shows a dot + status label
 */
export function StatusBadge({ status, label, size = 'md', className }) {
  return (
    <Badge variant={status} size={size} dot className={className}>
      {label}
    </Badge>
  );
}
