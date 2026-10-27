"use client";

import React, { useEffect, useRef } from "react";

interface Props {
  isBusy?: boolean;
  isOnline?: boolean;
}

export default function InteractiveBackground({
  isBusy = false,
  isOnline = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    const SPACING = 48;

    // Flat TypedArrays — Turbo Grid (zero GC pressure)
    let baseX = new Float32Array(0);
    let baseY = new Float32Array(0);
    let curX = new Float32Array(0);
    let curY = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let nodeCount = 0;

    // High-speed Data Comets
    const COMET_COUNT = 8;
    const cometX = new Float32Array(COMET_COUNT);
    const cometY = new Float32Array(COMET_COUNT);
    const cometSpeed = new Float32Array(COMET_COUNT);
    const cometHorizontal = new Uint8Array(COMET_COUNT);

    // Shockwaves (click ripple pool)
    const MAX_WAVES = 5;
    const waveX = new Float32Array(MAX_WAVES);
    const waveY = new Float32Array(MAX_WAVES);
    const waveR = new Float32Array(MAX_WAVES);
    const waveActive = new Uint8Array(MAX_WAVES);

    // Autonomous Breathing Orb position
    let orbX = 0;
    let orbY = 0;

    const initGrid = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
      nodeCount = cols * rows;

      baseX = new Float32Array(nodeCount);
      baseY = new Float32Array(nodeCount);
      curX = new Float32Array(nodeCount);
      curY = new Float32Array(nodeCount);
      vx = new Float32Array(nodeCount);
      vy = new Float32Array(nodeCount);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y = r * SPACING;
          baseX[idx] = x;
          baseY[idx] = y;
          curX[idx] = x;
          curY[idx] = y;
          idx++;
        }
      }

      orbX = width * 0.65;
      orbY = height * 0.35;

      for (let i = 0; i < COMET_COUNT; i++) {
        cometHorizontal[i] = i % 2;
        cometX[i] = Math.random() * width;
        cometY[i] = Math.floor(Math.random() * rows) * SPACING;
        cometSpeed[i] = (isBusy ? 4.5 : 2.2) + Math.random() * 2;
      }
    };

    initGrid();

    const mouse = {
      x: width / 2,
      y: height / 2,
      tx: width / 2,
      ty: height / 2,
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };

    const onMouseDown = (e: MouseEvent) => {
      for (let i = 0; i < MAX_WAVES; i++) {
        if (!waveActive[i]) {
          waveActive[i] = 1;
          waveX[i] = e.clientX;
          waveY[i] = e.clientY;
          waveR[i] = 4;
          break;
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("resize", initGrid, { passive: true });

    let time = 0;
    let isTabVisible = true;
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isTabVisible) return;

      time += isBusy ? 0.03 : 0.014;
      mouse.x += (mouse.tx - mouse.x) * 0.16;
      mouse.y += (mouse.ty - mouse.y) * 0.16;

      // ── 1. Background Fill ──
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // ── 2. Dual Dynamic Aura Gradients ──
      const accentRgba = !isOnline
        ? "239, 68, 68"
        : isBusy
        ? "2, 132, 199"
        : "37, 99, 235";

      // Cursor-following aura
      const cursorGrad = ctx.createRadialGradient(
        mouse.x, mouse.y, 10,
        mouse.x, mouse.y, 340
      );
      cursorGrad.addColorStop(0, `rgba(${accentRgba}, 0.08)`);
      cursorGrad.addColorStop(1, "rgba(248, 250, 252, 0)");
      ctx.fillStyle = cursorGrad;
      ctx.fillRect(0, 0, width, height);

      // Autonomous Breathing Orb — drifts smoothly with cos/sin
      orbX = width * 0.5 + Math.cos(time * 0.6) * width * 0.2;
      orbY = height * 0.5 + Math.sin(time * 0.45) * height * 0.18;
      const orbPulse = 0.035 + Math.sin(time * 1.2) * 0.02;
      const orbGrad = ctx.createRadialGradient(
        orbX, orbY, 20,
        orbX, orbY, 380
      );
      orbGrad.addColorStop(0, `rgba(${accentRgba}, ${orbPulse.toFixed(3)})`);
      orbGrad.addColorStop(0.5, `rgba(${accentRgba}, ${(orbPulse * 0.35).toFixed(3)})`);
      orbGrad.addColorStop(1, "rgba(248, 250, 252, 0)");
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, width, height);

      // ── 3. Shockwaves ──
      for (let w = 0; w < MAX_WAVES; w++) {
        if (waveActive[w]) {
          waveR[w] += 10;
          const alpha = Math.max(0, 1 - waveR[w] / 340);
          ctx.strokeStyle = `rgba(${accentRgba}, ${(alpha * 0.3).toFixed(3)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(waveX[w], waveY[w], waveR[w], 0, Math.PI * 2);
          ctx.stroke();
          if (waveR[w] >= 340) waveActive[w] = 0;
        }
      }

      // ── 4. GRID NODES — Batched Dots + Magnetic Vector Needles ──
      const INFLUENCE = 180;
      const INFLUENCE_SQ = INFLUENCE * INFLUENCE;

      // Phase A: Batch resting dots into single fill call
      ctx.beginPath();
      let needleCount = 0;

      // Temp arrays for displaced nodes (needles) — avoid per-node draw calls for resting ones
      // We collect needle data to draw AFTER the batch fill
      const NEEDLE_CAP = 256;
      const needleFromX = new Float32Array(NEEDLE_CAP);
      const needleFromY = new Float32Array(NEEDLE_CAP);
      const needleToX = new Float32Array(NEEDLE_CAP);
      const needleToY = new Float32Array(NEEDLE_CAP);
      const needleAlpha = new Float32Array(NEEDLE_CAP);

      for (let i = 0; i < nodeCount; i++) {
        const bx = baseX[i];
        const by = baseY[i];

        // Cursor magnetic force
        const dx = bx - mouse.x;
        const dy = by - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < INFLUENCE_SQ && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / INFLUENCE) * 16;
          vx[i] += (dx / dist) * force * 0.2;
          vy[i] += (dy / dist) * force * 0.2;
        }

        // Shockwave node push
        for (let w = 0; w < MAX_WAVES; w++) {
          if (waveActive[w]) {
            const wdx = bx - waveX[w];
            const wdy = by - waveY[w];
            const wDist = Math.sqrt(wdx * wdx + wdy * wdy);
            if (Math.abs(wDist - waveR[w]) < 26 && wDist > 1) {
              vx[i] += (wdx / wDist) * 4;
              vy[i] += (wdy / wDist) * 4;
            }
          }
        }

        // Spring Return + Damping
        vx[i] += (bx - curX[i]) * 0.14;
        vy[i] += (by - curY[i]) * 0.14;
        vx[i] *= 0.8;
        vy[i] *= 0.8;

        curX[i] += vx[i];
        curY[i] += vy[i];

        // Check displacement
        const dispX = curX[i] - bx;
        const dispY = curY[i] - by;
        const dispSq = dispX * dispX + dispY * dispY;

        if (dispSq > 0.36 && needleCount < NEEDLE_CAP) {
          // Displaced → will draw magnetic vector needle
          const disp = Math.sqrt(dispSq);
          const angle = Math.atan2(dispY, dispX);
          const needleLen = Math.min(disp * 2.5, 22);
          const a = Math.min(disp / 14, 0.85);

          needleFromX[needleCount] = curX[i];
          needleFromY[needleCount] = curY[i];
          needleToX[needleCount] = curX[i] + Math.cos(angle) * needleLen;
          needleToY[needleCount] = curY[i] + Math.sin(angle) * needleLen;
          needleAlpha[needleCount] = a;
          needleCount++;
        } else {
          // Resting → batch into single rect fill
          ctx.rect(curX[i] - 1, curY[i] - 1, 2, 2);
        }
      }

      // Flush batched resting dots
      ctx.fillStyle = "rgba(148, 163, 184, 0.32)";
      ctx.fill();

      // Phase B: Draw magnetic vector needles (displaced nodes only — small count = fast)
      if (needleCount > 0) {
        ctx.lineCap = "round";
        ctx.lineWidth = 1.6;
        for (let n = 0; n < needleCount; n++) {
          ctx.strokeStyle = `rgba(${accentRgba}, ${needleAlpha[n].toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(needleFromX[n], needleFromY[n]);
          ctx.lineTo(needleToX[n], needleToY[n]);
          ctx.stroke();

          // Dot at needle tip
          ctx.fillStyle = `rgba(${accentRgba}, ${(needleAlpha[n] * 0.7).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(needleToX[n], needleToY[n], 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── 5. Data Comets — glowing trails on grid rails ──
      ctx.lineCap = "round";
      for (let c = 0; c < COMET_COUNT; c++) {
        const tailLen = 55;
        if (cometHorizontal[c]) {
          cometX[c] += cometSpeed[c];
          if (cometX[c] > width + 80) {
            cometX[c] = -80;
            cometY[c] = Math.floor(Math.random() * rows) * SPACING;
          }
          const g = ctx.createLinearGradient(
            cometX[c] - tailLen, cometY[c],
            cometX[c], cometY[c]
          );
          g.addColorStop(0, `rgba(${accentRgba}, 0)`);
          g.addColorStop(1, `rgba(${accentRgba}, 0.5)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cometX[c] - tailLen, cometY[c]);
          ctx.lineTo(cometX[c], cometY[c]);
          ctx.stroke();

          // Comet head glow dot
          ctx.fillStyle = `rgba(${accentRgba}, 0.7)`;
          ctx.beginPath();
          ctx.arc(cometX[c], cometY[c], 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          cometY[c] += cometSpeed[c];
          if (cometY[c] > height + 80) {
            cometY[c] = -80;
            cometX[c] = Math.floor(Math.random() * cols) * SPACING;
          }
          const g = ctx.createLinearGradient(
            cometX[c], cometY[c] - tailLen,
            cometX[c], cometY[c]
          );
          g.addColorStop(0, `rgba(${accentRgba}, 0)`);
          g.addColorStop(1, `rgba(${accentRgba}, 0.5)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cometX[c], cometY[c] - tailLen);
          ctx.lineTo(cometX[c], cometY[c]);
          ctx.stroke();

          ctx.fillStyle = `rgba(${accentRgba}, 0.7)`;
          ctx.beginPath();
          ctx.arc(cometX[c], cometY[c], 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("resize", initGrid);
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