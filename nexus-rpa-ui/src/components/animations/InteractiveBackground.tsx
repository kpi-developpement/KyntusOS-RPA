"use client";

/**
 * NEXUS INTERACTIVE BACKGROUND — "Turbo v3 · Constellation"
 * ------------------------------------------------------------------
 * Same identity as before (dot grid, magnetic needles, data comets, click
 * shockwaves, cursor aura + breathing orb), plus:
 *
 *  • Magnetic mesh      thin lines between displaced neighbour nodes, so the
 *                       grid bends like fabric around the cursor
 *  • Cursor reticle     a quiet targeting ring that follows the cursor and
 *                       pulses on click (fits an RPA "click target" tool)
 *  • Node sparks        comets light up the grid nodes they cross
 *  • Data pulse         a diagonal scan sweeps the grid every few seconds
 *                       (faster while a robot is running)
 *  • Double shockwave   click sends two rings + a spark burst
 *
 * Performance rules:
 *  • Static dot grid + register marks live in ONE static CSS layer (painted
 *    once); the canvas only draws what moves
 *  • Glows / comets are pre-rendered sprites (drawImage, no gradients per frame)
 *  • Strokes are BATCHED by alpha bucket: a handful of stroke() calls per frame
 *    instead of one per needle
 *  • Delta-time physics: identical feel at 60 / 144 / 240 / 360 Hz
 *  • Sleeping nodes are skipped; paused when the window is hidden
 *  • Props are read through refs (no engine re-init); prefers-reduced-motion
 *    disables everything decorative
 */

import React, { useEffect, useRef } from "react";

interface Props {
  isBusy?: boolean;
  isOnline?: boolean;
}

const SPACING = 48;
const INFLUENCE = 190;
const INFLUENCE_SQ = INFLUENCE * INFLUENCE;
const COMET_COUNT = 9;
const COMET_TAIL = 60;
const MAX_WAVES = 8;
const WAVE_MAX_R = 360;
const MAX_SPARKS = 40;
const SWEEP_BAND = 70; // half-width of the diagonal data pulse, px
const SWEEP_DURATION = 2.4; // seconds for one pass across the screen

type RGB = [number, number, number];

/** 70/30 white-blue: every state stays in the blue family (no red, no black). */
const accentFor = (isBusy: boolean, isOnline: boolean): RGB =>
  !isOnline ? [99, 127, 179] : isBusy ? [2, 132, 199] : [37, 99, 235];

