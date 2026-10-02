'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from '@/lib/themes';

const emptySubscribe = () => () => {};

const themeIcons: Record<string, () => React.ReactElement> = {
  midnightTeal: MoonIcon,
  warmCyberSunset: FlameIcon,
  obsidianEmerald: DiamondIcon,
  softAcademicLight: SunIcon,
};

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { themeName, themeList, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`inline-flex items-center gap-0.5 rounded-control glass-2 p-0.5 ${className}`}
    >
      {themeList.map((t) => {
        const Icon = themeIcons[t.id] || SunIcon;
        const active = mounted && themeName === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={`${t.label} — ${t.description}`}
            onClick={() => setTheme(t.id)}
            className={`press flex h-8 w-8 items-center justify-center rounded-[9px] ${
              active
                ? 'bg-brand-soft text-brand-ink ring-1 ring-brand/30'
                : 'text-ink-faint hover:bg-surface-2 hover:text-ink-soft'
            }`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2.01-1.5-2.5S6 8.5 6 10c0 1.5 1 2.5 2.5 2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.72 0 1.44-.07 2.12-.2" />
      <path d="M14 9a2 2 0 0 1 2 2c0 1.38-.5 2.01-1.5 2.5S14 15.5 14 14c0-1.5 1-2.5 2.5-2.5" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3L1 9l11 11 11-11-11-11z" />
      <path d="M12 3v18" />
      <path d="M1 9l11 11" />
      <path d="M23 9l-11 11" />
    </svg>
  );
}
