const KEY = "radar.region";

export function loadRegion() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveRegion(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    return;
  }
}
