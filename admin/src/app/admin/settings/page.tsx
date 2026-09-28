'use client';

import { useState } from 'react';
import type { AdminSettings } from '@/types';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/themes';
import {
  Avatar,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  RoleBadge,
  ghostBtn,
  inputCls,
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
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand-solid' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { themeName, themeList, setTheme } = useTheme();
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
          <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
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
                className={inputCls}
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
                className={inputCls}
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

      <Card>
          <CardHeader title="Appearance" subtitle="Choose a theme for the admin dashboard" />
          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {themeList.map((t) => {
                const active = themeName === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
                      active
                        ? 'border-brand-solid bg-brand-soft/50 shadow-lg shadow-brand/10 scale-[1.02]'
                        : 'border-line hover:border-line-strong hover:bg-surface-2'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `var(--brand-soft)` }}
                      >
                        <span className="text-xs font-semibold" style={{ color: `var(--brand-ink)` }}>
                          {t.label.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{t.label}</p>
                        <p className="text-xs text-ink-faint truncate">{t.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `var(--brand)` }}
                      />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `var(--success)` }}
                      />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `var(--warning)` }}
                      />
                    </div>
                    {active && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-solid text-on-brand">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

      <p className="text-xs text-ink-faint">
        Last updated: {new Date(current.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
