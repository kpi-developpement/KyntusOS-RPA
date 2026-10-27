"use client";

import React, { useEffect, useRef } from "react";

interface OdometerProps {
  value: number;
}

export default function Odometer({ value }: OdometerProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const target = Math.max(0, Math.floor(value ?? 0));
    const str = target.toLocaleString("en-US");
    const prevStr = prevRef.current !== null ? prevRef.current.toLocaleString("en-US") : "";

    // Build DOM if not built or if digit count changes
    if (host.dataset.built !== "1" || str.length !== prevStr.length) {
      host.innerHTML = "";
      str.split("").forEach((ch) => {
        if (/\d/.test(ch)) {
          const strip = document.createElement("span");
          strip.className = "odo-strip";
          for (let d = 0; d <= 9; d++) {
            const dd = document.createElement("span");
            dd.textContent = String(d);
            strip.appendChild(dd);
          }
          // Set initial target transform immediately so no unclipped glitch occurs
          strip.style.transform = `translate3d(0, -${Number(ch)}em, 0)`;
          host.appendChild(strip);
        } else {
          const st = document.createElement("span");
          st.className = "odo-sep";
          st.textContent = ch;
          host.appendChild(st);
        }
      });
      host.dataset.built = "1";
    }

    // Animate to new values smoothly with GPU translate3d
    const strips = host.querySelectorAll<HTMLSpanElement>(".odo-strip");
    let si = 0;
    const rafId = requestAnimationFrame(() => {
      for (const ch of str) {
        if (/\d/.test(ch)) {
          const strip = strips[si++];
          if (!strip) continue;
          strip.style.transform = `translate3d(0, -${Number(ch)}em, 0)`;
        }
      }
    });

    prevRef.current = target;
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <span ref={hostRef} className="odo" />;
}