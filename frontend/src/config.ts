import axios from 'axios';

// API configuration for different environments
const config = {
  // In production on Render, use the backend service URL
  // In development, use the proxy (which goes to localhost:8000)
  apiBaseUrl: import.meta.env.PROD 
    ? 'https://missing-data-tool-backend.onrender.com'
    : '',
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: config.apiBaseUrl,
});

export default api;
export { config };