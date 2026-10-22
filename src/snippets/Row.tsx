import { useEffect, useState } from "react";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import type { Snippet } from "../../core/snippets";
import { Editor } from "./Editor";

const FLASH = 1400;

type Props = {
  snippet: Snippet;
  onChange: (s: Snippet) => void;
  onDelete: () => void;
  onError: (e: unknown) => void;
};

export function Row({ snippet, onChange, onDelete, onError }: Props) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), FLASH);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () =>
    window.radar.copy(snippet.value).then(() => setCopied(true), onError);

  if (editing)
    return (
      <li>
        <Editor
          label={snippet.label}
          value={snippet.value}
          onCancel={() => setEditing(false)}
          onSave={(label, value) => {
            onChange({ ...snippet, label, value });
            setEditing(false);
          }}
        />
      </li>
    );

  return (
    <li className="snip">
      <button
        className="snip-copy"
        onClick={copy}
        aria-label={"Copy " + snippet.label}
      >
        <small>{snippet.label}</small>
        <span>{snippet.value}</span>
      </button>
      <button
        className="icon-btn"
        data-copied={copied || undefined}
        aria-label={copied ? "Copied" : "Copy"}
        onClick={copy}
      >
        {copied ? <Check size={18} strokeWidth={2.6} /> : <Copy size={18} />}
      </button>
      <button
        className="icon-btn"
        aria-label="Edit"
        onClick={() => setEditing(true)}
      >
        <Pencil size={18} />
      </button>
      <button className="icon-btn" aria-label="Delete" onClick={onDelete}>
        <Trash2 size={18} />
      </button>
    </li>
  );
}
