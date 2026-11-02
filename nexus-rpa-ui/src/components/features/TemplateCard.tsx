"use client";

import React, { memo, useCallback, useMemo, useRef } from "react";
import { Template, Step } from "@/types";
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
  MousePointer2,
  Zap,
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
const DNA_SEGMENTS = 28; // max bars in the pipeline strip

type StepKind = "click" | "action" | "macro";

const kindOf = (s: Step): StepKind =>
  s.type === "CLICK"
    ? "click"
    : s.type === "MACRO" || s.actionName?.startsWith("CUSTOM_PROC_")
    ? "macro"
    : "action";

/**
 * Pipeline "DNA": one bar per step (or per bucket of steps when the workflow
 * is long), coloured by step kind. Gives the structure of a workflow at a
 * glance — clicks vs keyboard/system actions vs nested macros.
 */
function buildDna(steps: Step[]) {
  const counts = { click: 0, action: 0, macro: 0 };
  steps.forEach((s) => counts[kindOf(s)]++);

  if (steps.length === 0) return { bars: [] as StepKind[], counts };
  if (steps.length <= DNA_SEGMENTS) return { bars: steps.map(kindOf), counts };

  // bucket long workflows: each bar shows the dominant kind of its slice
  const bars: StepKind[] = [];
  const per = steps.length / DNA_SEGMENTS;
  for (let b = 0; b < DNA_SEGMENTS; b++) {
    const slice = steps.slice(Math.floor(b * per), Math.floor((b + 1) * per));
    const c = { click: 0, action: 0, macro: 0 };
    slice.forEach((s) => c[kindOf(s)]++);
    bars.push(
      c.macro >= c.click && c.macro >= c.action && c.macro > 0
        ? "macro"
        : c.click >= c.action
        ? "click"
        : "action"
    );
  }
  return { bars, counts };
}

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
  const dna = useMemo(() => buildDna(steps), [steps]);

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

  const WatermarkIcon = isMacro ? Layers : Cpu;

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onWheel={() => {
        rectRef.current = null; /* list scrolled → re-measure on next move */
      }}
      className={`prime-card ${isMacro ? "prime-macro" : ""} ${isSelected ? "prime-selected" : ""}`}
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
    >
      {/* ── decorative GPU layers (transform / opacity only) ── */}
      <div className="prime-glow" />
      <div ref={spotRef} className="prime-spotlight" />
      <div className="prime-shine" aria-hidden="true" />
      <div className="prime-top-beam" />
      <div className="prime-wing-tl" />
      <div className="prime-wing-br" />
      <div className="prime-watermark" aria-hidden="true">
        <WatermarkIcon size={150} strokeWidth={1} />
      </div>

      {/* ── Top Section: Header & Quick Actions ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div className="prime-header">
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
          <span className="prime-title-text">{template.name}</span>
        </h3>

        <div className="prime-metrics-bar" style={{ marginBottom: "16px" }}>
          <div className="prime-metric-chip">
            {isMacro ? <Layers size={13} color="#0284c7" /> : <Cpu size={13} color="#2563eb" />}
            <span>{steps.length} Steps</span>
          </div>

          <div className="prime-metric-chip">
            <Clock size={13} color="#3b82f6" />
            <span>~{totalDuration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Pipeline DNA strip */}
        {dna.bars.length > 0 && (
          <div className="prime-dna" title="Pipeline structure">
            <div className="prime-dna-track">
              {dna.bars.map((kind, i) => (
                <span
                  key={i}
                  className={`prime-dna-seg seg-${kind}`}
                  style={{ "--s": i } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="prime-dna-legend">
              <span className="dna-key key-click">
                <MousePointer2 size={10} /> {dna.counts.click}
              </span>
              <span className="dna-key key-action">
                <Zap size={10} /> {dna.counts.action}
              </span>
              {dna.counts.macro > 0 && (
                <span className="dna-key key-macro">
                  <Layers size={10} /> {dna.counts.macro}
                </span>
              )}
            </div>
          </div>
        )}

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
            <div className="prime-empty-trace">No steps recorded</div>
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

      {/* ── Bottom Thruster Controls ── */}
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