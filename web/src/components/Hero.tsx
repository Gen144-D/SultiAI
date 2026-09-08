import Link from 'next/link';
import PlayStoreBadge from './PlayStoreBadge';
import AppScreenshot from './AppScreenshot';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-light to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-dark">
            <span className="h-2 w-2 rounded-full bg-success" />
            Now on Google Play
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Learn Bisaya{' '}
            <span className="bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
              with AI
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            SultiAI is your AI-powered language partner for learning Bisaya (Cebuano) — with a
            tutor, voice practice, cultural discovery, and a community that keeps the language
            alive.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PlayStoreBadge />
            <Link
              href="/how-it-works"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              See how it works
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-8">
            {[
              { value: '48k+', label: 'Downloads' },
              { value: '12k+', label: 'Learners' },
              { value: '1.9k', label: 'Active today' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-2xl font-bold text-brand-dark">{s.value}</dt>
                <dd className="mt-1 text-sm text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand/15 via-accent/10 to-transparent blur-2xl" />
          <AppScreenshot />
        </div>
      </div>
    </section>
  );
}
