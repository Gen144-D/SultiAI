export default function AppScreenshot() {
  return (
    <div className="relative mx-auto w-64 sm:w-72">
      <div className="rounded-[2.6rem] border-[10px] border-ink bg-white shadow-2xl">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-brand-light">
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <span className="text-xs font-bold text-ink">Maayong buntag! ☀️</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-ink">
              ⚡
            </span>
          </div>

          <div className="space-y-3 px-3 pb-4 pt-2">
            <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Daily challenge</p>
              <p className="mt-1 text-sm font-bold">&ldquo;Unsa imong pangalan?&rdquo;</p>
              <p className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold">
                +25 XP
              </p>
            </div>

            {[
              { icon: '🗣', label: 'AI Tutor', w: 'w-24', color: 'bg-white' },
              { icon: '🎙', label: 'Voice Mode', w: 'w-24', color: 'bg-white' },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-base">
                  {c.icon}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ink">{c.label}</p>
                  <div className={`mt-1.5 h-1.5 rounded-full bg-line ${c.w}`} />
                </div>
              </div>
            ))}

            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-ink">Streak</p>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span
                    key={d}
                    className={`h-6 flex-1 rounded-md ${d <= 5 ? 'bg-accent' : 'bg-line'}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-ink-faint">5-day streak · Level 8 · 2,450 XP</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl shadow-lg">
        🎉
      </div>
      <div className="absolute -left-6 bottom-10 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-lg">
        <span className="text-base">🇵🇭</span>
        <span className="text-xs font-semibold text-ink">Bisaya · Cebuano</span>
      </div>
    </div>
  );
}
