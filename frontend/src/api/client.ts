import axios from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth';

// during local development we rely on Vite's proxy; in production set VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const alreadyRetried = Boolean(originalRequest._retry);
    const refreshToken = getRefreshToken();

    if (isUnauthorized && !alreadyRetried && refreshToken) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = refreshResponse.data.access;
        setTokens(newAccess, refreshToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const loginUser = (username: string, password: string) => {
  return api.post('/auth/login/', { username, password });
};

export const getCurrentUser = () => {
  return api.get('/auth/me/');
};

export const refreshToken = (refresh: string) => {
  return api.post('/auth/refresh/', { refresh });
};

export const scheduleInterview = (candidateId: number) => {
  return api.post('/schedule-interview/', { candidate_id: candidateId });
};

export const getInterviewStatus = (interviewId: number) => {
  return api.get(`/interviews/${interviewId}/`);
};

export const getAllInterviews = () => {
  return api.get('/interviews/');
};

export const getAreas = () => {
  return api.get('/areas/');
};

export const createArea = (name: string) => {
  return api.post('/areas/', { name });
};

export const getAOMs = () => {
  return api.get('/aoms/');
};

export const createAOM = (data: {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  area_id?: number;
}) => {
  return api.post('/aoms/', data);
};

export const getCandidates = () => {
  return api.get('/candidates/');
};

export const createCandidate = (data: {
  name: string;
  email: string;
  area_id?: number;
}) => {
  return api.post('/candidates/', data);
};

export const getAnalytics = () => {
  return api.get('/analytics/');
};

export default api;
