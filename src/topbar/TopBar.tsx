import type { CSSProperties } from "react";
import { ArrowDownWideNarrow, Clock3, Eye, EyeOff, Pause, Play, RefreshCw } from "lucide-react";
import { WINDOW_HOURS } from "../../core/time";
import type { Region } from "../../core/settings";
import type { Classifying, SourceStatus, Tier } from "../../core/types";
import type { LinkedInState } from "../../electron/linkedin/queue";
import type { Sort } from "../App";
import { LinkedIn } from "../linkedin/LinkedIn";
import type { Hours } from "../lib/window";
import { hoursLabel } from "../lib/window";
import { Logs } from "../logs/Logs";
import { Options } from "../options/Options";
import { Snippets } from "../snippets/Snippets";
import { Reset } from "./Reset";
import { Seg } from "./Seg";
import { Sources } from "./Sources";
import "./controls.css";
import "./topbar.css";

type Props = {
  count: number;
  hours: Hours;
  onHours: (h: Hours) => void;
  regions: Region[];
  region: string;
  counts: Record<string, number>;
  onRegion: (r: string) => void;
  onSettings: () => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  stale: boolean;
  statuses: SourceStatus[];
  busy: boolean;
  error: string | null;
  classifyError: string | null;
  classifying: Classifying | null;
  tiers: Tier[] | null;
  showFiltered: boolean;
  onShowFiltered: (v: boolean) => void;
  filteredCount: number;
  onRefresh: () => void;
  lastAt?: number;
  nextAt: number;
  resume: boolean;
  scanning: boolean;
  pausing: boolean;
  onPause: () => void;
  onReset: () => void;
  linkedIn: LinkedInState;
};

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function TopBar(p: Props) {
  const hours = WINDOW_HOURS.map((h) => {
    const t = p.tiers?.find((x) => x.hours === h);
    return { value: h, label: hoursLabel(h), state: t?.state, partial: t?.partial };
  });
  const regions = p.regions.map((r) => ({ value: r.id, label: r.label, count: p.counts[r.id] ?? 0 }));
  const byScore = p.sort === "score";
  const progress = p.classifying?.total ? p.classifying.done / p.classifying.total : 0;
  return (
    <header className="topbar" data-busy={p.busy || undefined}>
      <div className="brand">
        <span className="mark" aria-hidden />
        <h1>SWE Radar</h1>
        <span className="count" data-tip="Matches" key={p.count}>
          {p.count}
        </span>
      </div>

      <div className="filters">
        <Seg label="Time window" options={hours} value={p.hours} onChange={p.onHours} />
        {regions.length > 0 && <Seg label="Region" options={regions} value={p.region} onChange={p.onRegion} wide />}
      </div>

      <div className="actions">
        <Sources statuses={p.statuses} busy={p.busy} error={p.error} classifyError={p.classifyError} />
        <button
          className="icon-btn"
          aria-label={byScore ? "Best first" : "Newest first"}
          data-tip={byScore ? "Best first" : "Newest first"}
          onClick={() => p.onSort(byScore ? "newest" : "score")}
        >
          {byScore ? <ArrowDownWideNarrow size={20} /> : <Clock3 size={20} />}
        </button>
        <button
          className="icon-btn"
          aria-pressed={p.showFiltered}
          aria-label="Show filtered"
          data-tip="Show filtered"
          onClick={() => p.onShowFiltered(!p.showFiltered)}
        >
          {p.showFiltered ? <Eye size={20} /> : <EyeOff size={20} />}
          <span className="num">{p.filteredCount}</span>
        </button>
        <LinkedIn state={p.linkedIn} />
        <Logs />
        <Reset onReset={p.onReset} />
        <Options busy={p.busy} onSettings={p.onSettings} />
        <Snippets />
        {p.scanning && (
          <button className="icon-btn" aria-label="Pause" data-tip="Pause" disabled={p.pausing} onClick={p.onPause}>
            <Pause size={20} />
          </button>
        )}
        <button
          id="refresh"
          className="refresh"
          data-stale={(p.stale && !p.busy && !p.resume) || undefined}
          data-busy={p.busy || undefined}
          data-tip={p.busy ? "Restart" : [p.lastAt && "Last " + clock(p.lastAt), Number.isFinite(p.nextAt) && "next " + clock(p.nextAt)].filter(Boolean).join(" · ") || undefined}
          onClick={p.onRefresh}
        >
          {p.resume && !p.busy ? <Play size={19} strokeWidth={2.4} /> : <RefreshCw size={19} strokeWidth={2.4} />}
          {p.busy ? (p.pausing ? "Pausing" : "Scanning") : p.resume ? "Resume" : "Refresh"}
        </button>
      </div>
      {p.classifying && (
        <span className="classify-bar" aria-hidden style={{ "--p": progress } as CSSProperties} />
      )}
    </header>
  );
}
