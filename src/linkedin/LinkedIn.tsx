import { useState } from "react";
import { Linkedin, LogOut } from "lucide-react";
import { failure } from "../lib/format";
import type { LinkedInState } from "../../electron/linkedin/queue";
import "./linkedin.css";

export function LinkedIn({ state }: { state: LinkedInState }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(failure(e));
    }
    setBusy(false);
  };

  const on = state.signedIn;
  const tip = busy ? "Signing in" : on ? "LinkedIn connected" : (error ?? "Connect LinkedIn");
  return (
    <>
      <button
        className="icon-btn li-btn"
        data-on={on || undefined}
        aria-label={tip}
        data-tip={tip}
        disabled={busy}
        popoverTarget={on ? "li-pop" : undefined}
        onClick={on ? undefined : () => run(window.radar.connectLinkedIn)}
      >
        <Linkedin size={20} strokeWidth={2.2} />
        {(on || busy) && <span className="dot li-dot" data-state={busy ? "running" : "ok"} />}
      </button>
      <div id="li-pop" popover="auto" className="pop li-pop">
        <Linkedin size={22} className="li-logo" />
        <span className="ok-chip">Connected</span>
        <b className="li-count" data-tip="Checked">
          {Object.keys(state.verdicts).length}
        </b>
        <button
          className="icon-btn"
          aria-label="Disconnect"
          data-tip="Disconnect"
          popoverTarget="li-pop"
          popoverTargetAction="hide"
          onClick={() => run(window.radar.disconnectLinkedIn)}
        >
          <LogOut size={18} />
        </button>
      </div>
    </>
  );
}
