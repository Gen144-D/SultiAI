import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Motion primitives.
 *
 * Every animation here is CSS-driven and transform/opacity only, so these
 * components need no client runtime. `globals.css` neutralises them under
 * `prefers-reduced-motion`, which means a reduced-motion visitor lands
 * directly on the final state instead of a shortened animation.
 */

const EASE_STEPS = [0, 1, 2, 3, 4, 5] as const;

type MotionProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating in. */
  delay?: number;
  style?: CSSProperties;
};

export function FadeIn({ children, className = '', delay = 0, style }: MotionProps) {
  return (
    <div
      className={`anim-enter ${className}`}
      style={delay ? { animationDelay: `${delay}s`, ...style } : style}
    >
      {children}
    </div>
  );
}

/**
 * Lifts a group of panels in one after another. Pair with `StaggerItem`,
 * passing each item its index so the cascade stays deterministic.
 */
export function Stagger({
  children,
  className = '',
  step = 0.06,
  base = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds between consecutive items. */
  step?: number;
  /** Seconds before the first item animates. */
  base?: number;
}) {
  return (
    <StaggerContext.Provider value={{ step, base }}>
      <div className={className}>{children}</div>
    </StaggerContext.Provider>
  );
}

const StaggerContext = createContext({ step: 0.06, base: 0 });

export function StaggerItem({
  children,
  className = '',
  index = 0,
  style,
}: MotionProps & { index?: number }) {
  const { step, base } = useContext(StaggerContext);
  // Cap the cascade: past six items the tail should not feel sluggish.
  const slot = EASE_STEPS.includes(index as (typeof EASE_STEPS)[number]) ? index : 0;
  const delay = base + slot * step;

  return (
    <div
      className={`anim-enter ${className}`}
      style={delay ? { animationDelay: `${delay}s`, ...style } : style}
    >
      {children}
    </div>
  );
}

/** Very slow ambient drift for decorative orbs. Never used on content. */
export function Floating({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`anim-drift ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Wraps a route so switching destinations reads as movement, not a cut. */
export function PageTransition({
  children,
  routeKey,
  className = '',
}: {
  children: ReactNode;
  routeKey: string;
  className?: string;
}) {
  return (
    <div key={routeKey} className={`anim-enter ${className}`}>
      {children}
    </div>
  );
}
