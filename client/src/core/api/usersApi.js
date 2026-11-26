import { apiRequest } from './httpClient.js';

export const usersApi = {
  async listUsers(params = {}) {
    return apiRequest('/users', { query: params });
  },

  async getUserById(id) {
    const res = await apiRequest(`/users/${id}`);
    return res.data;
  },

  async createUser(payload) {
    const res = await apiRequest('/users', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async updateUser(id, payload) {
    const res = await apiRequest(`/users/${id}`, {
      method: 'PATCH',
      body: payload
    });
    return res.data;
  },

  async deactivateUser(id) {
    const res = await apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async resetUserAccess(id, payload) {
    const res = await apiRequest(`/users/${id}/reset-access`, {
      method: 'POST',
      body: payload
    });
    return res.data;
  }
};
