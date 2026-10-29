import { useId } from 'react';

export function Sparkline({ data, color = '#cdff4d', height = 64, className = '' }: { data: number[]; color?: string; height?: number; className?: string }) {
  const id = useId().replace(/[:]/g, '');
  const series = data && data.length > 1 ? data : [0, 0];
  const w = 280;
  const h = height;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const pts = series.map((v, i) => [
    (i / (series.length - 1)) * w,
    h - 6 - ((v - min) / range) * (h - 14),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${className}`} style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={line} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

export function Bars({ data, color = '#8b7cff', height = 170, format }: { data: { label: string; value: number }[]; color?: string; height?: number; format?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 h-full justify-end">
          <span className="text-[10px] font-mono text-mut">{format ? format(d.value) : d.value}</span>
          <div
            className="w-full rounded-t-md transition-all duration-700"
            style={{ height: `${Math.max(3, (d.value / max) * 72)}%`, background: `linear-gradient(180deg, ${color}, ${color}55)` }}
          />
          <span className="text-[10px] text-faint truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 150, centerLabel, centerValue }: { segments: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string; centerValue?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="10"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={offset} strokeLinecap="butt"
            />
          );
        })}
        <g className="rotate-90" style={{ transformOrigin: '50px 50px' }}>
          {centerValue && <text x="50" y="48" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="'Bricolage Grotesque', sans-serif">{centerValue}</text>}
          {centerLabel && <text x="50" y="61" textAnchor="middle" fill="#9096a8" fontSize="7" letterSpacing="0.1em">{centerLabel.toUpperCase()}</text>}
        </g>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-mut">{s.label}</span>
            <span className="font-mono text-white/80 ml-auto pl-4">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
