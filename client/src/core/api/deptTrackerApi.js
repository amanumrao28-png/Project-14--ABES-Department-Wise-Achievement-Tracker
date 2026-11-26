import { apiRequest, downloadProtectedFile } from './httpClient.js';

export const deptTrackerApi = {
  async listCategories() {
    const res = await apiRequest('/department-achievements/categories');
    return res.data;
  },

  async getAnalytics(params = {}) {
    const res = await apiRequest('/department-achievements/analytics', { query: params });
    return res.data;
  },

  async list(params = {}) {
    return apiRequest('/department-achievements', { query: params });
  },

  async getById(id) {
    const res = await apiRequest(`/department-achievements/${id}`);
    return res.data;
  },

  async create(payload) {
    const res = await apiRequest('/department-achievements', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async update(id, payload) {
    const res = await apiRequest(`/department-achievements/${id}`, {
      method: 'PATCH',
      body: payload
    });
    return res.data;
  },

  async remove(id) {
    const res = await apiRequest(`/department-achievements/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async submit(id) {
    const res = await apiRequest(`/department-achievements/${id}/submit`, {
      method: 'POST'
    });
    return res.data;
  },

  async review(id, payload) {
    const res = await apiRequest(`/department-achievements/${id}/review`, {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async uploadDocument(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiRequest(`/department-achievements/${id}/documents`, {
      method: 'POST',
      body: formData
    });
    return res.data;
  },

  async downloadDocument(id, docId, filename) {
    return downloadProtectedFile(
      `/department-achievements/${id}/documents/${docId}/download`,
      filename
    );
  },

  async deleteDocument(id, docId) {
    const res = await apiRequest(`/department-achievements/${id}/documents/${docId}`, {
      method: 'DELETE'
    });
    return res.data;
  }
};
