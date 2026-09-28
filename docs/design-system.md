# SultiAI — Complete Visual Design System

**Status:** Implemented (phases 1–8). Remaining work is the primitive adoption
sweep and §15 audit follow-ups — see *Implementation log* at the end.
**Scope:** Five dashboards, four selectable themes, one shared design language.
**Default theme:** Midnight Teal.

---

## 0. Critical finding: the foundation already exists

Before designing anything, you should know this. SultiAI does **not** need a new
theme system built from scratch. It already has one, and it is good.

| What you asked for | What exists today | Status |
|---|---|---|
| Four selectable themes | `src/theme/index.js:218` — `themes` with 4 entries | Done |
| Midnight Teal (default) | `src/theme/index.js:3`, `DEFAULT_THEME` at `:254` | Done |
| Warm Cyber Sunset | `src/theme/index.js:57` | Done |
| Obsidian Emerald | `src/theme/index.js:111` | Done |
| Soft Academic Light | `src/theme/index.js:165` | Done |
| Theme state + persistence | `src/context/ThemeContext.js` — AsyncStorage, cross-fade switch | Done |
| Theme selector UI | `src/screens/ProfileScreen.js:527-560` — preview cards, swatches, check | Done |
| Spacing / radius / type / shadow tokens | `src/theme/index.js:256-336` | Done |
| Accessibility prefs | `src/hooks/useAccessibility.ts` | Done |
| Per-dashboard visual identity | `src/theme/atmosphere.js` — 5 atmospheres (density, radius, ambient) | Done |
| Per-dashboard ambient/illustration treatment | `AuroraBackground.js` theme-coloured, atmosphere-scaled, mounted on all 5 tabs | Done |
| Single source of color truth | 426 → 209 hardcoded hex outside theme dir (45 files) | Improved |
| Consistent loading states | `src/components/Skeleton.js` — replaces 20 duplicated skeleton styles | Done |
| Consistent empty states | `src/components/EmptyState.js` — adopted by Leaderboard, Notifications | Partial |
| Consistent icon controls | `src/components/IconButton.js` — 44pt hit target, no ad-hoc variants | New |
| Consistent section headers | `src/components/SectionHeader.js` + `Divider` | New |
| Consistent primary CTA | `src/components/Button.js` — but only 4 consumers vs ~100 hand-rolled | Partial |
| Working navigation | Fixed 7 dead `Tutor` targets; repo-wide route sweep clean | Done |

So the real work is **not** "make four palettes." It is three things:

1. **Fix the leaks** so the themes you already have actually reach the screen.
2. **Add a dashboard-dimension layer** so Learn feels like learning and SULTI feels
   like a voice companion — under the same theme.
3. **Fix the accessibility defects** listed in §15.

### 0.1 On screenshots

The screenshots referenced in the prompt did not arrive with the message. I did not
guess at them. Every color value in this document is **read from source**, not
estimated from a screenshot. Where I describe the existing look, that description is
inferred from code, and is labelled as such.

---

## 1. Product and visual identity analysis

SultiAI is four products sharing one shell:

| Product | User's job | Emotional target |
|---|---|---|
| Personal coach | "What should I do next?" | Oriented, capable, not judged |
| Learning platform | "Teach me systematically" | Progress, structure, momentum |
| Voice companion | "Let me practise out loud" | Safe to be imperfect |
| Practice community | "Let me talk to people" | Belonging, not competition |

### The design principle

**One brand, five atmospheres, four themes.**

- **Themes** change *colour only*. They never change layout, spacing, type scale,
  component structure, or information architecture. This is what keeps the app
  coherent, and it is what your existing architecture already enforces.
- **Dashboard atmospheres** change *composition only*. Density, ambient background,
  which components appear, and how content is prioritised. They never change the
  colour contract or the component library.

The failure mode this avoids: dashboards that each invent their own colour palette.
That is how apps stop looking like one product. Colour is brand. Layout is purpose.

### What users should feel on open

> *"Something here already knows where I left off, and it's glad to see me."*

Not: an analytics dashboard. Not: a game. Warmth first, data second.

### What makes SultiAI recognisable

1. **The orb.** `VoiceOrb.js` is a 46-bar radial waveform with orbiting particles and
   a gradient core. It is the single strongest brand asset in the codebase and it
   should appear — at reduced scale and opacity — on Home and Learn as a motif.
2. **Aurora wash.** `AuroraBackground.js` renders four radial gradient blooms at
   0.04–0.08 alpha. It is the atmospheric signature of the dark themes.
3. **Deep-space surfaces.** `background #0B1120` → `surface #111827` is a subtle 3%
   step. It reads as depth, not as a grey card on a grey page.
4. **Mint-teal on midnight.** The `#00D4BD` on `#0B1120` pairing is distinctive.
   Preserve it as the default.

---

## 2. Existing design audit

### 2.1 Verified tokens (`src/theme/index.js`)

**Midnight Teal** — your default, and the brand.

| Role | Hex | Line |
|---|---|---|
| background | `#0B1120` | 16 |
| backgroundDeep | `#080E1A` | 17 |
| surface / card | `#111827` | 18, 21 |
| surfaceSecondary | `#0F172A` | 19 |
| primary | `#00D4BD` | 4 |
| primaryDark | `#00B8A3` | 5 |
| primaryHover | `#33DDD0` | 7 |
| secondary | `#34D399` | 8 |
| accent | `#5EEAD4` | 10 |
| text | `#F8FAFC` | 22 |
| textSecondary | `#94A3B8` | 23 |
| textLight | `#CBD5E1` | 24 |
| border | `#1E293B` | 25 |
| success / error / warning | `#34D399` / `#FB7185` / `#FCD34D` | 28-30 |
| overlay | `rgba(15,23,42,0.6)` | 39 |
| aurora1–4 | teal @ 0.04–0.07 | 41-44 |
| orbGradient1–2 | `#00D4BD` / `#34D399` | 45-46 |

This palette is genuinely well-built. Surfaces are separated by luminance, not by
hue, which is why it feels cohesive.

### 2.2 The problems

#### P1 — Hardcoded colour leaks (highest priority)

The original audit found `426` hardcoded hex values across `56` files **outside**
`src/theme/`. That is now down to **209 across 45 files** (see §16.3); the counts
below are the *baseline* offenders, kept for reference.

Worst offenders:

| File | Hardcoded hex | Impact |
|---|---|---|
| `src/screens/LearnScreen.js` | 70 | 14 module gradients are Tailwind hex, theme-invariant |
| `src/screens/ProfileScreen.js` | 21 | Certificates, downloads, history colours |
| `src/components/learning/VocabularyExercise.js` | 20 | Exercise feedback colours |
| `src/screens/learning/ModuleScreens.js` | 18 | Module hero gradients |
| `src/screens/PronunciationScreen.js` | 18 | **Hardcoded Midnight-Teal-only** |

`PronunciationScreen.js` is the clearest proof of a real bug. Lines 719-883 hardcode
`#0D1E30`, `#2DD4BF`, `#04111f`, `#FFFFFF`. Under **Obsidian Emerald** or **Warm
Cyber Sunset** this screen still renders midnight teal. A user who picks a different
theme gets a visibly broken screen.

Meanwhile `src/components/voice/palette.js` maintains a **parallel, inconsistent**
token set — 52 hex values, different names (`glass` vs `glassBg`, `danger` vs
`error`, `textMuted` vs `textDisabled`, `star` with no theme equivalent). Two sources
of truth for the same visual system. This is the single biggest structural liability.

`src/theme/colors.js` is a **third** source: a light legacy palette
(`background #EBF7F5`, `primary #008B8B`) that predates the dark system and appears
superseded. It should be deleted or explicitly marked legacy.

`src/theme/index.js:339-342` (`gradients.header = ['#008B8B','#00A896']`) still uses
the **old** teal, not the current `#00D4BD`. Inconsistent with its own theme.

#### P2 — Contrast defects (see §15 for the full table)

- `textOnGradient: '#FFFFFF'` in all three dark themes. On `#00D4BD` that is
  **1.88:1** — fails AA badly. The code already has a fix, `getContrastColor`, but
  it is applied inconsistently and the token itself is wrong.
