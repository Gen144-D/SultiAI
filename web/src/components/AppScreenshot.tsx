import Icon, { type IconName } from './Icon';
import { TABS } from '@/lib/product';

/**
 * Structural mockup of the app's Home tab.
 *
 * Deliberately shows no invented numbers. An earlier version of this component
 * displayed "Level 8 · 2,450 XP" and a "5-day streak" that do not exist for any
 * real user, which made the site claim data it could not stand behind. The
 * values below are structural labels taken from the app, not fabricated stats.
 *
 * The phone renders its own light UI inside the dark page: the app is light
 * today, so faking a dark app screen here would misrepresent the product.
 */
export default function AppScreenshot() {
  const shortcuts: { icon: IconName; label: string }[] = [
    { icon: 'chatbubbles', label: 'Scenario' },
    { icon: 'school', label: 'Grammar' },
    { icon: 'mic', label: 'Voice' },
    { icon: 'refresh', label: 'Review' },
  ];

  const tabIcons: IconName[] = ['bolt', 'book', 'sparkle', 'people', 'trophy'];

  return (
    <div className="relative mx-auto w-60 sm:w-68">
      {/* The bloom sits behind the device so the frame separates from the page. */}
      <div
        aria-hidden="true"
        className="anim-pulse absolute -inset-10 rounded-full blur-3xl"
        style={{
          backgroundImage: 'radial-gradient(closest-side, var(--nebula-1), transparent 72%)',
        }}
      />

      <div className="relative rounded-[2.4rem] border border-line/80 bg-[#0d1220] p-2 shadow-[0_40px_90px_-40px_var(--brand-glow)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#f7f9fc]">
          {/* status bar */}
          <div className="flex items-center justify-between bg-[#0f172a] px-4 pb-2.5 pt-3 text-white">
            <span className="text-[10px] font-semibold">Maayong buntag!</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-brand">
              <Icon name="bolt" className="h-3 w-3" strokeWidth={2.5} />
              XP
            </span>
          </div>

          {/* daily goal, the real Home headline */}
          <div className="px-4 pb-3 pt-3">
            <div className="rounded-2xl border border-[#e6ebf2] bg-white p-4">
              <p className="text-[10px] font-semibold tracking-wide text-[#8492a6] uppercase">
                Daily goal
              </p>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">Keep your streak alive</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e6ebf2]">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-brand to-brand-solid" />
              </div>
              <p className="mt-2 text-[10px] text-[#8492a6]">Practise daily to earn XP</p>
            </div>
          </div>

          {/* module shortcuts, real module names */}
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {shortcuts.map((c) => (
              <div
                key={c.label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e6ebf2] bg-white p-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand-solid">
                  <Icon name={c.icon} className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-semibold text-[#0f172a]">{c.label}</span>
              </div>
            ))}
          </div>

          {/* real bottom tab bar */}
          <div className="flex items-center justify-around border-t border-[#e6ebf2] bg-white px-2 py-2">
            {TABS.map((t, i) => (
              <span
                key={t.name}
                className={`flex flex-col items-center gap-0.5 px-1.5 text-[8px] font-semibold ${
                  i === 0 ? 'text-brand-solid' : 'text-[#8492a6]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${
                    i === 0 ? 'bg-brand' : 'bg-[#eef1f6]'
                  }`}
                >
                  <Icon
                    name={tabIcons[i] ?? 'trophy'}
                    className="h-3 w-3 text-white"
                    strokeWidth={2.25}
                  />
                </span>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating confirmation chips. Glass rather than solid white so they read
          as overlays of the page, not part of the app UI. */}
      <div className="glass-3 glass-shadow absolute -right-4 top-14 flex items-center gap-2 rounded-control px-3 py-2 sm:-right-6">
        <Icon name="check" className="h-4 w-4 text-success" strokeWidth={2.5} />
        <span className="text-[11px] font-semibold text-ink">Phonemes matched</span>
      </div>

      <div className="glass-3 glass-shadow absolute -left-4 bottom-24 flex items-center gap-2 rounded-control px-3 py-2 sm:-left-6">
        <Icon name="globe" className="h-4 w-4 text-brand" />
        <span className="text-[11px] font-semibold text-ink">3 dialects</span>
      </div>
    </div>
  );
}
