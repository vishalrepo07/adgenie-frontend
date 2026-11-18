import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function registerUser(name, email, password) {
  const response = await api.post('/api/auth/register', { name, email, password });
  return response.data;
}

export async function loginUser(email, password) {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
}

export async function generateCampaign(userId, productDescription, platform, audience, budget) {
  const response = await api.post('/api/campaigns/generate', {
    user_id: userId,
    product_description: productDescription,
    platform,
    audience,
    budget,
  });
  return response.data;
}

export default api;