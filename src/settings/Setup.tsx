import { useState, type FormEvent } from "react";
import { Radar, X } from "lucide-react";
import { type Provider, type Settings, ready } from "../../core/settings";
import { WINDOW_HOURS } from "../../core/time";
import { SENIORITIES } from "../../core/types";
import { failure } from "../lib/format";
import { hoursLabel } from "../lib/window";
import { Chips, Field } from "./Controls";
import { Regions } from "./Regions";
import "./settings.css";

type Props = {
  settings: Settings;
  onSave: (s: Settings) => Promise<void>;
  onClose?: () => void;
};

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "codex", label: "Codex" },
  { value: "claude", label: "Claude Code" },
];

const LEVELS = SENIORITIES.filter((s) => s !== "unknown").map((s) => ({ value: s as string, label: s.replace("_plus", "+") }));

const WINDOWS = WINDOW_HOURS.map((h) => ({ value: h as number, label: hoursLabel(h) }));

const list = (text: string) =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export function Setup({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(settings);
  const [terms, setTerms] = useState(settings.searchTerms.join(", "));
  const [languages, setLanguages] = useState(
    settings.requiredLanguagesToExclude.join(", "),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Settings>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const toggle = (level: string) =>
    set({
      excludeSeniorities: draft.excludeSeniorities.includes(level)
        ? draft.excludeSeniorities.filter((s) => s !== level)
        : [...draft.excludeSeniorities, level],
    });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave({
        ...draft,
        searchTerms: list(terms),
        requiredLanguagesToExclude: list(languages),
      });
      onClose?.();
    } catch (err) {
      setError(failure(err));
    }
  };

  return (
    <form className="setup opt" onSubmit={onSubmit}>
      <h3>
        <Radar size={20} />{" "}
        {ready(settings) ? "Search settings" : "Set up your radar"}
        {onClose && (
          <button
            type="button"
            className="icon-btn set-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </h3>

      <div className="set-grid">
        <Field label="Work country">
          <input
            value={draft.workCountry}
            placeholder="e.g. Germany"
            onChange={(e) => set({ workCountry: e.target.value })}
          />
        </Field>
        <Field label="Skip jobs that hire only in">
          <input
            value={draft.excludeCountryOnly ?? ""}
            placeholder="optional, e.g. United States"
            onChange={(e) => set({ excludeCountryOnly: e.target.value })}
          />
        </Field>
        <Field label="Search terms">
          <input value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
        <Field label="Skip jobs requiring">
          <input
            value={languages}
            placeholder="languages, e.g. Japanese"
            onChange={(e) => setLanguages(e.target.value)}
          />
        </Field>
        <Field label="Max years required">
          <input
            type="number"
            min={0}
            max={15}
            value={draft.maxYears}
            onChange={(e) => set({ maxYears: Number(e.target.value) })}
          />
        </Field>
        <Field label="Currency and pay floor">
          <div className="opt-row">
            <input
              className="set-currency"
              value={draft.currency}
              maxLength={3}
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
            />
            <input
              type="number"
              min={0}
              step={1000}
              value={draft.payFloor}
              onChange={(e) => set({ payFloor: Number(e.target.value) })}
            />
          </div>
        </Field>
      </div>

      <Field label="Regions">
        <Regions
          regions={draft.regions}
          onChange={(regions) => set({ regions })}
        />
      </Field>

      <Field label="Skip seniority">
        <Chips options={LEVELS} on={(v) => draft.excludeSeniorities.includes(v)} onToggle={toggle} />
      </Field>

      <div className="set-grid">
        <Field label="AI for answers and documents">
          <Chips options={PROVIDERS} on={(v) => draft.provider === v} onToggle={(provider) => set({ provider })} />
        </Field>
        <Field label="Default window">
          <Chips options={WINDOWS} on={(v) => draft.windowHours === v} onToggle={(windowHours) => set({ windowHours })} />
        </Field>
      </div>

      <Field label="Role scope">
        <textarea
          rows={3}
          value={draft.roleScope}
          onChange={(e) => set({ roleScope: e.target.value })}
        />
      </Field>

      <div className="opt-row">
        {error && <p className="opt-error">{error}</p>}
        <button type="submit" className="pill set-save">
          Save
        </button>
      </div>
    </form>
  );
}
