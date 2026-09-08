import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import PlayStoreBadge from '@/components/PlayStoreBadge';
import { api } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Download',
  description: 'Download SultiAI on Google Play and start learning Bisaya with AI.',
};

export default async function Download() {
  const [app, health] = await Promise.all([api.getAppInfo(), api.getHealth()]);

  const statusStyles =
    health.status === 'healthy'
      ? 'border-success/30 bg-success/5 text-success'
      : health.status === 'degraded'
        ? 'border-accent/40 bg-accent-light text-brand-dark'
        : 'border-danger/30 bg-danger/5 text-danger';

  const statusLabel =
    health.status === 'healthy' ? 'All systems operational' : health.status.toUpperCase();

  return (
    <>
      <PageHero
        eyebrow="Download"
        title="Get SultiAI on your phone"
        description={`Learn Bisaya with AI — available on Android. Latest version ${app.version}.`}
      />

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-6 bg-gradient-to-br from-brand to-brand-dark p-8 text-white sm:p-10">
              <h2 className="text-2xl font-bold">Start learning today</h2>
              <p className="text-sm text-white/85">
                Free to download. No credit card required. Your first conversation in Bisaya is a
                few taps away.
              </p>
              <div className="mt-2">
                <PlayStoreBadge />
              </div>
              <dl className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6 text-sm">
                <div>
                  <dt className="text-white/60">Version</dt>
                  <dd className="mt-1 font-semibold">{app.version}</dd>
                </div>
                <div>
                  <dt className="text-white/60">Size</dt>
                  <dd className="mt-1 font-semibold">{app.sizeMb} MB</dd>
                </div>
                <div>
                  <dt className="text-white/60">Downloads</dt>
                  <dd className="mt-1 font-semibold">{app.downloads.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-white/60">Rating</dt>
                  <dd className="mt-1 font-semibold">
                    ★ {app.ratings.average} ({app.ratings.count.toLocaleString()})
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-5 p-8 sm:p-10">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-faint">
                  Requirements
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  <li>• {app.minAndroidVersion}</li>
                  <li>• Targets {app.targetAndroidVersion}</li>
                  <li>• {app.sizeMb} MB free storage</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-faint">
                  Languages
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {app.supportedLanguages.map((l) => (
                    <li key={l}>• {l}</li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${statusStyles}`}>
                ● {statusLabel}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