- `border` at 1.2:1 against surface. Acceptable for a decorative hairline, fails
  for anything meaningful.

#### P3 — Token naming is not semantic

Tokens are named by *hue slot* (`primaryLight`, `softTeal`, `softOrange`) rather
than by *purpose* (`onPrimary`, `dangerSurface`, `successBorder`). Result: any screen
that wants a subtle amber background reaches for `softOrange`, which is a theme-
specific tint. Adding a fifth theme would require auditing 426 call sites.

#### P4 — `useAccessibility` bugs

- `getTextStyle` multiplies `fontSize` by 1.2 but **not** `lineHeight`, so large-text
  mode clips descenders.
- `getContrastColor` uses `isDarkMode` from the **OS** `Appearance` setting, not the
  active theme. A user on Obsidian Emerald with the OS in light mode gets
  light-mode ink on a dark surface.
- `highContrast` returns pure `#000`/`#FFF`, discarding the theme entirely.

#### P5 — Typography is iOS-shaped only

`letterSpacing: 0.37` on `largeTitle`, `0.36` on `h1` are SF Pro Display values.
Android gets these too, via `StyleSheet`, and Roboto renders loose and odd at that
tracking. `h4` and `button` both carry `-0.41`, which is a copy-paste from a single
source value.

---

## 3. Recommended overall design direction

Keep the architecture. Change three things.

### 3.1 Add a semantic token layer

Insert between `themes.*.colors` and the screens. Screens consume semantics, never
hues.

```js
// src/theme/semantic.js  (proposed)
export function buildSemantic(theme) {
  const c = theme.colors;
  return {
    onPrimary:        theme.family === 'light' ? '#FFFFFF' : '#04111F',
    onPrimaryMuted:   theme.family === 'light' ? '#D1FAE5' : '#04231F',
    dangerSurface:    c.coralLight,
    successSurface:   theme.family === 'light' ? '#D1FAE5' : '#0B2A22',
    warningSurface:   c.amberLight,
    infoSurface:      theme.family === 'light' ? '#E6F7F3' : '#131A2E',
    focusRing:        c.primaryHover,
    focusRingWidth:   2,
    borderStrong:     c.borderHover,
    scrim:            c.overlay,
  };
}
```

This fixes `textOnGradient` once, for all four themes, permanently.

### 3.2 Add a dashboard atmosphere layer

This is the answer to your actual question: *how do dashboards differ without
forking the app?*

```js
// src/theme/atmosphere.js  (proposed)
export const ATMOSPHERE = {
  home: {
    density: 'comfortable',
    ambient: 'aurora-soft',
    radiusScale: 1,
    elevation: 'low',
    signature: 'orb',        // faint orb motif behind the greeting
    heroPattern: 'single',
  },
  learn: {
    density: 'compact',
    ambient: 'aurora-path',  // vertical spine glow behind the learning path
    radiusScale: 0.85,       // tighter radii = denser, more "textbook"
    elevation: 'flat',       // path reads via fill, not shadow
    signature: 'path',
    heroPattern: 'staggered',
  },
  sulti: {
    density: 'spacious',
    ambient: 'orb-active',   // full aurora + orb glow
    radiusScale: 1.25,       // rounder, softer, less "interface"
    elevation: 'glow',       // shadow replaced by coloured glow
    signature: 'orb',
    heroPattern: 'immersive',
  },
  community: {
    density: 'comfortable',
    ambient: 'flat',         // content-first, minimal atmosphere
    radiusScale: 0.9,
    elevation: 'card',
    signature: 'none',
    heroPattern: 'feed',
  },
  settings: {
    density: 'comfortable',
    ambient: 'none',
    radiusScale: 0.75,       // smallest radii = quietest, most utilitarian
    elevation: 'flat',
    signature: 'none',
    heroPattern: 'grouped',
  },
};

export function useAtmosphere(screenId) {
  const { themeName, reduceMotion } = useTheme();
  return { ...ATMOSPHERE[screenId], reduceMotion, themeName };
}
```

Apply it in exactly three places so it stays cheap:

- `borderRadius` lookups go through `radiusScale`
- ambient background picks a component variant
- section spacing derives from `density`

**Critically:** atmosphere never touches colour. Warm Cyber Sunset Learn is warm
because of the *theme*, not because Learn added its own coral.

### 3.3 Delete the leaks

Three-phase, each independently shippable:

1. Delete `src/theme/colors.js`. Fix `gradients` at `index.js:339` to use theme
   values.
2. Fold `voice/palette.js` into `semantic.js`. Keep `useVoicePalette()` as a thin
   re-export so no component breaks.
3. Screen by screen, replace hardcoded hex with tokens. `PronunciationScreen` and
   `LearnScreen` first — they are the visibly broken ones.

---

## 4. Dashboard-specific design strategy

| | Home | Learn | SULTI | Community | Settings |
|---|---|---|---|---|---|
| Purpose | Orient + one next action | Systematic progress | Conversation | Communication | Control |
| Primary action | **Continue** | **Next lesson** | **Hold to speak** | **Create post** | **Change a setting** |
| Atmosphere | aurora-soft | aurora-path | orb-active | flat | none |
| Density | comfortable | compact | spacious | comfortable | comfortable |
| Radius scale | 1.0 | 0.85 | 1.25 | 0.9 | 0.75 |
| Structure | Hero → single CTA → proof | Path spine → categories | Avatar stage → controls | Full-bleed feed | Grouped list |
| Stat density | 2–3 max | Progress rings | **None** | Inline only | None |
| Content order | Motivation, then action | Progress, then content | Avatar, then text | Content, then nav | Grouped, alphabetical-ish |

The rule that keeps this from collapsing into sameness: **colour and type are
identical across all five; composition is not.** A user switching tabs should feel
the same brand and a different room.

---

## 5. Home Dashboard — personal learning companion

**Primary purpose:** Tell the user what to do next, in under two seconds.
**Primary action:** Continue.
**Visual personality:** Calm, warm, one clear invitation.

### Hierarchy (top to bottom)

1. **Greeting** — `largeTitle` "Kumusta, Maria" + `caption` secondary.
2. **SULTI line** — one sentence, `body`, `textSecondary`, with a 16px orb glyph.
   Not a card. It should read as a friend glancing up.
3. **Continue card** — the hero. 20% of viewport height. Progress bar, lesson title,
   `bodyBold`, and a filled 52px button. Only element on screen allowed to use
   `gradientStart → gradientEnd`.
4. **Streak + goal** — one compact row, two items max. Streak uses `StreakFlame`,
   goal uses a 48px `ProgressRing`. If both fit, they sit in a single row; they do
   not each get their own card.
5. **Recommended for you** — one card, `SultiPrompt`, explaining *why* it's
   recommended. This is the personalisation signal.
6. **Quick practice** — 3 compact tiles (Pronounce / Flashcards / Chat). Tiles, not
   cards — 1/3 width, icon + 2-word label.

### Rules

- Max **one** card uses a gradient. Two gradients on Home destroys the hierarchy.
- No analytics charts. `LearningAnalytics` and `RecentActivity` move to Profile.
- SULTI presence: 16–24px glyph, not a full avatar. Full avatar is SULTI's job.
- If the user has 0 sessions, replace items 3-5 with the onboarding card. One
  decision, not a layout branch.

### Theme appearance

Identical structure in all four themes. Only the gradient, orb tint, and ring colour
change. On Soft Academic Light the Continue card keeps its gradient but the shadow
becomes `shadows.md` and the border becomes `borderLight` — the card must not
disappear into a white page.

---

## 6. Learn Dashboard — guided learning journey

**Primary purpose:** Make progression legible at a glance.
**Primary action:** Start the next lesson.
**Visual personality:** Structured, textbook-like, quietly colourful.

This is the screen that must **not** be a card grid. It is a *path*.

### The path visual system

A vertical spine, 2px, running down the left at 56px from edge:

- Behind completed nodes: `primary` at 0.35 alpha.
- Behind current node: `primary`, full.
- Ahead of current: `border`, 2px.

Node states — four, and they must be distinguishable **without relying on colour
alone** (shape and icon carry it too, for colour-blind users):

