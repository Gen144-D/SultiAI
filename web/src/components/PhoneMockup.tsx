import SultiOrb from './SultiOrb';
import Icon from './Icon';

/**
 * Premium interactive mobile showcase for the hero.
 *
 * Shows the product as a conversation — not the Home tab — because the
 * landing promise is "learn by speaking". The scores and labels here are
 * illustrative UI, clearly presented as a product preview rather than a
 * claim about the visitor's own speech.
 */
const WAVE_BARS = [10, 18, 28, 36, 44, 52, 44, 36, 28, 20, 30, 42, 50, 38, 26, 16, 22, 32];

export default function PhoneMockup() {
  return (
    <div className="phone-float relative mx-auto w-64 sm:w-72">
      {/* Bloom behind the device */}
      <div
        aria-hidden="true"
        className="anim-pulse absolute -inset-10 rounded-full blur-3xl"
        style={{
          backgroundImage: 'radial-gradient(closest-side, var(--brand-glow), transparent 72%)',
        }}
      />

      <div className="relative rounded-[2.6rem] border border-line-strong bg-[#0d1220] p-2 shadow-[0_50px_100px_-40px_var(--brand-glow)]">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-[#070d18]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-4 text-white">
            <span className="text-[10px] font-semibold text-white/80">SultiAI</span>
            <span className="flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light px-2 py-0.5 text-[9px] font-bold text-brand">
              <span className="anim-pulse h-1.5 w-1.5 rounded-full bg-brand" />
              AI Tutor Online
            </span>
          </div>

          {/* AI avatar with glow pulse */}
          <div className="flex justify-center pt-3">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-full blur-xl"
                style={{
                  background: 'radial-gradient(closest-side, var(--brand-glow), transparent 70%)',
                }}
              />
              <SultiOrb state="speaking" size="compact" />
            </div>
          </div>

          {/* Conversation bubbles */}
          <div className="space-y-2 px-4 pt-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-white/[0.06] px-3 py-2">
              <p className="text-[11px] font-semibold text-white">Maayong buntag! Kumusta ka?</p>
              <p className="text-[10px] text-white/50">Good morning! How are you?</p>
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-brand/30 bg-brand-light px-3 py-2">
              <p className="text-[11px] font-semibold text-white">Maayo ko, salamat!</p>
              <p className="text-[10px] text-brand/80">I am good, thanks!</p>
            </div>
          </div>

          {/* Voice waveform + speaking indicator */}
          <div className="mx-4 mt-4 rounded-2xl border border-brand/20 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand">
                <Icon name="mic" className="h-3 w-3" strokeWidth={2.5} />
                Voice Active
              </span>
              <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[9px] font-bold text-brand">
                Cebuano Detected
              </span>
            </div>
            <div className="mt-2.5 flex h-10 items-center justify-center gap-1" aria-hidden="true">
              {WAVE_BARS.map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-gradient-to-t from-brand-solid to-brand"
                  style={{ height: `${h}px`, animationDelay: `${i * 0.09}s` }}
                />
              ))}
            </div>
          </div>

          {/* Pronunciation score */}
          <div className="mx-4 mb-4 mt-2.5 flex items-center gap-3 rounded-2xl border border-line bg-white/[0.05] p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-solid text-xs font-bold text-[#04202a]">
              97%
            </span>
            <span>
              <span className="block text-[11px] font-bold text-white">Pronunciation Accuracy</span>
              <span className="block text-[10px] text-white/50">Vowel length — keep it up</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating glass badges */}
      <div className="glass-3 glass-shadow badge-float-1 absolute -right-6 top-16 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:-right-10">
        <Icon name="mic" className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
        <span className="text-[10px] font-bold text-ink">Voice Active</span>
      </div>
      <div className="glass-3 glass-shadow badge-float-2 absolute -left-6 bottom-28 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:-left-10">
        <Icon name="check" className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
        <span className="text-[10px] font-bold text-ink">97% Pronunciation</span>
      </div>
    </div>
  );
}
