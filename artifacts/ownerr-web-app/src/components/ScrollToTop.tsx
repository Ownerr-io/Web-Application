import { useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { scrollPageToTop } from "@/lib/scrollPageToTop";

let scrollRestorationPatched = false;

/**
 * Scroll document (and nested scroll roots) to top on every client-side route change.
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    if (
      !scrollRestorationPatched &&
      typeof history !== "undefined" &&
      "scrollRestoration" in history
    ) {
      history.scrollRestoration = "manual";
      scrollRestorationPatched = true;
    }

    scrollPageToTop();
    const raf = requestAnimationFrame(() => scrollPageToTop());
    return () => cancelAnimationFrame(raf);
  }, [location]);

  return null;
}
