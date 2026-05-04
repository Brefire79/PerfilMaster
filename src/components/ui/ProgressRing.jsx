import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * ProgressRing — SVG circular progress indicator
 *
 * @param {number} value - Progress 0–100
 * @param {number} size - SVG diameter in px (default 64)
 * @param {number} strokeWidth - Ring stroke width (default 6)
 * @param {string} color - CSS color string or var(--color-X) (default '#6366F1')
 * @param {string} label - Center text (defaults to value%)
 * @param {string} sublabel - Small text below label
 * @param {string} className - Extra wrapper class
 * @param {string} trackColor - Background ring color (default '#2D3047')
 */
export default function ProgressRing({
  value = 0,
  size = 64,
  strokeWidth = 6,
  color = '#6366F1',
  label,
  sublabel,
  className,
  trackColor = '#2D3047',
}) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const DURATION = 900; // ms

  useEffect(() => {
    const from = 0;
    const to = clampedValue;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [clampedValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  const fontSize = size < 56 ? size * 0.22 : size * 0.2;
  const subFontSize = size < 56 ? size * 0.14 : size * 0.13;

  return (
    <div
      className={clsx('inline-flex flex-col items-center gap-1', className)}
      role="img"
      aria-label={`${label ?? `${clampedValue}%`} — ${sublabel ?? ''}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'none' }}
        />
      </svg>

      {/* Center text overlay */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          marginTop: -(size + (sublabel ? 4 : 0)),
          height: size,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <span
          className="font-heading font-bold text-[#F7F8FC] leading-none"
          style={{ fontSize }}
        >
          {label ?? `${animatedValue}%`}
        </span>
        {sublabel && (
          <span
            className="text-[#A0A3B1] leading-none mt-0.5 text-center"
            style={{ fontSize: subFontSize }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
