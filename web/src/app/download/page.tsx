import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ApkButton from '@/components/ApkButton';
import CopyButton from '@/components/CopyButton';
import Icon from '@/components/Icon';
import PageHero from '@/components/PageHero';
import QrCode from '@/components/QrCode';
import ServiceStatus from '@/components/ServiceStatus';
import { getApkRelease } from '@/lib/apk';
import { APP, DOWNLOAD_PAGE_URL } from '@/lib/site';
import { Container, GlassCard, Section, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Download',
  description:
    'Download the SultiAI Android APK directly and install it on your phone — no Play Store account required.',
  alternates: { canonical: '/download' },
  openGraph: {
    title: 'Download SultiAI for Android',
    description: 'Install the SultiAI APK directly on your phone. Learn Bisaya with an AI tutor.',
    url: '/download',
  },
};

// The page reports the real file on disk, so it must not be baked at build time
// — dropping a new APK in `web/downloads/` should go live without a rebuild.
export const dynamic = 'force-dynamic';

const INSTALL_STEPS = [
  {
    title: 'Download the APK',
    body: 'Tap the button above. Your phone will ask whether to keep the file — choose Keep.',
  },
  {
    title: 'Allow installs from this source',
    body: 'Open Settings → Apps → Special app access → Install unknown apps, then pick your browser and turn it on.',
  },
  {
    title: 'Open the file and install',
    body: 'Tap the downloaded APK, then Install. If Android warns you, confirm you trust the file — it came from this site.',
  },
  {
    title: 'Launch SultiAI',
    body: 'Open the app from your launcher and start your first Bisaya conversation.',
  },
];

const TROUBLESHOOTING = [
  {
    q: '"App not installed" or the installer closes',
    a: 'An older copy of SultiAI is probably still installed with a different signing key. Uninstall it first (long-press the icon → Uninstall), then install the new APK.',
  },
  {
    q: 'The install button is greyed out',
    a: 'You are on Android 7.0 or older. SultiAI needs Android 8.0 or newer.',
  },
  {
    q: '"For your security, your phone is not allowed to install unknown apps"',
    a: 'That is the sideload guard. Go to Settings → Apps → Special app access → Install unknown apps and enable it for the browser you downloaded from.',
  },
  {
    q: 'The download stalls or restarts',
    a: 'The APK is served from this site over your connection. Try Wi-Fi, or scan the QR code from the same page on your phone.',
  },
];

const REQUIREMENTS = [
  `${APP.minAndroid} or newer`,
  `Built for ${APP.targetAndroid}`,
  'Around 80 MB free storage',
  'Microphone access for voice practice',
];

