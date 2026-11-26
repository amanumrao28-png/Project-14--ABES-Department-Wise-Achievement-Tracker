import { apiRequest } from './httpClient.js';

export const insightsApi = {
  async getDepartmentInsights() {
    const res = await apiRequest('/insights/department');
    return res.data;
  },
  async getFacultyInsights() {
    const res = await apiRequest('/insights/faculty');
    return res.data;
  },
  async getStudentInsights() {
    const res = await apiRequest('/insights/student');
    return res.data;
  },
  async getCollegeInsights() {
    const res = await apiRequest('/insights/college');
    return res.data;
  }
};