| State | Node | Icon | Label |
|---|---|---|---|
| Complete | 40px filled circle, `primary` | `checkmark` | `textSecondary` |
| Current | 56px ring, 4px `primary` stroke, 8% fill | `play` | `text`, `bodyBold` |
| Locked | 40px circle, `border` fill | `lock-closed` | `textDisabled` |
| Recommended | 40px circle, dashed `primary` stroke | `sparkles` | `text` |

The current node is the only element permitted a glow. This is what makes "next
lesson" obvious without a banner or an arrow.

### Which components use what

- **Path rows** — spine + node, for modules and lessons. Not cards.
- **Progress rings** — 3 across, for overall level / weekly goal / speaking score.
- **Category grid** — 2×2 tiles with per-category gradient icons, for the 5 skills.
- **Horizontal scroll** — for culture notes and scenario cards only.
- **Cards** — reserved for the "current lesson" detail panel at the top.

### Rules

- Category colours are currently hardcoded Tailwind hex (`LearnScreen.js:55-139`).
  Move them to `theme.colors.moduleGradients` so Obsidian Emerald and Soft Academic
  Light get harmonised versions. Keep them distinguishable from each other but derive
  them from the theme family, not fixed.
- The learning-path content already exists — `buildLearningPath()` at
  `LearnScreen.js:153` builds it from progress rows. **The visual layer is what's
  missing, not the data.**
- Locked modules must show *why* they're locked on tap ("Finish Unit 2"). A lock with
  no explanation is a dead end.

### Theme appearance

In Warm Cyber Sunset, path nodes use coral/amber. In Soft Academic Light, the spine
needs 3:1 contrast against `#F4F6F8`, so it uses `primaryDark`, not `primary`.

---

## 7. SULTI Dashboard — AI communication companion

**Primary purpose:** Get the user talking. Everything else is subordinate.
**Primary action:** Hold to speak.
**Visual personality:** Immersive, alive, calm.

This is the strongest existing screen. `VoiceOrb.js` (368 lines), `VoiceControls.js`,
`StatusPill.js`, `MessageBubble.js`, `VoiceBackground.js`, `SettingsSheet.js` are a
complete, coherent voice UI. **Preserve it.**

### What is already right

- Orb with 46 radial bars + orbit particles + gradient core. Distinctive.
- Four explicit states — `idle / listening / thinking / speaking` (`VoiceOrb.js:38+`).
  This is the single most important accessibility affordance in the app and it
  already exists.
- `SettingsSheet` as a bottom sheet with toggles, character selection, and
  Deepgram status.

### What to improve

1. **State must be perceivable without sound or motion.** The orb animates, but a
   deaf user or someone with `reduceMotion` on gets nothing. `StatusPill` must
   always render text. Add a persistent text state line beneath the orb, and keep
   it visible in all four states.
2. **`onGradientText` is wrong.** `palette.js:23,44,63` set it to `#04111F` — correct
   for dark themes. Line 84 sets `#FFFFFF` for Soft Academic Light, which is right
   there. But `theme/index.js:31,82,117,187` set `textOnGradient: '#FFFFFF'` in
   **all four**, which is 1.88:1 on the dark themes. Collapse this into `onPrimary`
   from §3.1.
3. **Settings sheet needs the semantic tokens.** `SettingsSheet.js:20-21` hardcodes
   `rgba(32,214,199,0.5)` for the switch track and `#9AA6B2` for the off thumb. Under
   Warm Cyber Sunset the switch is teal. Replace with `primary` + `border`.
4. **Toggle `trackColor` per theme family.** `rgba(255,255,255,0.15)` is invisible
   on a white surface. Light themes need `rgba(30,41,59,0.12)`.
5. **No statistics on this screen.** The prompt is right about this. Voice fluency
   feedback goes *after* the conversation, in a summary sheet.

### Layout

```
┌─────────────────────────┐
│  ←   SULTI      ⚙  ⓘ    │  header, 56px
│                         │
│  ·  ·  idle dots  ·  ·   │  suggestion chips (collapsed)
│                         │
│         ╭───────╮        │
│         │  ORB  │        │  40% of height
│         ╰───────╯        │
│      "Listening…"        │  ALWAYS visible, statusPill
│                         │
│    ▁▃▅▇▅▃▁ live meter   │  voiceControls
│                         │
│  ┌───────────────────┐  │
│  │ Type a message…   │  │  input, 48px
│  └───────────────────┘  │
│      ╭─────────╮        │
│      │  🎤  ⟳  │        │  64px primary, 48px secondary
│      ╰─────────╯        │
└─────────────────────────┘
```

No streak, no XP, no progress ring. The orb is the interface.

### Reduced motion

`useAccessibility` already returns `getAnimationDuration(0)`. The orb must render a
**static** wave in that case, not a stopped animation — a frozen half-scale bar
looks broken.

---

## 8. Community Dashboard — social language practice

**Primary purpose:** Real communication, not passive scrolling.
**Primary action:** Create a post / answer a question.
**Visual personality:** Social, content-first, supportive.

### Structure

1. **Collapsing header** — the scroll-driven collapse at `CommunityScreen.js:83-84`
   already exists and is good. Keep it. Tabs (`PRIMARY_TABS`) sit in the expanded
   state and pin on collapse.
2. **Filter row** — horizontal chips. `FEED_FILTERS` and `TYPE_FILTERS` both exist;
   showing two stacked filter rows is noise. Show the type filter, surface the
   period filter inside it.
3. **Feed** — `FlatList` of `PostCard`. Full-bleed, `elevation: 'card'`.
4. **Metrics** — the current `dashboardStats` block (authors, likes, weekly bars) is
   analytics on a social screen. Cut it. Keep a single line: "12 learners active in
   Bisaya today" — a reason to participate, not a scoreboard.

### The differentiator: this is a *practice* community

This is where a language app stops looking like a language app. Make language
practice structurally visible:

- Every post shows a **type chip** — Question / Translation / Pronunciation / Tip /
  Vocabulary. This already exists in `constants/community.js` (`TYPE_FILTERS`).
  Make it visually prominent; it's the primary axis of the feed.
- **Pronunciation posts** get a mini waveform row, so a learner can see at a glance
  that a recording is attached.
- **Question posts** show a reply count with an unanswered emphasis. Unanswered
  questions are where the user can help someone, which is the strongest retention
  hook in the whole app.
- Add a **"Needs an answer"** default filter. It makes the feed *useful* on open,
  which is the direct answer to "how does this encourage practice rather than
  passive scrolling."

### Avoid

- No follower counts, no like-count leaderboards. Supportive, not competitive.
- No infinite-scroll-only. The first screen should always show something
  answerable.
- Don't copy Instagram/Twitter structure. Divergence: no stories rail, no
  algorithmic "For You", flat chronological feed with a practice-first filter.

---

## 9. Settings Dashboard — personalisation and control

**Primary purpose:** Let the user change the app, safely and obviously.
**Primary action:** Change one setting.
**Visual personality:** Quiet, organised, trustworthy.

The tab is currently labelled **"Profile"** (`AppNavigator.js:81-85`) but contains
appearance, analytics, and account settings. Consider a Profile → Settings split,
or at minimum retitle, because a user looking for theme switching will not open a
tab called "Profile."

### Group structure

| Group | Rows |
|---|---|
| **Account** | Profile header (avatar, name, level), Edit profile |
| **Appearance** | **Theme** (4 preview cards), Text size, Reduce motion, High contrast |
| **Learning** | Daily goal, Target language, Dialect, Reminder time |
| **Notifications** | Practice reminders, Streak nudges, Community replies |
| **Voice** | TTS rate, Haptics, Continuous mode, Slow mode |
| **Privacy & data** | Data export, Delete account, Blocked users |
| **Support** | Help centre, Community guidelines, About, Sign out |

### The theme selector (exists at `ProfileScreen.js:527-560` — improve, don't rebuild)

Current: 2×2 grid of cards, each with a background swatch, two dots, a mini card
shape, label, description, and a check badge. Solid foundation. Four upgrades:

