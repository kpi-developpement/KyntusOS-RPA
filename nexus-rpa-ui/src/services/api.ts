import axios from 'axios';
import { Template, Step, PlaybackStatus } from '../types';

const API_BASE_URL = 'http://localhost:8226/api/v1/rpa';

export const rpaApi = {
  startRecording: async (): Promise<string> => {
    const response = await axios.post(`${API_BASE_URL}/record/start`);
    return response.data;
  },
  stopRecording: async (): Promise<Step[]> => {
    const response = await axios.post(`${API_BASE_URL}/record/stop`);
    return response.data;
  },
  captureSingleClick: async (): Promise<{x: number, y: number}> => {
    const response = await axios.get(`${API_BASE_URL}/record/single-click`);
    return response.data;
  },
  saveTemplate: async (template: Template): Promise<Template> => {
    const response = await axios.post(`${API_BASE_URL}/templates`, template);
    return response.data;
  },
  getTemplates: async (): Promise<Template[]> => {
    const response = await axios.get(`${API_BASE_URL}/templates`);
    return response.data;
  },
  deleteTemplate: async (templateId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/templates/${templateId}`);
  },
  playTemplate: async (templateName: string): Promise<string> => {
    const response = await axios.post(`${API_BASE_URL}/play/${templateName}`);
    return response.data;
  },
  playBatchTemplate: async (templateName: string, filePaths: string[]): Promise<string> => {
    const response = await axios.post(`${API_BASE_URL}/play/batch/${templateName}`, filePaths);
    return response.data;
  },
  getPlaybackStatus: async (): Promise<PlaybackStatus> => {
    const response = await axios.get(`${API_BASE_URL}/play/status`);
    return response.data;
  },
  pausePlayback: async (): Promise<void> => {
    await axios.post(`${API_BASE_URL}/play/pause`);
  },
  resumePlayback: async (): Promise<void> => {
    await axios.post(`${API_BASE_URL}/play/resume`);
  },
  stopPlayback: async (): Promise<void> => {
    await axios.post(`${API_BASE_URL}/play/stop`);
  }
};