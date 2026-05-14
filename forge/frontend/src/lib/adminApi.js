import { supabase } from './supabase'

const API = import.meta.env.VITE_API_URL

async function adminRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${API}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed ${res.status}`)
  }
  return res.json()
}

export const adminApi = {
  getDashboard: () => adminRequest('/dashboard'),
  getFlagged: () => adminRequest('/flagged'),
  getFlaggedSession: (id) => adminRequest(`/flagged/${id}/session`),
  dismissFlag: (id) => adminRequest(`/flagged/${id}/dismiss`, { method: 'POST' }),
  deleteFlaggedIdea: (id) => adminRequest(`/flagged/${id}/delete-idea`, { method: 'POST' }),
  banUserViaFlag: (id) => adminRequest(`/flagged/${id}/ban-user`, { method: 'POST' }),
  getCosts: () => adminRequest('/costs'),
  generateSeed: (body) => adminRequest('/seed/generate', { method: 'POST', body: JSON.stringify(body) }),
  postSeedIdea: (body) => adminRequest('/seed/post', { method: 'POST', body: JSON.stringify(body) }),
  listUsers: (search = '') => adminRequest(`/users?search=${encodeURIComponent(search)}`),
  getUserDetail: (id) => adminRequest(`/users/${id}`),
  adjustCredits: (id, credits) => adminRequest(`/users/${id}/credits`, { method: 'POST', body: JSON.stringify({ credits }) }),
  changeTier: (id, tier) => adminRequest(`/users/${id}/tier`, { method: 'POST', body: JSON.stringify({ tier }) }),
  deleteUserIdea: (userId, ideaId) => adminRequest(`/users/${userId}/ideas/${ideaId}`, { method: 'DELETE' }),
  softDeleteUser: (id) => adminRequest(`/users/${id}/soft-delete`, { method: 'POST' }),
  unbanUser: (id) => adminRequest(`/users/${id}/unban`, { method: 'POST' }),
  hardDeleteUser: (id, confirm_username) => adminRequest(`/users/${id}/hard-delete`, { method: 'POST', body: JSON.stringify({ confirm_username }) }),
  getSettings: () => adminRequest('/settings'),
  setSettings: (body) => adminRequest('/settings', { method: 'POST', body: JSON.stringify(body) }),
  resetCosts: () => adminRequest('/costs/reset', { method: 'POST' }),
}