1. **Live preview on press-and-hold.** The cross-fade in `ThemeContext.js:44-53`
   already makes switching instant. Add a "Hold to preview" affordance so users can
   try a theme and cancel.
2. **Preview in the user's own context.** Swatches should render a miniature of a
   *real* SultiAI screen (orb + path), not abstract dots. Currently it's 2 circles
   and a rectangle. This is the "preview" the prompt asks for.
3. **Section it as a full-width row that navigates**, not four cards inline. Themes
   are a considered choice, not a casual toggle. Opens a dedicated screen with the
   four previews large.
4. **Show `family` (dark/light).** A light theme is a meaningful accessibility
   choice for some users. Label them.

The selector must look correct in all four themes — it does today, because it reads
`colors.*` from the theme context and hardcoded neutral greys for the frame.

---

## 10. Four complete theme concepts

All four exist. Here is the honest assessment plus the required fixes.

### 10.1 Midnight Teal — default, brand

Strong. 18.0:1 text, 10.0:1 primary. The 3% luminance step between background and
surface is the reason it feels like depth rather than flat panels.

**Fixes:** `textOnGradient` → `#04111F`. `gradients` at `:339` → `#00D4BD`.

### 10.2 Warm Cyber Sunset

Good, but the surfaces are lighter than the other dark themes (`#2E2138` vs
`#111827` vs `#161616`), so it reads flatter and slightly washed. And it's the only
theme where `secondary` (`#F5A524` amber) is close enough to `primary`
(`#FF7A59` coral) to be hard to tell apart at small sizes — a real risk for
colour-blind users on the Learn path nodes.

**Fixes:** darken surface to `#291E33`. Push `secondary` to `#FBBF24` for more
separation, or add a shape/icon distinction on path nodes (already specified in §6).
Set `textOnGradient` → `#2A1206`.

### 10.3 Obsidian Emerald

The most premium-feeling of the four and the best for long sessions — true matte
black (`#0A0A0A`) with minimal aurora. Highest primary contrast at 10.45:1.

**Weakness:** it's *very* close to Midnight Teal. Different enough in temperature
(neutral grey vs blue-navy), but the two greens are adjacent hues. A user who
switches between them may not notice. Consider shifting the accent toward a cooler
mint (`#5EEAD4`) and keeping the surface neutral, to widen the gap.

**Fixes:** `textOnGradient` → `#04111F`.

### 10.4 Soft Academic Light

The only light theme, and therefore the biggest behavioural difference — it forces
real design work, not colour swaps.

`textSecondary #64748B` on `background #F4F6F8` is **4.39:1**, just under AA 4.5:1
for body text. It passes on white surfaces but fails on the background itself.

**Fixes:** `textSecondary` → `#5A6B7F` (5.05:1 on bg, 5.47:1 on white).
`border` needs to be visible for input affordance, not just hairline.

---

## 11. Visible design preview

See **`docs/design-preview.html`**. Open it in any browser — no build step, no
server, no Expo. It is generated from the exact token values in `src/theme/index.js`.

It contains:

- **§A — Four theme boards.** The same Home composition rendered in all four
  themes: background, header, typography at real scale, cards, buttons, icons,
  progress rings, orb, selected states, input.
- **§B — Five dashboards.** Home, Learn, SULTI, Community, Settings in Midnight
  Teal, each with its own composition.
- **§C — Theme comparison.** Identical component kit, four themes, side by side.
- **§D — Before/after.** The Voice Tutor before (as coded) and the proposed
  Midnight Teal revision.

I generated this as HTML rather than images because I cannot produce raster
mockups. It renders at real device proportions (390×844) and uses the real hex
values, so it is a specification, not an impression.

---

## 12. Complete design token system

### 12.1 Semantic additions (new, replaces ad-hoc tokens)

| Token | Midnight Teal | Warm Sunset | Obsidian | Soft Light | Use |
|---|---|---|---|---|---|
| `onPrimary` | `#04111F` | `#2A1206` | `#04111F` | `#FFFFFF` | Text/icon on a primary fill |
| `onPrimaryMuted` | `#04231F` | `#3A1A0A` | `#04231F` | `#D1FAE5` | Text on a soft primary |
| `successSurface` | `#0B2A22` | `#14301F` | `#0B2620` | `#D1FAE5` | Correct-answer background |
| `dangerSurface` | `#3D2424` | `#3D1F1F` | `#2E1D1D` | `#FEE2E2` | Wrong-answer background |
| `warningSurface` | `#3D3224` | `#3D3018` | `#2E2718` | `#FEF3C7` | Streak / caution background |
| `infoSurface` | `#131A2E` | `#2A2138` | `#16151C` | `#E6F7F3` | Informational background |
| `focusRing` | `#33DDD0` | `#FF9478` | `#54E0BC` | `#046C50` | 2px focus outline |
| `borderStrong` | `#334155` | `#4E3B5C` | `#333333` | `#CBD5E1` | Inputs, meaningful dividers |

### 12.1b Category accent tokens (added in phase 4)

These exist because Home's feature tiles were the largest remaining source of
per-`isDark` hex pairs. Each accent is verified `>=4.5:1` against its own
`soft*` tile background in all four themes.

| Token | Midnight Teal | Warm Sunset | Obsidian | Soft Light | Use / measured ratio on its tint |
|---|---|---|---|---|---|
| `violet` | `#A78BFA` | `#A78BFA` | `#A78BFA` | `#7C3AED` | Chat / AI accent — 6.35 / 5.62 / 6.66 / 5.08 on `softPurple` |
| `teal` | `#2DD4BF` | `#2DD4BF` | `#2DD4BF` | `#0B7D72` | Vocabulary accent — 7.85 / 7.59 / 9.23 / 4.53 on `softTeal` |
| `blue` | `#60A5FA` | `#60A5FA` | `#60A5FA` | `#2563EB` | AR / augmented-reality — 6.83 / 6.83 / 6.83 / 4.69 on `softBlue` |
| `softBlue` | `#101A2E` | `#101A2E` | `#101A2E` | `#EFF4FF` | AR tile background |
| `pink` | `#F472B6` | `#F472B6` | `#F472B6` | `#C7216B` | Challenge accent — 6.46 / 5.52 / 6.69 / 4.93 on `softPink` |

Note that `amber`/`softOrange` and `coral`/`coralLight` still fall below 4.5:1 in
Soft Academic Light (1.98:1 and 2.32:1). Rather than repaint two brand colours
theme-wide, `FeaturesGrid` runs every tile accent through
`ensureContrast(accent, bg, 4.5)` at the point of use, lifting them to 4.96 and
4.74 without affecting `amber`/`coral` elsewhere.
| `scrim` | `rgba(15,23,42,.6)` | `rgba(20,14,26,.6)` | `rgba(0,0,0,.6)` | `rgba(30,41,59,.4)` | Modal backdrop |

### 12.2 Category gradients (replaces the 70 hardcoded in LearnScreen)

Derive from theme, keep 5 categories mutually distinguishable:

| Category | Dark themes | Soft Light |
|---|---|---|
| Pronunciation | `#00D4BD → #0D9488` | `#65A30D → #4D7C0F` |
| Vocabulary | `#3B82F6 → #2563EB` | `#0F766E → #115E59` |
| Grammar | `#8B5CF6 → #7C3AED` | `#7C3AED → #6D28D9` |
| Listening | `#F59E0B → #F97316` | `#D97706 → #EA580C` |
| Conversation | `#EC4899 → #DB2777` | `#DB2777 → #BE185D` |

### 12.3 What already exists (do not rewrite)

`spacing` (`:256`), `borderRadius` (`:271`), `typography` (`:282`), `shadows`
(`:295`), `animation` (`:344`), `getTabBarClearance` (`:269`).

All are sound. The only change needed is to apply `radiusScale` from the atmosphere
layer, and to add `Platform.select()` letter-spacing for Android.

---

## 13. Typography and spacing system

### 13.1 Type scale (existing, with corrections)

