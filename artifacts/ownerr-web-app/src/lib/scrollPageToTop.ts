/** Reset window + in-app scroll regions after navigation or step changes. */
export function scrollPageToTop(): void {
  if (typeof window === "undefined") return;

  const opts: ScrollToOptions = { top: 0, left: 0, behavior: "auto" };
  window.scrollTo(opts);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.scrollingElement?.scrollTo(opts);

  document
    .querySelectorAll<HTMLElement>("[data-scroll-reset]")
    .forEach((el) => {
      el.scrollTop = 0;
    });

  document.querySelectorAll<HTMLElement>("main").forEach((el) => {
    el.scrollTop = 0;
  });
}
