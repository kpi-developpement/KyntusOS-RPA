"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlaybackStatus, QueueItem } from "@/types";
import { 
  Activity, Play, Pause, Square, Timer, X, Cpu, 
  Terminal, Radio, ArrowUpRight, CheckCircle2 
} from "lucide-react";
import SymbioteButton from "./SymbioteButton";

interface CyberHUDTelemetryProps {
  playbackStatus: PlaybackStatus;
  totalWaitSeconds: number;
  queueList: QueueItem[];
  robotHost: string;
  isAdmin: boolean;
  currentUser: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancelQueueJob: (jobId: string) => void;
  formatTimeEta: (seconds?: number) => string;
}

export default function CyberHUDTelemetry({
  playbackStatus,
  totalWaitSeconds,
  queueList,
  robotHost,
  isAdmin,
  currentUser,
  onPause,
  onResume,
  onStop,
  onCancelQueueJob,
  formatTimeEta,
}: CyberHUDTelemetryProps) {
  const progress = Math.max(0, Math.min(100, playbackStatus.progressPercent || 0));
  const isPaused = Boolean(playbackStatus.paused);

  // SVG circular gauge math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Waveform bars count
  const waveBars = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="cyber-hud-shell"
    >
      {/* Laser Top Scanning Bar */}
      <div className={`cyber-hud-laser-beam ${isPaused ? "laser-paused" : "laser-active"}`} />

      {/* Background Hologram Grid & Scanline */}
      <div className="cyber-hud-grid-bg" />
      <div className="cyber-hud-scanline" />

      {/* HEADER SECTION */}
      <div className="cyber-hud-header">
        <div className="cyber-hud-identity">
          <div className="cyber-radar-emitter">
            <Radio size={20} className={isPaused ? "text-amber-500" : "text-blue-500 animate-pulse"} />
            {!isPaused && <div className="cyber-radar-ping" />}
          </div>

          <div>
            <div className="cyber-hud-status-row">
              <span className={`cyber-hud-pill ${isPaused ? "pill-warning" : "pill-live"}`}>
                <span className="cyber-status-blip" />
                {isPaused ? "EXECUTION SUSPENDED" : "LIVE DESKTOP HARVEST"}
              </span>
              <span className="cyber-hud-subtext">
                HOST: <strong>{robotHost}</strong>
              </span>
              <span className="cyber-hud-subtext">
                OPERATOR: <strong>[{playbackStatus.triggeredByUser || "admin"}]</strong>
              </span>
            </div>
            <h2 className="cyber-hud-title">
              {playbackStatus.templateName}
            </h2>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="cyber-hud-actions">
          {isPaused ? (
            <SymbioteButton variant="blue" onClick={onResume}>
              <Play size={14} fill="currentColor" /> RESUME SEQUENCE
            </SymbioteButton>
          ) : (
            <SymbioteButton variant="outline" onClick={onPause}>
              <Pause size={14} fill="currentColor" /> PAUSE
            </SymbioteButton>
          )}
          <SymbioteButton variant="danger" onClick={onStop}>
            <Square size={14} fill="currentColor" /> ABORT ENGINE
          </SymbioteButton>
        </div>
      </div>

      {/* METRICS & CIRCULAR GAUGE GRID */}
      <div className="cyber-hud-body">
        {/* CIRCULAR GAUGE */}
        <div className="cyber-gauge-card">
          <div className="cyber-circle-wrap">
            <svg className="cyber-circle-svg" width="136" height="136" viewBox="0 0 136 136">
              <circle
                className="cyber-circle-track"
                cx="68"
                cy="68"
                r={radius}
                strokeWidth="9"
              />
              <circle
                className={`cyber-circle-progress ${isPaused ? "stroke-amber" : "stroke-blue"}`}
                cx="68"
                cy="68"
                r={radius}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 68 68)"
              />
            </svg>
            <div className="cyber-circle-content">
              <span className="cyber-circle-value">{progress}%</span>
              <span className="cyber-circle-label">PROGRESS</span>
            </div>
          </div>

          <div className="cyber-gauge-details">
            <div className="cyber-mini-kpi">
              <span className="label">ACTIVE STEP</span>
              <span className="value">
                {playbackStatus.currentStep} <span className="denom">/ {playbackStatus.totalSteps}</span>
              </span>
            </div>
            <div className="cyber-mini-kpi">
              <span className="label">REMAINING TIME</span>
              <span className="value value-cyan">
                {formatTimeEta(playbackStatus.remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* TELEMETRY READOUT & WAVEFORM */}
        <div className="cyber-telemetry-console">
          <div className="cyber-console-header">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-blue-500" />
              <span className="cyber-console-title">// REAL-TIME HARDWARE TELEMETRY</span>
            </div>

            {/* LIVE EQUALIZER OSCILLOSCOPE */}
            <div className="cyber-equalizer">
              {waveBars.map((b) => (
                <span
                  key={b}
                  className={`cyber-eq-bar ${isPaused ? "eq-idle" : "eq-active"}`}
                  style={{
                    animationDelay: `${(b * 0.08).toFixed(2)}s`,
                    animationDuration: `${(0.6 + (b % 4) * 0.15).toFixed(2)}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="cyber-active-command-box">
            <div className="cyber-cmd-indicator">
              <span className="cyber-cmd-prompt">&gt;</span>
              <span className="cyber-cmd-text">
                {playbackStatus.stepDescription || "Executing system action pipeline..."}
              </span>
            </div>
            <div className="cyber-cmd-meta">
              <span>STATUS: {isPaused ? "HALTED" : "SYNCHRONIZED"}</span>
              <span>RATE: 60Hz DESKTOP AWT</span>
            </div>
          </div>

          {/* PROGRESS LINEAR BAR WITH GLOW BEAD */}
          <div className="cyber-linear-track">
            <div 
              className={`cyber-linear-fill ${isPaused ? "bg-amber" : "bg-gradient-laser"}`}
              style={{ width: `${progress}%` }}
            >
              <div className="cyber-linear-bead" />
            </div>
          </div>
        </div>
      </div>

      {/* QUEUED JOBS STREAM */}
      <AnimatePresence>
        {queueList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="cyber-hud-queue-section"
          >
            <div className="cyber-queue-header">
              <Timer size={14} className="text-blue-500" />
              <span>PIPELINE BUFFER ({queueList.length} PENDING WORKFLOWS):</span>
            </div>

            <div className="cyber-queue-cards-stream">
              {queueList.map((job) => (
                <div key={job.jobId} className="cyber-queue-item-card">
                  <div className="flex items-center gap-3">
                    <span className="cyber-queue-tag">#{job.position}</span>
                    <div>
                      <div className="cyber-queue-name">{job.templateName}</div>
                      <div className="cyber-queue-author">
                        Req by: <strong>{job.requestedBy}</strong> • Est: ~{formatTimeEta(job.estimatedDurationSeconds)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="cyber-queue-eta-label">STARTS IN</div>
                      <div className="cyber-queue-eta-val">
                        ~{formatTimeEta(job.estimatedWaitSecondsBeforeStart)}
                      </div>
                    </div>

                    {(isAdmin || job.requestedBy === currentUser) && (
                      <button
                        onClick={() => onCancelQueueJob(job.jobId)}
                        className="cyber-queue-cancel-btn"
                        title="Dequeue Automation"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
