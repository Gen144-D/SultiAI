/**
 * The site's atmosphere: a deep-space base, two slow nebula washes, a star
 * field, and a vignette that keeps the eye on the content column.
 *
 * Server component with no JavaScript. The layers are fixed and never repaint,
 * so the animation cost is one composited layer. `variant` lets a page opt into
 * a calmer or heavier field without duplicating the markup.
 */
export default function CosmicBackground({
  variant = 'default',
}: {
  /** `focused` is quieter and centred — for text-heavy pages like legal. */
  variant?: 'default' | 'focused' | 'deep';
}) {
  const isFocused = variant === 'focused';
  const isDeep = variant === 'deep';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-variant={variant}
    >
      <div className="cosmic-base absolute inset-0" />

      {/*
        Two nebula washes on their own layers. They drift independently so the
        background never reads as a single moving gradient. Teal reads as Sulti's
        energy; indigo/violet is pure atmosphere.
      */}
      <div
        className="anim-drift absolute inset-0 scale-110"
        style={{
          backgroundImage:
            'radial-gradient(720px 480px at 18% 12%, var(--nebula-1), transparent 62%)',
        }}
      />
      <div
        className="anim-drift absolute inset-0 scale-110"
        style={{
          backgroundImage:
            'radial-gradient(760px 520px at 84% 22%, var(--nebula-2), transparent 60%)',
          animationDirection: 'reverse',
          animationDuration: '44s',
        }}
      />

      {!isFocused && (
        <>
          <div className="cosmic-stars absolute inset-0 opacity-40" />
          {/* Particles are a separate, sparser layer from the stars. Two
              different sizes read as depth; one would read as noise. */}
          <div className="cosmic-particles absolute inset-0 opacity-60" />
        </>
      )}

      {/* `deep` adds the cool blue floor used on conversion-oriented pages
          (pricing, download) so they feel distinct without a new colour ramp. */}
      {isDeep && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(900px 600px at 50% 110%, var(--nebula-blue), transparent 68%)',
          }}
        />
      )}

      <div className="cosmic-vignette absolute inset-0" />
    </div>
  );
}
