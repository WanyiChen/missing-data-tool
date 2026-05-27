import api from '../config';

let warmupInterval: ReturnType<typeof setInterval> | null = null;
let isWarming = false;

export const startBackendWarmup = () => {
  if (warmupInterval) return;

  // Ping every 2 minutes to keep backend alive
  warmupInterval = setInterval(async () => {
    try {
      await api.get('/api/health', { timeout: 5000 });
    } catch (error) {
      console.warn('Backend warmup ping failed:', error);
    }
  }, 2 * 60 * 1000);
};

export const stopBackendWarmup = () => {
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
  }
};

export const warmupBackend = async (): Promise<boolean> => {
  if (isWarming) return false;
  
  isWarming = true;
  try {
    await api.get('/api/health', { timeout: 30000 });
    return true;
  } catch (error) {
    console.warn('Backend warmup failed:', error);
    return false;
  } finally {
    isWarming = false;
  }
};
