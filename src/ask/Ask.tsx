import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Sparkles, X } from "lucide-react";
import type { Row } from "../../core/types";
import { withDescription } from "../docs/store";
import { Avatar } from "../feed/Avatar";
import { failure } from "../lib/format";
import { Answer, type Qa } from "./Answer";
import "./ask.css";

type Props = { row: Row | null; onClose: () => void };

export function Ask({ row, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<Record<string, Qa[]>>({});
  const [pending, setPending] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = dialog.current;
    if (row && !d?.open) d?.showModal();
    if (!row && d?.open) d.close();
    setDraft("");
  }, [row?.key]);

  if (!row) return <dialog ref={dialog} className="ask" onClose={onClose} />;
  const key = row.key;
  const waiting = pending[key];
  const asked = history[key] ?? [];

  const patch = <T,>(set: (f: (m: Record<string, T>) => Record<string, T>) => void, value?: T) =>
    set((m) => {
      const { [key]: _, ...rest } = m;
      return value === undefined ? rest : { ...rest, [key]: value };
    });

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const question = draft.trim();
    if (!question || waiting) return;
    patch(setPending, question);
    patch(setErrors);
    try {
      const { answer } = await window.radar.ask(withDescription(row), question);
      setHistory((h) => ({ ...h, [key]: [{ question, answer }, ...(h[key] ?? [])] }));
      setDraft((d) => (d.trim() === question ? "" : d));
    } catch (err) {
      patch(setErrors, failure(err));
    } finally {
      patch(setPending);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <dialog ref={dialog} className="ask" onClose={onClose}>
      <header className="ask-head">
        <Avatar r={row} />
        <span>
          <b>{row.title}</b>
          <small>{row.company}</small>
        </span>
        <button className="icon-btn" aria-label="Close" onClick={() => dialog.current?.close()}>
          <X size={20} />
        </button>
      </header>
      <form className="ask-form" onSubmit={submit}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Paste the question"
          aria-label="Application question"
          rows={3}
        />
        <button type="submit" className="pill ask-go" disabled={!draft.trim() || !!waiting}>
          <Sparkles size={17} strokeWidth={2.4} /> Ask <kbd>⌘↵</kbd>
        </button>
      </form>
      {waiting && (
        <div className="ask-wait" role="status" aria-label="Writing">
          <q>{waiting}</q>
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
      {errors[key] && <p className="opt-error">{errors[key]}</p>}
      <ol className="qa">
        {asked.map((qa, i) => (
          <Answer key={asked.length - i} qa={qa} />
        ))}
      </ol>
    </dialog>
  );
}
