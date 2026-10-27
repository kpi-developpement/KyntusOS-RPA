"use client";

import React, { useRef, useCallback, useEffect, useState, MouseEvent } from "react";

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
  depth = 16,
  glowColor,
  isMacro = false,
  onClick,
}: HoloCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;

      const rx = (py * -depth).toFixed(2);
      const ry = (px * depth).toFixed(2);
      const gx = ((x / rect.width) * 100).toFixed(1);
      const gy = ((y / rect.height) * 100).toFixed(1);

      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--gx", `${gx}%`);
      card.style.setProperty("--gy", `${gy}%`);
      card.style.setProperty("--g-opacity", "1");
    });
  }, [depth]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--g-opacity", "0");
    setIsHovered(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const accentColor = isMacro ? "#0ea5e9" : "#2563eb";
  const effectiveGlow = glowColor || (isMacro ? "rgba(14, 165, 233, 0.35)" : "rgba(37, 99, 235, 0.35)");

  return (
    <div
      className={`transformer-card-assembly ${className}`}
      onClick={onClick}
    >
      {/* 2D BASE CHASSIS — Anchored in 2D space beneath the ejected card */}
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

      {/* 3D TRANSFORMER ARMOR PLATE — Unlatches and ejects forward in 3D */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`holo-card-body transformer-prime-plate ${isMacro ? "macro-holo" : "seq-holo"} ${isHovered ? "is-ejected" : ""}`}
      >
        {/* Dynamic Specular Sheen (Pure Monochromatic White-Blue Light) */}
        <div
          className="holo-glare-overlay"
          style={{
            background: `radial-gradient(circle 340px at var(--gx, 50%) var(--gy, 50%), ${
              isMacro ? "rgba(14, 165, 233, 0.22)" : "rgba(37, 99, 235, 0.22)"
            }, transparent 70%)`,
          }}
        />

        {/* Monochromatic Laser Edge Line (Horizontal Scan) */}
        <div
          className="holo-laser-scan"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        {/* Crisp Monochromatic Cyber Brackets */}
        <div className="holo-corner holo-corner-tl" style={{ borderColor: accentColor }} />
        <div className="holo-corner holo-corner-tr" style={{ borderColor: accentColor }} />
        <div className="holo-corner holo-corner-bl" style={{ borderColor: accentColor }} />
        <div className="holo-corner holo-corner-br" style={{ borderColor: accentColor }} />

        {/* Monochromatic Cyber Perimeter Glow */}
        <div
          className="holo-ambient-glow"
          style={{
            boxShadow: `0 24px 50px -10px ${effectiveGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.9)`,
          }}
        />

        {/* Card Content with True 3D Z-plane Layering */}
        <div className="holo-card-inner-3d">
          {children}
        </div>
      </div>
    </div>
  );
}