| Token | Size | Weight | Line | Tracking | Android fix |
|---|---|---|---|---|---|
| `largeTitle` | 34 | 700 | 41 | 0.37 → **0** | 0 |
| `h1` | 28 | 700 | 34 | 0.36 → **0** | 0 |
| `h2` | 22 | 600 | 28 | 0.35 → **0** | 0 |
| `h3` | 20 | 600 | 25 | 0.34 → **0** | 0 |
| `h4` | 17 | 600 | 22 | -0.41 → **-0.2** | 0 |
| `body` | 15 | 400 | 20 | -0.24 → **-0.1** | 0 |
| `bodyBold` | 15 | 600 | 20 | -0.24 → **-0.1** | 0 |
| `caption` | 13 | 400 | 18 | -0.08 → **0** | 0 |
| `small` | 11 | 500 | 13 | 0.07 → **0** | 0 |
| `button` | 17 | 600 | 22 | -0.41 → **-0.2** | 0 |

Positive tracking above 20px is an SF Pro Display trait. It should not leak to
Roboto. Note also `body` is 15px — for a language-learning app where users read
foreign-script text, **16px body is the better floor**. Recommend `body: 16 / 24`.

### 13.2 Spacing (existing, correct)

`xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · huge 48`

Screen padding 20 (`xl`). Card padding 16 (`lg`). Section gap 24 (`xxl`). Button
height 52 primary, 44 secondary. Touch target ≥44 everywhere. Tab bar clearance
`insets.bottom + 88` (`:269`).

The `xxl2 52` and `xxxl2 56` entries (`:267-268`) duplicate `huge 48` semantically
and should be removed — the scale should stay memorable.

---

## 14. Theme selector design

Covered in §9. Requirements:

- One screen, four previews, large — not four cards inline.
- Each preview renders a **miniature real screen**: orb, path spine, card, button —
  all in that theme's colours.
- Name + one-line description + dark/light badge.
- Selected state: `border 2px primary` + check badge (current behaviour is right).
- **Hold to preview** with a 400ms delay, cross-fading via the existing
  `switchOverlay`, releasing restores the previous theme.
- Immediate application, persisted to `sultiai_theme_name` (already implemented at
  `ThemeContext.js:8,55`).
- Default remains Midnight Teal.

---

## 15. Accessibility audit

Computed with WCAG 2.1 relative luminance. All values are measured, not estimated.

### 15.1 Passing

| Theme | text/bg | textSecondary/bg | primary/bg |
|---|---|---|---|
| Midnight Teal | 18.00 | 7.34 | 10.00 |
| Warm Cyber Sunset | 15.05 | 8.90 | 6.43 |
| Obsidian Emerald | 18.16 | 7.85 | 10.45 |
| Soft Academic Light | 13.50 | 4.39 ⚠ | 5.80 |

Text hierarchy is strong everywhere. `textSecondary` is comfortable for secondary
copy in all three dark themes.

### 15.2 Failures

| # | Issue | Ratio | Requirement | Fix |
|---|---|---|---|---|
| A1 | `#FFFFFF` on `primary` — Midnight Teal | **1.88** | 4.5 | `onPrimary: #04111F` (10.09) |
| A2 | `#FFFFFF` on `primary` — Warm Sunset | **2.57** | 4.5 | `onPrimary: #2A1206` |
| A3 | `#FFFFFF` on `primary` — Obsidian | **1.89** | 4.5 | `onPrimary: #04111F` (10.03) |
| A4 | `textSecondary` on `background` — Soft Light | **4.39** | 4.5 | `#5A6B7F` (5.05) |
| A5 | `border` on `surface` — all four | **1.20** | 3.0 for UI | Keep as hairline; add `borderStrong` for inputs/focus |
| A6 | `getTextStyle` scales `fontSize` not `lineHeight` | — | — | Scale both by 1.2 |
| A7 | `getContrastColor` uses OS scheme, not active theme | — | — | Pass `isDark` from theme |
| A8 | Voice states rely on animation + audio | — | WCAG 1.4.2 | Always-visible text state |
| A9 | `borderRadius` scale not applied per screen | — | — | Wire `radiusScale` |

A1 is the most serious: **every primary button in the three dark themes is
currently below 2:1 for its label.** `getContrastColor` is called in several places
(`SultiTutorScreen.js:181`, `LoginScreen.js:49`, `ProfileScreen.js:50`) but
`textOnGradient` is still `'#FFFFFF'` in the token itself, and not every call site
uses the helper.

### 15.3 Also required

- `accessibilityRole`/`label` on the orb state, theme cards (already present at
  `ProfileScreen.js:546`), path nodes, and voice controls.
- Minimum 44pt touch targets — audit the 40px path nodes.
- `maxFontSizeMultiplier` ≤ 1.4 on fixed-height elements (orb, path nodes, tab bar)
  so large text can't clip them.
- Respect `reduceMotion` for the orb, aurora, and the theme cross-fade.
- Announce SULTI state changes via `AccessibilityInfo.announceForAccessibility`.

---

## 16. React Native / Expo implementation architecture

The good news: **the architecture is already correct.** `ThemeProvider` at the root
of `App.js:11`, `useTheme()` everywhere, tokens in one file. Adding atmosphere and
semantic layers requires no restructuring and no new dependency.

### Layering

```
src/theme/
  index.js          (existing) themes, spacing, radius, type, shadows, animation
  semantic.js       (new)     buildSemantic(theme) -> onPrimary, surfaces, focus
  atmosphere.js     (new)     ATMOSPHERE + useAtmosphere(screenId)
  moduleColors.js   (new)     5 category gradients per theme
  colors.js         (DELETE)  legacy light palette
src/context/
  ThemeContext.js   (existing) add `semantic` + `atmosphere` to the provider value
```

### Provider shape

```js
const value = {
  isDark, colors, semantic, themeName, themeList, loading,
  toggleTheme, setThemeName,
  reduceMotion, highContrast, largeText,
  getAnimationDuration, getSpringConfig, getTextStyle, getContrastColor,
};
```

### Consumption

```jsx
// Theme-aware — use for colour
const { colors, semantic } = useTheme();
<Pressable style={{ backgroundColor: semantic.onPrimary }} />

// Atmosphere-aware — use for composition
const { radiusScale, ambient, density } = useAtmosphere('learn');
<View style={{ borderRadius: borderRadius.lg * radiusScale }} />
```

### Screen scaffold

```jsx
function LearnScreen({ navigation }) {
  const { colors, semantic } = useTheme();
  const atm = useAtmosphere('learn');
  return (
    <Screen
      ambient={atm.ambient}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: gapFor(atm.density) }}>
        <LearningPath radiusScale={atm.radiusScale} />
      </ScrollView>
    </Screen>
  );
}
```

### Environment notes

- Expo SDK 57, RN 0.86.3, React 19.2. `useColorScheme` and `Appearance` are
  deprecated in favour of a user-controlled theme — which is exactly what
  `ThemeProvider` does. Nothing to migrate.
- `boxShadow` in `shadows` (`:296+`) is the RN 0.76+ API and is correct for 0.86.
- Reanimated 4.5.1 with `react-native-worklets` — verify the babel plugin config
  before touching animated components.
- No new dependencies required. `expo-linear-gradient`, `react-native-svg`,
  `expo-blur`, `expo-linear-gradient` are all already present, which is everything
  needed for paths, orbs, rings, and ambient layers.

### Migration order (each step shippable)

1. Add `semantic.js`; wire into provider. Fix A1-A4. **Highest value, lowest risk.**
2. Delete `colors.js`; fix `gradients` at `index.js:339`.
3. Fold `voice/palette.js` into `semantic.js`, keep `useVoicePalette` as re-export.
4. Fix `useAccessibility` A6, A7.
5. `PronunciationScreen` — 18 hardcoded hex, visibly broken under non-default themes.
6. `LearnScreen` — 70 hardcoded hex → `moduleColors.js`; add path visual system.
7. `ProfileScreen`, `VocabularyExercise`, `ModuleScreens` — remaining leaks.
8. Add `atmosphere.js`; apply to the five dashboards.
9. Rebuild theme selector as its own screen with real previews.
10. Accessibility pass: roles, labels, touch targets, reduced motion.

Steps 1-4 are pure bug fixes and can ship immediately. Steps 5-8 are the visual
work. Step 9 is polish.

