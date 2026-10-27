"use client";

import React, { useRef, useState, MouseEvent } from "react";
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
  ...props
}: SymbioteButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current || disabled) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={disabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={disabled ? undefined : { y: 1, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      disabled={disabled}
      className={`luxe-symbiote-btn variant-${variant} ${className}`}
      style={style}
      {...props}
    >
      {/* Dynamic Magnetic Spotlight Follower */}
      {isHovered && !disabled && (
        <span
          className="luxe-symbiote-radial-glow"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
        />
      )}

      {/* Shimmer Wave */}
      {(variant === "blue" || variant === "emerald" || variant === "cyber") && !disabled && (
        <span className="luxe-symbiote-shimmer" />
      )}

      {/* Button Content */}
      <span className="luxe-symbiote-content">{children}</span>
    </motion.button>
  );
}