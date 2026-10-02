import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import ContactForm from '@/components/ContactForm';
import Icon from '@/components/Icon';
import { APP, SITE_URL } from '@/lib/site';
import { Container, GlassCard, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the SultiAI team.',
};

const CHANNELS = [
  {
    icon: 'mail' as const,
    label: 'Email',
    value: APP.contactEmail,
    href: `mailto:${APP.contactEmail}`,
  },
  { icon: 'globe' as const, label: 'Website', value: SITE_URL, href: SITE_URL },
];

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        description="Questions, feedback, partnerships, or just a hello — drop us a message."
      />

      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div className="space-y-5">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
                Other ways to reach us
              </h2>

              <ul className="space-y-3">
                {CHANNELS.map((c) => (
                  <li key={c.label}>
                    <a
                      href={c.href}
                      className="press glass-1 flex items-center gap-3.5 rounded-control p-4 transition-colors hover:border-brand/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] border border-brand/20 bg-brand-light text-brand">
                        <Icon name={c.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                          {c.label}
                        </span>
                        {/* break-all: an address must not overflow a narrow card. */}
                        <span className="mt-0.5 block truncate text-sm font-medium break-all text-ink">
                          {c.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}

                <li className="glass-1 flex items-center gap-3.5 rounded-control p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] border border-line bg-white/5 text-ink-soft">
                    <Icon name="chatbubbles" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                      In the app
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-ink">
                      Download and chat with us there
                    </span>
                  </span>
                </li>
              </ul>

              <GlassCard level={1} className="p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Icon name="info" className="h-4 w-4 text-brand" />
                  Response time
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  We usually reply within 1&ndash;2 business days. For urgent issues, use the in-app
                  feedback form.
                </p>
              </GlassCard>
            </div>

            <ContactForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
