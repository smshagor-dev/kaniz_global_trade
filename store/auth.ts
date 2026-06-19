import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string | null
  roles: string[]
  emailVerified?: string | null
  status: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  rememberMe: boolean
  isLoading: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  updateUser: (user: Partial<AuthUser>) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setRememberMe: (rememberMe: boolean) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

type PersistedAuthState = Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'rememberMe'>

const authStorage: PersistStorage<PersistedAuthState> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(name) || window.localStorage.getItem(name)
    if (!raw) return null
    return JSON.parse(raw) as StorageValue<PersistedAuthState>
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return

    const shouldRemember = value.state?.rememberMe ?? false
    const target = shouldRemember ? window.localStorage : window.sessionStorage
    const other = shouldRemember ? window.sessionStorage : window.localStorage

    target.setItem(name, JSON.stringify(value))
    other.removeItem(name)
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
    window.sessionStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      rememberMe: true,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setRememberMe: (rememberMe) =>
        set({ rememberMe }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'kgt-auth',
      storage: authStorage,
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        rememberMe:   state.rememberMe,
      }),
    }
  )
)

// Helpers
export const useIsAuthenticated = () => useAuthStore((s) => !!s.user)
export const useCurrentUser      = () => useAuthStore((s) => s.user)
export const useAccessToken      = () => useAuthStore((s) => s.accessToken)

export const useHasRole = (role: string) =>
  useAuthStore((s) => s.user?.roles.includes(role) ?? false)

export const useIsAdmin = () =>
  useAuthStore((s) =>
    s.user?.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r)) ?? false
  )

export const useIsSupplier = () =>
  useAuthStore((s) =>
    s.user?.roles.some((r) => ['SUPPLIER_OWNER', 'SUPPLIER_STAFF'].includes(r)) ?? false
  )

export const useIsBuyer = () =>
  useAuthStore((s) => s.user?.roles.includes('BUYER') ?? false)
