import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  isLoading: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  updateUser: (user: Partial<AuthUser>) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'kgt-auth',
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
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
