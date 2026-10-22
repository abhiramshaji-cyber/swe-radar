import { useState, type FormEvent } from "react";

type Props = {
  label?: string;
  value?: string;
  onSave: (label: string, value: string) => void;
  onCancel: () => void;
};

export function Editor(p: Props) {
  const [label, setLabel] = useState(p.label ?? "");
  const [value, setValue] = useState(p.value ?? "");
  const ready = label.trim() !== "" && value.trim() !== "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) p.onSave(label.trim(), value);
  };

  return (
    <form
      className="snip-edit"
      onSubmit={submit}
      onKeyDown={(e) =>
        e.key === "Escape" && (e.stopPropagation(), p.onCancel())
      }
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label"
        aria-label="Label"
      />
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        aria-label="Value"
        rows={2}
        spellCheck={false}
      />
      <div className="snip-actions">
        <button type="button" className="pill ghost" onClick={p.onCancel}>
          Cancel
        </button>
        <button type="submit" className="pill" disabled={!ready}>
          Save
        </button>
      </div>
    </form>
  );
}
