import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";

const DISARM = 3000;

export function Reset({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), DISARM);
    return () => clearTimeout(t);
  }, [armed]);

  const click = () => {
    setArmed(!armed);
    if (armed) onReset();
  };

  return (
    <button
      className="icon-btn reset-btn"
      data-armed={armed || undefined}
      aria-label={armed ? "Confirm clear" : "Clear"}
      data-tip={armed ? "Sure?" : "Clear"}
      onClick={click}
    >
      {armed ? <Check size={20} strokeWidth={2.6} /> : <Trash2 size={20} />}
    </button>
  );
}
