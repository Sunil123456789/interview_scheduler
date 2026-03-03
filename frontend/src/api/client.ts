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

export default api;
