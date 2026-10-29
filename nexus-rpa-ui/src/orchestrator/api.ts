import axios from 'axios';
import { Template, PlaybackStatus, AuthResponse } from '../types';

// 🔥 L'URL DABA HWA L'PROXY LI SAYBNA F NEXT.JS, MACHI L'PC DIRECT!
const PROXY_API_URL = '/api/proxy';

// Hada l'IP dyal l'Master API (Par defaut)
let currentTargetNode = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.10.25:9833';

const webApiClient = axios.create({
  baseURL: PROXY_API_URL, // Axios dima kay-hder m3a l'serveur local dyalo
});

webApiClient.interceptors.request.use((config) => {
  // 🔥 KANSAYFTOU L'IP DYAL L'PC F WA7D L'HEADER KHFII L'NEXT.JS BACH Y3REF FIN YSIFET
  config.headers['x-target-node'] = currentTargetNode;

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexus_web_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 🔥 L'FONCTION DYAL L'BOUTON "SYNC" DABA KAT-BEDDEL GHIR LA CIBLE DYAL L'PROXY
export const syncAxiosNode = (newNodeUrl: string) => {
  const cleanUrl = newNodeUrl.endsWith('/') ? newNodeUrl.slice(0, -1) : newNodeUrl;
  currentTargetNode = cleanUrl;
  console.log("🚀 [NEXUS SYNC] L'Orchestrator ghadi y-proxy l'ordres l': ", currentTargetNode);
};

export const orchestratorApi = {
  // --- AUTH ---
  login: async (credentials: any): Promise<AuthResponse> => {
    const response = await webApiClient.post(`/auth/login`, credentials);
    return response.data;
  },
  
  // --- ORCHESTRATOR (WEB) ---
  getTemplates: async (): Promise<Template[]> => {
    // Hadi ghat-wlli: /api/proxy/rpa/templates 
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