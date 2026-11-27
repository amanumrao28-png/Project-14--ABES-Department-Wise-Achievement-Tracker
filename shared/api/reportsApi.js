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

export const reportsApi = {
  async getDepartmentReport(params = {}) {
    const res = await apiRequest(`/reports/department${buildQuery(params)}`);
    return res.data;
  },
  async getFacultyReport(params = {}) {
    const res = await apiRequest(`/reports/faculty${buildQuery(params)}`);
    return res.data;
  },
  async getStudentReport(params = {}) {
    const res = await apiRequest(`/reports/student${buildQuery(params)}`);
    return res.data;
  },
  async getCollegeConsolidatedReport(params = {}) {
    const res = await apiRequest(`/reports/college-consolidated${buildQuery(params)}`);
    return res.data;
  }
};
