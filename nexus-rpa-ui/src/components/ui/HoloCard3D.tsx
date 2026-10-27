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
  depth = 14,
  glowColor = "rgba(37, 99, 235, 0.4)",
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
      card.style.setProperty("--card-scale", "1.03");
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
    card.style.setProperty("--card-scale", "1");
    setIsHovered(false);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const accentPrimary = isMacro ? "#0ea5e9" : "#3b82f6";
  const accentSecondary = isMacro ? "#06b6d4" : "#2563eb";

  return (
    <div
      style={{ perspective: 1200 }}
      className={`holo-card-perspective-wrapper ${className}`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`holo-card-body ${isMacro ? "macro-holo" : "seq-holo"} ${isHovered ? "is-hovered" : ""}`}
      >
        {/* Holographic Shimmer Sweep — diagonal light that sweeps across on hover */}
        <div className="holo-shimmer-sweep" />

        {/* Dynamic Specular Glare — follows cursor position */}
        <div
          className="holo-glare-overlay"
          style={{
            background: `radial-gradient(circle 320px at var(--gx, 50%) var(--gy, 50%), ${
              isMacro ? "rgba(14, 165, 233, 0.28)" : "rgba(59, 130, 246, 0.32)"
            }, transparent 75%)`,
          }}
        />

        {/* Prismatic Edge Border — rainbow on hover */}
        <div className="holo-prismatic-border" />

        {/* Scanning Laser Line — horizontal scan on hover */}
        <div className="holo-laser-scan" style={{ background: `linear-gradient(90deg, transparent, ${accentPrimary}, transparent)` }} />

        {/* Holographic Cyber Corners — expand on hover */}
        <div className="holo-corner holo-corner-tl" style={{ borderColor: accentSecondary }} />
        <div className="holo-corner holo-corner-tr" style={{ borderColor: accentSecondary }} />
        <div className="holo-corner holo-corner-bl" style={{ borderColor: accentSecondary }} />
        <div className="holo-corner holo-corner-br" style={{ borderColor: accentSecondary }} />

        {/* Ambient Neon Edge Glow — outer shadow bloom */}
        <div
          className="holo-ambient-glow"
          style={{
            boxShadow: `0 24px 50px -10px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.6)`,
          }}
        />

        {/* Floating Micro Particles on hover */}
        {isHovered && (
          <div className="holo-particles-container">
            <div className="holo-particle p1" />
            <div className="holo-particle p2" />
            <div className="holo-particle p3" />
            <div className="holo-particle p4" />
            <div className="holo-particle p5" />
            <div className="holo-particle p6" />
          </div>
        )}

        {/* Card Content with 3D Layered Depth */}
        <div className="holo-card-inner-3d">
          {children}
        </div>
      </div>
    </div>
  );
}
