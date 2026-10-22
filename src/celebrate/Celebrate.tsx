import { useEffect, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import "./celebrate.css";

export type Wave = { id: number; count: number };

const HUES = [38, 92, 160, 295, 0];

const PIECES = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.4;
  const reach = 140 + Math.random() * 220;
  return {
    "--x": Math.cos(angle) * reach + "px",
    "--y": Math.sin(angle) * reach * 0.6 + 120 + "px",
    "--r": Math.round(Math.random() * 720 - 360) + "deg",
    "--h": HUES[i % HUES.length],
    "--d": Math.round(Math.random() * 120) + "ms",
  } as CSSProperties;
});

export function Celebrate({ wave, onDone }: { wave: Wave; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="celebrate" role="status">
      <div className="confetti" aria-hidden>
        {PIECES.map((style, i) => (
          <i key={i} style={style} />
        ))}
      </div>
      <div className="cheer">
        <Sparkles size={22} strokeWidth={2.4} />+{wave.count}
      </div>
    </div>
  );
}
