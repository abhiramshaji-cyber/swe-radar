import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import type { SourceStatus } from "../../core/types";

function Line({ s }: { s: SourceStatus }) {
  const head = (
    <>
      <span className="dot" data-state={s.state} />
      <span className="src-name">
        <b>{s.source}</b>
        {s.label && <small className="src-label">{s.label}</small>}
      </span>
      <span className="num">{s.state === "running" ? "" : s.count}</span>
    </>
  );
  if (!s.note) return <li className="src-line">{head}</li>;
  return (
    <li>
      <details>
        <summary className="src-line">
          {head}
          <ChevronDown size={16} className="chev" />
        </summary>
        <p className="src-note">{s.note}</p>
      </details>
    </li>
  );
}

type Props = { statuses: SourceStatus[]; busy: boolean; error: string | null; classifyError: string | null };

export function Sources({ statuses, busy, error, classifyError }: Props) {
  if (!statuses.length && !error && !classifyError) return null;
  const issues =
    statuses.filter((s) => s.state === "error").length + (error ? 1 : 0) + (classifyError ? 1 : 0);
  const done = statuses.filter((s) => s.state === "ok" || s.state === "error").length;
  const halted = !busy && statuses.some((s) => s.state === "paused");
  const state = busy ? "running" : halted ? "paused" : issues ? "error" : "ok";
  return (
    <>
      <button
        className="icon-btn sources-btn"
        popoverTarget="sources-pop"
        aria-label="Sources"
        data-tip="Sources"
      >
        <span className="dot" data-state={state} />
        <span className="num">{busy || halted ? done + "/" + statuses.length : statuses.length - issues}</span>
        {!busy && issues > 0 && (
          <span className="issues">
            <AlertTriangle size={16} strokeWidth={2.4} />
            {issues}
          </span>
        )}
      </button>
      <div id="sources-pop" popover="auto" className="pop sources-pop">
        {error && (
          <details className="refresh-error" open>
            <summary>
              <AlertTriangle size={16} strokeWidth={2.4} /> Refresh failed
            </summary>
            <p className="src-note">{error}</p>
          </details>
        )}
        {classifyError && (
          <details className="refresh-error" open>
            <summary>
              <Sparkles size={16} strokeWidth={2.4} /> Jev failed, jobs hidden
            </summary>
            <p className="src-note">{classifyError}</p>
          </details>
        )}
        <ul>
          {statuses.map((s) => (
            <Line key={s.source} s={s} />
          ))}
        </ul>
      </div>
    </>
  );
}
