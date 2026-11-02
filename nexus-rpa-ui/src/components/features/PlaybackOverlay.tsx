"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Square, Clock } from "lucide-react";
import Button from "../ui/Button";
import { PlaybackStatus } from "../../types";

interface PlaybackOverlayProps {
  status: PlaybackStatus | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

function PlaybackOverlay({ status, onPause, onResume, onStop }: PlaybackOverlayProps) {
  const visible = !!status?.playing;

  return (
    <div className="nx-playback-anchor">
      <AnimatePresence>
        {visible && status && (
          <motion.div
            key="playback"
            className={`nx-playback ${status.paused ? "is-paused" : ""}`}
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            {/* TOP ROW */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="nx-playback-beacon" />
                <div>
                  <span className="nx-playback-kicker">{status.paused ? "PAUSED" : "EXECUTING PIPELINE"}</span>
                  <h3 className="nx-playback-title">{status.templateName}</h3>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {status.paused ? (
                  <Button variant="success" size="sm" onClick={onResume}>
                    <Play size={14} /> Resume
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={onPause}>
                    <Pause size={14} /> Pause
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={onStop}>
                  <Square size={14} /> Stop
                </Button>
              </div>
            </div>

            {/* MIDDLE ROW */}
            <div className="nx-playback-panel">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                {/* key → tiny pop each time the step changes */}
                <span key={status.currentStep} className="nx-playback-step">
                  STEP {String(status.currentStep).padStart(2, "0")}/{String(status.totalSteps).padStart(2, "0")}
                </span>
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <span className="nx-playback-label">Current Action</span>
                  <span key={status.stepDescription} className="nx-playback-desc">
                    {status.stepDescription}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                <Clock size={16} color="#d97706" />
                <div style={{ textAlign: "right" }}>
                  <span className="nx-playback-label">Remaining</span>
                  <span className="nx-playback-eta">{formatTime(status.remainingSeconds)}</span>
                </div>
              </div>
            </div>

            {/* PROGRESS BAR — transform: scaleX (compositor only, no layout) */}
            <div className="nx-playback-track">
              <div className="nx-playback-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(100, status.progressPercent)) / 100})` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(PlaybackOverlay);
