"use client";

/**
 * HOLO CARD 3D — web Orchestrator workflow card
 * ---------------------------------------------------------------------------
 * Same markup contract as before (chassis dock + ejecting plate), rebuilt for
 * smooth frames:
 *  • No React state on hover (before: every enter/leave re-rendered the card
 *    and its whole content). Hover is pure CSS.
 *  • Pointer tracking is rAF-throttled, rect cached on enter, CSS vars only.
 *  • Tilt reduced 16° → 7° and the eject is a calm lift: enterprise, not toy.
 *  • Shadows are pre-painted blue glows faded with opacity (no black shadow,
 *    no box-shadow animation, no mix-blend-mode).
 *  • Accent frame + one-shot shine on hover (opacity / transform only).
 */

import React, { useCallback, useEffect, useRef } from "react";

interface HoloCard3DProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  glowColor?: string;
  isMacro?: boolean;
  onClick?: () => void;
}

export default function HoloCard3D({
  children,
  className = "",
  depth = 7,
  glowColor,
  isMacro = false,
  onClick,
}: HoloCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef(0);
  const rectRef = useRef<DOMRect | null>(null);
  const ptr = useRef({ x: 0, y: 0 });

  const flush = useCallback(() => {
    rafId.current = 0;
    const card = cardRef.current;
    const rect = rectRef.current;
    if (!card || !rect) return;
    const x = ptr.current.x - rect.left;
    const y = ptr.current.y - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;
    card.style.setProperty("--rx", `${(-py * depth).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(px * depth).toFixed(2)}deg`);
    card.style.setProperty("--gx", `${((x / rect.width) * 100).toFixed(1)}%`);
    card.style.setProperty("--gy", `${((y / rect.height) * 100).toFixed(1)}%`);
  }, [depth]);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      ptr.current.x = e.clientX;
      ptr.current.y = e.clientY;
      if (!rectRef.current) rectRef.current = e.currentTarget.getBoundingClientRect();
      if (!rafId.current) rafId.current = requestAnimationFrame(flush);
    },
    [flush]
  );

  const handlePointerLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = 0;
    rectRef.current = null;
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const style = {
    "--holo-accent": isMacro ? "#0284c7" : "#2563eb",
    "--holo-accent-soft": isMacro ? "rgba(2, 132, 199, 0.16)" : "rgba(37, 99, 235, 0.16)",
    "--holo-glow": glowColor || (isMacro ? "rgba(14, 165, 233, 0.35)" : "rgba(37, 99, 235, 0.35)"),
  } as React.CSSProperties;

  return (
    <div className={`transformer-card-assembly ${className}`} onClick={onClick} style={style}>
      {/* 2D BASE CHASSIS — anchored beneath the ejected plate */}
      <div className={`transformer-base-chassis ${isMacro ? "macro-chassis" : "seq-chassis"}`}>
        <div className="chassis-grid-pattern" />
        <div className="chassis-dock-header">
          <span className="chassis-stencil-code">// CHASSIS_BAY: #{isMacro ? "MACRO" : "WORKFLOW"}</span>
          <span className="chassis-dock-status">DOCK_LOCKED</span>
        </div>
        <div className="chassis-circuit-lines" />
        <div className="chassis-latches">
          <span className="chassis-latch latch-tl" />
          <span className="chassis-latch latch-tr" />
          <span className="chassis-latch latch-bl" />
          <span className="chassis-latch latch-br" />
        </div>
      </div>

      {/* 3D PLATE */}
      <div
        ref={cardRef}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onWheel={() => {
          rectRef.current = null;
        }}
        className={`holo-card-body transformer-prime-plate ${isMacro ? "macro-holo" : "seq-holo"}`}
      >
        {/* accent frame + inner glow (pre-painted, opacity only) */}
        <div className="holo-lift-glow" />
        {/* specular light following the pointer */}
        <div className="holo-glare-overlay" />
        {/* one-shot light sweep on hover */}
        <div className="holo-shine" aria-hidden="true" />
        {/* scanning laser (transform-driven) */}
        <div className="holo-laser-scan" />

        <div className="holo-corner holo-corner-tl" />
        <div className="holo-corner holo-corner-tr" />
        <div className="holo-corner holo-corner-bl" />
        <div className="holo-corner holo-corner-br" />

        <div className="holo-card-inner-3d">{children}</div>
      </div>
    </div>
  );
}