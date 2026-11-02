"use client";

/**
 * NEXUS ORCHESTRATOR — SCROLL CHOREOGRAPHER
 * ---------------------------------------------------------------------------
 * Drives every scroll-linked motion on the web dashboard without touching
 * page.tsx. Mounted once from app/web/layout.tsx.
 *
 *  1. Scroll progress  -> writes --web-scroll (0..1) on .web-root
 *  2. Condensed deck   -> toggles .is-scrolled on .web-nav past a threshold
 *  3. Reveal on enter  -> IntersectionObserver adds .is-in to [data-reveal]
 *                         elements, with a per-row stagger via --ri
 *  4. Back-to-top      -> appears after 420px, smooth scrolls home
 *
 * Everything animated here is transform/opacity only, so it stays on the
 * compositor. Reveals are one-shot (unobserved once played), so scrolling a
 * long list costs nothing after the first pass.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Elements that get the rise-and-fade reveal. */
const REVEAL_SELECTOR = [
  ".web-kpi-card",
  ".web-toolbar",
  ".transformer-card-assembly",
  ".web-user-row",
  ".web-users-layout > div",
  ".web-section-reveal",
].join(",");

const SCROLL_THRESHOLD = 24;
const TOP_BUTTON_AT = 420;

export default function ScrollChoreographer() {
  const [showTop, setShowTop] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  const scrollToTop = useCallback(() => {
    rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let teardown: (() => void) | null = null;
    let waiter: MutationObserver | null = null;

    /** Wire everything up against the real scroll container. */
    const setup = (root: HTMLElement): (() => void) => {
      rootRef.current = root;

      const reduceMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

      // ─────────────────── 1 + 2 + 4 : scroll-driven state ───────────────────
      const nav = document.querySelector<HTMLElement>(".web-nav");
      let scrollRaf = 0;
      let lastScrolled = false;
      let lastTopVisible = false;

      const applyScroll = () => {
        scrollRaf = 0;
        const max = root.scrollHeight - root.clientHeight;
        const top = root.scrollTop;
        const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
        root.style.setProperty("--web-scroll", progress.toFixed(4));

        const scrolled = top > SCROLL_THRESHOLD;
        if (scrolled !== lastScrolled) {
          lastScrolled = scrolled;
          nav?.classList.toggle("is-scrolled", scrolled);
        }

        const topVisible = top > TOP_BUTTON_AT;
        if (topVisible !== lastTopVisible) {
          lastTopVisible = topVisible;
          setShowTop(topVisible);
        }
      };

      const onScroll = () => {
        if (!scrollRaf) scrollRaf = requestAnimationFrame(applyScroll);
      };

      root.addEventListener("scroll", onScroll, { passive: true });
      applyScroll();

      // ───────────────────────── 3 : reveal on enter ─────────────────────────
      let observer: IntersectionObserver | null = null;
      let scanRaf = 0;

      if (!reduceMotion) {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add("is-in");
              observer!.unobserve(entry.target);
            }
          },
          { root, rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
        );
      }

      const scan = () => {
        const nodes = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
        nodes.forEach((el) => {
          if (el.hasAttribute("data-reveal")) return;
          el.setAttribute("data-reveal", "");

          if (!observer) {
            // reduced motion: show immediately, no animation
            el.classList.add("is-in");
            return;
          }

          // stagger index = position among its siblings, capped so a long
          // list never waits a full second to appear
          const siblings = el.parentElement?.children;
          const idx = siblings
            ? Math.min(Array.prototype.indexOf.call(siblings, el), 7)
            : 0;
          el.style.setProperty("--ri", String(Math.max(0, idx)));
          observer.observe(el);
        });
      };

      scan();

      // Tab switches / filtering / refresh mount new cards — pick them up.
      const mutObserver = new MutationObserver(() => {
        if (!scanRaf) {
          scanRaf = requestAnimationFrame(() => {
            scanRaf = 0;
            scan();
          });
        }
      });
      mutObserver.observe(root, { childList: true, subtree: true });

      return () => {
        root.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(scrollRaf);
        cancelAnimationFrame(scanRaf);
        observer?.disconnect();
        mutObserver.disconnect();
      };
    };

    // .web-root only mounts once WebAuthContext has restored the session from
    // localStorage, which happens after this effect runs. So wait for it
    // instead of giving up on the first look.
    const boot = () => {
      const root = document.querySelector<HTMLElement>(".web-root");
      if (!root) return false;
      waiter?.disconnect();
      waiter = null;
      teardown = setup(root);
      return true;
    };

    if (!boot()) {
      waiter = new MutationObserver(() => {
        boot();
      });
      waiter.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      waiter?.disconnect();
      teardown?.();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`web-to-top ${showTop ? "is-visible" : ""}`}
      title="Back to top"
      aria-label="Back to top"
      tabIndex={showTop ? 0 : -1}
    >
      <ArrowUp size={18} />
    </button>
  );
}