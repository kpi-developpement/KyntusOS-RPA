"use client";

import React, { useEffect, useRef } from "react";

/* ============================================================
   SPARKLINE — live history polyline (canvas, no deps)
   • Props: { data: number[] }
   • Redraws only when the data array reference changes.
   • Normalizes to [min,max] of the window -> always readable.
   • Glow dot at the last point + gradient fill under the line.
   • DPR-aware, capped at 1.5 -> crisp but cheap.
   ============================================================ */

interface SparklineProps {
  data: number[];
  accent?: string; // css color for stroke/dot
}

export default function Sparkline({ data, accent = "#38bdf8" }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.clientWidth || 160;
    const H = canvas.clientHeight || 44;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 5;
    const stepX = (W - pad * 2) / (data.length - 1);
    const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);

    // gradient fill under the line
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
    grad.addColorStop(1, "rgba(56, 189, 248, 0)");

    ctx.beginPath();
    data.forEach((v, i) => {
      const X = pad + i * stepX;
      if (i === 0) ctx.moveTo(X, y(v));
      else ctx.lineTo(X, y(v));
    });
    const lastX = pad + (data.length - 1) * stepX;
    ctx.lineTo(lastX, H);
    ctx.lineTo(pad, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // the line itself
    ctx.beginPath();
    data.forEach((v, i) => {
      const X = pad + i * stepX;
      if (i === 0) ctx.moveTo(X, y(v));
      else ctx.lineTo(X, y(v));
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.stroke();

    // glow dot at the live end
    const ly = y(data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, ly, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, ly, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }, [data, accent]);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: 44, display: "block" }}
      aria-hidden="true"
    />
  );
}