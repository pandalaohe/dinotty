import { isTauri, tauriInvoke } from './useTransport'

let cached = ''
let inflight: Promise<string> | null = null

export function getAuthToken(): string {
  return document.querySelector('meta[name="auth-token"]')?.getAttribute('content') || ''
}

export async function getApiBase(): Promise<string> {
  if (!isTauri()) {
    cached = ''
    return ''
  }
  if (cached) return cached
  if (!inflight) {
    inflight = tauriInvoke('embedded_http_origin')
      .then((o) => {
        const s = String(o).replace(/\/$/, '')
        cached = s
        return s
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return cached ? `${cached}${p}` : p
}

export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}

export function wsUrlWithToken(url: string): string {
  const token = getAuthToken()
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}