---

## 17. Final recommendations

**Don't rebuild the theme system. It exists and it's good.** The problem was never
missing palettes — it's that the palettes don't reach the screen (426 hardcoded hex)
and four accessibility bugs affect every primary button in the dark themes.

**Do this first, ship it this week:** items 1-4 above. One new 30-line file
(`semantic.js`) fixes the worst accessibility defect in the app. Delete one dead
file. Fix two hook bugs.

**Do this second:** the Learn path visual system. `buildLearningPath()` already
produces the ordered progress data with completion percentages. What's missing is
the spine, the four node states, and the glow on the current node. That's a
presentation layer over data you already have — the highest visual-impact work per
unit of effort in the entire project.

**Do this third:** the atmosphere layer. It's the smallest abstraction in this
document and the only thing that makes the five dashboards feel like five rooms
instead of one room with different content. Five lines in a lookup table, applied
in three places.

**The principle to hold onto:** colour is brand, layout is purpose. Midnight Teal
is Midnight Teal on Home, on Learn, in Community, in Settings. What changes is
composition — density, ambient atmosphere, radii, which components appear. The
moment a dashboard starts inventing its own colours, it's a different app.

**On the four themes:** they're a genuine strength. Midnight Teal should stay the
default and should be the one the design is tuned against, because that's what most
users will see. The other three prove the token system is real rather than a
palette with one mood.

---

## Implementation log

Phases 1–3 of this document are implemented. Phases 4–5 remain open.

### Phase 1 — token surface

- `onPrimary` added to all four themes and exposed by `ThemeContext`. This is the
  token that replaces the ambiguous `textOnGradient`: it means "ink for a surface
  filled with `primary`", which is what the old key actually tried to express.
- `src/theme/moduleColors.js` now owns every module gradient, category gradient,
  neutral variant, alias, accent, danger colour and level accent as data.
  Screens ask for `gradientKey` / `accentKey`; they never name a colour.
- `readableOnGradient(gradient)` returns white or dark ink based on the *worst*
  stop in the gradient, so gradient-backed text stays legible instead of
  assuming white.

### Phase 2 — leak fixes

- `PronunciationScreen.js`, `LearnScreen.js`, `ModuleScreens.js`,
  `VocabularyExercise.js` and `SentenceCompletion.js` are free of hardcoded hex
  and `rgba()` values. Module switches, level badges, hero buttons, exercise
  feedback and start-button icons are all token-driven.
- `AuroraBackground.js` was hardcoded to Midnight Teal's blob colours regardless
  of the active theme. It now derives blob and glow tones from
  `primary` / `secondary` / `accent`, so the ambient wash follows the theme.
- Hardcoded hex outside `src/theme/` went from **426 across 55 files to 209
  across 45 files**. `npx eslint src App.js` sits at 168 errors, all in files
  this work did not touch.

### Phase 3 — atmosphere

- `src/theme/atmosphere.js` defines five atmospheres — `home`, `learn`, `sulti`,
  `community`, `profile` — each carrying `ambient` kind, `density`, `radiusScale`,
  `blobScale`, `particleScale`, `glowScale` and `blur`.
- `useAtmosphere(id)` folds in the theme family (light themes trim ambient
  strength) and `scaleRadius()` lets a screen scale the shared radius tokens
  instead of hardcoding its own corner sizes.
- `AuroraBackground` accepts an `atmosphere` prop; Learn, SULTI and Profile pass
  theirs at the mount point.

### Phase 4 — SULTI hub and Home

- **SULTI hub** (`SultiTutorScreen.js`, `TopicCard.js`, `UnifiedHeroCard.js`):
  hero ink is derived from the live gradient, the voice pill label reaches
  17.85:1, the heart uses `ensureContrastAcross`, sessions + XP render as one
  responsive pill, SUGOD is a full-width primary action, and the composer's own
  surface is the visible input (the invisible nested field and dead white
  stylesheet background are gone).
- **Home** (`DashboardScreen.tsx` + the 9 live dashboard components): all 35
  hardcoded hex values are removed. The four `getContrastColor('#FFFFFF',
  '#042F2B')` pins became real measurements —
  `DailyGoalCard` measures against its own gradient (and the completed state now
  uses `getNeutralGradient(themeName, 'success')` instead of mixing `success`
  with `gradientB`, which spanned light-to-dark so no single ink could clear
  4.5:1), while `ContinueLearningCard`, `HomeRecommendation` and `SultiPrompt`
  use `onPrimary` / `readableOnGradient`.
- New tokens added to **all four themes**, each verified `>=4.5:1` on its own
  tile background: `violet` (6.35 / 5.62 / 6.66 / 5.08), `teal` (7.85 / 7.59 /
  9.23 / 4.53), `blue` (6.83 / 6.83 / 6.83 / 4.69), `softBlue`, and `pink` (6.46 /
  5.52 / 6.69 / 4.93). These replace the per-`isDark` hex pairs in
  `QuickPractice.tsx` and `FeaturesGrid.tsx`.
- `FeaturesGrid` additionally runs every tile accent through
  `ensureContrast(accent, bg, 4.5)`, which fixed two *pre-existing* Soft
  Academic Light failures that the token migration alone would have carried
  over: `amber` on `softOrange` was **1.98:1** (now 4.96) and `coral` on
  `coralLight` was **2.32:1** (now 4.74). These are exactly the "dark text over
  a bright accent card" defect in §3C.
- `readableOnGradient` now also considers pure black, because `#0F172A` tops out
  around 4.4:1 on mid-tone greens. The helper picks the maximum worst-case ratio,
  so extra candidates can only improve the result.
- Soft Academic Light's `success` gradient was darkened from `['#059669',
  '#047857']` to `['#046C50', '#064E3B']` so small text can sit on it: the old
  pair allowed at most 3.77:1, which fails the 4.5:1 bar for the 13px bold
  progress label on `DailyGoalCard`.
- Six unused dashboard components (`CommunityHighlights`, `LearningAnalytics`,
  `RecentActivity`, `SectionLabel`, `TravelSuggestion`, `VoiceChallenge`) and the
  orphaned `src/components/DashboardHeader.js` were identified but **left
  untouched** — no deletion without sign-off.

### Phase 5 — UI/UX consistency pass

The theme work exposed the real reason the interface reads as unbalanced: the
shared primitives existed but adoption was ~20%, so roughly 20 screens
hand-rolled their own buttons, empty states and loading skeletons.

**Functional bugs fixed**

- **Dead navigation route.** 7 of 8 learning-module CTAs called
  `navigation.navigate('Tutor')`, which is not a registered route in
  `AppNavigator.js` — the taps did nothing. They now target the real SULTI tab
  via `navigate('Main', { screen: 'SULTI', params: { situation, label } })`,
  matching the convention in `LeaderboardScreen` and the
  `route.params.situation` read in `SultiTutorScreen:768`. `Listening` still
  targets the `VoiceMode` stack route. A repo-wide sweep of every `navigate()`
  target found no other dead routes.
- **Invisible loading states in the light theme.** The three learning cards
  hand-rolled skeleton blocks with `backgroundColor: 'rgba(255,255,255,0.1)'`,
  which is white-on-white under `softAcademicLight`. They now use the theme
  token.
- **White icon on a primary fill.** `LeaderboardScreen`'s empty-state CTA used
  `color="#fff"` over `colors.primary` — 1.88:1 on Midnight Teal. Replaced by
  `EmptyState`, whose button derives its ink.
- **TDZ-fragile effect.** `LearningProgressCard` called `loadAnalytics` from an
  effect declared above its `const` arrow declaration. The declaration now
  precedes the effect.
- Seven style objects spread `...typography.<token>` *after* literal
  `fontSize`/`fontWeight`/`letterSpacing`, so the literals were silently dead —
  editing them had no effect. Literals removed across `DashboardHeader`,
  `FeatureGrid`, `ModuleCard`, `OnboardingForm` and `ProgressScrollSection`.
- `Button.js` re-declared the button type by hand instead of using
  `typography.button`, which is how it lost the token's `lineHeight`.

**New primitives** (`src/components/`, exported from the barrel)

| Component | Why |
|---|---|
| `Skeleton` + `SkeletonText` + `SkeletonRow` | Replaces ~20 duplicated skeleton style blocks; theme-aware, respects `reduceMotion`, stagger support |
| `SectionHeader` | Replaces the local section-title function in `LearnScreen` and promotes `SectionLabel` out of `screens/dashboard/` |
| `Divider` | Horizontal/vertical rule, optional inset |
| `IconButton` | Square icon-only control; auto-`hitSlop` so even the 32px size keeps a 44pt touch target |

**Adoption**

- `AIRecommendationCard`, `DailyChallengeCard` and `LearningProgressCard` now
  use `Skeleton`/`SkeletonRow`; 20 hand-rolled skeleton styles removed.
- `LeaderboardScreen` and `NotificationsScreen` now use the shared
  `EmptyState`; 9 orphan styles removed. This drops the app from three parallel
  empty-state implementations (`EmptyState`, `ErrorState`, and the inline copy
  in `ScreenBoundary`/`ErrorBoundary`) to two.
- `Button.js` adoption is still low (4 files) versus ~100 hand-rolled
  `TouchableOpacity` CTAs — this is the largest remaining consistency gap.

**All five atmospheres are now live.** `DashboardScreen` and
`CommunityScreen` mount `AuroraBackground` with `atmosphere="home"` and
`atmosphere="community"`, so every tab has a distinct ambient treatment.

### Phase 6 — Midnight Teal surface shift & Profile/Settings rebuild

A design request specified the Profile/Settings screen against the "Midnight Teal"
dark theme with an explicit no-blue palette. Reviewing it against source showed
the screen already implemented almost everything requested, but it also surfaced
a contrast defect in the spec itself and a hardcoded header gradient.

**Spec corrections applied**

- The spec asked for a bright-aqua selected tab with **white** text. That is
  `#FFFFFF` on `#00B8A9` = **2.49:1** — a WCAG AA failure. The active tab now uses
  `colors.onPrimary` (`#04111F` on `#00D4BD` = **10.09:1**), the same fix already
  applied to `Button` and `EmptyState` in phase 4.
