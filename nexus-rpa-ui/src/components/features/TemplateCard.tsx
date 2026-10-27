"use client";

import React, { useRef } from "react";
import { Template } from "@/types";
import {
  Play,
  Edit3,
  Trash2,
  Layers,
  Cpu,
  Clock,
  FolderPlus,
  Check,
  Terminal,
  Sparkles,
} from "lucide-react";

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onToggleSelect?: (name: string) => void;
  onPlay: (name: string) => void;
  onEdit: (template: Template) => void;
  onBatchPlay: (name: string) => void;
  onDelete: (id: number) => void;
}

export default function TemplateCard({
  template,
  isSelected = false,
  onToggleSelect,
  onPlay,
  onEdit,
  onBatchPlay,
  onDelete,
}: TemplateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMacro = template.name.startsWith("PROC_");
  const steps = template.steps || [];
  const totalDuration = steps.reduce((acc, s) => acc + (s.delay || 0), 0);

  // Zero-Reflow Spotlight Update via requestAnimationFrame
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`prime-card ${isMacro ? "prime-macro" : ""} ${
        isSelected ? "prime-selected" : ""
      }`}
    >
      {/* GPU Specular Spotlight */}
      <div className="prime-spotlight" />
      <div className="prime-top-beam" />

      {/* Top Section: Header & Quick Actions */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!isMacro && onToggleSelect && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(template.name);
                }}
                className={`luxe-checkbox ${isSelected ? "checked" : ""}`}
                title="Select for Pipeline Merge"
              >
                {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
              </div>
            )}

            <div className="prime-badge">
              <span className="prime-dot" />
              <span className="prime-badge-default">
                {isMacro ? "SUB-ROUTINE" : "WORKFLOW"}
              </span>
              <span className="prime-badge-hover">
                ID #{String(template.id || 0).padStart(3, "0")}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => onEdit(template)}
              className="luxe-icon-btn"
              title="Edit Sequence"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
            {template.id && (
              <button
                onClick={() => onDelete(template.id!)}
                className="luxe-icon-btn danger"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Title & Key Metrics */}
        <h3 className="prime-title" title={template.name}>
          {template.name}
        </h3>

        <div className="prime-metrics-bar" style={{ marginBottom: "18px" }}>
          <div className="prime-metric-chip">
            {isMacro ? (
              <Layers size={13} color="#0284c7" />
            ) : (
              <Cpu size={13} color="#2563eb" />
            )}
            <span>{steps.length} Steps</span>
          </div>

          <div className="prime-metric-chip">
            <Clock size={13} color="#64748b" />
            <span>~{totalDuration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Live Telemetry Step Preview */}
        <div className="prime-telemetry-box">
          <div className="prime-telemetry-header">
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Terminal size={11} /> EXECUTION TRACE
            </span>
            <span className="prime-telemetry-status">READY</span>
          </div>

          {steps.length === 0 ? (
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", padding: "6px 0" }}>
              No steps recorded
            </div>
          ) : (
            steps.slice(0, 3).map((step, idx) => (
              <div key={idx} className="luxe-preview-row">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  <span className="luxe-step-num">{idx + 1}</span>
                  <span className="luxe-step-name">
                    {step.type === "CLICK"
                      ? `Click (${step.xCoordinate}, ${step.yCoordinate})`
                      : step.type === "MACRO"
                      ? `Call ${step.actionName}`
                      : step.actionName}
                  </span>
                </div>
                <span className="luxe-step-delay">{step.delay}s</span>
              </div>
            ))
          )}

          {steps.length > 3 && (
            <div
              style={{
                fontSize: "0.68rem",
                color: "#64748b",
                fontWeight: 700,
                paddingTop: "4px",
                borderTop: "1px dashed #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>+{steps.length - 3} additional operations</span>
              <Sparkles size={11} color="#2563eb" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Thruster Controls */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button
          onClick={() => onPlay(template.name)}
          className={`prime-thruster-btn ${isMacro ? "macro" : "seq"}`}
        >
          <div className="luxe-btn-shimmer" />
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <Play size={15} fill="currentColor" />
            <span className="btn-text-normal">Run Automation</span>
            <span className="btn-text-prime">EXECUTE SEQUENCE</span>
          </div>
          <div className="prime-exec-tag">RUN</div>
        </button>

        {!isMacro && (
          <button
            onClick={() => onBatchPlay(template.name)}
            className="luxe-secondary-btn"
          >
            <FolderPlus size={14} />
            <span>Batch Multi-File Execution</span>
          </button>
        )}
      </div>
    </div>
  );
}