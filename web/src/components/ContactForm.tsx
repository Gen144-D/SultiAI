'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const initial = { name: '', email: '', subject: '', message: '' };

export default function ContactForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const result = await api.submitContact(form);
      if (result.received) {
        setStatus('success');
        setForm(initial);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const field =
    'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand';

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
        <p className="text-3xl">🎉</p>
        <h3 className="mt-3 text-lg font-bold text-ink">Message sent!</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Salamat! Our team will get back to you within 1–2 business days.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-line bg-white p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
          <input
            required
            className={field}
            placeholder="Juan dela Cruz"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input
            required
            type="email"
            className={field}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
        <input
          required
          className={field}
          placeholder="How can we help?"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Message</label>
        <textarea
          required
          rows={5}
          className={`${field} resize-none`}
          placeholder="Tell us more..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>

      {status === 'error' && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-full bg-gradient-to-r from-brand to-brand-dark py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
