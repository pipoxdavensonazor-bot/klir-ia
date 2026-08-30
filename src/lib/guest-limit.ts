/** Invité : 3 recherches gratuites, puis compte obligatoire. */
export const GUEST_SEARCH_LIMIT = 3;
export const GUEST_SEARCH_STORAGE_KEY = "klir_guest_searches";

export function readGuestSearchCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(GUEST_SEARCH_STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeGuestSearchCount(n: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_SEARCH_STORAGE_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    // private mode
  }
}

export function incrementGuestSearchCount(): number {
  const next = readGuestSearchCount() + 1;
  writeGuestSearchCount(next);
  return next;
}

export function clearGuestSearchCount(): void {
  writeGuestSearchCount(0);
}
