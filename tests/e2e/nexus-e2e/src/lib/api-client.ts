// Typed API client for Nexus backend
// Backend URL: http://localhost:3001 (dev) | https://api.nexus.example.com (prod)

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })

  if (!res.ok) {
    let errorBody: any = {}
    try { errorBody = await res.json() } catch {}
    throw new ApiError(res.status, errorBody.error?.code ?? 'UNKNOWN', errorBody.error?.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name?: string }) =>
    apiFetch<{ token: string; user: any }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ── Content ────────────────────────────────────────────────────────────
export const contentApi = {
  list: (params?: Record<string, string>, token?: string) =>
    apiFetch<any>(`/api/v1/content?${new URLSearchParams(params).toString()}`, { token }),

  get: (id: string, token?: string) =>
    apiFetch<any>(`/api/v1/content/${id}`, { token }),

  update: (id: string, data: any, token?: string) =>
    apiFetch<any>(`/api/v1/content/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token?: string) =>
    apiFetch<any>(`/api/v1/content/${id}`, { method: 'DELETE', token }),
}

// ── Editorial ─────────────────────────────────────────────────────────
export const editorialApi = {
  queue: (params?: Record<string, string>, token?: string) =>
    apiFetch<any>(`/api/v1/editorial/queue?${new URLSearchParams(params).toString()}`, { token }),

  review: (id: string, decision: 'approve' | 'reject', notes?: string, token?: string) =>
    apiFetch<any>(`/api/v1/editorial/review/${id}`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
      token,
    }),
}

// ── Publishing ────────────────────────────────────────────────────────
export const publishingApi = {
  list: (params?: Record<string, string>, token?: string) =>
    apiFetch<any>(`/api/v1/publishing?${new URLSearchParams(params).toString()}`, { token }),

  publish: (contentId: string, channelIds: string[], token?: string) =>
    apiFetch<any>('/api/v1/publishing/publish', {
      method: 'POST',
      body: JSON.stringify({ contentId, channelIds }),
      token,
    }),
}

// ── Analytics ─────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: (token?: string) => apiFetch<any>('/api/v1/analytics/dashboard', { token }),
  events: (params?: Record<string, string>, token?: string) =>
    apiFetch<any>(`/api/v1/analytics/events?${new URLSearchParams(params).toString()}`, { token }),
}

// ── Sources ───────────────────────────────────────────────────────────
export const sourcesApi = {
  list: (token?: string) => apiFetch<any>('/api/v1/sources', { token }),
  create: (data: any, token?: string) =>
    apiFetch<any>('/api/v1/sources', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: any, token?: string) =>
    apiFetch<any>(`/api/v1/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (id: string, token?: string) =>
    apiFetch<any>(`/api/v1/sources/${id}`, { method: 'DELETE', token }),
}

// ── Users ─────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>, token?: string) =>
    apiFetch<any>(`/api/v1/users?${new URLSearchParams(params).toString()}`, { token }),
  getMe: (token?: string) => apiFetch<any>('/api/v1/users/me', { token }),
  updateRole: (userId: string, roleId: string, token?: string) =>
    apiFetch<any>(`/api/v1/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ roleId }),
      token,
    }),
  apiKeys: {
    list: (token?: string) => apiFetch<any>('/api/v1/users/api-keys', { token }),
    create: (data: any, token?: string) =>
      apiFetch<any>('/api/v1/users/api-keys', { method: 'POST', body: JSON.stringify(data), token }),
    revoke: (id: string, token?: string) =>
      apiFetch<any>(`/api/v1/users/api-keys/${id}`, { method: 'DELETE', token }),
  },
}

// ── Notifications ─────────────────────────────────────────────────────
export const notificationsApi = {
  list: (token?: string) => apiFetch<any>('/api/v1/notifications', { token }),
  preferences: {
    get: (token?: string) => apiFetch<any>('/api/v1/notifications/preferences', { token }),
    update: (data: any, token?: string) =>
      apiFetch<any>('/api/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),
  },
}

// ── Settings ──────────────────────────────────────────────────────────
export const settingsApi = {
  get: (token?: string) => apiFetch<any>('/api/v1/settings', { token }),
  update: (data: any, token?: string) =>
    apiFetch<any>('/api/v1/settings', { method: 'PATCH', body: JSON.stringify(data), token }),
  rules: {
    list: (token?: string) => apiFetch<any>('/api/v1/settings/rules', { token }),
    create: (data: any, token?: string) =>
      apiFetch<any>('/api/v1/settings/rules', { method: 'POST', body: JSON.stringify(data), token }),
    update: (id: string, data: any, token?: string) =>
      apiFetch<any>(`/api/v1/settings/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
    delete: (id: string, token?: string) =>
      apiFetch<any>(`/api/v1/settings/rules/${id}`, { method: 'DELETE', token }),
  },
}

export { ApiError }
