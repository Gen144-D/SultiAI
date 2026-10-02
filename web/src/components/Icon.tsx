/**
 * Inline stroke icons, lucide-style (24x24, currentColor).
 *
 * These replace the emoji that were previously scattered through the site:
 * emoji render differently on every OS, cannot be recoloured, and read as
 * unpolished next to real type. Keeping them inline avoids an icon dependency
 * and keeps the bundle small.
 */
export type IconName =
  | 'chatbubbles'
  | 'school'
  | 'ear'
  | 'create'
  | 'book'
  | 'swap'
  | 'swap-horizontal'
  | 'compass'
  | 'refresh'
  | 'mic'
  | 'globe'
  | 'people'
  | 'sparkle'
  | 'check'
  | 'download'
  | 'shield'
  | 'trophy'
  | 'camera'
  | 'code'
  | 'bolt'
  | 'heart'
  | 'wave'
  | 'arrow'
  | 'mail'
  | 'info'
  | 'layers'
  | 'phone'
  | 'play';

const PATHS: Record<IconName, React.ReactNode> = {
  chatbubbles: (
    <>
      <path d="M14 9a2 2 0 0 1-2 2H6l-4 3V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />
      <path d="M18 9h2a2 2 0 0 1 2 2v8l-4-3h-6a2 2 0 0 1-2-2" />
    </>
  ),
  school: (
    <>
      <path d="M22 9 12 4 2 9l10 5 10-5Z" />
      <path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
    </>
  ),
  ear: (
    <>
      <path d="M6 8.5a6 6 0 1 1 12 0c0 3-2 4-2 6a2.5 2.5 0 0 0 5 0" />
      <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-1.5 2.5-1.5 4" />
    </>
  ),
  create: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5" />
    </>
  ),
  swap: (
    <>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 0 8h-1" />
    </>
  ),
  // `product.ts` labels the Sulti Switch module "swap-horizontal". It is the
  // same glyph as `swap`; without this entry the lookup returned undefined and
  // the card rendered with no icon at all.
  'swap-horizontal': (
    <>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 0 8h-1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.7-5.3L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.3L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </>
  ),
  people: (
    <>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.87" />
      <path d="M16 3.6a4 4 0 0 1 0 7.75" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v5M12 16v5M4.2 7.5l4.3 2.5M15.5 14l4.3 2.5M4.2 16.5l4.3-2.5M15.5 10l4.3-2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  check: <path d="m4 12 5.5 5.5L20 7" />,
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5C3 10 5 11 7 11" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5C21 10 19 11 17 11" />
      <path d="M12 14v3M9 20h6M10 17h4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
      <path d="m13.5 5-3 14" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  heart: <path d="M12 20s-7-4.3-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.7 12 20 12 20Z" />,
  wave: <path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0" />,
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8v.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5Z" />,
};

export default function Icon({
  name,
  className = 'h-5 w-5',
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
