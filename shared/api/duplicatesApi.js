import { apiRequest } from './httpClient.js';

export const duplicatesApi = {
  async check(payload) {
    const res = await apiRequest('/duplicates/check', {
      method: 'POST',
      body: payload
    });
    return res.data;
  }
};
