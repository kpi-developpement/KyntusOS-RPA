"use client";

/**
 * NEXUS INTERACTIVE BACKGROUND — "Turbo v2"
 * ------------------------------------------------------------------
 * Same look (dot grid, magnetic needles, data comets, click shockwaves,
 * cursor aura + breathing orb) but rebuilt so the canvas does ~5% of the
 * previous per-frame work:
 *
 *  • Static dot grid  -> CSS background pattern (painted once, GPU composited)
 *  • Cursor aura/orb  -> gradients rendered ONCE into small sprites, then drawImage
 *                        (before: 2 new full-screen gradients filled every frame)
 *  • Canvas           -> transparent, single layer, only draws what MOVES
 *  • Comets           -> pre-rendered sprites (drawImage, no gradient per frame)
 *  • Alpha            -> globalAlpha instead of building rgba() strings each frame
 *  • Physics          -> delta-time scaled, so it feels identical at 60/144/240/360Hz
 *  • Sleeping nodes   -> nodes far from cursor/waves are skipped entirely
 *  • Props changes    -> handled via refs, no full re-init of the engine
 *  • Paused when the window is hidden, honors prefers-reduced-motion
 */

import React, { useEffect, useRef } from "react";

interface Props {
  isBusy?: boolean;
  isOnline?: boolean;
}

const SPACING = 48;
const INFLUENCE = 180;
const INFLUENCE_SQ = INFLUENCE * INFLUENCE;
const COMET_COUNT = 8;
const COMET_TAIL = 55;
const MAX_WAVES = 5;
const WAVE_MAX_R = 340;

const accentFor = (isBusy: boolean, isOnline: boolean): [number, number, number] =>
  !isOnline ? [239, 68, 68] : isBusy ? [2, 132, 199] : [37, 99, 235];

