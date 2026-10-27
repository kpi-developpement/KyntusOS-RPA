"use client";

import { motion } from "framer-motion";
import { PlayCircle, Cpu, Layers, Sparkles } from "lucide-react";

interface HeroSectionProps {
  isRecording: boolean;
  hasRecordedSteps: boolean;
  onStartSequence: () => void;
  onStartMacro: () => void;
}

export default function HeroSection({ isRecording, hasRecordedSteps, onStartSequence, onStartMacro }: HeroSectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 247, 255, 0.92) 100%)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(191, 219, 254, 0.95)",
        borderRadius: "26px",
        padding: "26px 34px",
        marginBottom: "34px",
        boxShadow: "0 20px 50px -15px rgba(37, 99, 235, 0.1), inset 0 1px 0 0 #ffffff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* ROYAL BLUE AMBIENT CROWN GLOW */}
      <div style={{
        position: "absolute",
        top: "-60%",
        left: "15%",
        width: "380px",
        height: "180px",
        background: "radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, transparent 70%)",
        filter: "blur(35px)",
        pointerEvents: "none"
      }} />

      {/* LEFT BRANDING */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", position: "relative", zIndex: 1 }}>
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "18px",
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: "0 12px 28px -6px rgba(37, 99, 235, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
        }}>
          <Cpu size={30} />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, letterSpacing: "-0.8px", color: "#0f172a", margin: 0 }}>
              Nexus <span style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Studio</span>
            </h1>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#2563eb",
              padding: "4px 12px",
              borderRadius: "999px",
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.4px"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 8px #2563eb" }} />
              CORE ONLINE
            </div>
          </div>

          <p style={{ color: "#475569", fontSize: "0.84rem", fontWeight: 600, margin: 0 }}>
            Enterprise Citrix & High-Precision Web Automation Architecture
          </p>
        </div>
      </div>

      {/* RIGHT LUXURY 70/30 BUTTONS */}
      {!isRecording && !hasRecordedSteps && (
        <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative", zIndex: 1 }}>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartMacro}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1.5px solid #bfdbfe",
              color: "#2563eb",
              fontWeight: 800,
              fontSize: "0.84rem",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(37, 99, 235, 0.08)",
              transition: "all 0.2s ease"
            }}
          >
            <Layers size={16} color="#0284c7" /> Record Sub-Routine
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartSequence}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "12px 24px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 12px 28px -6px rgba(37, 99, 235, 0.45)"
            }}
          >
            <PlayCircle size={17} /> New Workflow
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}