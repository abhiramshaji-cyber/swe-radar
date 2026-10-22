import { CircleAlert, CircleCheck, FolderOpen, X } from "lucide-react";
import { failure } from "../lib/format";
import { dismiss, toast, useDocs, type Toast } from "./store";

const act = (run: () => Promise<void>) => () => run().catch((e) => toast({ text: failure(e) }));

function Item({ t }: { t: Toast }) {
  const file = t.file;
  return (
    <li className="toast" data-kind={file ? "done" : "error"} role={file ? "status" : "alert"}>
      {file ? <CircleCheck size={20} strokeWidth={2.4} /> : <CircleAlert size={20} strokeWidth={2.4} />}
      <span className="toast-text">
        {t.text}
        {t.sub && <small>{t.sub}</small>}
      </span>
      {file && (
        <>
          <button className="toast-open" onClick={act(() => window.radar.openFile(file))}>
            Open
          </button>
          <button
            className="toast-icon"
            aria-label="Show in Finder"
            data-tip="Show in Finder"
            onClick={act(() => window.radar.showFile(file))}
          >
            <FolderOpen size={18} strokeWidth={2.2} />
          </button>
        </>
      )}
      <button className="toast-icon" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
        <X size={16} strokeWidth={2.4} />
      </button>
    </li>
  );
}

export function Toasts() {
  const { toasts } = useDocs();
  return (
    <ol className="toasts">
      {toasts.map((t) => (
        <Item key={t.id} t={t} />
      ))}
    </ol>
  );
}
