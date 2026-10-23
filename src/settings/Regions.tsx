import { Plus, X } from "lucide-react";
import type { Region } from "../../core/settings";

type Props = { regions: Region[]; onChange: (regions: Region[]) => void };

const BLANK: Region = {
  id: "",
  label: "",
  description: "",
  linkedinLocation: "",
};

export function Regions({ regions, onChange }: Props) {
  const set = (i: number, patch: Partial<Region>) =>
    onChange(regions.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="set-regions">
      {regions.map((r, i) => (
        <fieldset key={i} className="set-region">
          <div className="opt-row">
            <input
              value={r.label}
              placeholder="Name, e.g. Springfield"
              aria-label="Region name"
              onChange={(e) => set(i, { label: e.target.value })}
            />
            <input
              value={r.linkedinLocation ?? ""}
              placeholder="LinkedIn location"
              aria-label="LinkedIn search location"
              onChange={(e) => set(i, { linkedinLocation: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={!!r.linkedinRemoteOnly}
                onChange={(e) => set(i, { linkedinRemoteOnly: e.target.checked })}
              />
              Remote only
            </label>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove region"
              onClick={() => onChange(regions.filter((_, j) => j !== i))}
            >
              <X size={18} />
            </button>
          </div>
          <textarea
            value={r.description}
            rows={2}
            placeholder="Which jobs count, e.g. onsite or hybrid in the Springfield metro area, or fully remote open to my country"
            aria-label="Region description"
            onChange={(e) => set(i, { description: e.target.value })}
          />
        </fieldset>
      ))}
      <button
        type="button"
        className="pill set-add"
        onClick={() => onChange([...regions, { ...BLANK }])}
      >
        <Plus size={17} /> Region
      </button>
    </div>
  );
}