- The spec asked for `primary: #00B8A9`. Rejected: it is within a hair of the
  existing `#00D4BD` (imperceptible), but `primary` is the highest-blast-radius
  token in the app — it feeds every gradient, every `ensureContrast` result, and
  the SULTI orb — and changing it would violate the same request's rule to leave
  the voice agent untouched. **`primary` is unchanged.**
- Surface tokens were the part that actually removes blue, so they were adopted.

| Token | Was | Now | Note |
|---|---|---|---|
| `background` | `#0B1120` | `#0A121D` | more navy, less blue |
| `backgroundDeep` | `#080E1A` | `#060C15` | |
| `surface` / `card` / `notification` | `#111827` | `#11222D` | teal charcoal |
| `surfaceSecondary` | `#0F172A` | `#0E1A24` | |
| `textSecondary` / `textMuted` | `#94A3B8` | `#8E9BAE` | 5.77:1 on surface, 6.67:1 on background |
| `border` / `borderLight` | `#1E293B` | `#22404F` | old border fell to **1.11:1** on the new surface; new is 1.48:1 |
| `borderHover` | `#334155` | `#2E5568` | |
| `softPurple` | `#131A2E` | `#101E28` | was the last blue-leaning tint |
| `softBlue` | `#101A2E` | `#0E1C28` | |
| `glassBg`, `premiumCard`, `overlay`, `surfaceStrong` | blue-based rgba | teal-based rgba | re-derived from the new surfaces |

Card definition **improved**: surface-vs-background separation went from
1.06:1 to **1.16:1**, so cards read as raised without needing a heavier border.

**ProfileScreen (`src/screens/ProfileScreen.js`)**

- The header was a loud `colors.primary → colors.secondary` gradient — the
  brightest element on the screen. It is now a flat `colors.background` field, so
  the header recedes and the content leads. Because the header fill changed, the
  header ink had to be re-derived: it was `getContrastColor('#FFFFFF', '#042F2B')`,
  a dark-teal ink that only worked against a light aqua fill. It is now
  `colors.text` with white-on-dark / slate-on-light alpha ramps for email and
  `@username`. The alpha steps were tuned against the actual composited values
  (0.78 and 0.70 for the light theme) because 0.5 composited to 3.33:1.
- Active tab: background `colors.primary`, ink `colors.onPrimary` (was a literal
  `'#fff'` at 1.88:1).
- Inactive tab: `colors.surface` — this also removed the `'#F1F5F9'` literal,
  which in the light theme made tabs look *recessed* into the page.
- The header's `borderBottomLeft/RightRadius: 24` is gone; with a flat fill it
  was invisible.
- `tabActive`'s hardcoded `rgba(13,148,136,0.3)` glow now derives from
  `colors.primaryDark` via `shadowColor`.
- Literal `#FF6B6B` (hearts icon, hearts stat), `#FFD700` (XP star) and
  `#EF4444` (Sign Out) replaced with `colors.coral`, `colors.warning` and
  `colors.error`. The level badge and avatar check used `'#fff'` on coloured
  fills and now use `readableOnGradient`.
- Removed the now-unused `LinearGradient` import and `getContrastColor`
  binding. `ProfileScreen` went from 7 lint warnings to 0.

**Two pre-existing light-theme defects fixed by the sweep**

The Profile/Appearance rebuild exposed failures in `softAcademicLight` that had
nothing to do with Midnight Teal:

- `coral: #FF6B6B` was **2.78:1** on that theme's white surface (2.32:1 on
  `coralLight`) — a real failure for the hearts value. Now `#DC2626` (**4.83:1**).
- `textLight: #94A3B8` was **2.56:1** on white — this is the ink behind the
  "Choose a theme for the whole app" description the design request named
  specifically. Now `#5A6B7F` (**5.46:1**).

**Deliberately not changed**

- The settings toggle track is `'#D1D5DB'` with a white knob. Tokenising the track
  to `colors.border` would make the knob invisible in the light theme, so the
  pair was left alone. It is still a literal, and still a candidate.
- `HISTORY_COLORS` in `ProfileScreen` is a data palette for achievement chips, not
  a theme surface.
- The two `'#fff'` `borderColor` values are photo separator rings around the
  avatar, not text.
- **SULTI is untouched.** `SultiTutorScreen.js` has not been modified. It inherits
  the new `background`/`surface`/`border` values like every other screen, but its
  accent — the orb, gradient and active controls — still uses the unchanged
  `#00D4BD`.

### Phase 7 — Soft Academic Light: indigo → emerald

The Appearance settings request was to make Soft Academic Light green like the
other three themes, replacing the indigo that was its identity.

**Core identity** (`src/theme/index.js`)

| Token | Was (indigo) | Now (emerald) |
|---|---|---|
| `primary` | `#4F46E5` | `#047857` |
| `primaryDark` | `#4338CA` | `#065F46` |
| `primaryLight` | `#E0E7FF` | `#D1FAE5` |
| `primaryHover` | `#4F46E5` | `#046C50` |
| `secondary` / `accent` | `#3B5BDB` | `#0F766E` |
| `secondaryLight` / `accentLight` | `#E7EBFC` | `#CCFBF1` |
| `gradientA/B`, `gradientStart/End`, `orbGradient1/2` | indigo pair | `#047857 → #0F766E` |
| `glassBorder`, `aurora1-4`, `orbGlow`, `premiumBorder` | `rgba(79,70,229…)` / `rgba(59,91,219…)` | `rgba(4,120,87…)` / `rgba(15,118,110…)` |
| `softPurple` | `#F0F1FF` | `#E9F5F0` |
| `description` | "Clean & indigo…" | "Clean & emerald…" |

`onPrimary` stays `#FFFFFF` — white on `#047857` is 5.48:1, and it clears 4.5:1
in both directions (the emerald is dark enough to work as both a fill and as
text on white, which the old indigo was not).

**`primaryHover` now darkens instead of lightening.** On a light theme the
primary button's white label has to keep its contrast in the hover state, and
the previous "lighter" instinct (`#059669`) measured 3.77:1. `#046C50` gives
6.43:1. This is the opposite of the dark themes, where hover does lighten.

