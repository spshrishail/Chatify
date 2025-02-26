import axios from 'axios';

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || 'https://chatify-hfrzdcvxw-spshrishails-projects.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (userInfo?.token) {
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getAllUsers: () => api.get('/users'),
};

export const messageService = {
  sendMessage: (messageData) => api.post('/messages', messageData),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  likeMessage: (messageId) => api.put(`/messages/like/${messageId}`),
};

export default api; 
