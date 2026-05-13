import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request(method, path, body = null, requireAuth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (requireAuth) {
    const authHeaders = await getAuthHeader()
    Object.assign(headers, authHeaders)
  }

  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${API_URL}${path}`, opts)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }

  return res.json()
}

export const api = {
  // Feed & Ideas
  getFeed: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/ideas${qs ? '?' + qs : ''}`, null, false)
  },
  getIdea: (id) => request('GET', `/ideas/${id}`, null, false),
  sparkIdea: (id) => request('POST', `/ideas/${id}/spark`),
  getComments: (ideaId, page = 1) => request('GET', `/ideas/${ideaId}/comments?page=${page}`, null, false),
  postComment: (ideaId, content, parent_id = null) =>
    request('POST', `/ideas/${ideaId}/comments`, { content, parent_id }),

  // Forge
  startForge: (domain, genre, built_on_idea_id = null) =>
    request('POST', '/forge/start', { domain, genre, built_on_idea_id }),
  sendMessage: (session_id, message) =>
    request('POST', '/forge/message', { session_id, message }),
  streamMessage: async (session_id, message) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    return fetch(`${API_URL}/forge/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ session_id, message }),
    })
  },
  postIdea: (session_id, title, summary, tags) =>
    request('POST', '/forge/post', { session_id, title, summary, tags }),
  saveDraft: (session_id) =>
    request('POST', '/forge/save-draft', { session_id }),
  extendSession: (session_id) =>
    request('POST', '/forge/extend', { session_id }),
  getDrafts: () => request('GET', '/forge/drafts'),
  getSession: (id) => request('GET', `/forge/session/${id}`),

  // Users
  getProfile: (username) => request('GET', `/users/${username}`, null, false),
  getUserIdeas: (username, page = 1) => request('GET', `/users/${username}/ideas?page=${page}`, null, false),
  followUser: (username) => request('POST', `/users/${username}/follow`),
  updateProfile: (bio) => request('PATCH', '/users/me/profile', { bio }),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  markNotificationsRead: (ids) => request('POST', '/notifications/read', { ids }),

  // Ideas
  reportIdea: (ideaId, reason, reasonDetail) => request('POST', `/ideas/${ideaId}/report`, { reason, reason_detail: reasonDetail }),

  // Credits
  getCredits: () => request('GET', '/credits'),

  // Payments
  subscribe: (tier) => request('POST', '/payments/subscribe', { tier }),
  extendTurns: (session_id) => request('POST', '/payments/extend-turns', { session_id }),
  syncSubscription: () => request('POST', '/payments/sync'),
  syncTurns: (session_id, checkout_id) => request('POST', '/payments/sync-turns', { session_id, checkout_id }),
  cancelSubscription: () => request('DELETE', '/payments/subscription'),
}
