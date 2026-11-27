import { apiRequest } from './httpClient.js';

export const authApi = {
  async login(email, password, portal = undefined) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password, ...(portal ? { portal } : {}) },
      skipAuth: true
    });
    return res.data;
  },

  async logout(refreshToken) {
    const res = await apiRequest('/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {}
    });
    return res.data;
  },

  async getMe() {
    const res = await apiRequest('/auth/me');
    return res.data;
  },

  async changePassword(currentPassword, newPassword) {
    const res = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
    return res.data;
  },

  async forgotPassword(email) {
    const res = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true
    });
    return res.data;
  },

  async verifyResetToken(token) {
    const res = await apiRequest('/auth/reset-password/verify', {
      method: 'GET',
      query: { token },
      skipAuth: true
    });
    return res.data;
  },

  async resetPassword(token, newPassword) {
    const res = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
      skipAuth: true
    });
    return res.data;
  }
};
