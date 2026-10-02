'use client';

import { useState } from 'react';
import type { AdminSettings } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`press relative h-6 w-11 shrink-0 rounded-full ring-1 ring-inset ${
        checked ? 'bg-brand-solid ring-brand/40' : 'bg-line-strong ring-line-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-ink shadow transition-transform duration-300 ease-soft ${
          checked ? 'translate-x-5' : 'translate-x-0'
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
    } catch (err: unknown) {
      toast.push('error', errorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!current) return null;

  const set = (patch: Partial<AdminSettings>) => setForm((f) => ({ ...(f ?? data!), ...patch }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Platform-wide configuration, AI limits, and appearance."
        actions={
          <>
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
          </>
        }
      />

      {form && (
        <p
          role="status"
          className="anim-rise rounded-control bg-warning-soft px-4 py-2.5 text-xs font-medium text-warning ring-1 ring-warning/25 ring-inset"
        >
          You have unsaved changes. They apply platform-wide once you save.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Feature toggles" subtitle="Control what's available in the app" />
          <div className="space-y-5 p-5 sm:p-6">
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
                <Toggle
                  checked={current[item.key]}
                  onChange={(v) => set({ [item.key]: v })}
                  label={item.label}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="AI configuration" subtitle="Model provider and limits" />
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="ai-provider" className="mb-1.5 block text-sm font-medium text-ink">
                Primary AI provider
              </label>
              <select
                id="ai-provider"
                className={`${selectCls} w-full`}
                value={current.aiProvider}
                onChange={(e) => set({ aiProvider: e.target.value as AdminSettings['aiProvider'] })}
              >
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="auto">Auto (fallback)</option>
              </select>
            </div>
            <div>
              <label htmlFor="daily-xp-goal" className="mb-1.5 block text-sm font-medium text-ink">
                Daily XP goal (per user)
              </label>
              <input
                id="daily-xp-goal"
                type="number"
                min={10}
                className={inputCls}
                value={current.dailyXpGoal}
                onChange={(e) => set({ dailyXpGoal: Number(e.target.value) })}
              />
            </div>
            <div>
              <label
                htmlFor="max-ai-requests"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Max AI requests / user / day
              </label>
              <input
                id="max-ai-requests"
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
            <li
              key={a.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50 sm:px-6"
            >
              <Avatar name={a.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{a.name}</p>
                <p className="truncate text-xs text-ink-faint">{a.email}</p>
              </div>
              <RoleBadge role={a.role} />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Appearance" subtitle="Choose a theme for the admin dashboard" />
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {themeList.map((t) => {
              const active = themeName === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  aria-pressed={active}
                  className={`press relative rounded-card p-4 text-left ${
                    active
                      ? 'glass-3 ring-2 ring-brand/45'
                      : 'glass-2 hover:border-brand/25 hover:bg-brand-soft/40'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--brand-soft)',
                        color: 'var(--brand-ink)',
                      }}
                    >
                      {t.label.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {t.label}
                      </span>
                      <span className="block truncate text-xs text-ink-faint">{t.description}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {['--brand', '--success', '--warning', '--violet'].map((token) => (
                      <span
                        key={token}
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-white/10"
                        style={{ backgroundColor: `var(${token})` }}
                      />
                    ))}
                  </div>

                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-solid text-on-brand"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                  <span className="sr-only">{active ? 'Currently selected' : 'Select theme'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <p className="text-xs text-ink-faint">
        Last updated {new Date(current.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
