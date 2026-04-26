import axios from 'axios';

// API configuration for different environments
const config = {
  apiBaseUrl: '',
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: config.apiBaseUrl,
});

export default api;
export { config };