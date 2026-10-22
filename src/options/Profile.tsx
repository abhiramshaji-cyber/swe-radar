import { useEffect, useState, type FormEvent } from "react";
import { Check, UserRound } from "lucide-react";
import { failure } from "../lib/format";

export function Profile() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.radar.profile().then(
      (t) => {
        setText(t);
        setSaved(t);
      },
      (e) => setError(failure(e)),
    );
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await window.radar.setProfile(text);
      setSaved(text);
    } catch (err) {
      setError(failure(err));
    }
  };

  const dirty = text !== saved;

  return (
    <section className="opt">
      <h3>
        <UserRound size={18} /> Profile
        {!dirty && saved.trim() && (
          <span className="ok-chip">
            <Check size={14} strokeWidth={3} /> Saved
          </span>
        )}
      </h3>
      <form onSubmit={onSave} className="opt-profile">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder="Resume, wins, links"
          aria-label="Profile used by Ask AI"
          rows={8}
        />
        <button type="submit" className="pill" disabled={!dirty}>
          Save
        </button>
      </form>
      {error && <p className="opt-error">{error}</p>}
    </section>
  );
}
