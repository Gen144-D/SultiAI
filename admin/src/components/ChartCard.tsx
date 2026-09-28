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
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${Math.round((d.value / max) * 100)}%`, backgroundColor: color }}
              title={`${d.label}: ${d.value.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
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
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
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
            fill="var(--surface)"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-2 flex">
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
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
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
