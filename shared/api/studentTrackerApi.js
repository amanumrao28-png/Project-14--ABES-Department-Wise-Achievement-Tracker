import { apiRequest, downloadProtectedFile } from './httpClient.js';

export const studentTrackerApi = {
  async listCategories() {
    const res = await apiRequest('/student-achievements/categories');
    return res.data;
  },

  async getAnalytics(params = {}) {
    const res = await apiRequest('/student-achievements/analytics', { query: params });
    return res.data;
  },

  async list(params = {}) {
    return apiRequest('/student-achievements', { query: params });
  },

  async getPortfolio(params = {}) {
    const res = await apiRequest('/student-achievements/portfolio', { query: params });
    return res.data;
  },

  async getById(id) {
    const res = await apiRequest(`/student-achievements/${id}`);
    return res.data;
  },

  async create(payload) {
    const res = await apiRequest('/student-achievements', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async update(id, payload) {
    const res = await apiRequest(`/student-achievements/${id}`, {
      method: 'PATCH',
      body: payload
    });
    return res.data;
  },

  async remove(id) {
    const res = await apiRequest(`/student-achievements/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async submit(id) {
    const res = await apiRequest(`/student-achievements/${id}/submit`, {
      method: 'POST'
    });
    return res.data;
  },

  async review(id, payload) {
    const res = await apiRequest(`/student-achievements/${id}/review`, {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async uploadDocument(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiRequest(`/student-achievements/${id}/documents`, {
      method: 'POST',
      body: formData
    });
    return res.data;
  },

  async downloadDocument(id, docId, filename) {
    return downloadProtectedFile(
      `/student-achievements/${id}/documents/${docId}/download`,
      filename
    );
  },

  async deleteDocument(id, docId) {
    const res = await apiRequest(`/student-achievements/${id}/documents/${docId}`, {
      method: 'DELETE'
    });
    return res.data;
  }
};
