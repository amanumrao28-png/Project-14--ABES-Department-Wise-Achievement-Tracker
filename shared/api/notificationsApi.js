import { apiRequest } from './httpClient.js';

export const notificationsApi = {
  async list(limit = 20) {
    const res = await apiRequest('/notifications', { query: { limit } });
    return res.data;
  },

  async markRead(id) {
    const res = await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    return res.data;
  },

  async markAllRead() {
    const res = await apiRequest('/notifications/read-all', { method: 'POST' });
    return res.data;
  },

  async remove(id) {
    const res = await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
    return res.data;
  },

  async clearAll() {
    const res = await apiRequest('/notifications', { method: 'DELETE' });
    return res.data;
  }
};
