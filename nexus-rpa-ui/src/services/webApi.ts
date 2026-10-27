import axios from "axios";
import { Template, PlaybackStatus, PlayTriggerResponse } from "../types";

export const getRobotBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("nexus_robot_node_url");
    if (saved && saved.trim().length > 0) {
      return saved.trim().replace(/\/+$/, "");
    }
    // Smart Auto-Detect: Ila dkhalti mn PC akhor l-site web, y-pointi 3la nefs l-host f port 9833
    const currentHost = window.location.hostname;
    return `http://${currentHost}:9833`;
  }
  return "http://localhost:9833";
};

export const setRobotBaseUrl = (url: string) => {
  if (typeof window !== "undefined") {
    let formatted = url.trim().replace(/\/+$/, "");
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = "http://" + formatted;
    }
    localStorage.setItem("nexus_robot_node_url", formatted);
  }
};

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("nexus_web_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const webApi = {
  // AUTHENTICATION
  login: async (credentials: { username: string; password: string }) => {
    const res = await axios.post(`${getRobotBaseUrl()}/api/v1/auth/login`, credentials);
    return res.data;
  },

  register: async (userData: { username: string; password: string }) => {
    const res = await axios.post(`${getRobotBaseUrl()}/api/v1/auth/register`, userData, {
      headers: getHeaders(),
    });
    return res.data;
  },

  getUsers: async (): Promise<string[]> => {
    const res = await axios.get(`${getRobotBaseUrl()}/api/v1/auth/users`, {
      headers: getHeaders(),
    });
    return res.data;
  },

  deleteUser: async (username: string): Promise<void> => {
    await axios.delete(`${getRobotBaseUrl()}/api/v1/auth/users/${username}`, {
      headers: getHeaders(),
    });
  },

  // TEMPLATES & DISPATCH
  getTemplates: async (): Promise<Template[]> => {
    const res = await axios.get(`${getRobotBaseUrl()}/api/v1/rpa/templates`, {
      headers: getHeaders(),
    });
    return res.data;
  },

  getAllSystemTemplates: async (): Promise<Template[]> => {
    const res = await axios.get(`${getRobotBaseUrl()}/api/v1/rpa/templates/all`, {
      headers: getHeaders(),
    });
    return res.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await axios.delete(`${getRobotBaseUrl()}/api/v1/rpa/templates/${id}`, {
      headers: getHeaders(),
    });
  },

  dispatchTemplate: async (templateId: number, targetUsername: string): Promise<string> => {
    const res = await axios.post(
      `${getRobotBaseUrl()}/api/v1/rpa/templates/${templateId}/dispatch/${targetUsername}`,
      {},
      { headers: getHeaders() }
    );
    return res.data;
  },

  // REMOTE ROBOT PLAYBACK & QUEUE CONTROL
  playTemplate: async (name: string): Promise<PlayTriggerResponse> => {
    const res = await axios.post(
      `${getRobotBaseUrl()}/api/v1/rpa/play/${encodeURIComponent(name)}`,
      {},
      { headers: getHeaders() }
    );
    return res.data;
  },

  cancelQueuedJob: async (jobId: string): Promise<void> => {
    await axios.delete(`${getRobotBaseUrl()}/api/v1/rpa/play/queue/${jobId}`, {
      headers: getHeaders(),
    });
  },

  getPlaybackStatus: async (): Promise<PlaybackStatus> => {
    const res = await axios.get(`${getRobotBaseUrl()}/api/v1/rpa/play/status`, {
      headers: getHeaders(),
      timeout: 2500,
    });
    return res.data;
  },

  pausePlayback: async (): Promise<void> => {
    await axios.post(`${getRobotBaseUrl()}/api/v1/rpa/play/pause`, {}, { headers: getHeaders() });
  },

  resumePlayback: async (): Promise<void> => {
    await axios.post(`${getRobotBaseUrl()}/api/v1/rpa/play/resume`, {}, { headers: getHeaders() });
  },

  stopPlayback: async (): Promise<void> => {
    await axios.post(`${getRobotBaseUrl()}/api/v1/rpa/play/stop`, {}, { headers: getHeaders() });
  },
};