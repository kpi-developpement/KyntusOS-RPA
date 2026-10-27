import axios from 'axios';
import { Template, PlaybackStatus, AuthResponse } from '../types';

// L'URL dyal l'Backend Spring Boot li fih l'Robot (Serveur f charika awla Worker Node)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.50:9833/api/v1';

const webApiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor bach n-siftou l'token f kol requête Web
webApiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexus_web_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const orchestratorApi = {
  // --- AUTH ---
  login: async (credentials: any): Promise<AuthResponse> => {
    const response = await webApiClient.post(`/auth/login`, credentials);
    return response.data;
  },
  
  // --- ORCHESTRATOR (WEB) ---
  getTemplates: async (): Promise<Template[]> => {
    const response = await webApiClient.get(`/rpa/templates`);
    return response.data;
  },
  
  playTemplate: async (templateName: string): Promise<string> => {
    const response = await webApiClient.post(`/rpa/play/${templateName}`);
    return response.data;
  },
  
  getPlaybackStatus: async (): Promise<PlaybackStatus> => {
    const response = await webApiClient.get(`/rpa/play/status`);
    return response.data;
  },
  
  pausePlayback: async (): Promise<void> => {
    await webApiClient.post(`/rpa/play/pause`);
  },
  
  resumePlayback: async (): Promise<void> => {
    await webApiClient.post(`/rpa/play/resume`);
  },
  
  stopPlayback: async (): Promise<void> => {
    await webApiClient.post(`/rpa/play/stop`);
  }
};