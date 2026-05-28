import {
  r as d,
  R as P,
  H as Ze,
  J as Ee,
  K as Qe,
  j as r,
  P as _e,
  N as et,
  O as tt,
  Q as rt,
  T as nt,
  c as se,
  U as at,
  W as st,
  X as F,
  L as ot,
  Y as je,
  d as it,
  $ as Fe,
  a0 as we,
  a1 as lt,
  a2 as ke,
} from "./index-B-37iCee.js";
import {
  S as Se,
  a as ct,
  f as me,
  L as U,
  b as dt,
  A as ut,
  i as te,
  c as mt,
  d as $e,
  E as ft,
  g as ae,
  e as ht,
  h as pt,
  C as xt,
  j as G,
  k as yt,
  u as gt,
  G as bt,
  l as Be,
  m as Ae,
  n as De,
  B as q,
  X as E,
  Y as _,
  o as Ke,
  R as D,
  p as K,
  T as I,
  q as fe,
} from "./generateCategoricalChart-Hp5p9eTs.js";
function V(e) {
  "@babel/helpers - typeof";
  return (
    (V =
      typeof Symbol == "function" && typeof Symbol.iterator == "symbol"
        ? function (t) {
            return typeof t;
          }
        : function (t) {
            return t &&
              typeof Symbol == "function" &&
              t.constructor === Symbol &&
              t !== Symbol.prototype
              ? "symbol"
              : typeof t;
          }),
    V(e)
  );
}
function vt(e, t) {
  if (!(e instanceof t))
    throw new TypeError("Cannot call a class as a function");
}
function jt(e, t) {
  for (var n = 0; n < t.length; n++) {
    var a = t[n];
    ((a.enumerable = a.enumerable || !1),
      (a.configurable = !0),
      "value" in a && (a.writable = !0),
      Object.defineProperty(e, Le(a.key), a));
  }
}
function wt(e, t, n) {
  return (
    t && jt(e.prototype, t),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function kt(e, t, n) {
  return (
    (t = oe(t)),
    Nt(
      e,
      Ie() ? Reflect.construct(t, n || [], oe(e).constructor) : t.apply(e, n),
    )
  );
}
function Nt(e, t) {
  if (t && (V(t) === "object" || typeof t == "function")) return t;
  if (t !== void 0)
    throw new TypeError(
      "Derived constructors may only return object or undefined",
    );
  return St(e);
}
function St(e) {
  if (e === void 0)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called",
    );
  return e;
}
function Ie() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {}),
    );
  } catch {}
  return (Ie = function () {
    return !!e;
  })();
}
function oe(e) {
  return (
    (oe = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (n) {
          return n.__proto__ || Object.getPrototypeOf(n);
        }),
    oe(e)
  );
}
function At(e, t) {
  if (typeof t != "function" && t !== null)
    throw new TypeError("Super expression must either be null or a function");
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    t && be(e, t));
}
function be(e, t) {
  return (
    (be = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (a, s) {
          return ((a.__proto__ = s), a);
        }),
    be(e, t)
  );
}
function ze(e, t, n) {
  return (
    (t = Le(t)),
    t in e
      ? Object.defineProperty(e, t, {
          value: n,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (e[t] = n),
    e
  );
}
function Le(e) {
  var t = Pt(e, "string");
  return V(t) == "symbol" ? t : t + "";
}
function Pt(e, t) {
  if (V(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var a = n.call(e, t);
    if (V(a) != "object") return a;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
var ce = (function (e) {
  function t() {
    return (vt(this, t), kt(this, t, arguments));
  }
  return (
    At(t, e),
    wt(t, [
      {
        key: "render",
        value: function () {
          return null;
        },
      },
    ])
  );
})(d.Component);
ze(ce, "displayName", "ZAxis");
ze(ce, "defaultProps", {
  zAxisId: 0,
  range: [64, 64],
  scale: "auto",
  type: "number",
});
var Rt = ["option", "isActive"];
function J() {
  return (
    (J = Object.assign
      ? Object.assign.bind()
      : function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var a in n)
              Object.prototype.hasOwnProperty.call(n, a) && (e[a] = n[a]);
          }
          return e;
        }),
    J.apply(this, arguments)
  );
}
function Tt(e, t) {
  if (e == null) return {};
  var n = Mt(e, t),
    a,
    s;
  if (Object.getOwnPropertySymbols) {
    var l = Object.getOwnPropertySymbols(e);
    for (s = 0; s < l.length; s++)
      ((a = l[s]),
        !(t.indexOf(a) >= 0) &&
          Object.prototype.propertyIsEnumerable.call(e, a) &&
          (n[a] = e[a]));
  }
  return n;
}
function Mt(e, t) {
  if (e == null) return {};
  var n = {};
  for (var a in e)
    if (Object.prototype.hasOwnProperty.call(e, a)) {
      if (t.indexOf(a) >= 0) continue;
      n[a] = e[a];
    }
  return n;
}
function Ot(e) {
  var t = e.option,
    n = e.isActive,
    a = Tt(e, Rt);
  return typeof t == "string"
    ? d.createElement(
        Se,
        J(
          {
            option: d.createElement(ct, J({ type: t }, a)),
            isActive: n,
            shapeType: "symbols",
          },
          a,
        ),
      )
    : d.createElement(
        Se,
        J({ option: t, isActive: n, shapeType: "symbols" }, a),
      );
}
function Y(e) {
  "@babel/helpers - typeof";
  return (
    (Y =
      typeof Symbol == "function" && typeof Symbol.iterator == "symbol"
        ? function (t) {
            return typeof t;
          }
        : function (t) {
            return t &&
              typeof Symbol == "function" &&
              t.constructor === Symbol &&
              t !== Symbol.prototype
              ? "symbol"
              : typeof t;
          }),
    Y(e)
  );
}
function Z() {
  return (
    (Z = Object.assign
      ? Object.assign.bind()
      : function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var a in n)
              Object.prototype.hasOwnProperty.call(n, a) && (e[a] = n[a]);
          }
          return e;
        }),
    Z.apply(this, arguments)
  );
}
function Pe(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    (t &&
      (a = a.filter(function (s) {
        return Object.getOwnPropertyDescriptor(e, s).enumerable;
      })),
      n.push.apply(n, a));
  }
  return n;
}
function R(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2
      ? Pe(Object(n), !0).forEach(function (a) {
          $(e, a, n[a]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : Pe(Object(n)).forEach(function (a) {
            Object.defineProperty(e, a, Object.getOwnPropertyDescriptor(n, a));
          });
  }
  return e;
}
function Ct(e, t) {
  if (!(e instanceof t))
    throw new TypeError("Cannot call a class as a function");
}
function Re(e, t) {
  for (var n = 0; n < t.length; n++) {
    var a = t[n];
    ((a.enumerable = a.enumerable || !1),
      (a.configurable = !0),
      "value" in a && (a.writable = !0),
      Object.defineProperty(e, Ge(a.key), a));
  }
}
function Et(e, t, n) {
  return (
    t && Re(e.prototype, t),
    n && Re(e, n),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function _t(e, t, n) {
  return (
    (t = ie(t)),
    Ft(
      e,
      He() ? Reflect.construct(t, n || [], ie(e).constructor) : t.apply(e, n),
    )
  );
}
function Ft(e, t) {
  if (t && (Y(t) === "object" || typeof t == "function")) return t;
  if (t !== void 0)
    throw new TypeError(
      "Derived constructors may only return object or undefined",
    );
  return $t(e);
}
function $t(e) {
  if (e === void 0)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called",
    );
  return e;
}
function He() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {}),
    );
  } catch {}
  return (He = function () {
    return !!e;
  })();
}
function ie(e) {
  return (
    (ie = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (n) {
          return n.__proto__ || Object.getPrototypeOf(n);
        }),
    ie(e)
  );
}
function Bt(e, t) {
  if (typeof t != "function" && t !== null)
    throw new TypeError("Super expression must either be null or a function");
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    t && ve(e, t));
}
function ve(e, t) {
  return (
    (ve = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (a, s) {
          return ((a.__proto__ = s), a);
        }),
    ve(e, t)
  );
}
function $(e, t, n) {
  return (
    (t = Ge(t)),
    t in e
      ? Object.defineProperty(e, t, {
          value: n,
          enumerable: !0,
          configurable: !0,
          writable: !0,
        })
      : (e[t] = n),
    e
  );
}
function Ge(e) {
  var t = Dt(e, "string");
  return Y(t) == "symbol" ? t : t + "";
}
function Dt(e, t) {
  if (Y(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var a = n.call(e, t);
    if (Y(a) != "object") return a;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return String(e);
}
var L = (function (e) {
  function t() {
    var n;
    Ct(this, t);
    for (var a = arguments.length, s = new Array(a), l = 0; l < a; l++)
      s[l] = arguments[l];
    return (
      (n = _t(this, t, [].concat(s))),
      $(n, "state", { isAnimationFinished: !1 }),
      $(n, "handleAnimationEnd", function () {
        n.setState({ isAnimationFinished: !0 });
      }),
      $(n, "handleAnimationStart", function () {
        n.setState({ isAnimationFinished: !1 });
      }),
      $(n, "id", gt("recharts-scatter-")),
      n
    );
  }
  return (
    Bt(t, e),
    Et(
      t,
      [
        {
          key: "renderSymbolsStatically",
          value: function (a) {
            var s = this,
              l = this.props,
              m = l.shape,
              v = l.activeShape,
              y = l.activeIndex,
              x = me(this.props, !1);
            return a.map(function (c, f) {
              var p = y === f,
                u = p ? v : m,
                j = R(R({}, x), c);
              return P.createElement(
                U,
                Z(
                  {
                    className: "recharts-scatter-symbol",
                    key: "symbol-"
                      .concat(c?.cx, "-")
                      .concat(c?.cy, "-")
                      .concat(c?.size, "-")
                      .concat(f),
                  },
                  dt(s.props, c, f),
                  { role: "img" },
                ),
                P.createElement(
                  Ot,
                  Z({ option: u, isActive: p, key: "symbol-".concat(f) }, j),
                ),
              );
            });
          },
        },
        {
          key: "renderSymbolsWithAnimation",
          value: function () {
            var a = this,
              s = this.props,
              l = s.points,
              m = s.isAnimationActive,
              v = s.animationBegin,
              y = s.animationDuration,
              x = s.animationEasing,
              c = s.animationId,
              f = this.state.prevPoints;
            return P.createElement(
              ut,
              {
                begin: v,
                duration: y,
                isActive: m,
                easing: x,
                from: { t: 0 },
                to: { t: 1 },
                key: "pie-".concat(c),
                onAnimationEnd: this.handleAnimationEnd,
                onAnimationStart: this.handleAnimationStart,
              },
              function (p) {
                var u = p.t,
                  j = l.map(function (b, w) {
                    var g = f && f[w];
                    if (g) {
                      var N = te(g.cx, b.cx),
                        h = te(g.cy, b.cy),
                        o = te(g.size, b.size);
                      return R(
                        R({}, b),
                        {},
                        { cx: N(u), cy: h(u), size: o(u) },
                      );
                    }
                    var C = te(0, b.size);
                    return R(R({}, b), {}, { size: C(u) });
                  });
                return P.createElement(U, null, a.renderSymbolsStatically(j));
              },
            );
          },
        },
        {
          key: "renderSymbols",
          value: function () {
            var a = this.props,
              s = a.points,
              l = a.isAnimationActive,
              m = this.state.prevPoints;
            return l && s && s.length && (!m || !mt(m, s))
              ? this.renderSymbolsWithAnimation()
              : this.renderSymbolsStatically(s);
          },
        },
        {
          key: "renderErrorBar",
          value: function () {
            var a = this.props.isAnimationActive;
            if (a && !this.state.isAnimationFinished) return null;
            var s = this.props,
              l = s.points,
              m = s.xAxis,
              v = s.yAxis,
              y = s.children,
              x = $e(y, ft);
            return x
              ? x.map(function (c, f) {
                  var p = c.props,
                    u = p.direction,
                    j = p.dataKey;
                  return P.cloneElement(c, {
                    key: "".concat(u, "-").concat(j, "-").concat(l[f]),
                    data: l,
                    xAxis: m,
                    yAxis: v,
                    layout: u === "x" ? "vertical" : "horizontal",
                    dataPointFormatter: function (w, g) {
                      return {
                        x: w.cx,
                        y: w.cy,
                        value: u === "x" ? +w.node.x : +w.node.y,
                        errorVal: ae(w, g),
                      };
                    },
                  });
                })
              : null;
          },
        },
        {
          key: "renderLine",
          value: function () {
            var a = this.props,
              s = a.points,
              l = a.line,
              m = a.lineType,
              v = a.lineJointType,
              y = me(this.props, !1),
              x = me(l, !1),
              c,
              f;
            if (m === "joint")
              c = s.map(function (h) {
                return { x: h.cx, y: h.cy };
              });
            else if (m === "fitting") {
              var p = ht(s),
                u = p.xmin,
                j = p.xmax,
                b = p.a,
                w = p.b,
                g = function (o) {
                  return b * o + w;
                };
              c = [
                { x: u, y: g(u) },
                { x: j, y: g(j) },
              ];
            }
            var N = R(
              R(R({}, y), {}, { fill: "none", stroke: y && y.fill }, x),
              {},
              { points: c },
            );
            return (
              P.isValidElement(l)
                ? (f = P.cloneElement(l, N))
                : pt(l)
                  ? (f = l(N))
                  : (f = P.createElement(xt, Z({}, N, { type: v }))),
              P.createElement(
                U,
                {
                  className: "recharts-scatter-line",
                  key: "recharts-scatter-line",
                },
                f,
              )
            );
          },
        },
        {
          key: "render",
          value: function () {
            var a = this.props,
              s = a.hide,
              l = a.points,
              m = a.line,
              v = a.className,
              y = a.xAxis,
              x = a.yAxis,
              c = a.left,
              f = a.top,
              p = a.width,
              u = a.height,
              j = a.id,
              b = a.isAnimationActive;
            if (s || !l || !l.length) return null;
            var w = this.state.isAnimationFinished,
              g = Ze("recharts-scatter", v),
              N = y && y.allowDataOverflow,
              h = x && x.allowDataOverflow,
              o = N || h,
              C = G(j) ? this.id : j;
            return P.createElement(
              U,
              {
                className: g,
                clipPath: o ? "url(#clipPath-".concat(C, ")") : null,
              },
              N || h
                ? P.createElement(
                    "defs",
                    null,
                    P.createElement(
                      "clipPath",
                      { id: "clipPath-".concat(C) },
                      P.createElement("rect", {
                        x: N ? c : c - p / 2,
                        y: h ? f : f - u / 2,
                        width: N ? p : p * 2,
                        height: h ? u : u * 2,
                      }),
                    ),
                  )
                : null,
              m && this.renderLine(),
              this.renderErrorBar(),
              P.createElement(
                U,
                { key: "recharts-scatter-symbols" },
                this.renderSymbols(),
              ),
              (!b || w) && yt.renderCallByParent(this.props, l),
            );
          },
        },
      ],
      [
        {
          key: "getDerivedStateFromProps",
          value: function (a, s) {
            return a.animationId !== s.prevAnimationId
              ? {
                  prevAnimationId: a.animationId,
                  curPoints: a.points,
                  prevPoints: s.curPoints,
                }
              : a.points !== s.curPoints
                ? { curPoints: a.points }
                : null;
          },
        },
      ],
    )
  );
})(d.PureComponent);
$(L, "displayName", "Scatter");
$(L, "defaultProps", {
  xAxisId: 0,
  yAxisId: 0,
  zAxisId: 0,
  legendType: "circle",
  lineType: "joint",
  lineJointType: "linear",
  data: [],
  shape: "circle",
  hide: !1,
  isAnimationActive: !bt.isSsr,
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: "linear",
});
$(L, "getComposedData", function (e) {
  var t = e.xAxis,
    n = e.yAxis,
    a = e.zAxis,
    s = e.item,
    l = e.displayedData,
    m = e.xAxisTicks,
    v = e.yAxisTicks,
    y = e.offset,
    x = s.props.tooltipType,
    c = $e(s.props.children, Be),
    f = G(t.dataKey) ? s.props.dataKey : t.dataKey,
    p = G(n.dataKey) ? s.props.dataKey : n.dataKey,
    u = a && a.dataKey,
    j = a ? a.range : ce.defaultProps.range,
    b = j && j[0],
    w = t.scale.bandwidth ? t.scale.bandwidth() : 0,
    g = n.scale.bandwidth ? n.scale.bandwidth() : 0,
    N = l.map(function (h, o) {
      var C = ae(h, f),
        Q = ae(h, p),
        B = (!G(u) && ae(h, u)) || "-",
        i = [
          {
            name: G(t.dataKey) ? s.props.name : t.name || t.dataKey,
            unit: t.unit || "",
            value: C,
            payload: h,
            dataKey: f,
            type: x,
          },
          {
            name: G(n.dataKey) ? s.props.name : n.name || n.dataKey,
            unit: n.unit || "",
            value: Q,
            payload: h,
            dataKey: p,
            type: x,
          },
        ];
      B !== "-" &&
        i.push({
          name: a.name || a.dataKey,
          unit: a.unit || "",
          value: B,
          payload: h,
          dataKey: u,
          type: x,
        });
      var k = Ae({
          axis: t,
          ticks: m,
          bandSize: w,
          entry: h,
          index: o,
          dataKey: f,
        }),
        H = Ae({
          axis: n,
          ticks: v,
          bandSize: g,
          entry: h,
          index: o,
          dataKey: p,
        }),
        Ne = B !== "-" ? a.scale(B) : b,
        ee = Math.sqrt(Math.max(Ne, 0) / Math.PI);
      return R(
        R({}, h),
        {},
        {
          cx: k,
          cy: H,
          x: k - ee,
          y: H - ee,
          xAxis: t,
          yAxis: n,
          zAxis: a,
          width: 2 * ee,
          height: 2 * ee,
          size: Ne,
          node: { x: C, y: Q, z: B },
          tooltipPayload: i,
          tooltipPosition: { x: k, y: H },
          payload: h,
        },
        c && c[o] && c[o].props,
      );
    });
  return R({ points: N }, y);
});
var re = De({
    chartName: "BarChart",
    GraphicalChild: q,
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: ["axis", "item"],
    axisComponents: [
      { axisType: "xAxis", AxisComp: E },
      { axisType: "yAxis", AxisComp: _ },
    ],
    formatAxisMap: Ke,
  }),
  he = De({
    chartName: "ScatterChart",
    GraphicalChild: L,
    defaultTooltipEventType: "item",
    validateTooltipEventTypes: ["item"],
    axisComponents: [
      { axisType: "xAxis", AxisComp: E },
      { axisType: "yAxis", AxisComp: _ },
      { axisType: "zAxis", AxisComp: ce },
    ],
    formatAxisMap: Ke,
  }),
  de = "Switch",
  [Kt] = nt(de),
  [It, zt] = Kt(de),
  We = d.forwardRef((e, t) => {
    const {
        __scopeSwitch: n,
        name: a,
        checked: s,
        defaultChecked: l,
        required: m,
        disabled: v,
        value: y = "on",
        onCheckedChange: x,
        form: c,
        ...f
      } = e,
      [p, u] = d.useState(null),
      j = Ee(t, (h) => u(h)),
      b = d.useRef(!1),
      w = p ? c || !!p.closest("form") : !0,
      [g, N] = Qe({ prop: s, defaultProp: l ?? !1, onChange: x, caller: de });
    return r.jsxs(It, {
      scope: n,
      checked: g,
      disabled: v,
      children: [
        r.jsx(_e.button, {
          type: "button",
          role: "switch",
          "aria-checked": g,
          "aria-required": m,
          "data-state": Xe(g),
          "data-disabled": v ? "" : void 0,
          disabled: v,
          value: y,
          ...f,
          ref: j,
          onClick: et(e.onClick, (h) => {
            (N((o) => !o),
              w &&
                ((b.current = h.isPropagationStopped()),
                b.current || h.stopPropagation()));
          }),
        }),
        w &&
          r.jsx(Ue, {
            control: p,
            bubbles: !b.current,
            name: a,
            value: y,
            checked: g,
            required: m,
            disabled: v,
            form: c,
            style: { transform: "translateX(-100%)" },
          }),
      ],
    });
  });
We.displayName = de;
var Ve = "SwitchThumb",
  Ye = d.forwardRef((e, t) => {
    const { __scopeSwitch: n, ...a } = e,
      s = zt(Ve, n);
    return r.jsx(_e.span, {
      "data-state": Xe(s.checked),
      "data-disabled": s.disabled ? "" : void 0,
      ...a,
      ref: t,
    });
  });
Ye.displayName = Ve;
var Lt = "SwitchBubbleInput",
  Ue = d.forwardRef(
    (
      { __scopeSwitch: e, control: t, checked: n, bubbles: a = !0, ...s },
      l,
    ) => {
      const m = d.useRef(null),
        v = Ee(m, l),
        y = tt(n),
        x = rt(t);
      return (
        d.useEffect(() => {
          const c = m.current;
          if (!c) return;
          const f = window.HTMLInputElement.prototype,
            u = Object.getOwnPropertyDescriptor(f, "checked").set;
          if (y !== n && u) {
            const j = new Event("click", { bubbles: a });
            (u.call(c, n), c.dispatchEvent(j));
          }
        }, [y, n, a]),
        r.jsx("input", {
          type: "checkbox",
          "aria-hidden": !0,
          defaultChecked: n,
          ...s,
          tabIndex: -1,
          ref: v,
          style: {
            ...s.style,
            ...x,
            position: "absolute",
            pointerEvents: "none",
            opacity: 0,
            margin: 0,
          },
        })
      );
    },
  );
Ue.displayName = Lt;
function Xe(e) {
  return e ? "checked" : "unchecked";
}
var qe = We,
  Ht = Ye;
const W = d.forwardRef(({ className: e, ...t }, n) =>
  r.jsx(qe, {
    className: se(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      e,
    ),
    ...t,
    ref: n,
    children: r.jsx(Ht, {
      className: se(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      ),
    }),
  }),
);
W.displayName = qe.displayName;
const Te = [
    { iso2: "US", name: "United States" },
    { iso2: "GB", name: "United Kingdom" },
    { iso2: "DE", name: "Germany" },
    { iso2: "FR", name: "France" },
    { iso2: "CA", name: "Canada" },
    { iso2: "AU", name: "Australia" },
    { iso2: "IN", name: "India" },
    { iso2: "NL", name: "Netherlands" },
    { iso2: "SE", name: "Sweden" },
    { iso2: "BR", name: "Brazil" },
    { iso2: "JP", name: "Japan" },
    { iso2: "ES", name: "Spain" },
    { iso2: "IT", name: "Italy" },
    { iso2: "PL", name: "Poland" },
    { iso2: "IE", name: "Ireland" },
  ],
  Gt = {
    "Artificial Intelligence": ["Python", "Next.js", "OpenAI", "Vercel"],
    SaaS: ["Next.js", "Postgres", "Ruby on Rails", "React"],
    "Mobile Apps": ["Swift", "Kotlin", "React Native", "Flutter"],
    "Developer Tools": ["Go", "Rust", "TypeScript", "Node.js"],
    Marketing: ["Node.js", "Next.js", "Postgres", "Supabase"],
    "Content Creation": ["Next.js", "Remix", "Postgres", "Svelte"],
    "Crypto & Web3": ["Solidity", "TypeScript", "Next.js", "Node.js"],
    Education: ["Next.js", "Python", "Django", "Postgres"],
    Health: ["Node.js", "Postgres", "React", "Python"],
    "Customer Support": ["Next.js", "Ruby", "Postgres", "Node.js"],
    "Social Media": ["Node.js", "Next.js", "Postgres", "Go"],
  },
  Wt = [
    "Next.js",
    "Node.js",
    "Python",
    "React",
    "Postgres",
    "Go",
    "Ruby on Rails",
    "TypeScript",
    "Swift",
    "Svelte",
    "Django",
    "OpenAI",
    "Vercel",
    "Remix",
    "Supabase",
    "Flutter",
    "Kotlin",
    "Solidity",
    "Rust",
    "Vue",
  ];
function ue(e) {
  let t = 2166136261;
  for (let n = 0; n < e.length; n++)
    ((t ^= e.charCodeAt(n)), (t = Math.imul(t, 16777619)));
  return Math.abs(t);
}
function le(e, t) {
  return (ue(e + t) % 1e6) / 1e6;
}
function Vt(e, t) {
  const n = le(e, "xf"),
    a = le(t, "xf2"),
    s = (n * 0.6 + a * 0.4) ** 1.6;
  return Math.max(1, Math.min(2e5, Math.round(1 + s * 199999)));
}
function Me(e, t) {
  const n = le(e, t) ** 0.55;
  return Math.max(0.1, Math.min(200, 0.1 + n * 199.9));
}
function Yt(e, t) {
  const n = ue(e + t) % Te.length;
  return Te[n];
}
function Ut(e) {
  const t = Gt[e.category] ?? Wt,
    n = ue(e.slug) % t.length;
  return t[n] ?? "Next.js";
}
function Je(e) {
  const t = 2026 - e.foundedYear,
    n = (ue(e.slug) % 330) - 100;
  return Math.max(5, t * 365 + n);
}
function Xt(e) {
  const t = Math.max(1, Je(e) / 30),
    n = e.revenue,
    a = (s) =>
      Math.max(
        1,
        Math.min(
          120,
          Math.round(
            t * (s / Math.max(n, 1)) * (0.4 + le(e.slug, "m" + s) * 0.6),
          ),
        ),
      );
  return { m1k: a(1e3), m10k: a(1e4), m100k: a(1e5) };
}
function qt(e) {
  const { iso2: t, name: n } = Yt(e.slug, e.founderHandle),
    a = Xt(e);
  return {
    ...e,
    xFollowers: Vt(e.slug, e.founderHandle),
    xFollowerGrowthPct: Me(e.slug, "xfg"),
    revGrowthComparePct: Me(e.slug, "rvg"),
    countryIso2: t,
    countryName: n,
    techStack: Ut(e),
    daysInBusiness: Je(e),
    monthsTo1k: a.m1k,
    monthsTo10k: a.m10k,
    monthsTo100k: a.m100k,
    arr: e.revenue * 12,
  };
}
function pe(e) {
  return at.find((t) => t.handle === e);
}
function Jt(e) {
  return e.map(qt);
}
function Zt(e) {
  const t = new Map();
  for (const n of e) t.set(n.techStack, (t.get(n.techStack) ?? 0) + n.revenue);
  return [...t.entries()].sort((n, a) => a[1] - n[1]).slice(0, 12);
}
function Qt(e) {
  const t = new Map();
  for (const n of e) {
    const a = t.get(n.category) ?? { total: 0, sumGrowth: 0, n: 0 };
    ((a.total += n.revenue), (a.n += 1));
    const s = n.revenueGrowth30dPct ?? n.momGrowth;
    ((a.sumGrowth += s), t.set(n.category, a));
  }
  return [...t.entries()]
    .map(([n, a]) => ({
      category: n,
      totalRevenue: a.total * 12,
      mrr: a.total,
      growth30d: a.n > 0 ? a.sumGrowth / a.n : 0,
      n: a.n,
    }))
    .sort((n, a) => a.mrr - n.mrr);
}
function er(e) {
  const t = new Map();
  for (const n of e) {
    const a = t.get(n.countryIso2) ?? { mrr: 0, count: 0, name: n.countryName };
    ((a.mrr += n.revenue), (a.count += 1), t.set(n.countryIso2, a));
  }
  return [...t.entries()]
    .map(([n, a]) => ({
      iso: n,
      name: a.name,
      totalMrr: a.mrr,
      count: a.count,
      arr: a.mrr * 12,
    }))
    .sort((n, a) => a.totalMrr - n.totalMrr);
}
function tr(e, t = 10) {
  return [...e]
    .filter((n) => n.arr >= 1e6)
    .sort((n, a) => n.xFollowers - a.xFollowers)
    .slice(0, t);
}
function rr(e) {
  let t = 0;
  for (const n of e) n.revGrowthComparePct > n.xFollowerGrowthPct && t++;
  return {
    above: t,
    n: e.length,
    pct: e.length ? Math.round((100 * t) / e.length) : 0,
  };
}
function Oe(e, t) {
  return t === "revenue"
    ? [
        { name: "< $5k", test: (s) => s < 5e3 },
        { name: "$5k–$10k", test: (s) => s >= 5e3 && s < 1e4 },
        { name: "$10k–$50k", test: (s) => s >= 1e4 && s < 5e4 },
        { name: "$50k–$100k", test: (s) => s >= 5e4 && s < 1e5 },
        { name: "≥ $100k", test: (s) => s >= 1e5 },
      ].map((s) => ({
        name: s.name,
        count: e.filter((l) => s.test(l.revenue)).length,
      }))
    : [
        { name: "< 1k", test: (a) => a < 1e3 },
        { name: "1k – 5k", test: (a) => a >= 1e3 && a < 5e3 },
        { name: "5k – 10k", test: (a) => a >= 5e3 && a < 1e4 },
        { name: "10k – 50k", test: (a) => a >= 1e4 && a < 5e4 },
        { name: "≥ 50k", test: (a) => a >= 5e4 },
      ].map((a) => ({
        name: a.name,
        count: e.filter((s) => a.test(s.xFollowers)).length,
      }));
}
function nr(e) {
  return [
    { milestone: "To $1k MRR", months: xe(e.map((t) => t.monthsTo1k)) },
    { milestone: "To $10k MRR", months: xe(e.map((t) => t.monthsTo10k)) },
    { milestone: "To $100k MRR", months: xe(e.map((t) => t.monthsTo100k)) },
  ];
}
function xe(e) {
  return e.length
    ? Math.round((e.reduce((t, n) => t + n, 0) / e.length) * 10) / 10
    : 0;
}
const T =
    "rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5",
  M =
    "font-mono text-sm font-bold tracking-tight text-[color:var(--terminal-display)]",
  O = "mp-body text-xs",
  ye = { top: 20, right: 28, left: 60, bottom: 72 };
function z(e, t) {
  return {
    value: e,
    position: "bottom",
    offset: 18,
    style: { fill: t, fontSize: 12, fontWeight: 500, textAnchor: "middle" },
  };
}
function X(e, t) {
  return {
    value: e,
    angle: -90,
    position: "insideLeft",
    offset: 4,
    style: { fill: t, fontSize: 12, fontWeight: 500, textAnchor: "middle" },
  };
}
const ge = "mt-3 overflow-x-auto rounded-lg border border-border",
  S =
    "mp-label border-b border-border bg-muted/50 px-3 py-2 text-left text-[10px] font-mono uppercase",
  A = "mp-body border-b border-border/80 px-3 py-2 text-xs";
function ne(e) {
  return e >= 1e6
    ? `${(e / 1e6).toFixed(0)}M`
    : e >= 1e3
      ? `${(e / 1e3).toFixed(0)}K`
      : String(e);
}
function ar() {
  const e = d.useMemo(() => Jt(lt), []),
    t = d.useMemo(() => Zt(e), [e]),
    n = d.useMemo(() => Qt(e), [e]),
    a = d.useMemo(() => er(e), [e]),
    s = d.useMemo(() => tr(e, 10), [e]),
    l = d.useMemo(() => rr(e), [e]),
    m = d.useMemo(() => Oe(e, "revenue"), [e]),
    v = d.useMemo(() => Oe(e, "xFollowers"), [e]),
    y = d.useMemo(() => nr(e), [e]),
    [x, c] = d.useState(!0),
    [f, p] = d.useState(!0),
    [u, j] = d.useState(!0),
    [b, w] = d.useState(!0),
    [g, N] = d.useState(!0),
    h = st(),
    o = d.useMemo(
      () =>
        h
          ? {
              grid: "#27272a",
              tick: { fontSize: 10, fill: "#a1a1aa" },
              axis: "#52525b",
              tooltipBg: "#18181b",
              tooltipBorder: "#3f3f46",
              tooltipLabel: "#e4e4e7",
              bar1: "#3f3f46",
              bar2: "#52525b",
              barHi: "#e4e4e7",
              ref: "#a1a1aa",
              diag: "#71717a",
              cell0: "#e4e4e7",
              cell1: "#52525b",
            }
          : {
              grid: "#e4e4e7",
              tick: { fontSize: 10, fill: "#52525b" },
              axis: "#a1a1aa",
              tooltipBg: "#ffffff",
              tooltipBorder: "#d4d4d8",
              tooltipLabel: "#18181b",
              bar1: "#a1a1aa",
              bar2: "#d4d4d8",
              barHi: "#3f3f46",
              ref: "#737373",
              diag: "#a1a1aa",
              cell0: "#3f3f46",
              cell1: "#d4d4d8",
            },
      [h],
    ),
    C = d.useMemo(
      () =>
        e.map((i) => {
          const k = pe(i.founderHandle);
          return {
            x: i.xFollowers,
            y: i.arr,
            name: i.name,
            followers: i.xFollowers,
            slug: i.slug,
            founderHandle: i.founderHandle,
            handle: k?.twitter ?? `@${i.founderHandle}`,
            founderAvatarSeed: k?.avatarSeed ?? i.founderHandle,
          };
        }),
      [e],
    ),
    Q = d.useMemo(
      () =>
        e.map((i) => ({
          x: i.xFollowerGrowthPct,
          y: i.revGrowthComparePct,
          name: i.name,
          slug: i.slug,
          founderHandle: i.founderHandle,
          founderAvatarSeed: pe(i.founderHandle)?.avatarSeed ?? i.founderHandle,
        })),
      [e],
    ),
    B = d.useMemo(
      () =>
        e.map((i) => ({
          x: Math.max(1, i.daysInBusiness),
          y: i.revenue * 12,
          name: i.name,
          slug: i.slug,
          founderHandle: i.founderHandle,
        })),
      [e],
    );
  return r.jsxs("div", {
    className:
      "mx-auto max-w-6xl space-y-10 pb-16 font-sans text-[color:var(--terminal-fg)]",
    children: [
      r.jsxs("div", {
        children: [
          r.jsx("h1", {
            className:
              "font-mono text-2xl font-bold text-[color:var(--terminal-display)]",
            children: "Stats",
          }),
          r.jsx("p", {
            className: "mp-body mt-1 text-sm",
            children: "Verified revenue, founders, and markets across Ownerr",
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", { className: M, children: "1. Revenue distribution" }),
          r.jsx("p", {
            className: O,
            children: "Count of startups by MRR band",
          }),
          r.jsx("div", {
            className: "mt-4 h-72 w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(re, {
                data: m,
                margin: { top: 12, right: 12, left: 44, bottom: 32 },
                children: [
                  r.jsx(K, { strokeDasharray: "3 3", stroke: o.grid }),
                  r.jsx(E, {
                    dataKey: "name",
                    tick: o.tick,
                    stroke: o.axis,
                    tickMargin: 8,
                    height: 40,
                    label: z("MRR band", o.tick.fill),
                  }),
                  r.jsx(_, {
                    tick: o.tick,
                    stroke: o.axis,
                    allowDecimals: !1,
                    width: 40,
                    label: X("Startups", o.tick.fill),
                  }),
                  r.jsx(I, {
                    contentStyle: {
                      background: o.tooltipBg,
                      border: `1px solid ${o.tooltipBorder}`,
                      fontSize: 12,
                    },
                    labelStyle: { color: o.tooltipLabel },
                    formatter: (i) => [i, "Startups"],
                  }),
                  r.jsx(q, {
                    dataKey: "count",
                    radius: [4, 4, 0, 0],
                    fill: o.bar1,
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", { className: M, children: "2. Time to growth" }),
          r.jsx("p", {
            className: O,
            children:
              "Average months to reach revenue milestones (modelled from verified MRR + age)",
          }),
          r.jsx("div", {
            className: "mt-4 h-72 w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(re, {
                data: y,
                layout: "vertical",
                margin: { top: 12, right: 24, left: 12, bottom: 36 },
                children: [
                  r.jsx(K, {
                    strokeDasharray: "3 3",
                    stroke: o.grid,
                    horizontal: !1,
                  }),
                  r.jsx(E, {
                    type: "number",
                    tick: o.tick,
                    stroke: o.axis,
                    unit: " mo",
                    tickMargin: 6,
                    label: z("Average months to milestone", o.tick.fill),
                  }),
                  r.jsx(_, {
                    dataKey: "milestone",
                    type: "category",
                    width: 120,
                    tick: o.tick,
                    stroke: o.axis,
                  }),
                  r.jsx(I, {
                    contentStyle: {
                      background: o.tooltipBg,
                      border: `1px solid ${o.tooltipBorder}`,
                    },
                    formatter: (i) => [`${i} mo`, "Avg. months"],
                  }),
                  r.jsx(q, {
                    dataKey: "months",
                    fill: o.bar2,
                    radius: [0, 4, 4, 0],
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", { className: M, children: "3. Founder 𝕏 followers" }),
          r.jsx("p", {
            className: O,
            children:
              "Distribution of 𝕏 (Twitter) followers across founders in the dataset",
          }),
          r.jsx("div", {
            className: "mt-4 h-72 w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(re, {
                data: v,
                margin: { top: 12, right: 12, left: 44, bottom: 32 },
                children: [
                  r.jsx(K, { strokeDasharray: "3 3", stroke: o.grid }),
                  r.jsx(E, {
                    dataKey: "name",
                    tick: o.tick,
                    interval: 0,
                    height: 48,
                    stroke: o.axis,
                    tickMargin: 6,
                    label: z("𝕏 follower count band", o.tick.fill),
                  }),
                  r.jsx(_, {
                    tick: o.tick,
                    stroke: o.axis,
                    allowDecimals: !1,
                    width: 40,
                    label: X("Founders", o.tick.fill),
                  }),
                  r.jsx(I, {
                    contentStyle: {
                      background: o.tooltipBg,
                      border: `1px solid ${o.tooltipBorder}`,
                    },
                    formatter: (i) => [i, "Founders"],
                  }),
                  r.jsx(q, {
                    dataKey: "count",
                    radius: [4, 4, 0, 0],
                    fill: o.bar1,
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsxs("div", {
            className: "mb-2 flex flex-wrap items-start justify-between gap-3",
            children: [
              r.jsxs("div", {
                children: [
                  r.jsx("h2", {
                    className: M,
                    children: "4. Revenue vs 𝕏 followers (log scale)",
                  }),
                  r.jsx("p", {
                    className: O,
                    children:
                      "ARR (y) vs founder 𝕏 reach (x). Dashed guides at $1.5M and ~300 followers.",
                  }),
                ],
              }),
              r.jsxs("div", {
                className: "flex flex-col gap-2 sm:flex-row sm:items-center",
                children: [
                  r.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-[10px] text-muted-foreground",
                    children: [
                      r.jsx("span", { children: "Log 𝕏" }),
                      r.jsx(W, { checked: x, onCheckedChange: c }),
                    ],
                  }),
                  r.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-[10px] text-muted-foreground",
                    children: [
                      r.jsx("span", { children: "Log revenue" }),
                      r.jsx(W, { checked: f, onCheckedChange: p }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          r.jsx("div", {
            className: "h-[500px] w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(he, {
                margin: ye,
                children: [
                  r.jsx(K, { strokeDasharray: "3 3", stroke: o.grid }),
                  r.jsx(E, {
                    type: "number",
                    dataKey: "x",
                    name: "Followers",
                    scale: x ? "log" : "linear",
                    domain: x ? [1, 2e5] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    tickMargin: 10,
                    tickFormatter: ne,
                    label: z("𝕏 Followers (log scale)", o.tick.fill),
                  }),
                  r.jsx(_, {
                    type: "number",
                    dataKey: "y",
                    name: "Revenue",
                    scale: f ? "log" : "linear",
                    domain: f ? [5e4, 7e7] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    width: 56,
                    tickFormatter: ne,
                    tickMargin: 6,
                    label: X("Revenue (log scale, ARR)", o.tick.fill),
                  }),
                  r.jsx(I, {
                    content: or,
                    cursor: { strokeDasharray: "3 3" },
                    allowEscapeViewBox: { x: !0, y: !0 },
                  }),
                  r.jsx(fe, {
                    y: 15e5,
                    stroke: o.ref,
                    strokeDasharray: "4 4",
                    strokeOpacity: 0.6,
                    label: { value: "$1.5M", fill: o.ref, fontSize: 9 },
                  }),
                  r.jsx(fe, {
                    x: 300,
                    stroke: o.ref,
                    strokeDasharray: "4 4",
                    strokeOpacity: 0.6,
                    label: {
                      value: "300",
                      position: "top",
                      fill: o.ref,
                      fontSize: 9,
                    },
                  }),
                  r.jsx(L, {
                    data: C,
                    shape: Ce,
                    isAnimationActive: !1,
                    fill: o.ref,
                  }),
                ],
              }),
            }),
          }),
          r.jsx("p", {
            className:
              "mt-1 text-right font-mono text-[10px] text-muted-foreground",
            children: "Ownerr",
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsxs("div", {
            className: "mb-2 flex flex-wrap items-start justify-between gap-3",
            children: [
              r.jsxs("div", {
                children: [
                  r.jsx("h2", {
                    className: M,
                    children: "5. Follower growth vs revenue growth",
                  }),
                  r.jsx("p", {
                    className: O,
                    children:
                      "Above the diagonal = revenue growth outpaced followers · Below = followers grew faster",
                  }),
                  r.jsxs("p", {
                    className: "mt-0.5 text-[10px] text-muted-foreground",
                    children: [
                      "↑ Revenue faster · ",
                      r.jsx("span", {
                        className: "text-muted-foreground/80",
                        children: "↓ Followers faster",
                      }),
                    ],
                  }),
                ],
              }),
              r.jsxs("div", {
                className:
                  "flex items-center gap-2 text-[10px] text-muted-foreground",
                children: [
                  r.jsx("span", { children: "Log scale" }),
                  r.jsx(W, { checked: u, onCheckedChange: j }),
                ],
              }),
            ],
          }),
          r.jsx("div", {
            className: "h-[500px] w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(he, {
                margin: ye,
                children: [
                  r.jsx(K, { strokeDasharray: "3 3", stroke: o.grid }),
                  r.jsx(E, {
                    type: "number",
                    dataKey: "x",
                    name: "Follower gr.",
                    scale: u ? "log" : "linear",
                    domain: u ? [0.1, 200] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    tickMargin: 10,
                    label: z("𝕏 Follower growth % (log)", o.tick.fill),
                  }),
                  r.jsx(_, {
                    type: "number",
                    dataKey: "y",
                    name: "Revenue gr.",
                    scale: u ? "log" : "linear",
                    domain: u ? [0.1, 200] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    width: 56,
                    tickMargin: 6,
                    label: X("Revenue growth % (log)", o.tick.fill),
                  }),
                  r.jsx(I, { content: lr, cursor: { strokeDasharray: "3 3" } }),
                  r.jsx(fe, {
                    segment: [
                      { x: 0.1, y: 0.1 },
                      { x: 200, y: 200 },
                    ],
                    stroke: o.diag,
                    strokeDasharray: "5 4",
                    strokeOpacity: 0.7,
                    label: {
                      value: "Equal growth",
                      position: "insideTopLeft",
                      fill: o.diag,
                      fontSize: 9,
                    },
                  }),
                  r.jsx(L, {
                    data: Q,
                    shape: Ce,
                    isAnimationActive: !1,
                    fill: o.ref,
                  }),
                ],
              }),
            }),
          }),
          r.jsxs("div", {
            className:
              "mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground",
            children: [
              "Revenue outpaced followers in ",
              l.pct,
              "% of cases (n=",
              l.n,
              ")",
            ],
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsxs("div", {
            className: "mb-2 flex flex-wrap items-start justify-between gap-3",
            children: [
              r.jsxs("div", {
                children: [
                  r.jsx("h2", {
                    className: M,
                    children: "6. Revenue vs time in business",
                  }),
                  r.jsx("p", {
                    className: O,
                    children:
                      "ARR vs days since founded (synthetic from founded year + dataset)",
                  }),
                ],
              }),
              r.jsxs("div", {
                className: "flex flex-col gap-2 sm:flex-row sm:items-center",
                children: [
                  r.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-[10px] text-muted-foreground",
                    children: [
                      r.jsx("span", { children: "Log time" }),
                      r.jsx(W, { checked: b, onCheckedChange: w }),
                    ],
                  }),
                  r.jsxs("div", {
                    className:
                      "flex items-center gap-2 text-[10px] text-muted-foreground",
                    children: [
                      r.jsx("span", { children: "Log revenue" }),
                      r.jsx(W, { checked: g, onCheckedChange: N }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          r.jsx("div", {
            className: "h-[500px] w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(he, {
                margin: ye,
                children: [
                  r.jsx(K, { strokeDasharray: "3 3", stroke: o.grid }),
                  r.jsx(E, {
                    type: "number",
                    dataKey: "x",
                    scale: b ? "log" : "linear",
                    domain: b ? [5, 5e3] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    tickMargin: 10,
                    tickFormatter: sr,
                    label: z("Time in business (days, log scale)", o.tick.fill),
                  }),
                  r.jsx(_, {
                    type: "number",
                    dataKey: "y",
                    scale: g ? "log" : "linear",
                    domain: g ? [10, 5e7] : ["auto", "auto"],
                    tick: o.tick,
                    stroke: o.axis,
                    width: 56,
                    tickFormatter: ne,
                    tickMargin: 6,
                    label: X("Revenue (log scale, ARR)", o.tick.fill),
                  }),
                  r.jsx(I, { content: cr, cursor: { strokeDasharray: "3 3" } }),
                  r.jsx(L, {
                    data: B,
                    shape: ir,
                    isAnimationActive: !1,
                    fill: o.ref,
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", { className: M, children: "7. Startup Olympics" }),
          r.jsx("p", {
            className: O,
            children:
              "Countries ranked by total verified MRR (monthly) from the dataset",
          }),
          r.jsx("div", {
            className: ge,
            children: r.jsxs("table", {
              className: "w-full min-w-[480px] border-collapse",
              children: [
                r.jsx("thead", {
                  children: r.jsxs("tr", {
                    children: [
                      r.jsx("th", { className: S, children: "#" }),
                      r.jsx("th", { className: S, children: "Country" }),
                      r.jsx("th", { className: S, children: "Total MRR" }),
                      r.jsx("th", { className: S, children: "ARR" }),
                      r.jsx("th", { className: S, children: "Startups" }),
                    ],
                  }),
                }),
                r.jsx("tbody", {
                  children: a.map((i, k) =>
                    r.jsxs(
                      "tr",
                      {
                        className: "hover:bg-muted/50",
                        children: [
                          r.jsx("td", { className: A, children: k + 1 }),
                          r.jsxs("td", {
                            className: se(A, "font-mono font-bold"),
                            children: [
                              i.name,
                              " ",
                              r.jsxs("span", {
                                className: "text-muted-foreground",
                                children: ["(", i.iso, ")"],
                              }),
                            ],
                          }),
                          r.jsx("td", {
                            className: A,
                            children: F(i.totalMrr),
                          }),
                          r.jsx("td", { className: A, children: F(i.arr) }),
                          r.jsx("td", { className: A, children: i.count }),
                        ],
                      },
                      i.iso,
                    ),
                  ),
                }),
              ],
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", {
            className: M,
            children: "8. Top tech stacks by revenue",
          }),
          r.jsx("p", {
            className: O,
            children:
              "Aggregated MRR by inferred primary stack (deterministic from category + slug)",
          }),
          r.jsx("div", {
            className: "mt-4 h-80 w-full min-w-0 max-w-full",
            children: r.jsx(D, {
              children: r.jsxs(re, {
                data: t.map(([i, k]) => ({ name: i, mrr: k })),
                layout: "vertical",
                margin: { top: 8, right: 16, left: 8, bottom: 36 },
                children: [
                  r.jsx(K, {
                    strokeDasharray: "3 3",
                    stroke: o.grid,
                    horizontal: !1,
                  }),
                  r.jsx(E, {
                    type: "number",
                    tick: o.tick,
                    stroke: o.axis,
                    tickFormatter: ne,
                    tickMargin: 6,
                    label: z("MRR (Σ)", o.tick.fill),
                  }),
                  r.jsx(_, {
                    dataKey: "name",
                    type: "category",
                    width: 100,
                    tick: { fontSize: 9, fill: o.tick.fill },
                    stroke: o.axis,
                  }),
                  r.jsx(I, {
                    contentStyle: {
                      background: o.tooltipBg,
                      border: `1px solid ${o.tooltipBorder}`,
                    },
                    formatter: (i) => [F(i), "MRR"],
                  }),
                  r.jsx(q, {
                    dataKey: "mrr",
                    radius: [0, 3, 3, 0],
                    children: t.map((i, k) =>
                      r.jsx(Be, { fill: k === 0 ? o.cell0 : o.cell1 }, k),
                    ),
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", {
            className: M,
            children: "9. Most profitable categories",
          }),
          r.jsx("p", {
            className: O,
            children: "Totals across verified startups in each category",
          }),
          r.jsx("div", {
            className: ge,
            children: r.jsxs("table", {
              className: "w-full min-w-[520px] border-collapse",
              children: [
                r.jsx("thead", {
                  children: r.jsxs("tr", {
                    children: [
                      r.jsx("th", { className: S, children: "#" }),
                      r.jsx("th", { className: S, children: "Category" }),
                      r.jsx("th", {
                        className: S,
                        children: "Total revenue (ARR)",
                      }),
                      r.jsx("th", { className: S, children: "MRR (Σ)" }),
                      r.jsx("th", {
                        className: S,
                        children: "Growth (30d avg)",
                      }),
                    ],
                  }),
                }),
                r.jsx("tbody", {
                  children: n.map((i, k) =>
                    r.jsxs(
                      "tr",
                      {
                        className: "hover:bg-muted/50",
                        children: [
                          r.jsx("td", { className: A, children: k + 1 }),
                          r.jsx("td", {
                            className: se(A, "font-medium text-foreground"),
                            children: i.category,
                          }),
                          r.jsx("td", {
                            className: A,
                            children: F(i.totalRevenue),
                          }),
                          r.jsx("td", { className: A, children: F(i.mrr) }),
                          r.jsxs("td", {
                            className: A,
                            children: [i.growth30d.toFixed(1), "%"],
                          }),
                        ],
                      },
                      i.category,
                    ),
                  ),
                }),
              ],
            }),
          }),
        ],
      }),
      r.jsxs("section", {
        className: T,
        children: [
          r.jsx("h2", {
            className: M,
            children: "10. High revenue ($1M+ ARR), least followers",
          }),
          r.jsx("p", {
            className: O,
            children:
              "Startups with ≥ $1M ARR, sorted by lowest 𝕏 followers first",
          }),
          r.jsx("div", {
            className: ge,
            children: r.jsxs("table", {
              className: "w-full min-w-[640px] border-collapse",
              children: [
                r.jsx("thead", {
                  children: r.jsxs("tr", {
                    children: [
                      r.jsx("th", { className: S, children: "#" }),
                      r.jsx("th", { className: S, children: "Startup" }),
                      r.jsx("th", { className: S, children: "Founder" }),
                      r.jsx("th", { className: S, children: "Revenue (ARR)" }),
                      r.jsx("th", { className: S, children: "𝕏 followers" }),
                    ],
                  }),
                }),
                r.jsx("tbody", {
                  children: s.map((i, k) => {
                    const H = pe(i.founderHandle);
                    return r.jsxs(
                      "tr",
                      {
                        className: "hover:bg-muted/50",
                        children: [
                          r.jsx("td", { className: A, children: k + 1 }),
                          r.jsx("td", {
                            className: A,
                            children: r.jsxs(ot, {
                              href: it(`/startup/${i.slug}`),
                              className:
                                "inline-flex items-center gap-2 font-medium text-foreground hover:underline",
                              children: [
                                r.jsx("img", {
                                  src: je(i.name),
                                  alt: "",
                                  className:
                                    "h-7 w-7 rounded-md border border-border",
                                }),
                                i.name,
                              ],
                            }),
                          }),
                          r.jsx("td", {
                            className: A,
                            children: r.jsxs(Fe, {
                              handle: i.founderHandle,
                              className:
                                "inline-flex items-center gap-2 text-muted-foreground",
                              children: [
                                r.jsx("img", {
                                  src: we(H?.avatarSeed ?? i.founderHandle),
                                  alt: "",
                                  className:
                                    "h-7 w-7 rounded-full border border-border",
                                }),
                                r.jsx("span", {
                                  children: H?.name ?? i.founderHandle,
                                }),
                              ],
                            }),
                          }),
                          r.jsx("td", { className: A, children: F(i.arr) }),
                          r.jsx("td", {
                            className: A,
                            children: i.xFollowers.toLocaleString(),
                          }),
                        ],
                      },
                      i.slug,
                    );
                  }),
                }),
              ],
            }),
          }),
        ],
      }),
    ],
  });
}
function sr(e) {
  if (e < 1) return String(e);
  if (e < 400) return `${Math.round(e)}d`;
  const t = e / 365;
  return t < 1.2 ? `${Math.round((e / 30) * 10) / 10}m` : `${t.toFixed(1)}y`;
}
function or({ active: e, payload: t }) {
  if (!e || !t?.[0]) return null;
  const n = t[0].payload;
  return r.jsxs("div", {
    className:
      "z-50 max-w-xs rounded-lg border border-border bg-popover p-2 text-left text-popover-foreground shadow-xl",
    children: [
      r.jsxs("div", {
        className: "flex items-center gap-2 border-b border-border pb-2",
        children: [
          r.jsx("img", {
            src: je(n.name),
            alt: "",
            className: "h-8 w-8 rounded border border-border",
          }),
          r.jsxs("div", {
            children: [
              r.jsx("div", {
                className: "text-xs font-bold",
                children: r.jsx(ke, {
                  slug: n.slug,
                  className: "text-foreground",
                  children: n.name,
                }),
              }),
              r.jsxs("div", {
                className: "text-[10px] text-muted-foreground",
                children: ["ARR ", F(n.y)],
              }),
            ],
          }),
        ],
      }),
      r.jsxs("div", {
        className:
          "mt-2 flex items-center gap-2 text-[11px] text-muted-foreground",
        children: [
          r.jsx("img", {
            src: we(n.founderAvatarSeed),
            alt: "",
            className: "h-6 w-6 rounded-full border border-border",
          }),
          r.jsxs("div", {
            children: [
              r.jsx("div", {
                children: r.jsx(Fe, {
                  handle: n.founderHandle,
                  className: "text-foreground",
                  children: n.handle,
                }),
              }),
              r.jsxs("div", {
                className: "text-muted-foreground",
                children: [n.followers.toLocaleString(), " followers"],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function Ce(e) {
  const { cx: t, cy: n, payload: a, index: s } = e;
  if (t == null || n == null) return r.jsx("g", {});
  const l = a;
  if (!l?.founderAvatarSeed) return r.jsx("g", {});
  const m = `c-av-${String(t).replace(/\./g, "p")}-${String(n).replace(/\./g, "p")}-${String(s)}`;
  return r.jsxs("g", {
    children: [
      r.jsx("defs", {
        children: r.jsx("clipPath", {
          id: m,
          children: r.jsx("circle", { cx: t, cy: n, r: 8 }),
        }),
      }),
      r.jsx("image", {
        href: we(l.founderAvatarSeed),
        x: t - 8,
        y: n - 8,
        width: 16,
        height: 16,
        clipPath: `url(#${m})`,
        preserveAspectRatio: "xMidYMid slice",
      }),
      r.jsx("circle", {
        cx: t,
        cy: n,
        r: 8,
        fill: "none",
        stroke: "#fafafa",
        strokeWidth: 0.6,
        opacity: 0.85,
      }),
    ],
  });
}
function ir(e) {
  const { cx: t, cy: n, payload: a, index: s } = e;
  if (t == null || n == null) return r.jsx("g", {});
  const l = a;
  if (!l?.name) return r.jsx("g", {});
  const m = `c-lg-${String(t).replace(/\./g, "p")}-${String(n).replace(/\./g, "p")}-${String(s)}`;
  return r.jsxs("g", {
    children: [
      r.jsx("defs", {
        children: r.jsx("clipPath", {
          id: m,
          children: r.jsx("circle", { cx: t, cy: n, r: 7 }),
        }),
      }),
      r.jsx("image", {
        href: je(l.name),
        x: t - 7,
        y: n - 7,
        width: 14,
        height: 14,
        clipPath: `url(#${m})`,
        preserveAspectRatio: "xMidYMid slice",
      }),
      r.jsx("circle", {
        cx: t,
        cy: n,
        r: 7,
        fill: "none",
        stroke: "#e4e4e7",
        strokeWidth: 0.5,
        opacity: 0.6,
      }),
    ],
  });
}
function lr({ active: e, payload: t }) {
  if (!e || !t?.[0]) return null;
  const n = t[0].payload;
  return r.jsxs("div", {
    className:
      "z-50 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-xl",
    children: [
      r.jsx("div", {
        className: "font-bold text-foreground",
        children: r.jsx(ke, {
          slug: n.slug,
          className: "text-foreground",
          children: n.name,
        }),
      }),
      r.jsxs("div", {
        className: "text-muted-foreground",
        children: [
          "Revenue +",
          n.y.toFixed(1),
          "% · Followers +",
          n.x.toFixed(1),
          "%",
        ],
      }),
    ],
  });
}
function cr({ active: e, payload: t }) {
  if (!e || !t?.[0]) return null;
  const n = t[0].payload;
  return r.jsxs("div", {
    className:
      "z-50 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-xl",
    children: [
      r.jsx("div", {
        className: "font-bold text-foreground",
        children: r.jsx(ke, {
          slug: n.slug,
          className: "text-foreground",
          children: n.name,
        }),
      }),
      r.jsxs("div", { children: ["ARR ", F(n.y)] }),
      r.jsxs("div", {
        className: "text-muted-foreground",
        children: ["~", Math.round(n.x), " days in business"],
      }),
    ],
  });
}
function mr() {
  const [e, t] = d.useState(!1);
  return (
    d.useEffect(() => {
      t(!0);
    }, []),
    e
      ? r.jsx("div", {
          className: "w-full min-w-0 px-0 py-1 text-[color:var(--terminal-fg)]",
          children: r.jsx(ar, {}),
        })
      : r.jsx("div", { className: "min-h-[500px] bg-background" })
  );
}
export { mr as default };
