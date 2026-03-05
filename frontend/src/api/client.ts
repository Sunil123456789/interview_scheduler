import axios from 'axios';

// during local development we rely on Vite's proxy; in production set VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
