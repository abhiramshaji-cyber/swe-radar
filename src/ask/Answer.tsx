import { useState } from "react";
import { Check, Copy } from "lucide-react";
import "./answer.css";

export type Qa = { question: string; answer: string };

export function Answer({ qa }: { qa: Qa }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(qa.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <li className="qa-item">
      <q>{qa.question}</q>
      <p>{qa.answer}</p>
      <footer>
        <button className="icon-btn ask-copy" onClick={copy} data-copied={copied || undefined}>
          {copied ? <Check size={17} strokeWidth={2.6} /> : <Copy size={17} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </footer>
    </li>
  );
}
