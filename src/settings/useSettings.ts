import { useEffect, useState } from "react";
import type { Settings } from "../../core/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    window.radar.settings().then(setSettings, () => {});
    return window.radar.onSettings(setSettings);
  }, []);
  const save = async (next: Settings) => setSettings(await window.radar.setSettings(next));
  return [settings, save] as const;
}
