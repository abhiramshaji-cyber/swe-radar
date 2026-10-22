import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Row } from "../../core/types";
import { needsDescription, refetch, refetchId, useDocs } from "./store";

type Progress = { at: number; total: number };

export function FetchAll({ rows }: { rows: Row[] }) {
  const { status } = useDocs();
  const [progress, setProgress] = useState<Progress | null>(null);
  const live = useRef(rows);
  useEffect(() => {
    live.current = rows;
  }, [rows]);
  useEffect(() => () => void (live.current = []), []);
  const waiting = rows.filter(
    (r) => needsDescription(r) && status[refetchId(r)] !== "busy",
  );
  if (!progress && !waiting.length) return null;

  async function run() {
    try {
      for (const [i, r] of waiting.entries()) {
        const current = live.current.find((x) => x.key === r.key);
        if (!current || !needsDescription(current)) continue;
        setProgress({ at: i + 1, total: waiting.length });
        await refetch(current);
      }
    } finally {
      setProgress(null);
    }
  }

  return (
    <button
      className="icon-btn card-refetch fetch-all"
      data-state={progress ? "busy" : undefined}
      aria-busy={!!progress}
      disabled={!!progress}
      onClick={run}
    >
      <RefreshCw size={16} strokeWidth={2.4} />
      {progress ? `Fetching ${progress.at}/${progress.total}` : "Fetch all"}
    </button>
  );
}
