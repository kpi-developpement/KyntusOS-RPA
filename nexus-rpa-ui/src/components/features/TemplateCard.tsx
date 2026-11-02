"use client";

import React, { memo, useCallback, useRef } from "react";
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
  index?: number;
  isSelected?: boolean;
  onToggleSelect?: (name: string) => void;
  onPlay: (name: string) => void;
  onEdit: (template: Template) => void;
  onBatchPlay: (name: string) => void;
  onDelete: (id: number) => void;
}

const MAX_TILT = 3.2; // degrees — subtle, enterprise

function TemplateCard({
  template,
  index = 0,
  isSelected = false,
  onToggleSelect,
  onPlay,
  onEdit,
  onBatchPlay,
  onDelete,
}: TemplateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const rectRef = useRef<DOMRect | null>(null);
  const ptrRef = useRef({ x: 0, y: 0 });

  const isMacro = template.name.startsWith("PROC_");
  const steps = template.steps || [];
  const totalDuration = steps.reduce((acc, s) => acc + (s.delay || 0), 0);

  // rAF-throttled pointer tracking: max 1 style write per frame, rect cached on enter
  const flush = useCallback(() => {
    rafRef.current = 0;
    const el = cardRef.current;
    const rect = rectRef.current;
    if (!el || !rect) return;
    const x = ptrRef.current.x - rect.left;
    const y = ptrRef.current.y - rect.top;
    const px = x / rect.width - 0.5; // -0.5 .. 0.5
    const py = y / rect.height - 0.5;
    // spotlight vars go on the spotlight itself (not the card) so a mouse move
    // invalidates style for 1 element instead of the whole card subtree
    const spot = spotRef.current;
    if (spot) {
      spot.style.setProperty("--mx", `${x}px`);
      spot.style.setProperty("--my", `${y}px`);
    }
    el.style.setProperty("--rx", `${(-py * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * MAX_TILT).toFixed(2)}deg`);
  }, []);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      ptrRef.current.x = e.clientX;
      ptrRef.current.y = e.clientY;
      if (!rectRef.current) rectRef.current = e.currentTarget.getBoundingClientRect();
      if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
    },
    [flush]
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    rectRef.current = null;
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onWheel={() => { rectRef.current = null; /* list scrolled → re-measure on next move */ }}
      className={`prime-card ${isMacro ? "prime-macro" : ""} ${isSelected ? "prime-selected" : ""}`}
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
    >
      {/* GPU Specular Spotlight + glow shadow layer (opacity-only transitions) */}
      <div className="prime-glow" />
      <div ref={spotRef} className="prime-spotlight" />
      <div className="prime-top-beam" />
      <div className="prime-wing-tl" />
      <div className="prime-wing-br" />

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
                role="checkbox"
                aria-checked={isSelected}
              >
                <Check size={13} color="#ffffff" strokeWidth={3} className="luxe-check-icon" />
              </div>
            )}

            <div className="prime-badge">
              <span className="prime-dot" />
              <span className="prime-badge-swap">
                <span className="prime-badge-default">{isMacro ? "SUB-ROUTINE" : "WORKFLOW"}</span>
                <span className="prime-badge-hover">ID #{String(template.id || 0).padStart(3, "0")}</span>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button onClick={() => onEdit(template)} className="luxe-icon-btn" title="Edit Sequence">
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
            {template.id && (
              <button onClick={() => onDelete(template.id!)} className="luxe-icon-btn danger" title="Delete">
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
            {isMacro ? <Layers size={13} color="#0284c7" /> : <Cpu size={13} color="#2563eb" />}
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
            <span className="prime-telemetry-status">
              <span className="prime-telemetry-led" />
              READY
            </span>
          </div>

          {steps.length === 0 ? (
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", padding: "6px 0" }}>No steps recorded</div>
          ) : (
            steps.slice(0, 3).map((step, idx) => (
              <div key={idx} className="luxe-preview-row" style={{ "--r": idx } as React.CSSProperties}>
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
            <div className="prime-more-row">
              <span>+{steps.length - 3} additional operations</span>
              <Sparkles size={11} color="#2563eb" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Thruster Controls */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "8px" }}>
        <button onClick={() => onPlay(template.name)} className={`prime-thruster-btn ${isMacro ? "macro" : "seq"}`}>
          <div className="luxe-btn-shimmer" />
          <div className="prime-thruster-label">
            <span className="prime-thruster-icon">
              <Play size={15} fill="currentColor" />
            </span>
            <span className="btn-text-swap">
              <span className="btn-text-normal">Run Automation</span>
              <span className="btn-text-prime">EXECUTE SEQUENCE</span>
            </span>
          </div>
          <div className="prime-exec-tag">RUN</div>
        </button>

        {!isMacro && (
          <button onClick={() => onBatchPlay(template.name)} className="luxe-secondary-btn">
            <FolderPlus size={14} />
            <span>Batch Multi-File Execution</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(TemplateCard);
