"use client";

import { motion } from "framer-motion";
import { Pause, Play, Square, Clock } from "lucide-react";
import Button from "../ui/Button";
import { PlaybackStatus } from "../../types";

interface PlaybackOverlayProps {
  status: PlaybackStatus | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function PlaybackOverlay({ status, onPause, onResume, onStop }: PlaybackOverlayProps) {
  if (!status || !status.playing) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ position: 'fixed', bottom: '35px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }} 
        animate={{ y: 0, opacity: 1, scale: 1 }} 
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '20px',
          padding: '16px 26px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minWidth: '520px'
        }}
      >
        {/* TOP ROW */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                background: status.paused ? '#eab308' : '#10b981',
                boxShadow: status.paused ? '0 0 10px #eab308' : '0 0 12px #10b981'
              }}
            />
            <div>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>
                {status.paused ? 'PAUSED' : 'EXECUTING PIPELINE'}
              </span>
              <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                {status.templateName}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 1fr', 
          gap: '12px',
          background: '#f8fafc',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '8px', 
              padding: '4px 10px',
              fontFamily: "'Fira Code', monospace",
              color: '#2563eb',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              STEP {String(status.currentStep).padStart(2, '0')}/{String(status.totalSteps).padStart(2, '0')}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Current Action</span>
              <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, fontFamily: "'Fira Code', monospace", whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
                {status.stepDescription}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <Clock size={16} color="#d97706" />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Remaining</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', fontFamily: "'Fira Code', monospace" }}>
                {formatTime(status.remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div style={{ width: '100%' }}>
          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <motion.div 
              style={{ height: '100%', background: '#2563eb', borderRadius: '10px' }}
              initial={{ width: 0 }}
              animate={{ width: `${status.progressPercent}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
        </div>

      </motion.div>
    </div>
  );
}