const BASE = import.meta.env.VITE_API_BASE || '/api';
const API = BASE;

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
};

export const assessmentApi = (token) => ({
  questions: () => api('/assessment/questions', { token }),
  submit: (answers) => api('/assessment/submit', { method: 'POST', body: { answers }, token }),
  mine: () => api('/assessment/my', { token }),
});

export const scheduleApi = (token) => ({
  mine: () => api('/schedules/mine', { token }),
  all: () => api('/schedules', { token }),
  create: (s) => api('/schedules', { method: 'POST', body: s, token }),
  update: (id, s) => api(`/schedules/${id}`, { method: 'PATCH', body: s, token }),
  remove: (id) => api(`/schedules/${id}`, { method: 'DELETE', token }),
});

export const adminApi = (token) => ({
  stats: () => api('/admin/stats', { token }),
  users: () => api('/admin/users', { token }),
  setRole: (id, role) => api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role }, token }),
});

export const aiApi = (token) => ({
  chat: (messages) => api('/ai/chat', { method: 'POST', body: { messages }, token }),
  status: () => api('/ai/status', { token }),
});

export async function downloadSource(token) {
  const res = await fetch(BASE + '/download/source', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'balanga-kalinga-source.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}