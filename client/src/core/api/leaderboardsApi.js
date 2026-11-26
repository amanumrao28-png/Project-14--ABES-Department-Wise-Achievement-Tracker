import { apiRequest } from './httpClient.js';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      qs.set(k, String(v));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const leaderboardsApi = {
  async getDepartments(params = {}) {
    const res = await apiRequest(`/leaderboards/departments${buildQuery(params)}`);
    return res.data;
  },
  async getFaculty(params = {}) {
    const res = await apiRequest(`/leaderboards/faculty${buildQuery(params)}`);
    return res.data;
  },
  async getStudents(params = {}) {
    const res = await apiRequest(`/leaderboards/students${buildQuery(params)}`);
    return res.data;
  }
};
