import type { SeriesPoint } from '@/types';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
];

export const chartColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];

export function BarChart({
  data,
  height = 160,
  color = CHART_COLORS[0],
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t-[5px] opacity-85 transition-opacity duration-300 hover:opacity-100"
              style={{
                height: `${Math.max(Math.round((d.value / max) * 100), d.value > 0 ? 3 : 0)}%`,
                background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 35%, transparent))`,
                boxShadow: `0 0 18px -6px ${color}`,
              }}
              title={`${d.label}: ${d.value.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 truncate text-center text-[10px] font-medium text-ink-faint"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 160,
  color = CHART_COLORS[0],
  gradientId = 'line-fill',
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
  gradientId?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const w = 560;
  const h = height;
  const step = w / (data.length - 1);
  const points = data.map((d, i) => ({
    x: i * step,
    y: h - 8 - ((d.value - min) / range) * (h - 24),
    ...d,
  }));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${path} L${(data.length - 1) * step},${h} L0,${h} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label={lineAriaLabel(data)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--bg-raise)"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-3 flex">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 truncate text-center text-[10px] font-medium text-ink-faint"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Summarises the series so the trend is available without reading the plot. */
function lineAriaLabel(data: SeriesPoint[]): string {
  if (data.length === 0) return 'No data';
  const first = data[0];
  const last = data[data.length - 1];
  const trend = last.value > first.value ? 'rising' : last.value < first.value ? 'falling' : 'flat';
  return `Trend over ${data.length} days, ${trend} from ${first.value.toLocaleString()} to ${last.value.toLocaleString()}`;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 20,
}: {
  data: SeriesPoint[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce<
    { label: string; value: number; color: string; length: number; offset: number }[]
  >((acc, d, i) => {
    const length = (d.value / total) * circumference;
    const offset = acc.reduce((s, seg) => s + seg.length, 0);
    acc.push({
      label: d.label,
      value: d.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
      length,
      offset,
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth={thickness}
          />
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tracking-tight tabular-nums text-ink">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-ink-faint">total</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-soft">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {seg.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
