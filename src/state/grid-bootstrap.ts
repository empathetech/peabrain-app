// Triggers background hydration of the Köppen and frost-date grids on app
// boot. Idempotent — safe to call repeatedly. Failures are swallowed; the
// next user-driven lookup retries naturally.

import { ensureFrostLoaded } from '../db/frost'
import { ensureKoppenLoaded } from '../db/koppen'

let started = false

export function bootstrapGrids(): void {
  if (started) return
  started = true
  void ensureKoppenLoaded().catch(() => {
    // The next lookup will retry. Reset the latch so we don't permanently
    // skip a re-hydration attempt after the first failure.
    started = false
  })
  void ensureFrostLoaded().catch(() => {
    started = false
  })
}
