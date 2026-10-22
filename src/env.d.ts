import type { RadarApi } from "../electron/preload";

declare global {
  interface Window {
    radar: RadarApi;
  }
}
