export type SultiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline';

const stateMeta: Record<SultiState, { label: string; tone: string; ring: string }> = {
  idle: { label: 'Ready', tone: 'text-brand-ink', ring: 'border-brand/25' },
  listening: { label: 'Listening', tone: 'text-info', ring: 'border-info/50' },
  thinking: { label: 'Thinking', tone: 'text-violet', ring: 'border-violet/50' },
  speaking: { label: 'Speaking', tone: 'text-brand-ink', ring: 'border-brand/60' },
  offline: { label: 'Offline', tone: 'text-danger', ring: 'border-danger/50' },
};

/**
 * Sulti's mark and state indicator.
 *
 * The label is rendered as real text, so the current state is always
 * readable — the motion around it is reinforcement, never the signal itself.
 */
export function SultiOrb({
  state = 'idle',
  size = 'md',
  showLabel = true,
  className = '',
}: {
  state?: SultiState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  const meta = stateMeta[state];

  const dims = {
    sm: { box: 'h-9 w-9', core: 'h-3.5 w-3.5', glow: 'h-14 w-14', text: 'text-[10px]' },
    md: { box: 'h-12 w-12', core: 'h-5 w-5', glow: 'h-20 w-20', text: 'text-[11px]' },
    lg: { box: 'h-20 w-20', core: 'h-8 w-8', glow: 'h-32 w-32', text: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="relative flex shrink-0 items-center justify-center">
        {/* Breathing halo — the ambient "Sulti is here" signal. */}
        <span
          aria-hidden="true"
          className={`absolute rounded-full bg-brand/12 blur-2xl anim-breathe ${
            state === 'offline' ? '!bg-danger/10' : ''
          } ${dims.glow}`}
        />

        {/* State ring. Orbiting dashes mean "thinking"; static otherwise. */}
        <span
          aria-hidden="true"
          className={`absolute rounded-full border-2 border-dashed ${
            state === 'thinking' ? `${meta.ring} anim-orbit` : meta.ring
          } ${dims.box}`}
        />

        <span
          className={`relative flex ${dims.box} items-center justify-center rounded-full glass-3 glass-sheen`}
        >
          <span
            aria-hidden="true"
            className={`rounded-full bg-gradient-to-br from-brand to-brand-deep ${
              state === 'offline' ? '!from-line-strong !to-line-strong' : ''
            } ${dims.core} ${state === 'listening' || state === 'speaking' ? 'anim-breathe' : ''}`}
          />
        </span>
      </span>

      {showLabel && (
        <span className={`font-semibold tracking-wide uppercase ${dims.text} ${meta.tone}`}>
          {meta.label}
        </span>
      )}
    </div>
  );
}

/** Compact brand lockup for the sidebar and mobile header. */
export function SultiMark({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const shell = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const core = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';

  return (
    <span className={`relative flex ${shell} shrink-0 items-center justify-center ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-brand/18 blur-lg anim-breathe"
      />
      <span
        aria-hidden="true"
        className={`relative flex ${shell} items-center justify-center rounded-full bg-gradient-to-br from-brand via-brand-solid to-brand-deep shadow-lg shadow-brand/30 ring-1 ring-brand/40`}
      >
        <span className={`rounded-full bg-bg-deep/70 ${core}`} />
      </span>
    </span>
  );
}
