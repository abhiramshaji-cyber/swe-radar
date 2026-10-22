import type { CSSProperties } from "react";
import { ArrowUpRight, Check, Clock3, Repeat2, Sparkles } from "lucide-react";
import { companyKey } from "../../core/dedupe";
import { hasDescription } from "../../core/docs/description";
import type { Row } from "../../core/types";
import { DocButtons } from "../docs/DocButtons";
import { levelLabel, payLabel, relativeTime, repostTip } from "../lib/format";
import { Avatar } from "./Avatar";
import { useRatings } from "./ratings";

type Props = {
  r: Row;
  now: number;
  i: number;
  fresh?: boolean;
  audit?: boolean;
  applied?: boolean;
  onAsk: (r: Row) => void;
  onApplied: (key: string) => void;
};

export function Card({ r, now, i, fresh, audit, applied, onAsk, onApplied }: Props) {
  const level = r.extraction ? levelLabel(r.extraction) : "";
  const pay = payLabel(r);
  const guess = !hasDescription(r.description);
  const rated = useRatings()[companyKey(r)];
  return (
    <li
      className="card"
      data-fresh={fresh || undefined}
      data-audit={audit || undefined}
      data-applied={applied || undefined}
      style={{ "--i": Math.min(i, 16) } as CSSProperties}
    >
      <button className="card-open" onClick={() => window.radar.open(r.url)}>
        <Avatar r={r} />
        <span className="card-body">
          <span className="card-title">{r.title}</span>
          <span className="card-meta">
            {r.company}
            {rated && (
              <span
                className="rating"
                role="link"
                aria-label={`Glassdoor ${rated.rating} from ${rated.reviews.toLocaleString()} reviews`}
                title={`Glassdoor · ${rated.reviews.toLocaleString()} reviews`}
                onClick={(e) => {
                  e.stopPropagation();
                  window.radar.open(rated.url);
                }}
              >
                ★ {rated.rating.toFixed(1)}
              </span>
            )}
            {r.company && r.location && " · "}
            {r.location}
          </span>
          {audit && r.extraction && <span className="card-reason">{r.extraction.reason}</span>}
        </span>
        <span className="card-foot">
          <span className="when">
            <Clock3 size={15} strokeWidth={2.2} />
            {relativeTime(r, now)}
          </span>
          {level && (
            <span className="level" data-level={r.extraction?.seniority}>
              {level}
            </span>
          )}
          {pay && (
            <span className="pay" data-estimated={r.estimated || undefined}>
              {pay}
            </span>
          )}
          {r.extraction && (
            <span
              className="score"
              data-estimated={guess || undefined}
              data-tip={guess ? "Estimated · no description yet" : "Score"}
              style={{ "--s": r.score } as CSSProperties}
            >
              {Math.round(r.score)}
            </span>
          )}
          {r.repost && (
            <span className="repost" role="img" aria-label={repostTip(r.repost)} data-tip={repostTip(r.repost)}>
              <Repeat2 size={15} strokeWidth={2.4} />
            </span>
          )}
          {r.stale && <span className="stale" role="img" aria-label="Kept from the last refresh" data-tip="Kept from the last refresh" />}
          {fresh && (
            <span className="new" aria-label="New">
              <Sparkles size={15} strokeWidth={2.4} />
            </span>
          )}
        </span>
        <ArrowUpRight className="card-go" size={20} strokeWidth={2.2} aria-hidden />
      </button>
      <span className="card-tools">
        <DocButtons r={r} onAsk={onAsk} />
        <button
          className="icon-btn card-tool card-applied"
          aria-label={applied ? "Applied" : "Mark applied"}
          aria-pressed={!!applied}
          data-tip={applied ? "Applied" : "Mark applied"}
          onClick={(e) => {
            e.stopPropagation();
            onApplied(r.key);
          }}
        >
          <Check size={19} strokeWidth={2.4} />
        </button>
      </span>
    </li>
  );
}
