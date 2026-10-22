import { useEffect, useRef, useState } from "react";
import { Check, Copy, ScrollText, X } from "lucide-react";
import "./logs.css";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    await window.radar.copy(text);
  }
}

export function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const off = window.radar.onLog(({ n, line }) =>
      setLines((cur) => (cur.length === n ? [...cur, line] : cur)),
    );
    window.radar
      .logs()
      .then((all) => setLines((cur) => (all.length >= cur.length ? all : cur)));
    return off;
  }, []);

  useEffect(() => {
    if (pre.current) pre.current.scrollTop = pre.current.scrollHeight;
  }, [lines]);

  const copy = async () => {
    await copyText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <>
      <button
        className="icon-btn"
        aria-label="Logs"
        data-tip="Logs"
        onClick={() => dialog.current?.showModal()}
      >
        <ScrollText size={20} />
      </button>
      <dialog ref={dialog} className="logs">
        <header>
          <h2>
            <ScrollText size={20} /> Logs{" "}
            <span className="num">{lines.length}</span>
          </h2>
          <button
            className="icon-btn"
            aria-label="Copy logs"
            data-copied={copied || undefined}
            onClick={copy}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            className="icon-btn"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </header>
        <pre ref={pre}>{lines.join("\n")}</pre>
      </dialog>
    </>
  );
}
