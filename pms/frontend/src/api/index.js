// src/api/index.js
// Axios instance: baseURL, auth header injection, global error normalisation.

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/* ── Request interceptor: inject JWT ─────────────────────────── */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

/* ── Response interceptor: normalise errors ──────────────────── */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired or invalid — clear storage & redirect
      const code = err.response.data?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID' || code === 'ACCOUNT_INACTIVE') {
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user');
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

/* ── Typed API helpers ────────────────────────────────────────── */

// Auth
export const authApi = {
  register:       (data)        => api.post('/auth/register', data),
  login:          (data)        => api.post('/auth/login', data),
  getMe:          ()            => api.get('/auth/me'),
  updateProfile:  (data)        => api.put('/auth/profile', data),
  changePassword: (data)        => api.put('/auth/change-password', data),
  getUsers:       (search = '') => api.get('/auth/users', { params: { search } }),
};

// Dashboard
export const dashboardApi = {
  getStats:             () => api.get('/dashboard/stats'),
  getProjectOverview:   () => api.get('/dashboard/project-overview'),
  getTaskSummary:       () => api.get('/dashboard/task-summary'),
  getRecentActivity:    (limit = 20) => api.get('/dashboard/recent-activity', { params: { limit } }),
  getUpcomingDeadlines: (days = 7)   => api.get('/dashboard/upcoming-deadlines', { params: { days } }),
};

// Projects
export const projectsApi = {
  getAll:           (params)      => api.get('/projects', { params }),
  getById:          (id)          => api.get(`/projects/${id}`),
  create:           (data)        => api.post('/projects', data),
  update:           (id, data)    => api.put(`/projects/${id}`, data),
  delete:           (id)          => api.delete(`/projects/${id}`),
  getMilestones:    (id)          => api.get(`/projects/${id}/milestones`),
  createMilestone:  (id, data)    => api.post(`/projects/${id}/milestones`, data),
  updateMilestone:  (id, mid, d)  => api.put(`/projects/${id}/milestones/${mid}`, d),
  deleteMilestone:  (id, mid)     => api.delete(`/projects/${id}/milestones/${mid}`),
  getActivity:      (id, limit)   => api.get(`/projects/${id}/activity`, { params: { limit } }),
  getMembers:       (id)          => api.get(`/projects/${id}/members`),
  addMember:        (id, data)    => api.post(`/projects/${id}/members`, data),
  updateMemberRole: (id, uid, d)  => api.put(`/projects/${id}/members/${uid}`, d),
  removeMember:     (id, uid)     => api.delete(`/projects/${id}/members/${uid}`),
};

// Tasks
export const tasksApi = {
  getByProject:   (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  create:         (projectId, data)   => api.post(`/projects/${projectId}/tasks`, data),
  getById:        (id)                => api.get(`/tasks/${id}`),
  update:         (id, data)          => api.put(`/tasks/${id}`, data),
  updateStatus:   (id, status, sortOrder) => api.patch(`/tasks/${id}/status`, { status, sortOrder }),
  delete:         (id)                => api.delete(`/tasks/${id}`),
  getMyTasks:     (params)            => api.get('/tasks/my-tasks', { params }),
  addComment:     (id, content)       => api.post(`/tasks/${id}/comments`, { content }),
  updateComment:  (id, cid, content)  => api.put(`/tasks/${id}/comments/${cid}`, { content }),
  deleteComment:  (id, cid)           => api.delete(`/tasks/${id}/comments/${cid}`),
};

// Notifications
export const notificationsApi = {
  getAll:      (params)  => api.get('/notifications', { params }),
  markRead:    (id)      => api.patch(`/notifications/${id}/read`),
  markAllRead: ()        => api.patch('/notifications/read-all'),
};
