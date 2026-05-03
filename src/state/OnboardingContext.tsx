// Carries the in-progress Location and Garden draft across the onboarding
// routes. Backed by sessionStorage so a refresh mid-flow doesn't lose the
// resolved location.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Location } from '../db/types'

type Draft = {
  location?: Location
}

type Ctx = {
  draft: Draft
  setLocation: (location: Location) => void
  reset: () => void
}

const OnboardingContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'peabrain.onboarding-draft'

function readInitial(): Draft {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Draft
  } catch {
    return {}
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(readInitial)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Quota or disabled storage — fall back to in-memory only.
    }
  }, [draft])

  const setLocation = useCallback((location: Location) => {
    setDraft((d) => ({ ...d, location }))
  }, [])

  const reset = useCallback(() => {
    setDraft({})
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<Ctx>(
    () => ({ draft, setLocation, reset }),
    [draft, setLocation, reset],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding(): Ctx {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return ctx
}