/** Soft radial glow rendered ONCE at half resolution; drawn scaled with drawImage. */
function makeGlowSprite(rgb: [number, number, number], radius: number, stops: [number, number][]) {
  const size = Math.ceil(radius); // half-res: radius px canvas drawn at 2*radius
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [pos, a] of stops) grad.addColorStop(pos, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Pre-render one comet (tail + glowing head) into a tiny offscreen canvas. */
function makeCometSprite(rgb: [number, number, number], horizontal: boolean, dpr: number) {
  const len = COMET_TAIL + 6;
  const thick = 8;
  const c = document.createElement("canvas");
  c.width = Math.ceil((horizontal ? len : thick) * dpr);
  c.height = Math.ceil((horizontal ? thick : len) * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const [r, gg, b] = rgb;
  const mid = thick / 2;
  const grad = horizontal
    ? g.createLinearGradient(0, mid, COMET_TAIL, mid)
    : g.createLinearGradient(mid, 0, mid, COMET_TAIL);
  grad.addColorStop(0, `rgba(${r},${gg},${b},0)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0.5)`);
  g.strokeStyle = grad;
  g.lineWidth = 1.8;
  g.lineCap = "round";
  g.beginPath();
  if (horizontal) {
    g.moveTo(0, mid);
    g.lineTo(COMET_TAIL, mid);
  } else {
    g.moveTo(mid, 0);
    g.lineTo(mid, COMET_TAIL);
  }
  g.stroke();
  g.fillStyle = `rgba(${r},${gg},${b},0.75)`;
  g.beginPath();
  if (horizontal) g.arc(COMET_TAIL, mid, 2.2, 0, Math.PI * 2);
  else g.arc(mid, COMET_TAIL, 2.2, 0, Math.PI * 2);
  g.fill();
  return c;
}

export default function InteractiveBackground({ isBusy = false, isOnline = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Live props for the render loop (no engine re-init when they change)
  const stateRef = useRef({ isBusy, isOnline, accentDirty: true });
  useEffect(() => {
    stateRef.current.isBusy = isBusy;
    stateRef.current.isOnline = isOnline;
    stateRef.current.accentDirty = true;
    const [r, g, b] = accentFor(isBusy, isOnline);
    rootRef.current?.style.setProperty("--bg-accent", `${r}, ${g}, ${b}`);
  }, [isBusy, isOnline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let animId = 0;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;

    let baseX = new Float32Array(0);
    let baseY = new Float32Array(0);
    let curX = new Float32Array(0);
    let curY = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let awake = new Uint8Array(0);
    let nodeCount = 0;

    const cometX = new Float32Array(COMET_COUNT);
    const cometY = new Float32Array(COMET_COUNT);
    const cometSpeed = new Float32Array(COMET_COUNT);
    const cometHorizontal = new Uint8Array(COMET_COUNT);

    const waveX = new Float32Array(MAX_WAVES);
    const waveY = new Float32Array(MAX_WAVES);
    const waveR = new Float32Array(MAX_WAVES);
    const waveActive = new Uint8Array(MAX_WAVES);
    let activeWaves = 0;

    let spriteH: HTMLCanvasElement | null = null;
    let spriteV: HTMLCanvasElement | null = null;
    let auraSprite: HTMLCanvasElement | null = null;
    let orbSprite: HTMLCanvasElement | null = null;
    const AURA_R = 340;
    const ORB_R = 380;
    let accentCss = "37, 99, 235";

    const rebuildAccent = () => {
      const rgb = accentFor(stateRef.current.isBusy, stateRef.current.isOnline);
      accentCss = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      spriteH = makeCometSprite(rgb, true, dpr);
      spriteV = makeCometSprite(rgb, false, dpr);
      auraSprite = makeGlowSprite(rgb, AURA_R, [[0, 0.08], [0.45, 0.035]]);
      orbSprite = makeGlowSprite(rgb, ORB_R, [[0, 0.07], [0.5, 0.025]]);
      stateRef.current.accentDirty = false;
    };

    const initGrid = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      awake = new Uint8Array(nodeCount);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          baseX[idx] = curX[idx] = c * SPACING;
          baseY[idx] = curY[idx] = r * SPACING;
          idx++;
        }
      }

      for (let i = 0; i < COMET_COUNT; i++) {
        cometHorizontal[i] = i % 2;
        cometX[i] = cometHorizontal[i] ? Math.random() * width : Math.floor(Math.random() * cols) * SPACING;
        cometY[i] = cometHorizontal[i] ? Math.floor(Math.random() * rows) * SPACING : Math.random() * height;
        cometSpeed[i] = 2.2 + Math.random() * 2;
      }
      rebuildAccent();
    };

    initGrid();

    const mouse = { x: width / 2, y: height / 2, tx: width / 2, ty: height / 2, inside: false };

    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.inside = true;
    };
    const onMouseLeave = () => {
      mouse.inside = false;
    };
    const onMouseDown = (e: MouseEvent) => {
      for (let i = 0; i < MAX_WAVES; i++) {
        if (!waveActive[i]) {
          waveActive[i] = 1;
          waveX[i] = e.clientX;
          waveY[i] = e.clientY;
          waveR[i] = 4;
          activeWaves++;
          break;
        }
      }
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(initGrid);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let last = performance.now();
    let time = 0;
    let running = true;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      // dt normalised to a 60Hz frame; clamp so a tab-switch doesn't explode the springs
      let k = (now - last) / 16.6667;
      last = now;
      if (k > 2) k = 2;
      else if (k < 0.1) k = 0.1;

      const st = stateRef.current;
      if (st.accentDirty) rebuildAccent();

      // Mouse smoothing (frame-rate independent lerp)
      const ease = 1 - Math.pow(0.84, k);
      mouse.x += (mouse.tx - mouse.x) * ease;
      mouse.y += (mouse.ty - mouse.y) * ease;
      time += (st.isBusy ? 0.03 : 0.014) * k;

      ctx.clearRect(0, 0, width, height);

      // ── Breathing orb + cursor aura (cached sprites, no per-frame gradients) ──
      if (orbSprite && auraSprite) {
        const ox = width * 0.5 + Math.cos(time * 0.6) * width * 0.2;
        const oy = height * 0.5 + Math.sin(time * 0.45) * height * 0.18;
        ctx.globalAlpha = 0.75 + Math.sin(time * 1.2) * 0.25;
        ctx.drawImage(orbSprite, ox - ORB_R, oy - ORB_R, ORB_R * 2, ORB_R * 2);
        ctx.globalAlpha = 1;
        ctx.drawImage(auraSprite, mouse.x - AURA_R, mouse.y - AURA_R, AURA_R * 2, AURA_R * 2);
      }
      ctx.strokeStyle = accentCss;
      ctx.fillStyle = accentCss;

      // ── Shockwaves ──
      if (activeWaves > 0) {
        ctx.lineWidth = 1.8;
        for (let w = 0; w < MAX_WAVES; w++) {
          if (!waveActive[w]) continue;
          waveR[w] += 10 * k;
          if (waveR[w] >= WAVE_MAX_R) {
            waveActive[w] = 0;
            activeWaves--;
            continue;
          }
          ctx.globalAlpha = (1 - waveR[w] / WAVE_MAX_R) * 0.3;
          ctx.beginPath();
          ctx.arc(waveX[w], waveY[w], waveR[w], 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ── Magnetic grid (only nodes that are awake) ──
      const spring = 0.14 * k;
      const damp = Math.pow(0.8, k);
      const mx = mouse.x;
      const my = mouse.y;

      // Only scan the grid cells that can be affected (cursor box) + already-awake nodes
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";

      const c0 = Math.max(0, Math.floor((mx - INFLUENCE) / SPACING));
      const c1 = Math.min(cols - 1, Math.ceil((mx + INFLUENCE) / SPACING));
      const r0 = Math.max(0, Math.floor((my - INFLUENCE) / SPACING));
      const r1 = Math.min(rows - 1, Math.ceil((my + INFLUENCE) / SPACING));
      if (mouse.inside && !reduceMotion) {
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) awake[r * cols + c] = 1;
        }
      }
      if (activeWaves > 0) {
        // waves sweep the whole grid while active (cheap: ~500 nodes)
        awake.fill(1);
      }

      for (let i = 0; i < nodeCount; i++) {
        if (!awake[i]) continue;
        const bx = baseX[i];
        const by = baseY[i];

        if (mouse.inside && !reduceMotion) {
          const dx = bx - mx;
          const dy = by - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < INFLUENCE_SQ && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / INFLUENCE) * 3.2 * k;
            vx[i] += (dx / dist) * force;
            vy[i] += (dy / dist) * force;
          }
        }

        if (activeWaves > 0) {
          for (let w = 0; w < MAX_WAVES; w++) {
            if (!waveActive[w]) continue;
            const wdx = bx - waveX[w];
            const wdy = by - waveY[w];
            const wDist = Math.sqrt(wdx * wdx + wdy * wdy);
            if (wDist > 1 && Math.abs(wDist - waveR[w]) < 26) {
              vx[i] += (wdx / wDist) * 4 * k;
              vy[i] += (wdy / wDist) * 4 * k;
            }
          }
        }

        vx[i] = (vx[i] + (bx - curX[i]) * spring) * damp;
        vy[i] = (vy[i] + (by - curY[i]) * spring) * damp;
        curX[i] += vx[i] * k;
        curY[i] += vy[i] * k;

        const dispX = curX[i] - bx;
        const dispY = curY[i] - by;
        const dispSq = dispX * dispX + dispY * dispY;

        if (dispSq > 0.36) {
          const disp = Math.sqrt(dispSq);
          const len = Math.min(disp * 2.5, 22) / disp;
          const tx = curX[i] + dispX * len;
          const ty = curY[i] + dispY * len;
          const a = Math.min(disp / 14, 0.85);
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.moveTo(curX[i], curY[i]);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.globalAlpha = a * 0.7;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (dispSq < 0.0004 && vx[i] * vx[i] + vy[i] * vy[i] < 0.0004) {
          // fully settled → put the node to sleep
          curX[i] = bx;
          curY[i] = by;
          vx[i] = vy[i] = 0;
          awake[i] = 0;
        }
      }

      // ── Data comets (sprites) ──
      if (!reduceMotion && spriteH && spriteV) {
        ctx.globalAlpha = 1;
        const speedMul = (st.isBusy ? 2 : 1) * k;
        const half = 4;
        for (let c = 0; c < COMET_COUNT; c++) {
          if (cometHorizontal[c]) {
            cometX[c] += cometSpeed[c] * speedMul;
            if (cometX[c] > width + 80) {
              cometX[c] = -80;
              cometY[c] = Math.floor(Math.random() * rows) * SPACING;
            }
            ctx.drawImage(spriteH, cometX[c] - COMET_TAIL, cometY[c] - half, COMET_TAIL + 6, 8);
          } else {
            cometY[c] += cometSpeed[c] * speedMul;
            if (cometY[c] > height + 80) {
              cometY[c] = -80;
              cometX[c] = Math.floor(Math.random() * cols) * SPACING;
            }
            ctx.drawImage(spriteV, cometX[c] - half, cometY[c] - COMET_TAIL, 8, COMET_TAIL + 6);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      animId = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(animId);
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibilityChange);

    animId = requestAnimationFrame(render);

    return () => {
      stop();
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div ref={rootRef} className="nx-bg-root" aria-hidden="true">
      <div className="nx-bg-grid" />
      <canvas ref={canvasRef} className="nx-bg-canvas" />
    </div>
  );
}
