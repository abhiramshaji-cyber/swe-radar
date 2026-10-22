export function remember<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const load = (): T => {
    try {
      return allowed.find((v) => v === localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const save = (v: T) => {
    try {
      localStorage.setItem(key, v);
    } catch {
      return;
    }
  };
  return { load, save };
}
