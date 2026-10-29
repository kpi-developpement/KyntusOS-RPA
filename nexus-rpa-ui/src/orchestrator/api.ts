import axios from 'axios';
import { Template, PlaybackStatus, AuthResponse } from '../types';

// L'URL dyal l'Backend Spring Boot li fih l'Robot (Serveur f charika awla Worker Node)
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:9833/api/v1';

// 🔥 Variable li ghadi tb9a tbeddel mnin twrek 3la SYNC
let dynamicBaseUrl = DEFAULT_API_URL;

const webApiClient = axios.create({
  baseURL: dynamicBaseUrl,
});

// 🔥 Interceptor bach n-badlou l'URL f ay requête w n-siftou l'token
webApiClient.interceptors.request.use((config) => {
  // Kan-forciw l'URL jdid f kola requête
  config.baseURL = dynamicBaseUrl;

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexus_web_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 🔥 Hadi hya l'fonction li ghadi t3eyet liha mn l'Bouton SYNC
export const syncAxiosNode = (newNodeUrl: string) => {
  const cleanUrl = newNodeUrl.endsWith('/') ? newNodeUrl.slice(0, -1) : newNodeUrl;
  // Kanzidou /api/v1 7it l'backend Java kaytsenaha
  dynamicBaseUrl = `${cleanUrl}/api/v1`; 
  console.log("🚀 [NEXUS SYNC] L'API kat-pointi daba 3la: ", dynamicBaseUrl);
};

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