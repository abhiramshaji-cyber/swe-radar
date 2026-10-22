import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EyeOff, Hourglass, Repeat2 } from "lucide-react";
import { byNewest } from "../../core/time";
import type { Row } from "../../core/types";
import { Ask } from "../ask/Ask";
import { FetchAll } from "../docs/FetchAll";
import { Toasts } from "../docs/Toasts";
import { useApplied } from "./applied";
import { Card } from "./Card";
import { Empty } from "./empty/Empty";
import "./feed.css";
import "./applied.css";

type GridProps = {
  rows: Row[];
  now: number;
  onAsk: (r: Row) => void;
  applied: Set<string>;
  onApplied: (key: string) => void;
  fresh?: Set<string>;
  audit?: boolean;
  end?: boolean;
};

function Grid({ rows, applied, fresh, end, ...rest }: GridProps) {
  return (
    <ul className="grid">
      {rows.map((r, i) => (
        <Card
          key={r.key}
          r={r}
          i={i}
          fresh={fresh?.has(r.key)}
          applied={applied.has(r.key)}
          {...rest}
        />
      ))}
      {end && (
        <li className="end-tile">
          <Empty busy={false} never={false} done />
        </li>
      )}
    </ul>
  );
}

type GroupProps = GridProps & { icon: LucideIcon; label: string };

function Group({ icon: Icon, label, rows, ...rest }: GroupProps) {
  if (!rows.length) return null;
  return (
    <section className="group">
      <h2 aria-label={label} data-tip={label}>
        <Icon size={18} strokeWidth={2.2} />
        {rows.length}
      </h2>
      <Grid rows={rows} {...rest} />
    </section>
  );
}

type Props = {
  jobs: Row[];
  pending: Row[];
  filtered: Row[];
  now: number;
  fresh: Set<string>;
  busy: boolean;
  never: boolean;
};

export function Feed({
  jobs,
  pending,
  filtered,
  now,
  fresh,
  busy,
  never,
}: Props) {
  const [asking, setAsking] = useState<Row | null>(null);
  const [applied, onApplied] = useApplied();
  const shared = { now, onAsk: setAsking, applied, onApplied };
  const open = (rows: Row[]) => rows.filter((r) => !applied.has(r.key));
  const live = open(jobs);
  const originals = live.filter((r) => !r.repost);
  const reposts = live.filter((r) => r.repost);
  const waiting = open(pending);
  const done = [...jobs, ...pending, ...filtered]
    .filter((r) => applied.has(r.key))
    .sort(byNewest);
  return (
    <main className="feed">
      {live.length ? (
        <>
          {originals.length > 0 && (
            <section className="group">
              <FetchAll rows={originals} />
              <Grid rows={originals} fresh={fresh} end={!busy && !reposts.length} {...shared} />
            </section>
          )}
          <Group icon={Repeat2} label="Reposted" rows={reposts} fresh={fresh} end={!busy} {...shared} />
        </>
      ) : waiting.length ? (
        <p className="scoring-note">
          <Hourglass size={18} strokeWidth={2.2} />
          {busy ? "Scoring…" : "Nothing scored yet"}
        </p>
      ) : (
        <Empty busy={busy} never={never} />
      )}
      {waiting.length > 0 && (
        <details className="scoring">
          <summary aria-label={busy ? "Scoring" : "Unscored"} data-tip={busy ? "Scoring" : "Unscored"}>
            <Hourglass size={16} strokeWidth={2.4} />
            {waiting.length}
          </summary>
          <Grid rows={waiting} {...shared} />
        </details>
      )}
      <Group
        icon={EyeOff}
        label="Filtered out"
        rows={open(filtered)}
        audit
        {...shared}
      />
      {done.length > 0 && (
        <section className="applied-group">
          <h2 className="applied-rule">Already applied</h2>
          <Grid rows={done} {...shared} />
        </section>
      )}
      <Ask row={asking} onClose={() => setAsking(null)} />
      <Toasts />
    </main>
  );
}
