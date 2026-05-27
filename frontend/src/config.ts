import axios from 'axios';

// API configuration for different environments
const config = {
  apiBaseUrl: import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL || 'https://missing-data-tool-backend.onrender.com')
    : '',
};
console.log('API Base URL:', config.apiBaseUrl);

// Create axios instance with base URL
const api = axios.create({
  baseURL: config.apiBaseUrl,
});

export default api;
export { config };