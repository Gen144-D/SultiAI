'use client';

import { useEffect, useRef } from 'react';
import type { ElementType, ReactNode } from 'react';

/**
 * Reveals children once they scroll into view.
 *
 * Visibility is opt-in from CSS and gated behind the `has-js` class that the
 * inline bootstrap in the root layout sets. That means if this component never
 * mounts — no JavaScript, a blocked bundle, or an error — the content is
 * simply already visible. Nothing on the page depends on this animation to be
 * readable.
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  as?: ElementType;
  /** Seconds. Kept small; anything past ~0.3s reads as lag, not choreography. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // The observer fires immediately for anything already on screen, so the
    // hero animates on load rather than waiting for a scroll.
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          // One-shot: re-animating on scroll-back is distracting.
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
