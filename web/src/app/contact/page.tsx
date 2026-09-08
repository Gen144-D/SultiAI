import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the SultiAI team.',
};

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        description="Questions, feedback, partnerships, or just a hello — drop us a message."
      />

      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-lg font-bold text-ink">Other ways to reach us</h2>
          <ul className="mt-5 space-y-4 text-sm text-ink-soft">
            <li className="flex items-center gap-3">
              <span className="text-xl">📧</span> hello@sultiai.com
            </li>
            <li className="flex items-center gap-3">
              <span className="text-xl">🌐</span> sultiai.com
            </li>
            <li className="flex items-center gap-3">
              <span className="text-xl">📱</span> Download the app and chat with us in-app
            </li>
          </ul>
          <div className="mt-8 rounded-3xl border border-line bg-surface p-6">
            <p className="text-sm font-semibold text-ink">Response time</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              We usually reply within 1–2 business days. For urgent issues, use the in-app feedback
              form.
            </p>
          </div>
        </div>

        <ContactForm />
      </section>
    </>
  );
}
