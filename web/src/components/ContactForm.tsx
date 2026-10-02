'use client';

import { useState } from 'react';
import { APP } from '@/lib/site';
import Icon from './Icon';
import { GlassCard } from './ui';

const initial = { name: '', email: '', subject: '', message: '' };

/**
 * There is no contact API on the server, so this composes a real email instead
 * of pretending to submit. The visitor's mail client does the sending.
 */
export default function ContactForm() {
  const [form, setForm] = useState(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = [`Name: ${form.name}`, `Email: ${form.email}`, '', form.message].join('\n');

    const href = `mailto:${APP.contactEmail}?subject=${encodeURIComponent(
      `[SultiAI] ${form.subject}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  const field =
    'w-full rounded-control border border-line bg-white/[0.04] px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors duration-200 hover:border-line-strong focus:border-brand/50';

  const label = 'mb-2 block text-sm font-medium text-ink';

  return (
    <GlassCard level={2} sheen className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={label}>
              Name
            </label>
            <input
              id="contact-name"
              required
              autoComplete="name"
              className={field}
              placeholder="Juan dela Cruz"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={label}>
              Your email
            </label>
            <input
              id="contact-email"
              required
              type="email"
              autoComplete="email"
              className={field}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject" className={label}>
            Subject
          </label>
          <input
            id="contact-subject"
            required
            className={field}
            placeholder="Install problem on Android 14"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className={label}>
            Message
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            className={`${field} resize-none`}
            placeholder="Tell us what happened..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3.5">
          <Icon name="mail" className="h-4 w-4" strokeWidth={2} />
          Open in my email app
        </button>

        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Sends to {APP.contactEmail} using your own mail app. Nothing is stored on this site.
        </p>
      </form>
    </GlassCard>
  );
}
