
import { Project } from '../types';
import { projectsData as fallbackProjects } from '../data/seedData';

/**
 * Fetches live property data from the CRM proxy server.
 * Includes a robust fallback to local data if the server is unreachable.
 */
export const fetchLiveProperties = async (): Promise<Project[]> => {
  let isLocal = false;
  try {
    const currentHostname = (window && window.location && window.location.hostname) ? window.location.hostname : '';
    isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
  } catch (e) {
    isLocal = false;
  }

  if (!isLocal) {
    return fallbackProjects;
  }

  const PROXY_URL = 'http://localhost:3001/api/properties';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(PROXY_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`CRM Proxy responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return (Array.isArray(data) && data.length > 0) ? (data as Project[]) : fallbackProjects;
  } catch (error) {
    console.warn('CRM Proxy unreachable. Falling back to local data.', error);
    return fallbackProjects;
  }
};
