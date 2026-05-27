import api from '../config';

let warmupInterval: ReturnType<typeof setInterval> | null = null;
let isWarming = false;

export const startBackendWarmup = () => {
  if (warmupInterval) return;

  console.log('[Backend Warmup] Starting periodic pings every 2 minutes');

  // Ping every 2 minutes to keep backend alive
  warmupInterval = setInterval(async () => {
    try {
      console.log('[Backend Warmup] Pinging backend...');
      const startTime = Date.now();
      await api.get('/api/health', { timeout: 5000 });
      const duration = Date.now() - startTime;
      console.log(`[Backend Warmup] Ping successful (${duration}ms)`);
    } catch (error) {
      console.warn('[Backend Warmup] Ping failed:', error);
    }
  }, 2 * 60 * 1000);
};

export const stopBackendWarmup = () => {
  if (warmupInterval) {
    console.log('[Backend Warmup] Stopping periodic pings');
    clearInterval(warmupInterval);
    warmupInterval = null;
  }
};

export const warmupBackend = async (): Promise<boolean> => {
  if (isWarming) return false;
  
  console.log('[Backend Warmup] Initial warmup starting...');
  isWarming = true;
  try {
    const startTime = Date.now();
    await api.get('/api/health', { timeout: 30000 });
    const duration = Date.now() - startTime;
    console.log(`[Backend Warmup] Initial warmup successful (${duration}ms)`);
    return true;
  } catch (error) {
    console.warn('[Backend Warmup] Initial warmup failed:', error);
    return false;
  } finally {
    isWarming = false;
  }
};
