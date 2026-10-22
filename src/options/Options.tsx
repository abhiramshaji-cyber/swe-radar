import { Settings2, SlidersHorizontal } from "lucide-react";
import { KeyForm } from "./KeyForm";
import { Profile } from "./Profile";
import { Spend } from "./Spend";
import "./options.css";

export function Options({ busy, onSettings }: { busy: boolean; onSettings: () => void }) {
  return (
    <>
      <button
        className="icon-btn options-btn"
        popoverTarget="options-pop"
        aria-label="Options"
        data-tip="Options"
      >
        <Settings2 size={21} />
      </button>
      <div id="options-pop" popover="auto" className="pop options-pop">
        <section className="opt">
          <button
            type="button"
            className="pill opt-search"
            popoverTarget="options-pop"
            popoverTargetAction="hide"
            onClick={onSettings}
          >
            <SlidersHorizontal size={17} /> Search settings
          </button>
        </section>
        <Profile />
        <KeyForm />
        <Spend busy={busy} />
      </div>
    </>
  );
}
