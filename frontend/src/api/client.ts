import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

export default api;
