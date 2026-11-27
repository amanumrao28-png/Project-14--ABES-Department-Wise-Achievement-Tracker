import { apiRequest } from './httpClient.js';

export const departmentsApi = {
  async listDepartments(params = {}) {
    const res = await apiRequest('/departments', { query: params });
    return res.data;
  },

  async createDepartment(payload) {
    const res = await apiRequest('/departments', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async updateDepartment(id, payload) {
    const res = await apiRequest(`/departments/${id}`, {
      method: 'PATCH',
      body: payload
    });
    return res.data;
  }
};
