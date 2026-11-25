"use client";

import { useEffect } from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Follows the opening scene as the page scrolls: sets how far the page has slid up over the
 * photo (--veil, 0 to 1, on the photo behind the page), which globals.css turns into the fade
 * to its blurred copy, and keeps the site header dark while it is over the photo.
 */
export function IntroMotion({ sceneId }: { sceneId: string }) {
  useEffect(() => {
    const scene = document.getElementById(sceneId);
    if (!scene) return;
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const backdrop = document.querySelector<HTMLElement>("[data-intro-backdrop]");
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
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      window.removeEventListener("pageshow", schedule);
      header?.removeAttribute("data-theme");
    };
  }, [sceneId]);

  return null;
}
