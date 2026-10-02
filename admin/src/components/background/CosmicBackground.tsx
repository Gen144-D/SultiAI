/**
 * Layered cosmic environment: base gradient, nebula glow, sparse star field
 * and a vignette. Pure CSS, fixed behind the app, decorative only.
 *
 * `variant="focused"` tightens the nebula and star density for full-screen
 * moments such as sign-in, where content is centred and the sky should
 * recede even further.
 */
export function CosmicBackground({ variant = 'app' }: { variant?: 'app' | 'focused' }) {
  const focused = variant === 'focused';

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="cosmic-base absolute inset-0" />

      <div
        className={`cosmic-nebula absolute inset-0 ${
          focused ? 'scale-90 opacity-70' : ''
        } anim-drift`}
      />

      <div className={`cosmic-stars absolute inset-0 ${focused ? 'opacity-45' : 'opacity-70'}`} />

      <div className="cosmic-vignette absolute inset-0" />
    </div>
  );
}
