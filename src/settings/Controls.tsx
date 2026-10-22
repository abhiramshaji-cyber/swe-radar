import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="set-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

type Chip<T> = { value: T; label: string };

type ChipsProps<T> = { options: Chip<T>[]; on: (v: T) => boolean; onToggle: (v: T) => void };

export function Chips<T extends string | number>({ options, on, onToggle }: ChipsProps<T>) {
  return (
    <div className="set-chips">
      {options.map((o) => (
        <button type="button" key={o.value} className="set-chip" aria-pressed={on(o.value)} onClick={() => onToggle(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
