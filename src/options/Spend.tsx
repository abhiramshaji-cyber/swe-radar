import { useEffect, useState } from "react";
import { Coins, RotateCcw } from "lucide-react";
import { failure, usd } from "../lib/format";

export function Spend({ busy }: { busy: boolean }) {
  const [spent, setSpent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) window.radar.spent().then(setSpent, (e) => setError(failure(e)));
  }, [busy]);

  const reset = () =>
    window.radar.resetSpent().then(
      () => setSpent(0),
      (e) => setError(failure(e)),
    );

  return (
    <section className="opt">
      <h3>
        <Coins size={18} /> Spend
      </h3>
      <div className="opt-row spend">
        <b data-tip="Estimated total">{spent === null ? "…" : usd(spent)}</b>
        <button
          className="icon-btn"
          aria-label="Reset spend"
          data-tip="Reset"
          disabled={busy}
          onClick={reset}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {error && <p className="opt-error">{error}</p>}
    </section>
  );
}
