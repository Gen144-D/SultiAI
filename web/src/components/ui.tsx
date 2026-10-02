import type { ReactNode } from 'react';

/**
 * Shared layout and surface primitives.
 *
 * The site has one material (liquid glass over deep space) and one type scale, so
 * these exist to stop every page re-deriving padding, radii and borders. Keep
 * page files about content and composition; keep this file about surface.
 */

/** Consistent horizontal gutter and max width. Every section uses it. */
export function Container({
  children,
  width = 'default',
  className = '',
}: {
  children: ReactNode;
  /** `narrow` for prose, `wide` for the homepage grid. */
  width?: 'narrow' | 'default' | 'wide';
  className?: string;
}) {
  const max = width === 'narrow' ? 'max-w-3xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-6xl';
  return <div className={`mx-auto ${max} px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Vertical rhythm for a full section. */
export function Section({
  children,
  className = '',
  spacing = 'default',
  id,
}: {
  children: ReactNode;
  className?: string;
  spacing?: 'tight' | 'default' | 'loose';
  id?: string;
}) {
  const pad =
    spacing === 'tight' ? 'py-14' : spacing === 'loose' ? 'py-24 sm:py-32' : 'py-20 sm:py-24';
  return (
    <section id={id} className={`relative ${pad} ${className}`}>
      {children}
    </section>
  );
}

/**
 * The workhorse surface. `sheen` adds the raking top highlight that makes glass
 * read as glass; leave it off for dense grids where the highlight would create
 * a stripe of visual noise across adjacent cards.
 */
export function GlassCard({
  children,
  as: Tag = 'div',
  level = 2,
  sheen = false,
  interactive = false,
  className = '',
}: {
  children: ReactNode;
  as?: 'div' | 'article' | 'li' | 'section';
  level?: 1 | 2 | 3;
  sheen?: boolean;
  /** Adds a hover lift. Only for cards that are genuinely clickable. */
  interactive?: boolean;
  className?: string;
}) {
  const glass = level === 1 ? 'glass-1' : level === 3 ? 'glass-3' : 'glass-2';
  return (
    <Tag
      className={`relative overflow-hidden rounded-card ${glass} ${sheen ? 'glass-sheen glass-shadow' : ''} ${
        interactive ? 'card-lift' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Small uppercase label that opens a section or a card. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase ${className}`}
    >
      {/* The rule gives the label a baseline to sit on and echoes the nebula. */}
      <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-brand/70 to-transparent" />
      {children}
    </p>
  );
}

/** Section header used across the site. Centred unless `align` says otherwise. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      <div className={align === 'center' ? 'flex justify-center' : ''}>
        <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-pretty text-ink-soft sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

/** A single headline + supporting copy block, for hero sections. */
export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-lg leading-relaxed text-pretty text-ink-soft sm:text-xl ${className}`}>
      {children}
    </p>
  );
}

/** Compact labelled figure, e.g. "8 — learning modules".
 *  Deliberately not mint: figures repeat down every page, and spending the
 *  accent colour here would break the 70/20/10 split that keeps mint meaning
 *  "AI action". Weight and size carry the hierarchy instead. */
export function ProofStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">{value}</p>
      <p className="mt-1.5 text-sm text-ink-soft">{label}</p>
    </div>
  );
}

/** Rounded tag for categories, scopes and small metadata. */
export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line bg-white/5 text-ink-soft',
    brand: 'border-brand/25 bg-brand-light text-brand',
    accent: 'border-accent/25 bg-accent-light text-accent',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Terminal-style code panel. Used for the curl examples on the homepage and API
 * page, so the chrome (traffic dots, filename) lives with the presentation
 * rather than being restated in each page.
 */
export function CodeBlock({
  children,
  label = 'bash',
  className = '',
}: {
  children: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`glass-2 overflow-hidden rounded-card border-line/80 ${className}`}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-danger/60" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent/60" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success/60" />
        <span className="ml-1.5 font-mono text-[11px] text-ink-faint">{label}</span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[11px] leading-relaxed text-ink-soft sm:text-xs">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * Long-form prose surface for the legal pages. Keeps measure and rhythm so
 * eight numbered clauses stay readable instead of becoming a wall of text.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <GlassCard level={1} className="p-7 sm:p-10">
      <div className="space-y-8">{children}</div>
    </GlassCard>
  );
}
