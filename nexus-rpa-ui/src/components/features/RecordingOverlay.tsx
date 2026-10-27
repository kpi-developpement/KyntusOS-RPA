"use client";

import { motion } from "framer-motion";
import { Square, Radio } from "lucide-react";
import Button from "../ui/Button";

interface RecordingOverlayProps {
  countdown: number;
  isRecording: boolean;
  onStop: () => void;
}

export default function RecordingOverlay({ countdown, isRecording, onStop }: RecordingOverlayProps) {
  if (countdown === 0 && !isRecording) return null;

  return (
    <div className="overlay">
      <div>
        {countdown > 0 ? (
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="countdown"
          >
            {countdown}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            style={{
              background: "#ffffff",
              border: "2px solid #2563eb",
              borderRadius: "28px",
              padding: "48px 56px",
              textAlign: "center",
              boxShadow: "0 35px 80px -15px rgba(37, 99, 235, 0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px"
            }}
          >
            <div style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "#eff6ff",
              border: "2px solid #93c5fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
              boxShadow: "0 0 30px rgba(37, 99, 235, 0.25)"
            }}>
              <Radio size={32} />
            </div>
            
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a', margin: 0 }}>
              RECORDING IN PROGRESS
            </h2>
            <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600, maxWidth: '400px', margin: 0 }}>
              Perform your actions in Citrix or Browser. The Nexus telemetry engine is capturing coordinates...
            </p>

            <Button variant="primary" size="lg" onClick={onStop} style={{ marginTop: '12px' }}>
              <Square size={18} fill="currentColor" /> FINISH & SAVE RECORDING
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}