export default async function DownloadPage() {
  const release = await getApkRelease();
  const builtOn = release
    ? new Date(release.builtAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <>
      <PageHero
        eyebrow="Download"
        title="Get SultiAI on your Android phone"
        description="Install the APK directly from this site. No Play Store account, no waiting for a review."
      />

      <Section spacing="tight">
        <Container>
          <GlassCard level={3} sheen className="overflow-hidden">
            <div className="grid md:grid-cols-[1.1fr_1fr]">
              {/* Release panel. Mint bloom from the top-left keeps this the
                  brightest surface on the page without a solid fill. */}
              <div className="relative p-7 sm:p-9">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(420px 300px at 12% 0%, var(--brand-glow), transparent 68%)',
                    opacity: 0.55,
                  }}
                />

                <div className="relative">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/app-icon.png"
                      alt=""
                      width={52}
                      height={52}
                      className="rounded-[0.85rem] shadow-lg"
                      priority
                    />
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-ink">
                        {APP.name}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">{APP.tagline}</p>
                    </div>
                  </div>

                  {release ? (
                    <>
                      <div className="mt-7">
                        <ApkButton release={release} />
                      </div>

                      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-7 text-sm">
                        <div>
                          <dt className="text-ink-faint">Version</dt>
                          <dd className="mt-1 font-semibold text-ink">{release.version ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-faint">Size</dt>
                          <dd className="mt-1 font-semibold text-ink">{release.sizeLabel}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-faint">Package</dt>
                          <dd className="mt-1 font-mono text-xs font-semibold break-all text-ink">
                            {APP.packageName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-faint">Built</dt>
                          <dd className="mt-1 font-semibold text-ink">{builtOn}</dd>
                        </div>
                      </dl>

                      <div className="mt-7 rounded-control border border-line bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                            SHA-256
                          </p>
                          <CopyButton value={release.sha256} label="Copy" />
                        </div>
                        <p className="mt-2.5 font-mono text-[11px] leading-relaxed break-all text-ink-soft">
                          {release.sha256}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="mt-7 rounded-control border border-line bg-white/[0.04] p-6">
                      <p className="text-sm font-semibold text-ink">No build published yet</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        Drop an Android build into{' '}
                        <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-xs text-brand">
                          web/downloads/
                        </code>{' '}
                        and this page will pick it up automatically, with its real size and
                        checksum.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-7 border-t border-line p-7 sm:p-9 md:border-t-0 md:border-l">
                <div>
                  <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                    Requirements
                  </h2>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                    {REQUIREMENTS.map((r) => (
                      <li key={r} className="flex items-start gap-2.5">
                        <Icon
                          name="check"
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                          strokeWidth={2.5}
                        />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                    Languages
                  </h2>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                    {APP.supportedLanguages.map((l) => (
                      <li key={l} className="flex items-start gap-2.5">
                        <Icon name="globe" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-control border border-warning/25 bg-warning/[0.06] p-4">
                  <p className="text-sm font-semibold text-ink">Sideloading, not the Play Store</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    Android blocks APK installs by default, so you will switch on &ldquo;install
                    unknown apps&rdquo; for your browser once. Everything after that is a normal
                    install.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </Container>
      </Section>

      {/* Live service status — only rendered when an API URL is configured. */}
      <Section spacing="tight">
        <Container>
          <ServiceStatus />
        </Container>
      </Section>

      {/* QR — desktop to phone */}
      <Section spacing="tight">
        <Container>
          <GlassCard level={1} className="p-7 sm:p-9">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="mx-auto">
                <QrCode
                  value={DOWNLOAD_PAGE_URL}
                  size={200}
                  alt={`QR code linking to ${DOWNLOAD_PAGE_URL}`}
                />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                  Installing from your computer?
                </h2>
                <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
                  Scan the code with your phone camera and this page opens on the device that will
                  install SultiAI. Handy when the APK is too big to move over by cable.
                </p>
                <p className="mt-5 rounded-control border border-line bg-white/[0.04] px-4 py-3 font-mono text-xs break-all text-ink-soft">
                  {DOWNLOAD_PAGE_URL}
                </p>
              </div>
            </div>
          </GlassCard>
        </Container>
      </Section>

      {/* Install steps */}
      <Section id="install" spacing="tight" className="scroll-mt-24 border-y border-line">
        <Container>
          <SectionHeading align="left" eyebrow="Setup" title="How to install" />
          <ol className="mt-10 space-y-4">
            {INSTALL_STEPS.map((step, i) => (
              <li key={step.title}>
                <GlassCard as="div" level={2} className="flex gap-4 p-5 sm:p-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] border border-brand/25 bg-brand-light font-mono text-sm font-bold text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Troubleshooting */}
      <Section>
        <Container>
          <SectionHeading align="left" eyebrow="Support" title="If something goes wrong" />
          <dl className="mt-10 space-y-4">
            {TROUBLESHOOTING.map((item) => (
              <GlassCard as="div" key={item.q} level={1} className="p-5 sm:p-6">
                <dt className="font-semibold text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</dd>
              </GlassCard>
            ))}
          </dl>
          <p className="mt-8 text-sm text-ink-soft">
            Still stuck?{' '}
            <a href={`mailto:${APP.contactEmail}`} className="link-brand">
              Email {APP.contactEmail}
            </a>{' '}
            or{' '}
            <Link href="/contact" className="link-brand">
              use the contact form
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
