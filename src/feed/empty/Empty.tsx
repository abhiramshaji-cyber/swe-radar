import "./empty.css";

const SPARKLE = "M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10Z";

type Props = { busy: boolean; never: boolean; done?: boolean };

export function Empty({ busy, never, done }: Props) {
  return (
    <div className="empty" data-busy={busy || undefined} data-done={done || undefined}>
      <svg viewBox="0 0 240 200" width={done ? 150 : 260} aria-hidden>
        <defs>
          <radialGradient id="dish" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="oklch(0.97 0.03 300)" />
            <stop offset="1" stopColor="oklch(0.9 0.07 300)" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.67 0.19 38)" stopOpacity="0.55" />
            <stop offset="1" stopColor="oklch(0.67 0.19 38)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="104" r="80" fill="url(#dish)" />
        {[60, 40, 20].map((r) => (
          <circle key={r} cx="120" cy="104" r={r} fill="none" stroke="oklch(0.8 0.08 300)" strokeWidth="1.5" strokeDasharray="3 5" />
        ))}
        <g className="beam">
          <path d="M120 104 L120 24 A80 80 0 0 1 189 64 Z" fill="url(#beam)" />
        </g>
        <circle className="blip b1" cx="156" cy="78" r="6" fill="oklch(0.67 0.19 38)" />
        <circle className="blip b2" cx="88" cy="130" r="5" fill="oklch(0.72 0.15 160)" />
        <circle className="blip b3" cx="140" cy="146" r="4" fill="oklch(0.5 0.19 295)" />
        <circle cx="120" cy="104" r="7" fill="oklch(0.26 0.07 292)" />
        <path className="spark s1" d={SPARKLE} transform="translate(36 40) scale(1.3)" fill="oklch(0.85 0.16 90)" />
        <path className="spark s2" d={SPARKLE} transform="translate(210 150) scale(0.9)" fill="oklch(0.67 0.19 38)" />
        <path className="spark s3" d={SPARKLE} transform="translate(206 34) scale(0.7)" fill="oklch(0.5 0.19 295)" />
      </svg>
      <p>{done ? "All caught up" : busy ? "Scanning" : never ? "Hit refresh" : "All quiet"}</p>
    </div>
  );
}
