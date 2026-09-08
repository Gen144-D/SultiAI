import type { SeriesPoint } from '@/types';

export function BarChart({
  data,
  height = 160,
  color = '#1e6f9f',
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
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center justify-end gap-2"
            style={{ height: '100%' }}
          >
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.round((d.value / max) * 100)}%`,
                backgroundColor: color,
                opacity: 0.85 + (d.value / max) * 0.15,
              }}
              title={`${d.label}: ${d.value.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] font-medium text-ink-faint">
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
  color = '#1e6f9f',
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const w = 560;
  const h = height;
  const step = w / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * step;
    const y = h - 8 - ((d.value - min) / range) * (h - 24);
    return { x, y, ...d };
  });
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
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#fff"
            stroke={color}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-1 flex">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] font-medium text-ink-faint">
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
  thickness = 22,
}: {
  data: SeriesPoint[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#1e6f9f', '#10b981', '#ffb347', '#7c3aed', '#ef4444', '#38bdf8', '#ec4899'];
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce<
    { label: string; value: number; color: string; length: number; offset: number }[]
  >((acc, d, i) => {
    const length = (d.value / total) * circumference;
    const offset = acc.reduce((s, seg) => s + seg.length, 0);
    acc.push({ label: d.label, value: d.value, color: colors[i % colors.length], length, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
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
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-ink">{total.toLocaleString()}</span>
          <span className="text-[10px] text-ink-faint">total</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.label}
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
