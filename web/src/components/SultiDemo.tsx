'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import SultiOrb, { type SultiState } from './SultiOrb';
import { Pill } from './ui';

/**
 * A scripted preview of a Sulti conversation — the SULTI section's centrepiece.
 *
 * Honesty rules this component: it never claims to be a live AI session. The
 * phrases are real ones from the app's pronunciation bank (lib/product.ts),
 * and the footer says plainly that the live tutor runs in the Android app.
 *
 * The state machine drives both the orb and a written status line, so the
 * sequence is legible with animation disabled and to screen readers — motion
 * only reinforces what the labels already say. The shattered-glass entry plays
 * exactly once per session start, as the brief specifies: a transition into
 * AI space, not a texture.
 */

type Phase = 'idle' | 'greet' | 'listen' | 'think' | 'reply' | 'done';

const ORB_STATE: Record<Phase, SultiState> = {
  idle: 'idle',
  greet: 'speaking',
  listen: 'listening',
  think: 'thinking',
  reply: 'speaking',
  done: 'idle',
};

const STATE_TEXT: Record<Phase, string> = {
  idle: 'Ready to talk',
  greet: 'Sulti is speaking',
  listen: 'Sulti is listening',
  think: 'Sulti is thinking',
  reply: 'Sulti is speaking',
  done: 'Ready to talk',
};

interface Line {
  from: 'sulti' | 'you';
  text: string;
  gloss: string;
}

const GREETING: Line = {
  from: 'sulti',
  text: 'Maayong buntag! Kumusta ka?',
  gloss: 'Good morning! How are you?',
};

const REPLIES = [
  { text: 'Maayo ko, salamat!', gloss: 'I am good, thanks!' },
  { text: 'Okay ra ko, busy lang.', gloss: 'I am okay, just busy.' },
];

const FOLLOW_UP: Line = {
  from: 'sulti',
  text: 'Maayo! Salamat kaayo sa imong tubag. Unsa imong buhaton karon?',
  gloss: 'Very good! Thank you for your answer. What will you do today?',
};

export default function SultiDemo() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [shatter, setShatter] = useState(false);
  const [userLine, setUserLine] = useState<Line | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };

  // Never leave timers running after unmount (StrictMode double-invoke safe).
  useEffect(() => clearTimers, []);

  function start() {
    clearTimers();
    setUserLine(null);
    setShatter(true);
    setPhase('greet');

    after(950, () => setShatter(false));
    after(2800, () => setPhase('listen'));
    // Auto-pick a reply if the visitor does not — the preview must complete
    // on its own so nobody is left staring at a listening state.
    after(6400, () => {
      if (phaseRef.current === 'listen') answer(0);
    });
  }

  function answer(index: number) {
    if (phaseRef.current !== 'listen') return;
    clearTimers();
    setUserLine({ from: 'you', ...REPLIES[index] });
    setPhase('think');

    after(1500, () => setPhase('reply'));
    after(4400, () => setPhase('done'));
  }

  const showGreeting = phase !== 'idle';
  const showUser = phase === 'think' || phase === 'reply' || phase === 'done';
  const showFollowUp = phase === 'reply' || phase === 'done';

  return (
    <div className="glass-3 glass-sheen glass-shadow relative overflow-hidden rounded-card p-5 sm:p-6">
      {/* The one shattered-glass moment on the site: session start. */}
      {shatter && (
        <div className="shatter" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`shard shard-${i + 1}`} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Conversation preview
        </p>
        <Pill tone="brand">Scripted demo</Pill>
      </div>

      <div className="mt-2 flex justify-center">
        <SultiOrb state={ORB_STATE[phase]} size="compact" />
      </div>

      {/* State announcements for assistive tech — the animation is never the
          only carrier of meaning. */}
      <p role="status" aria-live="polite" className="sr-only">
        {STATE_TEXT[phase]}
      </p>

      <ol className="mt-4 min-h-[170px] space-y-3">
        {showGreeting && <Bubble line={GREETING} />}
        {showUser && userLine && <Bubble line={userLine} />}
        {showFollowUp && <Bubble line={FOLLOW_UP} />}
      </ol>

      {phase === 'idle' && (
        <button type="button" onClick={start} className="btn-primary mt-1 w-full justify-center">
          <Icon name="play" className="h-4 w-4" strokeWidth={2.25} />
          Play conversation preview
        </button>
      )}

      {phase === 'listen' && (
        <div className="anim-pop">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Suggested replies
          </p>
          <div className="mt-2.5 flex flex-col gap-2">
            {REPLIES.map((r, i) => (
              <button
                key={r.text}
                type="button"
                onClick={() => answer(i)}
                className="press rounded-control border border-brand/25 bg-brand-light px-4 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:border-brand/50"
              >
                &ldquo;{r.text}&rdquo;
                <span className="ml-2 text-xs font-normal text-ink-faint">{r.gloss}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => answer(0)}
            className="press mt-3 inline-flex items-center gap-2 rounded-control border border-line bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/30 hover:text-ink"
          >
            <Icon name="mic" className="h-3.5 w-3.5 text-brand" strokeWidth={2.25} />
            Answer with your voice
          </button>
        </div>
      )}

      {phase === 'done' && (
        <button type="button" onClick={start} className="btn-ghost mt-1 w-full justify-center">
          <Icon name="refresh" className="h-4 w-4" strokeWidth={2.25} />
          Replay preview
        </button>
      )}

      <p className="mt-4 flex items-start gap-2 border-t border-line/70 pt-4 text-xs leading-relaxed text-ink-faint">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />A scripted preview
        using real phrases from the app. The live tutor — voice input, real corrections, XP — runs
        in the Android app.
      </p>
    </div>
  );
}

function Bubble({ line }: { line: Line }) {
  const mine = line.from === 'you';
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <span
        className={`block max-w-[86%] rounded-control px-4 py-3 ${
          mine ? 'border border-brand/25 bg-brand-light' : 'border border-line bg-white/[0.05]'
        }`}
      >
        <span
          className={`block text-[10px] font-semibold tracking-[0.12em] uppercase ${
            mine ? 'text-brand' : 'text-ink-faint'
          }`}
        >
          {mine ? 'You' : 'Sulti'}
        </span>
        <span className="mt-1 block text-sm font-semibold text-ink">{line.text}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{line.gloss}</span>
      </span>
    </li>
  );
}
