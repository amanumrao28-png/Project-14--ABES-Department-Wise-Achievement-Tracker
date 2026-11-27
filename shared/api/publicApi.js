import { apiRequest } from './httpClient.js';

export const publicApi = {
  async getShowcase() {
    const res = await apiRequest('/public/showcase', { skipAuth: true });
    return res.data;
  }
};
