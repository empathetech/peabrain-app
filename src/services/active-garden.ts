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

// Wipe everything peabrain has stored in this browser: the active-garden
// pointer, the Dexie database, and the onboarding-draft sessionStorage.
// The Settings page (V1) will host the polished version of this.
export async function resetAllUserData(): Promise<void> {
  try {
    window.localStorage.removeItem(KEY)
    window.sessionStorage.removeItem('peabrain.onboarding-draft')
  } catch {
    // ignore
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('peabrain')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
