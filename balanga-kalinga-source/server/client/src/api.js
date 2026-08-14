const API = '/api';

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', body }),
  register: (body) => api('/auth/register', { method: 'POST', body }),
  forgotPassword: (email) => api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => api('/auth/reset-password', { method: 'POST', body: { token, password } }),
  me: (token) => api('/auth/me', { token }),
  updateMe: (token, body) => api('/auth/me', { method: 'PATCH', body, token }),
  changePassword: (token, body) => api('/auth/change-password', { method: 'POST', body, token }),
  deleteData: (token) => api('/auth/me/data', { method: 'DELETE', token }),
  deleteAccount: (token) => api('/auth/me/account', { method: 'DELETE', token }),
};

export const assessmentApi = (token) => ({
  questions: () => api('/assessment/questions', { token }),
  submit: (answers) => api('/assessment/submit', { method: 'POST', body: { answers }, token }),
  mine: () => api('/assessment/my', { token }),
  moods: () => api('/assessment/moods', { token }),
  logMood: (mood, note) => api('/assessment/moods', { method: 'POST', body: { mood, note }, token }),
  recommendations: () => api('/assessment/recommendations', { token }),
});

export const journalApi = (token) => ({
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.q) q.set('q', params.q);
    if (params.tag) q.set('tag', params.tag);
    return api('/journal?' + q.toString(), { token });
  },
  calendar: () => api('/journal/calendar', { token }),
  create: (entry) => api('/journal', { method: 'POST', body: entry, token }),
  update: (id, entry) => api(`/journal/${id}`, { method: 'PATCH', body: entry, token }),
  remove: (id) => api(`/journal/${id}`, { method: 'DELETE', token }),
  reflect: () => api('/journal/reflect', { method: 'POST', body: {}, token }),
});

export const selfcareApi = (token) => ({
  list: () => api('/selfcare', { token }),
  logs: () => api('/selfcare/logs', { token }),
  complete: (id) => api(`/selfcare/${id}/complete`, { method: 'POST', body: {}, token }),
});

export const progressApi = (token) => ({
  overview: () => api('/progress/overview', { token }),
});

export const counselingApi = (token) => ({
  counselors: () => api('/counseling/counselors', { token }),
  mine: () => api('/counseling/appointments/mine', { token }),
  request: (body) => api('/counseling/appointments', { method: 'POST', body, token }),
  cancel: (id) => api(`/counseling/appointments/${id}/cancel`, { method: 'PATCH', body: {}, token }),
  reschedule: (id, body) => api(`/counseling/appointments/${id}/reschedule`, { method: 'PATCH', body, token }),
});

export const notificationApi = (token) => ({
  list: () => api('/notifications', { token }),
  markRead: (id) => api(`/notifications/${id}/read`, { method: 'PATCH', body: {}, token }),
  readAll: () => api('/notifications/read-all', { method: 'PATCH', body: {}, token }),
});

export const adminApi = (token) => ({
  overview: () => api('/admin/overview', { token }),
  students: () => api('/admin/students', { token }),
  counselors: () => api('/admin/counselors', { token }),
  createCounselor: (body) => api('/admin/counselors', { method: 'POST', body, token }),
  updateCounselor: (id, body) => api(`/admin/counselors/${id}`, { method: 'PATCH', body, token }),
  removeCounselor: (id) => api(`/admin/counselors/${id}`, { method: 'DELETE', token }),
  appointments: () => api('/admin/appointments', { token }),
  updateAppointment: (id, body) => api(`/admin/appointments/${id}`, { method: 'PATCH', body, token }),
});

export const aiApi = (token) => ({
  chat: (messages, conversation_id = null) =>
    api('/ai/chat', { method: 'POST', body: { messages, conversation_id }, token }),
  status: () => api('/ai/status', { token }),
  conversations: () => api('/ai/conversations', { token }),
  conversation: (id) => api(`/ai/conversations/${id}`, { token }),
  removeConversation: (id) => api(`/ai/conversations/${id}`, { method: 'DELETE', token }),
});

export const emergencyApi = () => ({
  resources: () => api('/emergency/resources'),
});