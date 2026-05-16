import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Scroll document to top on every client-side route change (marketing, marketplace, app).
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.scrollingElement?.scrollTo(0, 0);
  }, [location]);

  return null;
}
