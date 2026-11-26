import { apiRequest } from './httpClient.js';

export const ocrApi = {
  async extractFromFile(file, text = '') {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (text) formData.append('text', text);

    const res = await apiRequest('/ocr/extract', {
      method: 'POST',
      body: formData
    });
    return res.data;
  },

  async extractFromText(text) {
    const res = await apiRequest('/ocr/extract', {
      method: 'POST',
      body: { text }
    });
    return res.data;
  }
};
