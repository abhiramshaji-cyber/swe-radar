import { Check, Copy, FileText, Mail, RefreshCw, WandSparkles } from "lucide-react";
import type { Row } from "../../core/types";
import { copyId, copyLetter, docId, makeDoc, needsDescription, refetch, refetchId, type Status, useDocs } from "./store";
import "./docs.css";

const DOCS = [
  {
    kind: "resume",
    label: "Download enhanced resume",
    tip: "Enhanced resume",
    Icon: FileText,
  },
  {
    kind: "letter",
    label: "Download enhanced cover letter",
    tip: "Enhanced cover letter",
    Icon: Mail,
  },
] as const;

type Tips = Partial<Record<Status, string>>;

const TIP: Tips = { busy: "Tailoring…", done: "Saved" };
const COPY_TIP: Tips = { busy: "Tailoring…", done: "Copied" };
const FETCH: Tips = { busy: "Fetching…", failed: "Failed, try again later" };

type Props = { r: Row; onAsk: (r: Row) => void };

export function DocButtons({ r, onAsk }: Props) {
  const { status } = useDocs();
  const copying = status[copyId(r)];
  if (needsDescription(r)) {
    const fetching = status[refetchId(r)];
    return (
      <button
        className="icon-btn card-tool card-refetch"
        data-state={fetching}
        aria-busy={fetching === "busy"}
        onClick={(e) => {
          e.stopPropagation();
          refetch(r);
        }}
      >
        <RefreshCw size={16} strokeWidth={2.4} />
        {(fetching && FETCH[fetching]) || "Fetch description"}
      </button>
    );
  }
  return (
    <>
      {DOCS.map(({ kind, label, tip, Icon }) => {
        const state = status[docId(r, kind)];
        return (
          <button
            key={kind}
            className="icon-btn card-tool card-doc"
            data-state={state}
            data-tip={(state && TIP[state]) || tip}
            aria-label={label}
            aria-busy={state === "busy"}
            onClick={(e) => {
              e.stopPropagation();
              makeDoc(r, kind);
            }}
          >
            {state === "done" ? (
              <Check size={19} strokeWidth={2.8} />
            ) : (
              <Icon size={18} strokeWidth={2.2} />
            )}
          </button>
        );
      })}
      <button
        className="icon-btn card-tool card-doc"
        data-state={copying}
        data-tip={(copying && COPY_TIP[copying]) || "Copy cover letter"}
        aria-label="Copy cover letter text"
        aria-busy={copying === "busy"}
        onClick={(e) => {
          e.stopPropagation();
          copyLetter(r);
        }}
      >
        {copying === "done" ? (
          <Check size={19} strokeWidth={2.8} />
        ) : (
          <Copy size={18} strokeWidth={2.2} />
        )}
      </button>
      <button
        className="icon-btn card-tool card-ask"
        aria-label="Ask AI"
        data-tip="Ask AI"
        onClick={(e) => {
          e.stopPropagation();
          onAsk(r);
        }}
      >
        <WandSparkles size={19} strokeWidth={2.2} />
      </button>
    </>
  );
}
