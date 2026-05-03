// Tracks which garden the user is currently viewing. localStorage-backed —
// per-device, not synced. Cleared via the import / "switch garden" flows.

const KEY = 'peabrain.activeGardenId'

export function setActiveGardenId(id: string): void {
  try {
    window.localStorage.setItem(KEY, id)
  } catch {
    // Storage disabled / quota — non-fatal; the next session just starts fresh.
  }
}

export function getActiveGardenId(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearActiveGardenId(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
