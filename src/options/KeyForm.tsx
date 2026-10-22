import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";
import { failure } from "../lib/format";

export function KeyForm() {
  const input = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.radar.hasKey().then(setSaved, (e) => setError(failure(e)));
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(failure(e));
    }
    setSaved(await window.radar.hasKey());
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    const field = input.current;
    if (!field) return;
    const key = field.value;
    field.value = "";
    run(() => window.radar.setKey(key));
  };

  return (
    <section className="opt">
      <h3>
        <KeyRound size={18} /> Key
        {saved && (
          <span className="ok-chip">
            <Check size={14} strokeWidth={3} /> Saved
          </span>
        )}
      </h3>
      <form onSubmit={onSave} className="opt-row">
        <input
          ref={input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={saved ? "Replace key" : "Paste TypeSafe key"}
          aria-label="TypeSafe API key"
        />
        <button type="submit" className="pill">
          Save
        </button>
        {saved && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove key"
            data-tip="Remove"
            onClick={() => run(window.radar.clearKey)}
          >
            <Trash2 size={18} />
          </button>
        )}
      </form>
      {error && <p className="opt-error">{error}</p>}
    </section>
  );
}
