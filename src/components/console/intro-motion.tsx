"use client";

import { useEffect } from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Drives the opening scene from the scroll position: how far the bands have lit up (--copy),
 * the buttons (--cta), and how far the page has slid up over the photo (--veil, on the photo
 * behind the page), each 0 to 1. The CSS in globals.css does the rest. Also keeps the site
 * header dark while it is over the photo. Nothing moves for anyone who asks their device for
 * less motion: the scene then shows whole, and only the header and the photo's fade change.
 */
export function IntroMotion({ sceneId }: { sceneId: string }) {
  useEffect(() => {
    const scene = document.getElementById(sceneId);
    if (!scene) return;
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const backdrop = document.querySelector<HTMLElement>("[data-intro-backdrop]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    function update() {
      frame = 0;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      if (header) {
        if (rect.bottom > header.offsetHeight) header.setAttribute("data-theme", "dark");
        else header.removeAttribute("data-theme");
      }
      // 0 while the scene fills the screen, 1 once the page covers most of it.
      const veil = clamp((window.innerHeight - rect.bottom) / (window.innerHeight * 0.45));
      backdrop?.style.setProperty("--veil", veil.toFixed(4));
      backdrop?.toggleAttribute("data-covered", veil >= 1);
      if (reduce.matches) return;

      const run = rect.height - window.innerHeight;
      const progress = run > 0 ? clamp(-rect.top / run) : 0;
      const cta = easeOut(clamp((progress - 0.55) / 0.2));
      scene.style.setProperty("--copy", clamp((progress - 0.04) / 0.5).toFixed(4));
      scene.style.setProperty("--cta", cta.toFixed(4));
      scene.toggleAttribute("data-cta", cta > 0.5);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    // A reload or Back can put the page back where it was after this first look.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    window.addEventListener("pageshow", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      window.removeEventListener("pageshow", schedule);
      reduce.removeEventListener("change", schedule);
      header?.removeAttribute("data-theme");
    };
  }, [sceneId]);

  return null;
}
