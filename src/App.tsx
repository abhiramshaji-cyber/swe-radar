import { useEffect, useRef, useState } from "react";
import { confirm } from "../core/listed/confirm";
import { WINDOW_HOURS, inWindow } from "../core/time";
import { ready } from "../core/settings";
import type { Classifying, RefreshResult, Row, SourceStatus, Tier } from "../core/types";
import { Celebrate, type Wave } from "./celebrate/Celebrate";
import { Feed } from "./feed/Feed";
import { keptKeys, selectFeed } from "./feed/select";
import { failure } from "./lib/format";
import { followScans } from "./lib/follow";
import { useNow } from "./lib/now";
import { loadRegion, saveRegion } from "./lib/region";
import { remember } from "./lib/remember";
import { Setup } from "./settings/Setup";
import { useSettings } from "./settings/useSettings";
import { type Hours, asHours, hoursMs, loadHours, saveHours } from "./lib/window";
import { useLinkedIn } from "./linkedin/useLinkedIn";
import { TopBar } from "./topbar/TopBar";

export type Sort = "score" | "newest";

const sortPref = remember<Sort>("radar.sort", ["score", "newest"], "score");

const FULL = hoursMs(WINDOW_HOURS[WINDOW_HOURS.length - 1]);

export function App() {
  const now = useNow();
  const [settings, saveSettings] = useSettings();
  const [editing, setEditing] = useState(false);
  const linkedIn = useLinkedIn();
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [live, setLive] = useState<Record<string, SourceStatus>>({});
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiltered, setShowFiltered] = useState(false);
  const [partial, setPartial] = useState<Row[] | null>(null);
  const [classifying, setClassifying] = useState<Classifying | null>(null);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [picked, setPicked] = useState<Hours | null>(loadHours);
  const [chosen, setChosen] = useState(loadRegion);
  const [sort, setSort] = useState<Sort>(sortPref.load);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [wave, setWave] = useState<Wave | null>(null);
  const [nextAt, setNextAt] = useState(Infinity);
  const seen = useRef<Set<string>>(new Set());
  const tried = useRef<Set<string>>(new Set());
  const latest = useRef(0);

  useEffect(() => {
    window.radar
      .last()
      .then(
        (r) => setResult((cur) => cur ?? (r && { ...r, classifyError: null })),
        (e) => setError(failure(e)),
      )
      .finally(() => setLoaded(true));
    const offs = [
      followScans({ begin, finish, next: setNextAt }),
      window.radar.onStatus((s) => setLive((m) => ({ ...m, [s.source]: s }))),
      window.radar.onRows(setPartial),
      window.radar.onClassifying(setClassifying),
      window.radar.onTiers(setTiers),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (result) seen.current = keptKeys(result.rows);
  }, [result]);

  const pickHours = (h: Hours) => {
    setPicked(h);
    saveHours(h);
  };
  const pickRegion = (r: string) => {
    setChosen(r);
    saveRegion(r);
  };
  const pickSort = (s: Sort) => {
    setSort(s);
    sortPref.save(s);
  };

  const begin = (scan: boolean) => {
    setBusy(true);
    setScanning(scan);
    setError(null);
    setLive({});
    setPartial(null);
    setClassifying(null);
    setTiers(null);
    return ++latest.current;
  };

  const finish = (id: number, scan: boolean, next: RefreshResult | null, failed?: unknown) => {
    if (id !== latest.current) return;
    if (failed !== undefined) setError(failure(failed));
    else if (next) {
      setScanned((was) => was || scan);
      const added = [...keptKeys(next.rows)].filter((k) => !seen.current.has(k));
      setFresh(new Set(added));
      if (added.length) setWave({ id: next.at, count: added.length });
      setResult(next);
    }
    setBusy(false);
    setScanning(false);
    setPausing(false);
    setPartial(null);
    setClassifying(null);
    setTiers(null);
  };

  const run = async (scan: boolean) => {
    const id = begin(scan);
    try {
      finish(id, scan, await (scan ? window.radar.refresh(!!result?.resume) : window.radar.rescore()));
    } catch (e) {
      finish(id, scan, null, e);
    }
  };

  const onPause = () => {
    setPausing(true);
    window.radar.pause().catch((e) => setError(failure(e)));
  };

  const onReset = async () => {
    try {
      await window.radar.reset();
      setFresh(new Set());
      setResult(await window.radar.last());
    } catch (e) {
      setError(failure(e));
    }
  };

  useEffect(() => {
    if (busy || !loaded) return;
    const score = "score:" + result?.at;
    if (!result?.rows.some((r) => r.kept === null) || tried.current.has(score)) return;
    tried.current.add(score);
    run(false);
  }, [result, busy, loaded]);

  const statuses = scanning
    ? Object.values(live)
    : (result?.statuses ?? []).map((s) => (scanned || s.state !== "error" ? s : { ...s, state: "ok" as const }));
  const found = new Set(partial?.map((r) => r.key));
  const merged = busy && partial ? [...partial, ...(result?.rows ?? []).filter((r) => !found.has(r.key))] : (result?.rows ?? []);
  const regions = settings?.regions ?? [];
  const ids = regions.map((r) => r.id);
  const region = ids.includes(chosen) ? chosen : (ids[0] ?? "");
  const hours = picked ?? asHours(settings?.windowHours ?? 12);
  const rows = confirm(merged, linkedIn.verdicts).filter((r) => inWindow(r, r.effectiveAt, now, hoursMs(hours)));
  const { counts, pending, shown, filtered } = selectFeed(rows, ids, region, sort);

  return (
    <>
      <TopBar
        count={shown.length}
        hours={hours}
        onHours={pickHours}
        regions={regions}
        region={region}
        counts={counts}
        onSettings={() => setEditing(true)}
        onRegion={pickRegion}
        sort={sort}
        onSort={pickSort}
        stale={!!result && (result.window ?? 0) < FULL}
        statuses={statuses}
        busy={busy}
        error={error}
        classifyError={busy ? null : (result?.classifyError ?? null)}
        classifying={busy ? classifying : null}
        tiers={busy ? tiers : null}
        showFiltered={showFiltered}
        onShowFiltered={setShowFiltered}
        filteredCount={filtered.length}
        onRefresh={() => run(true)}
        lastAt={result?.at}
        nextAt={nextAt}
        resume={!!result?.resume}
        scanning={scanning}
        pausing={pausing}
        onPause={onPause}
        onReset={onReset}
        linkedIn={linkedIn}
      />
      {settings && (editing || !ready(settings)) ? (
        <Setup key={JSON.stringify(settings)} settings={settings} onSave={saveSettings} onClose={ready(settings) ? () => setEditing(false) : undefined} />
      ) : (
      <Feed
        jobs={shown}
        pending={pending}
        filtered={showFiltered ? filtered : []}
        now={now}
        fresh={fresh}
        busy={busy}
        never={!result && !busy}
      />
      )}
      {wave && <Celebrate key={wave.id} wave={wave} onDone={() => setWave(null)} />}
    </>
  );
}