/** Soft radial glow rendered ONCE at half resolution; drawn scaled with drawImage. */
function makeGlowSprite(rgb: RGB, radius: number, stops: [number, number][]) {
  const size = Math.ceil(radius);
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
function makeCometSprite(rgb: RGB, horizontal: boolean, dpr: number) {
  const len = COMET_TAIL + 8;
  const thick = 10;
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
  grad.addColorStop(0.7, `rgba(${r},${gg},${b},0.28)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0.6)`);
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
  // head: soft halo + bright core
  const hx = horizontal ? COMET_TAIL : mid;
  const hy = horizontal ? mid : COMET_TAIL;
  const halo = g.createRadialGradient(hx, hy, 0, hx, hy, 4.5);
  halo.addColorStop(0, `rgba(${r},${gg},${b},0.45)`);
  halo.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = halo;
  g.beginPath();
  g.arc(hx, hy, 4.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = `rgba(${r},${gg},${b},0.85)`;
  g.beginPath();
  g.arc(hx, hy, 2, 0, Math.PI * 2);
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
    rootRef.current?.classList.toggle("is-busy", isBusy);
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

    // ── grid state (flat typed arrays, zero GC) ──
    let baseX = new Float32Array(0);
    let baseY = new Float32Array(0);
    let curX = new Float32Array(0);
    let curY = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let disp = new Float32Array(0); // displacement magnitude this frame
    let awake = new Uint8Array(0);
    let awakeList = new Int32Array(0);
    let nodeCount = 0;

    // ── comets ──
    const cometX = new Float32Array(COMET_COUNT);
    const cometY = new Float32Array(COMET_COUNT);
    const cometSpeed = new Float32Array(COMET_COUNT);
    const cometHorizontal = new Uint8Array(COMET_COUNT);

    // ── shockwaves ──
    const waveX = new Float32Array(MAX_WAVES);
    const waveY = new Float32Array(MAX_WAVES);
    const waveR = new Float32Array(MAX_WAVES);
    const waveActive = new Uint8Array(MAX_WAVES);
    let activeWaves = 0;

    // ── node sparks ──
    const sparkX = new Float32Array(MAX_SPARKS);
    const sparkY = new Float32Array(MAX_SPARKS);
    const sparkT = new Float32Array(MAX_SPARKS); // age 0..1
    const sparkActive = new Uint8Array(MAX_SPARKS);
    let activeSparks = 0;

    // ── sprites / colour ──
    let spriteH: HTMLCanvasElement | null = null;
    let spriteV: HTMLCanvasElement | null = null;
    let auraSprite: HTMLCanvasElement | null = null;
    let orbSprite: HTMLCanvasElement | null = null;
    let orb2Sprite: HTMLCanvasElement | null = null;

    const AURA_R = 340;
    const ORB_R = 380;
    let accentCss = "rgb(37, 99, 235)";

    const rebuildAccent = () => {
      const rgb = accentFor(stateRef.current.isBusy, stateRef.current.isOnline);
      accentCss = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      spriteH = makeCometSprite(rgb, true, dpr);
      spriteV = makeCometSprite(rgb, false, dpr);
      auraSprite = makeGlowSprite(rgb, AURA_R, [[0, 0.085], [0.45, 0.035]]);
      orbSprite = makeGlowSprite(rgb, ORB_R, [[0, 0.07], [0.5, 0.025]]);
      // second orb in sky blue for depth (still inside the blue family)
      orb2Sprite = makeGlowSprite([56, 189, 248], ORB_R, [[0, 0.05], [0.5, 0.018]]);
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
      disp = new Float32Array(nodeCount);
      awake = new Uint8Array(nodeCount);
      awakeList = new Int32Array(nodeCount);

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
        cometSpeed[i] = 2 + Math.random() * 2.2;
      }
      rebuildAccent();
    };

    initGrid();

    const spawnSpark = (x: number, y: number) => {
      for (let i = 0; i < MAX_SPARKS; i++) {
        if (!sparkActive[i]) {
          sparkActive[i] = 1;
          sparkX[i] = x;
          sparkY[i] = y;
          sparkT[i] = 0;
          activeSparks++;
          return;
        }
      }
    };

    const spawnWave = (x: number, y: number, startR: number) => {
      for (let i = 0; i < MAX_WAVES; i++) {
        if (!waveActive[i]) {
          waveActive[i] = 1;
          waveX[i] = x;
          waveY[i] = y;
          waveR[i] = startR;
          activeWaves++;
          return;
        }
      }
    };

    const mouse = { x: width / 2, y: height / 2, tx: width / 2, ty: height / 2, inside: false };
    let reticleAlpha = 0;
    let reticlePulse = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.inside = true;
    };
    const onMouseLeave = () => {
      mouse.inside = false;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (reduceMotion) return;
      spawnWave(e.clientX, e.clientY, 4);
      spawnWave(e.clientX, e.clientY, -46); // second ring, slightly delayed
      reticlePulse = 1;
      // light up the 4 grid nodes around the click
      const c = Math.floor(e.clientX / SPACING);
      const r = Math.floor(e.clientY / SPACING);
      spawnSpark(c * SPACING, r * SPACING);
      spawnSpark((c + 1) * SPACING, r * SPACING);
      spawnSpark(c * SPACING, (r + 1) * SPACING);
      spawnSpark((c + 1) * SPACING, (r + 1) * SPACING);
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
    let sweepClock = 1.2; // seconds until the first pulse
    let sweepT = -1; // -1 = idle, else 0..1 progress

    // reusable bucket thresholds
    const NEEDLE_ALPHAS = [0.22, 0.42, 0.62, 0.82];
    const MESH_ALPHAS = [0.08, 0.15, 0.24];

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      // dt normalised to a 60Hz frame; clamp so a tab-switch doesn't explode the springs
      const dtSec = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
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

      // ── 1. Ambient glows: two drifting orbs + cursor aura (cached sprites) ──
      if (orbSprite && orb2Sprite && auraSprite) {
        const ox = width * 0.5 + Math.cos(time * 0.6) * width * 0.22;
        const oy = height * 0.5 + Math.sin(time * 0.45) * height * 0.2;
        ctx.globalAlpha = 0.75 + Math.sin(time * 1.2) * 0.25;
        ctx.drawImage(orbSprite, ox - ORB_R, oy - ORB_R, ORB_R * 2, ORB_R * 2);
        const o2x = width * 0.5 + Math.cos(time * 0.38 + 2.2) * width * 0.3;
        const o2y = height * 0.45 + Math.sin(time * 0.52 + 1.1) * height * 0.24;
        ctx.globalAlpha = 0.7 + Math.cos(time * 0.9) * 0.3;
        ctx.drawImage(orb2Sprite, o2x - ORB_R, o2y - ORB_R, ORB_R * 2, ORB_R * 2);
        ctx.globalAlpha = 1;
        ctx.drawImage(auraSprite, mouse.x - AURA_R, mouse.y - AURA_R, AURA_R * 2, AURA_R * 2);
      }

      ctx.strokeStyle = accentCss;
      ctx.fillStyle = accentCss;
      ctx.lineCap = "round";

      // ── 2. Diagonal data pulse (dots light up as the band passes) ──
      if (!reduceMotion) {
        if (sweepT < 0) {
          sweepClock -= dtSec;
          if (sweepClock <= 0) sweepT = 0;
        } else {
          sweepT += dtSec / (st.isBusy ? SWEEP_DURATION * 0.7 : SWEEP_DURATION);
          if (sweepT >= 1) {
            sweepT = -1;
            sweepClock = st.isBusy ? 2.6 : 6.5;
          } else {
            const span = width + height + SWEEP_BAND * 2;
            const d = -SWEEP_BAND + sweepT * span; // band centre on the u = x + y axis
            const lo = d - SWEEP_BAND;
            const hi = d + SWEEP_BAND;
            for (let pass = 0; pass < 2; pass++) {
              ctx.globalAlpha = pass === 0 ? 0.22 : 0.5;
              ctx.beginPath();
              for (let r = 0; r < rows; r++) {
                const y = r * SPACING;
                const cMin = Math.max(0, Math.ceil((lo - y) / SPACING));
                const cMax = Math.min(cols - 1, Math.floor((hi - y) / SPACING));
                for (let c = cMin; c <= cMax; c++) {
                  const x = c * SPACING;
                  const t = 1 - Math.abs(x + y - d) / SWEEP_BAND; // 0 at edge, 1 at centre
                  if ((pass === 0 && t < 0.55) || (pass === 1 && t >= 0.55)) {
                    const s = pass === 0 ? 1.4 : 1.9;
                    ctx.rect(x - s, y - s, s * 2, s * 2);
                  }
                }
              }
              ctx.fill();
            }
          }
        }
      }

      // ── 3. Shockwaves (double ring) ──
      if (activeWaves > 0) {
        ctx.lineWidth = 1.6;
        for (let w = 0; w < MAX_WAVES; w++) {
          if (!waveActive[w]) continue;
          waveR[w] += 10 * k;
          if (waveR[w] >= WAVE_MAX_R) {
            waveActive[w] = 0;
            activeWaves--;
            continue;
          }
          if (waveR[w] <= 0) continue; // delayed second ring not born yet
          ctx.globalAlpha = (1 - waveR[w] / WAVE_MAX_R) * 0.3;
          ctx.beginPath();
          ctx.arc(waveX[w], waveY[w], waveR[w], 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ── 4. Magnetic grid physics (only awake nodes) ──
      const spring = 0.14 * k;
      const damp = Math.pow(0.8, k);
      const mx = mouse.x;
      const my = mouse.y;
      const mouseActive = mouse.inside && !reduceMotion;

      if (mouseActive) {
        const c0 = Math.max(0, Math.floor((mx - INFLUENCE) / SPACING));
        const c1 = Math.min(cols - 1, Math.ceil((mx + INFLUENCE) / SPACING));
        const r0 = Math.max(0, Math.floor((my - INFLUENCE) / SPACING));
        const r1 = Math.min(rows - 1, Math.ceil((my + INFLUENCE) / SPACING));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) awake[r * cols + c] = 1;
        }
      }
      if (activeWaves > 0) awake.fill(1); // waves sweep the whole grid (~500 nodes, cheap)

      let awakeCount = 0;
      for (let i = 0; i < nodeCount; i++) {
        if (!awake[i]) {
          disp[i] = 0;
          continue;
        }
        const bx = baseX[i];
        const by = baseY[i];

        if (mouseActive) {
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
            if (!waveActive[w] || waveR[w] <= 0) continue;
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

        const dX = curX[i] - bx;
        const dY = curY[i] - by;
        const dSq = dX * dX + dY * dY;

        if (dSq < 0.0004 && vx[i] * vx[i] + vy[i] * vy[i] < 0.0004) {
          // fully settled → sleep
          curX[i] = bx;
          curY[i] = by;
          vx[i] = vy[i] = 0;
          awake[i] = 0;
          disp[i] = 0;
          continue;
        }
        disp[i] = Math.sqrt(dSq);
        awakeList[awakeCount++] = i;
      }

      // ── 5. Magnetic mesh: link displaced neighbours (3 batched strokes) ──
      if (awakeCount > 0) {
        ctx.lineWidth = 1;
        for (let b = 0; b < 3; b++) {
          ctx.globalAlpha = MESH_ALPHAS[b];
          ctx.beginPath();
          for (let n = 0; n < awakeCount; n++) {
            const i = awakeList[n];
            const di = disp[i];
            if (di < 0.6) continue;
            // right neighbour (same row)
            if ((i % cols) < cols - 1) {
              const j = i + 1;
              const dj = disp[j];
              if (dj >= 0.6) {
                const m = (di + dj) * 0.5;
                const bucket = m < 3 ? 0 : m < 7 ? 1 : 2;
                if (bucket === b) {
                  ctx.moveTo(curX[i], curY[i]);
                  ctx.lineTo(curX[j], curY[j]);
                }
              }
            }
            // down neighbour
            const j2 = i + cols;
            if (j2 < nodeCount) {
              const dj = disp[j2];
              if (dj >= 0.6) {
                const m = (di + dj) * 0.5;
                const bucket = m < 3 ? 0 : m < 7 ? 1 : 2;
                if (bucket === b) {
                  ctx.moveTo(curX[i], curY[i]);
                  ctx.lineTo(curX[j2], curY[j2]);
                }
              }
            }
          }
          ctx.stroke();
        }

        // ── 6. Needles + tip dots (4 alpha buckets → 8 draw calls total) ──
        ctx.lineWidth = 1.6;
        for (let b = 0; b < 4; b++) {
          const lo = b === 0 ? 0 : (b / 4) * 0.85;
          const hi = ((b + 1) / 4) * 0.85 + (b === 3 ? 1 : 0);
          ctx.globalAlpha = NEEDLE_ALPHAS[b];
          ctx.beginPath();
          let any = false;
          for (let n = 0; n < awakeCount; n++) {
            const i = awakeList[n];
            const d = disp[i];
            if (d <= 0.6) continue;
            const a = Math.min(d / 14, 0.85);
            if (a < lo || a >= hi) continue;
            const len = Math.min(d * 2.5, 22) / d;
            const dX = curX[i] - baseX[i];
            const dY = curY[i] - baseY[i];
            ctx.moveTo(curX[i], curY[i]);
            ctx.lineTo(curX[i] + dX * len, curY[i] + dY * len);
            any = true;
          }
          if (!any) continue;
          ctx.stroke();
          ctx.globalAlpha = NEEDLE_ALPHAS[b] * 0.75;
          ctx.beginPath();
          for (let n = 0; n < awakeCount; n++) {
            const i = awakeList[n];
            const d = disp[i];
            if (d <= 0.6) continue;
            const a = Math.min(d / 14, 0.85);
            if (a < lo || a >= hi) continue;
            const len = Math.min(d * 2.5, 22) / d;
            const tx = curX[i] + (curX[i] - baseX[i]) * len;
            const ty = curY[i] + (curY[i] - baseY[i]) * len;
            ctx.moveTo(tx + 1.8, ty);
            ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      // ── 7. Data comets (sprites) — spark the nodes they cross ──
      if (!reduceMotion && spriteH && spriteV) {
        ctx.globalAlpha = 1;
        const speedMul = (st.isBusy ? 2 : 1) * k;
        for (let c = 0; c < COMET_COUNT; c++) {
          if (cometHorizontal[c]) {
            const prev = cometX[c];
            cometX[c] += cometSpeed[c] * speedMul;
            if (cometX[c] > width + 80) {
              cometX[c] = -80;
              cometY[c] = Math.floor(Math.random() * rows) * SPACING;
            } else if (Math.floor(prev / SPACING) !== Math.floor(cometX[c] / SPACING) && Math.random() < 0.3) {
              spawnSpark(Math.floor(cometX[c] / SPACING) * SPACING, cometY[c]);
            }
            ctx.drawImage(spriteH, cometX[c] - COMET_TAIL, cometY[c] - 5, COMET_TAIL + 8, 10);
          } else {
            const prev = cometY[c];
            cometY[c] += cometSpeed[c] * speedMul;
            if (cometY[c] > height + 80) {
              cometY[c] = -80;
              cometX[c] = Math.floor(Math.random() * cols) * SPACING;
            } else if (Math.floor(prev / SPACING) !== Math.floor(cometY[c] / SPACING) && Math.random() < 0.3) {
              spawnSpark(cometX[c], Math.floor(cometY[c] / SPACING) * SPACING);
            }
            ctx.drawImage(spriteV, cometX[c] - 5, cometY[c] - COMET_TAIL, 10, COMET_TAIL + 8);
          }
        }
      }

      // ── 8. Node sparks (expanding ring + core) ──
      if (activeSparks > 0) {
        ctx.lineWidth = 1.2;
        for (let s = 0; s < MAX_SPARKS; s++) {
          if (!sparkActive[s]) continue;
          sparkT[s] += 0.032 * k;
          if (sparkT[s] >= 1) {
            sparkActive[s] = 0;
            activeSparks--;
            continue;
          }
          const t = sparkT[s];
          const fade = 1 - t;
          ctx.globalAlpha = fade * 0.45;
          ctx.beginPath();
          ctx.arc(sparkX[s], sparkY[s], 2 + t * 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = fade * 0.7;
          ctx.beginPath();
          ctx.arc(sparkX[s], sparkY[s], 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── 9. Cursor reticle ──
      if (!reduceMotion) {
        const target = mouse.inside ? 1 : 0;
        reticleAlpha += (target - reticleAlpha) * (1 - Math.pow(0.82, k));
        reticlePulse *= Math.pow(0.9, k);
        if (reticleAlpha > 0.02) {
          const r = 15 + reticlePulse * 12;
          const spin = time * 1.6;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.32 * reticleAlpha;
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.55 * reticleAlpha;
          ctx.beginPath();
          for (let q = 0; q < 4; q++) {
            const a = spin + (q * Math.PI) / 2;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            ctx.moveTo(mouse.x + ca * (r + 3), mouse.y + sa * (r + 3));
            ctx.lineTo(mouse.x + ca * (r + 8), mouse.y + sa * (r + 8));
          }
          ctx.stroke();
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