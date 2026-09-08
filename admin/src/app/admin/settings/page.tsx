'use client';

import { useState } from 'react';
import type { AdminSettings } from '@/types';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import {
  Avatar,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  RoleBadge,
  ghostBtn,
  primaryBtn,
  selectCls,
} from '@/components/ui';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-line'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5.5 left-0' : 'translate-x-0.5 left-0'}`}
        style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getSettings(), []);
  const [form, setForm] = useState<Partial<AdminSettings> | null>(null);
  const [saving, setSaving] = useState(false);

  const current: AdminSettings = form ? { ...data!, ...form } : data!;

  async function handleSave() {
    if (!form) return;
    if (form.dailyXpGoal !== undefined && form.dailyXpGoal < 10) {
      toast.push('error', 'Daily XP goal must be at least 10.');
      return;
    }
    if (form.maxDailyAiRequests !== undefined && form.maxDailyAiRequests < 1) {
      toast.push('error', 'Max AI requests must be at least 1.');
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings(form);
      toast.push('success', 'Settings saved.');
      setForm(null);
      reload();
    } catch (err: any) {
      toast.push('error', err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!current) return null;

  const set = (patch: Partial<AdminSettings>) => setForm((f) => ({ ...(f ?? data!), ...patch }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Settings</h1>
          <p className="mt-1 text-sm text-ink-soft">Platform-wide configuration.</p>
        </div>
        <div className="flex gap-3">
          {form && (
            <button type="button" className={ghostBtn} onClick={() => setForm(null)}>
              Discard
            </button>
          )}
          <button
            type="button"
            className={primaryBtn}
            onClick={handleSave}
            disabled={!form || saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Feature toggles" subtitle="Control what's available in the app" />
          <div className="space-y-4 p-6">
            {(
              [
                {
                  key: 'maintenanceMode',
                  label: 'Maintenance mode',
                  desc: 'Blocks user sign-ins during maintenance',
                },
                {
                  key: 'allowSignups',
                  label: 'Allow new signups',
                  desc: 'Permit new account registration',
                },
                {
                  key: 'allowCommunity',
                  label: 'Community features',
                  desc: 'Posts, comments, and follows',
                },
                {
                  key: 'requireVerificationForCommunity',
                  label: 'Require verified users for community',
                  desc: 'Only verified accounts can post',
                },
              ] as const
            ).map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{item.desc}</p>
                </div>
                <Toggle checked={current[item.key]} onChange={(v) => set({ [item.key]: v })} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="AI configuration" subtitle="Model provider and limits" />
          <div className="space-y-5 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Primary AI provider
              </label>
              <select
                className={selectCls}
                value={current.aiProvider}
                onChange={(e) => set({ aiProvider: e.target.value as AdminSettings['aiProvider'] })}
              >
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="auto">Auto (fallback)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Daily XP goal (per user)
              </label>
              <input
                type="number"
                min={10}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
                value={current.dailyXpGoal}
                onChange={(e) => set({ dailyXpGoal: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Max AI requests / user / day
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
                value={current.maxDailyAiRequests}
                onChange={(e) => set({ maxDailyAiRequests: Number(e.target.value) })}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Administrators" subtitle="People with access to this dashboard" />
        <ul className="divide-y divide-line">
          {current.admins.map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-6 py-4">
              <Avatar name={a.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{a.name}</p>
                <p className="truncate text-xs text-ink-faint">{a.email}</p>
              </div>
              <RoleBadge role={a.role} />
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-ink-faint">
        Last updated: {new Date(current.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