**Module gradients** (`src/theme/moduleColors.js`) — the two blue module
hues were re-tinted so the theme no longer reads blue, while every module
keeps a distinct identity:

| Module | Was | Now |
|---|---|---|
| `neutral` | `#4F46E5 → #4338CA` | `#047857 → #065F46` |
| `vocabulary` | `#2563EB → #1D4ED8` | `#0F766E → #115E59` |
| `pronunciation` | `#4F46E5 → #4338CA` | `#65A30D → #4D7C0F` (lime) |
| `culture_notes` | `#059669 → #065F46` | `#4D7C0F → #3F6212` (olive) |
| `reading` | `#0D9488 → #115E59` | `#475569 → #334155` (slate) |
| `scenario_practice` | `#2563EB → #1D4ED8` | `#92400E → #78350F` (bronze) |

`grammar`, `listening`, `writing`, `review_center` and `sulti_switch` keep
their existing hues — they were already clearly non-blue, and reusing them is
what keeps the modules distinguishable once four of the cool slots are gone.

**Deliberately unchanged**

- `colors.blue` (`#2563EB`) is still defined for this theme. It has **zero
  consumers** in `src/`, so it has no visual effect; it is a feature-semantic
  token (AR/rewards), not theme identity.
- The dark themes' `neutral` gradients are still indigo (`#6366F1 → #4F46E5` in
  Midnight Teal, `#6366F1 → #4338CA` in Obsidian Emerald). Out of scope for this
  request, but the same "no indigo" argument applies to them.
- `sulti_switch` keeps its cyan — it reads as teal, not navy, and is the SULTI
  entry point.

**Two pre-existing failures found by the sweep, not fixed here**

- `warmCyberSunset`: `primaryDark` `#E8603F` on `surface` `#2E2138` = **4.44:1**,
  just under 4.5.
- `softAcademicLight`: `amber` `#F59E0B` on `amberLight` `#FEF3C7` = **1.93:1**.
  Same defect class as the `coral`/`textLight` fixes in phase 6.

### Phase 8 — Voice AI Agent theme unification

Reported symptom: the Voice AI Agent did not look like the rest of the app, and
the mismatch was worst on Midnight Teal. The cause was not the theme — SULTI
never read it in the places that mattered.

**Root cause**

`SultiTutorScreen` called `useTheme()` and used 25 tokens, so it *looked*
themed. The breakage was one layer down, plus a parallel voice palette:

| Where | Problem |
|---|---|
| `DailyStreakCard` | "Practice" button hardcoded `#008B8B → #006D6D` — a teal in **no** theme (Midnight's primary is `#00D4BD`) |
| `SultiTalkingAvatar` | drop shadow pinned to `#5B5FEF`, an indigo that exists in no theme |
| `RoleplayCard` | `rgba(0,139,139,…)` borders, `#008B8B` fallback when no `colors` prop |
| `SultiTutorScreen` | typing dots `#14B8A6`; header status dot `#065F46` on dark (invisible); `rgba(255,255,255,…)` overlays; blue-grey `rgba(15,23,42)` composer shadow; `rgba(0,0,0,0.06)` composer border; `#22C55E` online dot |
| `components/voice/palette.js` | duplicated `backgroundDeep` per theme (Midnight's copy went stale at `#080E1A` vs `#060C15`), per-theme `orbCoreGradient` that duplicated the theme ramp, and **indigo glass + a `#6C63FF → #3B5BDB` orb** left behind for Soft Academic Light |
| `VoiceBackground`, `VoiceControls`, `XpToast`, `StatusPill`, `SettingsSheet` | fixed teals `#20D6C7` / `#00D4BD`, a blue blob tint `#409CFF`, navy scrims `rgba(4,11,22)` / `rgba(10,24,40)` / `rgba(2,6,12)`, and a recording red `#FF6B6B` / `#E45757` |

**The `onPrimary` bug (the real "doesn't match" cause)**

Seven icon-only controls sat on saturated theme fills with a hardcoded
`color="#fff"`. `onPrimary` is `#FFFFFF` on light themes but `#04111F` on dark
ones, so white was correct exactly once:

| Fill | white contrast | midnight | warm | obsidian | soft |
|---|---|---|---|---|---|
| `colors.primary` | 1.88 / 2.57 / 1.89 / 5.48 | fail | fail | fail | pass |

On the three dark themes the mic, send arrow, chat bubbles and status bar had
unreadable glyphs. SULTI now derives its icon inks with
`ensureContrast(onPrimary, fill, 4.5)`, which returns `#04111F` on every dark
theme, white on Soft Academic's primary/error, and `#0F172A` for Soft Academic's
`success` (where white is only 3.77:1).

**`colors.onPrimary` never existed**

`ThemeContext` exposes `onPrimary` at the **top level**, not inside `colors`
(`ThemeContext.js:41` destructures `activeTheme.onPrimary` and returns it
separately). Every `colors.onPrimary` reference therefore evaluated to
`undefined`. Fixed in `SultiTutorScreen`, `DailyStreakCard`, `palette.js`, and
`ProfileScreen`. **`PronunciationScreen.js` still has 10 of these sites** and is
the one remaining known ink bug — out of scope for the Voice AI Agent, flagged
rather than changed.

**Recording state**

The recording red is semantic, not brand, so it now follows the theme's error
ramp: `danger` is the token and `dangerDark` is derived by mixing it 30% toward
`backgroundDeep` (`palette.js:mixToward`), replacing the hand-picked
`#FF6B6B → #E45757` pair that matched neither the theme nor itself.

**Verification**

40 ink-on-fill pairs across all four themes: 0 failures. 21/21 files parse.
Zero fixed brand colors remain across `SultiTutorScreen`, `VoiceModeScreen`,
`components/sulti/*` and `components/voice/*`. `tsc` 160 = baseline; ESLint
170/28 with **no errors in any file this phase touched**.

**Not changed**

- `SultiModeCard.js` and `TopicPill.js` are dead — not imported anywhere and not
  in `components/index.js`. `SultiModeCard` was themed anyway so no fixed teal
  survives in the folder, but both are deletion candidates and were left on disk
  pending approval.
- `VoiceModeScreen` was not edited. Its 12 lint errors are pre-existing.

### Still open
- **`PronunciationScreen.js` has 10 `colors.onPrimary` references that are all
  `undefined`.** `onPrimary` is a top-level `useTheme()` value, so this is the one
  place still shipping the original mistake. Its icons will be invisible on every
  theme. Same one-line fix as phase 8, deliberately left alone because the request
  was scoped to the Voice AI Agent.

- §15 accessibility defects are otherwise untouched. The two
  `set-state-in-effect` diagnostics in `VocabularyExercise.js` and
  `SentenceCompletion.js` were mount-time RoBERTa status checks that only
  `setState` after an `await`; they now carry a targeted disable with that
  justification rather than being restructured.
- The Obsidian Emerald `previewCard` override survives from phase 1 and is not
  wanted — it was introduced before the previewCard scope was clarified. The
  `obsidianPreviewCard` value itself is gone from source; only the unused
  optional `previewCard` plumbing remains in `ThemeContext`.
- Gradient contrast is verified at the 3:1 large-text threshold across all 68
  gradients. The Home hero gradients are additionally verified at **4.5:1**;
  other screens still have normal-size text on gradients that needs that pass.
- `Button`/`EmptyState` adoption is still partial — see the Phase 5 notes.
  Roughly 20 screens still hand-roll buttons, and `ProfileScreen` (2),
  `VocabularyReviewScreen` (1) and `CommunityPreview` (1) still hand-roll empty
  states.
- `ensureContrast` in `FeaturesGrid` corrects Soft Academic Light's
  `coral` on `coralLight` to `#D10000`. That clears 4.5:1 but reads more
  saturated than the original `#FF6B6B`; it is applied at the point of use
  only, so the global `coral` token is unchanged.
- 209 remaining hex literals are mostly mock data and content (`communityMock.js`,
  `situations.js`, `AchievementsScreen.js`) and the six unused dashboard
  components, rather than theme leaks, and were left alone deliberately.
