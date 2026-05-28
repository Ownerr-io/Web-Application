import {
  r as t,
  j as e,
  I as x,
  B as p,
  F as h,
  G as f,
} from "./index-B-37iCee.js";
function v() {
  const [r, l] = t.useState(""),
    [n, c] = t.useState(!1),
    [a, u] = t.useState(null),
    [i, d] = t.useState(null);
  async function m() {
    (c(!0), d(null));
    try {
      const s = await f(r.trim() || void 0);
      u(s);
    } catch {
      d("Failed to load analytics.");
    } finally {
      c(!1);
    }
  }
  return (
    t.useEffect(() => {
      m();
    }, []),
    e.jsxs("div", {
      className: "mx-auto max-w-[1000px] px-4 py-10",
      children: [
        e.jsx("h1", {
          className: "text-2xl font-bold text-[color:var(--terminal-fg)]",
          children: "Founder viral analytics",
        }),
        e.jsxs("p", {
          className: "mt-2 text-sm text-[color:var(--terminal-muted)]",
          children: [
            "Internal view. Set the admin key in Supabase (",
            e.jsx("code", {
              className: "text-[color:var(--terminal-ochre)]",
              children: "founder_admin_secrets",
            }),
            ") and enter the same value below.",
          ],
        }),
        e.jsxs("div", {
          className: "mt-6 flex max-w-md gap-2",
          children: [
            e.jsx(x, {
              type: "password",
              placeholder: "Admin key (optional for local IDB)",
              value: r,
              onChange: (s) => l(s.target.value),
              className:
                "border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]",
            }),
            e.jsx(p, {
              type: "button",
              onClick: m,
              disabled: n,
              className:
                "bg-[color:var(--terminal-ochre)] font-bold text-[color:var(--brand-accent-ink)]",
              children: n
                ? e.jsx(h, { className: "h-4 w-4 animate-spin" })
                : "Refresh",
            }),
          ],
        }),
        i
          ? e.jsx("p", {
              className: "mt-4 text-sm text-destructive",
              children: i,
            })
          : null,
        a
          ? e.jsxs("div", {
              className: "mt-8 grid gap-6 sm:grid-cols-3",
              children: [
                e.jsx(o, {
                  label: "Founders submitted",
                  value: a.totalFounders,
                }),
                e.jsx(o, {
                  label: "Referral clicks",
                  value: a.totalReferralClicks,
                }),
                e.jsx(o, { label: "Conversions", value: a.totalConversions }),
              ],
            })
          : null,
        a?.topFounders.length
          ? e.jsxs("section", {
              className: "mt-10",
              children: [
                e.jsx("h2", {
                  className: "text-lg font-bold",
                  children: "Top viral founders",
                }),
                e.jsx("ul", {
                  className: "mt-4 space-y-2 text-sm",
                  children: a.topFounders.map((s) =>
                    e.jsxs(
                      "li",
                      {
                        className:
                          "flex flex-wrap justify-between gap-2 rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2",
                        children: [
                          e.jsxs("span", {
                            children: [s.founderName, " · ", s.startupName],
                          }),
                          e.jsxs("span", {
                            className:
                              "font-mono text-[color:var(--terminal-muted)]",
                            children: [
                              "visits ",
                              s.visitCount,
                              " · signups ",
                              s.referralSignupCount,
                              " · score ",
                              s.viralScore,
                            ],
                          }),
                        ],
                      },
                      s.id,
                    ),
                  ),
                }),
              ],
            })
          : null,
        a?.topStartups.length
          ? e.jsxs("section", {
              className: "mt-10",
              children: [
                e.jsx("h2", {
                  className: "text-lg font-bold",
                  children: "Most shared startups",
                }),
                e.jsx("ul", {
                  className: "mt-4 space-y-2 text-sm",
                  children: a.topStartups.map((s) =>
                    e.jsxs(
                      "li",
                      {
                        className:
                          "flex justify-between rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2",
                        children: [
                          e.jsx("span", { children: s.startupName }),
                          e.jsxs("span", {
                            className: "text-[color:var(--terminal-muted)]",
                            children: [
                              s.founders,
                              " founders · ",
                              s.visitCount,
                              " visits",
                            ],
                          }),
                        ],
                      },
                      s.startupName,
                    ),
                  ),
                }),
              ],
            })
          : null,
        a?.trafficSources.length
          ? e.jsxs("section", {
              className: "mt-10",
              children: [
                e.jsx("h2", {
                  className: "text-lg font-bold",
                  children: "Traffic sources",
                }),
                e.jsx("ul", {
                  className: "mt-4 space-y-2 text-sm",
                  children: a.trafficSources.map((s) =>
                    e.jsxs(
                      "li",
                      {
                        className:
                          "flex justify-between rounded-[10px] border border-[color:var(--terminal-border)] px-3 py-2",
                        children: [
                          e.jsx("span", { children: s.sourcePlatform }),
                          e.jsx("span", { children: s.count }),
                        ],
                      },
                      s.sourcePlatform,
                    ),
                  ),
                }),
              ],
            })
          : null,
      ],
    })
  );
}
function o({ label: r, value: l }) {
  return e.jsxs("div", {
    className:
      "rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] p-4",
    children: [
      e.jsx("p", {
        className:
          "text-xs uppercase tracking-widest text-[color:var(--terminal-muted)]",
        children: r,
      }),
      e.jsx("p", {
        className: "mt-2 text-3xl font-bold text-[color:var(--terminal-ochre)]",
        children: l,
      }),
    ],
  });
}
export { v as default };
