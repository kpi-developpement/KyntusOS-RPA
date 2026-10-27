export interface Step {
  orderIndex: number;
  type: "CLICK" | "ACTION" | "MACRO";
  xCoordinate?: number;
  yCoordinate?: number;
  delay: number;
  actionName?: string;
  parameter?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface Template {
  id?: number;
  name: string;
  ownerUsername?: string;
  steps: Step[];
}

export interface QueueItem {
  jobId: string;
  templateName: string;
  requestedBy: string;
  estimatedDurationSeconds: number;
  estimatedWaitSecondsBeforeStart: number;
  position: number;
}

export interface PlayTriggerResponse {
  status: "STARTED" | "QUEUED";
  message: string;
  queuePosition: number;
  estimatedWaitSeconds: number;
}

export interface PlaybackStatus {
  playing: boolean;
  paused: boolean;
  templateName: string;
  triggeredByUser?: string;
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  remainingSeconds: number;
  totalQueueWaitSeconds?: number;
  progressPercent: number;
  queueSize?: number;
  queue?: QueueItem[];
}