"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Cpu, Layers } from "lucide-react";

interface HeroSectionProps {
  isRecording: boolean;
  hasRecordedSteps: boolean;
  onStartSequence: () => void;
  onStartMacro: () => void;
}

function HeroSection({ isRecording, hasRecordedSteps, onStartSequence, onStartMacro }: HeroSectionProps) {
  return (
    <motion.div
      className="nx-hero"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ROYAL BLUE AMBIENT CROWN GLOW (static, pre-blurred gradient — no filter) */}
      <div className="nx-hero-crown" />
      <div className="nx-hero-sheen" />

      {/* LEFT BRANDING */}
      <div className="nx-hero-brand">
        <div className="nx-hero-logo">
          <span className="nx-hero-logo-orbit" />
          <Cpu size={30} />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
            <h1 className="nx-hero-title">
              Nexus <span className="nx-hero-title-accent">Studio</span>
            </h1>

            <div className="nx-hero-status">
              <span className="nx-hero-status-dot" />
              CORE ONLINE
            </div>
          </div>

          <p className="nx-hero-subtitle">Enterprise Citrix & High-Precision Web Automation Architecture</p>
        </div>
      </div>

      {/* RIGHT LUXURY 70/30 BUTTONS */}
      {!isRecording && !hasRecordedSteps && (
        <div className="nx-hero-actions">
          <button onClick={onStartMacro} className="nx-hero-btn nx-hero-btn-ghost">
            <Layers size={16} color="#0284c7" /> Record Sub-Routine
          </button>

          <button onClick={onStartSequence} className="nx-hero-btn nx-hero-btn-primary">
            <span className="nx-hero-btn-shine" />
            <PlayCircle size={17} /> New Workflow
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default memo(HeroSection);
