import type { CSSProperties } from "react";
import type { Tier } from "../../core/types";

type Option<T> = { value: T; label: string; count?: number; state?: Tier["state"]; partial?: boolean };

type Props<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  wide?: boolean;
};

export function Seg<T extends string | number>({ label, options, value, onChange, wide }: Props<T>) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const style = { "--n": options.length, "--i": i } as CSSProperties;
  return (
    <div className="seg" role="radiogroup" aria-label={label} data-wide={wide || undefined} style={style}>
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          aria-busy={o.state === "run" || undefined}
          data-state={o.state}
          data-partial={o.partial || undefined}
          onClick={() => onChange(o.value)}
        >
          <span className="seg-label">{o.label}</span>
          {o.count !== undefined && <small className="seg-count">{o.count}</small>}
        </button>
      ))}
    </div>
  );
}
