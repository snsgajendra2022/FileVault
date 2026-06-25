import axios from 'axios';
import { trackApiError, trackApiRequest, trackApiResponse } from '../../utils/openclawAssistantMonitor';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 100000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const requestId = trackApiRequest(config as typeof config & { metadata?: Record<string, unknown> });
    (config as typeof config & { metadata?: Record<string, unknown> }).metadata = {
      ...((config as typeof config & { metadata?: Record<string, unknown> }).metadata || {}),
      requestId,
      startedAt: Date.now(),
    };
    const token = localStorage.getItem('token');
    // Only add token if no Authorization header is already present
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: redirect to login on 401 only when not on a public route
api.interceptors.response.use(
  (response) => {
    const requestId = (response.config as { metadata?: Record<string, unknown> })?.metadata?.requestId;
    if (typeof requestId === 'string') trackApiResponse(requestId, response);
    return response;
  },
  (error) => {
    const requestId = (error?.config as { metadata?: Record<string, unknown> })?.metadata?.requestId;
    if (typeof requestId === 'string') trackApiError(requestId, error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
