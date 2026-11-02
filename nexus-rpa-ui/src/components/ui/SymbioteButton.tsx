"use client";

/**
 * SYMBIOTE BUTTON — magnetic glow button (web Orchestrator)
 * ---------------------------------------------------------------------------
 * Before: setState on EVERY mousemove (a React re-render per frame per button)
 * and the glow moved with left/top (layout per frame).
 * Now: zero re-renders while hovering. The glow position is written as CSS
 * vars once per animation frame and moved with transform (compositor only).
 * Same props, same variants.
 */

import React, { useCallback, useRef, MouseEvent } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface SymbioteButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "blue" | "emerald" | "outline" | "danger" | "cyber";
  children: React.ReactNode;
}

export default function SymbioteButton({
  variant = "blue",
  children,
  style,
  disabled,
  className = "",
  onMouseMove,
  ...props
}: SymbioteButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const raf = useRef(0);
  const pos = useRef({ x: 0, y: 0 });

  const flush = useCallback(() => {
    raf.current = 0;
    const el = btnRef.current;
    if (!el) return;
    el.style.setProperty("--bx", `${pos.current.x}px`);
    el.style.setProperty("--by", `${pos.current.y}px`);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pos.current.x = e.clientX - rect.left;
    pos.current.y = e.clientY - rect.top;
    if (!raf.current) raf.current = requestAnimationFrame(flush);
  };

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      whileHover={disabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={disabled ? undefined : { y: 1, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      disabled={disabled}
      className={`luxe-symbiote-btn variant-${variant} ${className}`}
      style={style}
      {...props}
    >
      {/* Magnetic spotlight (always mounted, faded by CSS on hover) */}
      {!disabled && <span className="luxe-symbiote-radial-glow" />}

      {/* Shimmer wave */}
      {(variant === "blue" || variant === "emerald" || variant === "cyber") && !disabled && (
        <span className="luxe-symbiote-shimmer" />
      )}

      <span className="luxe-symbiote-content">{children}</span>
    </motion.button>
  );
}