import Icon from './Icon';

/**
 * SULTI, as a presence rather than an avatar image.
 *
 * The brief is explicit that Sulti must be the visual centrepiece and not
 * "another avatar sitting inside a card" — so this is built from glass and
 * light instead of artwork, and it carries real state.
 *
 * State is legible without animation: every state pairs a distinct ring
 * treatment with a written label and an icon, so nothing is communicated by
 * motion alone (which would also fail for reduced-motion users). The animation
 * only reinforces what the label already says.
 *
 * Pure CSS on the compositor — no canvas, no WebGL, no image request.
 */
export type SultiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline';

const STATE_META: Record<
  SultiState,
  { label: string; icon: 'wave' | 'mic' | 'sparkle' | 'chatbubbles' | 'info' }
> = {
  idle: { label: 'Ready to talk', icon: 'wave' },
  listening: { label: 'Listening', icon: 'mic' },
  thinking: { label: 'Thinking', icon: 'sparkle' },
  speaking: { label: 'Speaking', icon: 'chatbubbles' },
  offline: { label: 'Offline', icon: 'info' },
};

export default function SultiOrb({
  state = 'idle',
  size = 'default',
  showLabel = true,
}: {
  state?: SultiState;
  size?: 'compact' | 'default';
  showLabel?: boolean;
}) {
  const meta = STATE_META[state];
  const box = size === 'compact' ? 'h-32 w-32' : 'h-44 w-44 sm:h-56 sm:w-56';

  return (
    <div className="flex flex-col items-center">
      <div className={`relative grid place-items-center ${box}`} data-state={state}>
        {/* Ambient bloom. Sits behind everything and never animates — it is
            light, not decoration. */}
        <div
          aria-hidden="true"
          className="sulti-bloom absolute inset-[-45%] rounded-full blur-3xl"
        />

        {/* Concentric glass shell. Double ring reads as a sphere rather than a
            flat disc, and the inner highlight sells the curvature. */}
        <div
          aria-hidden="true"
          className="glass-3 absolute inset-0 rounded-full shadow-[0_24px_70px_-30px_var(--brand-glow)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[6%] rounded-full border border-white/12"
        />

        {/* Listening: concentric rings expanding outward. The only state that
            suggests "sound coming in". */}
        {state === 'listening' && (
          <>
            <span
              aria-hidden="true"
              className="sulti-ring sulti-ring-1 absolute inset-0 rounded-full"
            />
            <span
              aria-hidden="true"
              className="sulti-ring sulti-ring-2 absolute inset-0 rounded-full"
            />
          </>
        )}

        {/* Thinking: a slow orbiting arc, the conventional AI-progress idiom. */}
        {state === 'thinking' && (
          <span aria-hidden="true" className="sulti-orbit absolute inset-[-8%] rounded-full" />
        )}

        {/* Speaking: a single rim that pulses with the response. */}
        {state === 'speaking' && (
          <span aria-hidden="true" className="sulti-pulse-ring absolute inset-[-4%] rounded-full" />
        )}

        {/* Idle: a slow breathing scale. */}
        {state === 'idle' && (
          <span aria-hidden="true" className="sulti-breathe absolute inset-0 rounded-full" />
        )}

        {state === 'offline' && (
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[#050814]/55" />
        )}

        {/* The mark. */}
        <span
          aria-hidden="true"
          className="relative grid h-[38%] w-[38%] place-items-center rounded-full bg-gradient-to-br from-brand/25 to-brand-solid/10"
        >
          <span
            className={`block text-2xl leading-none sm:text-3xl ${
              state === 'offline' ? 'text-ink-faint' : 'text-brand'
            }`}
          >
            ✦
          </span>
        </span>
      </div>

      {showLabel && (
        <p className="mt-6 flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Icon
            name={meta.icon}
            className={`h-4 w-4 ${
              state === 'offline'
                ? 'text-ink-faint'
                : state === 'idle'
                  ? 'text-brand'
                  : 'text-accent'
            }`}
          />
          {meta.label}
        </p>
      )}
    </div>
  );
}
