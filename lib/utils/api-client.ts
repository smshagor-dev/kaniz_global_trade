import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

function emitLoadingEvent(type: 'request-start' | 'request-end' | 'pulse') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('kgt:loading', { detail: { type } }))
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor — attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  emitLoadingEvent('request-start')
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401 and refresh
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => {
    emitLoadingEvent('request-end')
    return res
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      emitLoadingEvent('request-end')

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const rememberMe = useAuthStore.getState().rememberMe
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post('/api/auth/refresh', { refreshToken, rememberMe })
        const { accessToken, refreshToken: newRefresh } = data.data

        useAuthStore.getState().setTokens(accessToken, newRefresh)
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`

        refreshQueue.forEach((cb) => cb(accessToken))
        refreshQueue = []

        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    emitLoadingEvent('request-end')
    return Promise.reject(error)
  }
)

export default api

// ── Typed helpers ──────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const { data } = await api.get<ApiResponse<T>>(url, { params })
  return data
}

export async function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.post<ApiResponse<T>>(url, body)
  return data
}

export async function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.put<ApiResponse<T>>(url, body)
  return data
}

export async function patch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.patch<ApiResponse<T>>(url, body)
  return data
}

export async function del<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await api.delete<ApiResponse<T>>(url, { data: body })
  return data
}
