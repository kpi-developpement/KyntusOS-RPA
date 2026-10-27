"use client";

import React, { useEffect, useRef } from "react";

interface QuantumScene3DProps {
  isBusy?: boolean;
  isOnline?: boolean;
}

export default function QuantumScene3D({
  isBusy = false,
  isOnline = true,
}: QuantumScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const mouse = { x: w * 0.5, y: h * 0.3, tx: w * 0.5, ty: h * 0.3 };

    const COUNT = 22;
    const px = new Float32Array(COUNT);
    const py = new Float32Array(COUNT);
    const vx = new Float32Array(COUNT);
    const vy = new Float32Array(COUNT);
    const radii = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      px[i] = Math.random() * w;
      py[i] = Math.random() * h;
      vx[i] = (Math.random() - 0.5) * 0.35;
      vy[i] = (Math.random() - 0.5) * 0.35;
      radii[i] = Math.random() * 2 + 1;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    let isTabVisible = true;
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isTabVisible) return;

      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;

      // Clean Alabaster Surface
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, "#ffffff");
      bgGrad.addColorStop(0.55, "#f8fafc");
      bgGrad.addColorStop(1, "#f0f7ff");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Ambient Silk Aura
      const auraColor = !isOnline
        ? "rgba(239, 68, 68, 0.06)"
        : isBusy
        ? "rgba(2, 132, 199, 0.09)"
        : "rgba(37, 99, 235, 0.075)";

      const aura = ctx.createRadialGradient(mouse.x, mouse.y, 20, mouse.x, mouse.y, 550);
      aura.addColorStop(0, auraColor);
      aura.addColorStop(1, "rgba(248, 250, 252, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      // Architectural Grid Lines
      ctx.strokeStyle = "rgba(219, 234, 254, 0.4)";
      ctx.lineWidth = 1;
      const gridSize = 72;
      ctx.beginPath();
      for (let x = 0; x <= w; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // BATCHED Micro-Nodes rendering in single draw call!
      ctx.fillStyle = isBusy ? "rgba(2, 132, 199, 0.3)" : "rgba(37, 99, 235, 0.25)";
      ctx.beginPath();
      for (let i = 0; i < COUNT; i++) {
        px[i] += vx[i] * (isBusy ? 1.8 : 1);
        py[i] += vy[i] * (isBusy ? 1.8 : 1);

        if (px[i] < 0) px[i] = w;
        if (px[i] > w) px[i] = 0;
        if (py[i] < 0) py[i] = h;
        if (py[i] > h) py[i] = 0;

        ctx.moveTo(px[i] + radii[i], py[i]);
        ctx.arc(px[i], py[i], radii[i], 0, Math.PI * 2);
      }
      ctx.fill();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isBusy, isOnline]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}