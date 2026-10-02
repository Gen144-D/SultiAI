/**
 * Circular progress indicator.
 *
 * `value` is written into the accessible name as a percentage so the figure
 * is available to assistive tech and remains readable when the arc is not.
 */
export function ProgressRing({
  value,
  size = 56,
  thickness = 5,
  label,
  caption,
  tone = 'var(--brand)',
}: {
  /** Completion percentage, 0–100. */
  value: number;
  size?: number;
  thickness?: number;
  label: string;
  caption?: string;
  tone?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%${caption ? ` ${caption}` : ''}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums text-ink"
          style={{ fontSize: Math.max(11, size * 0.24) }}
        >
          {Math.round(clamped)}%
        </span>
        {caption && (
          <span className="mt-0.5 text-ink-faint" style={{ fontSize: Math.max(8, size * 0.15) }}>
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}

/** Horizontal counterpart, used where a ring would waste horizontal space. */
export function ProgressBar({
  value,
  tone = 'var(--brand)',
  label,
  className = '',
}: {
  value: number;
  tone?: string;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line-strong ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-soft"
        style={{ width: `${clamped}%`, backgroundColor: tone }}
      />
    </div>
  );
}
