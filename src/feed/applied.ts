import { useEffect, useState } from "react";

export function useApplied() {
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const reload = () => window.radar.applied().then((keys) => setApplied(new Set(keys)), () => {});

  useEffect(() => void reload(), []);

  const toggle = (key: string) => {
    const on = !applied.has(key);
    setApplied((s) => {
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    window.radar.setApplied(key, on).catch(reload);
  };

  return [applied, toggle] as const;
}
