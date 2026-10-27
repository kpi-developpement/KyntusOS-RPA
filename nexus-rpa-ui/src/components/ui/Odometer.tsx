"use client";

import React, { useEffect, useRef } from "react";

/* ============================================================
   ODOMETER — rolling digit KPI
   • Props: { value: number }
   • Renders one .odo-strip (0..9 column) per digit.
   • Mounts at 0, then after a double-rAF slides every strip
     to the target digit with translate3d (GPU only).
   • Same digit change later = instant smooth re-roll
     because strips stay mounted (no unmount flicker).
   • Commas / decimal point rendered as static spans.
   ============================================================ */

interface OdometerProps {
  value: number;
}

export default function Odometer({ value }: OdometerProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const target = Math.max(0, Math.floor(value));
    const str = target.toLocaleString("en-US"); // adds commas
    const prevStr = prevRef.current.toLocaleString("en-US");

    // build DOM once per digit-count/layout change
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

    // position every strip at its digit
    const strips = host.querySelectorAll<HTMLSpanElement>(".odo-strip");
    let si = 0;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        for (const ch of str) {
          if (/\d/.test(ch)) {
            const strip = strips[si++];
            if (!strip) continue;
            strip.style.transform = `translate3d(0, -${Number(ch)}em, 0)`;
          }
        }
      });
      // store raf2 so cleanup could cancel it if needed
      (host as any).__raf2 = raf2;
    });
    (host as any).__raf1 = raf1;

    prevRef.current = target;
  }, [value]);

  return <span ref={hostRef} className="odo" />;
}