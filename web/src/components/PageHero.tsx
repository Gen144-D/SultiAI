import type { ReactNode } from 'react';
import { Container, Eyebrow } from './ui';

/**
 * Standard opening for every interior page.
 *
 * `actions` sits below the copy on mobile and beside it from `lg` up, so a
 * page with a primary CTA does not push the heading off-screen on a phone.
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* A tighter nebula than the page background, so the hero reads as its
          own pool of light without needing a solid colour change. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(680px 300px at 50% -10%, var(--nebula-1), transparent 70%)',
        }}
      />

      <Container className="pt-16 pb-14 sm:pt-20 sm:pb-18">
        <div
          className={
            aside
              ? 'grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]'
              : 'mx-auto max-w-3xl text-center'
          }
        >
          <div className={aside ? '' : 'flex flex-col items-center'}>
            <div className={aside ? '' : 'flex justify-center'}>
              <Eyebrow className={aside ? '' : 'justify-center'}>{eyebrow}</Eyebrow>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-5xl">
              {title}
            </h1>

            {description && (
              <p
                className={`mt-5 text-lg leading-relaxed text-pretty text-ink-soft ${
                  aside ? 'max-w-xl' : 'mx-auto max-w-2xl'
                }`}
              >
                {description}
              </p>
            )}

            {actions && (
              <div className={`mt-8 flex flex-wrap gap-3 ${aside ? '' : 'justify-center'}`}>
                {actions}
              </div>
            )}
          </div>

          {aside}
        </div>
      </Container>
    </section>
  );
}
