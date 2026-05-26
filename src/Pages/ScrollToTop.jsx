// ScrollToTop.jsx
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

function findScrollableElement() {
  const candidates = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById("root"),
    document.querySelector(".app-container"),
    document.querySelector(".scroll-container"),
  ].filter(Boolean);

  // also check a few top-level body children (limit to 10)
  Array.from(document.body.children).slice(0, 10).forEach(c => candidates.push(c));

  for (const el of candidates) {
    try {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      // element is scrollable if content is larger and overflow allows scrolling
      if (el.scrollHeight > el.clientHeight && /(auto|scroll|overlay)/.test(overflowY)) {
        return el;
      }
    } catch (e) {
      // ignore cross-origin or weird nodes
    }
  }
  // fallback
  return document.scrollingElement || document.documentElement;
}

export default function ScrollToTop({ selector } = {}) {
  const location = useLocation();

  useLayoutEffect(() => {
    const el = selector ? document.querySelector(selector) : findScrollableElement();
    if (!el) return;

    // immediate attempt
    if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } else {
      el.scrollTop = 0;
    }

    // extra attempt after paint (safe-guard for transitions)
    requestAnimationFrame(() => {
      if (el) el.scrollTop = 0;
    });
  }, [location.pathname, location.search, location.hash, selector]);

  return null;
}
