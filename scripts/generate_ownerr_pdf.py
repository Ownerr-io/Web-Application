"""
Ownerr.live — Technical Documentation PDF
Clean, professional, diagram-rich. No metrics, no fundraising.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    Paragraph, Spacer, HRFlowable, Table, TableStyle,
    PageBreak, BaseDocTemplate, PageTemplate, Frame,
    NextPageTemplate, KeepTogether,
)
from reportlab.lib.colors import HexColor, white, black
from reportlab.graphics.shapes import (
    Drawing, Rect, String, Line, Circle, Polygon, Path, Group
)
from reportlab.graphics import renderPDF
from reportlab.lib import colors

# ── Palette ──────────────────────────────────────────────────────────────────
NAVY        = HexColor("#0F172A")
INDIGO      = HexColor("#4F46E5")
INDIGO_LT   = HexColor("#818CF8")
INDIGO_DARK = HexColor("#3730A3")
SLATE_700   = HexColor("#334155")
SLATE_500   = HexColor("#64748B")
SLATE_300   = HexColor("#CBD5E1")
SLATE_200   = HexColor("#E2E8F0")
SLATE_100   = HexColor("#F1F5F9")
SLATE_50    = HexColor("#F8FAFC")
VIOLET_100  = HexColor("#EDE9FE")
VIOLET_200  = HexColor("#DDD6FE")
EMERALD     = HexColor("#10B981")
EMERALD_LT  = HexColor("#D1FAE5")
AMBER       = HexColor("#F59E0B")
AMBER_LT    = HexColor("#FEF3C7")
ROSE        = HexColor("#F43F5E")
CYAN        = HexColor("#0EA5E9")
PURPLE      = HexColor("#7C3AED")
WHITE       = white

W, H   = A4
MARGIN = 20 * mm
IW     = W - 2 * MARGIN

OUTPUT = "ownerr-investor-deck.pdf"

# ── Style Factory ─────────────────────────────────────────────────────────────
def PS(name, **kw):
    return ParagraphStyle(name, **kw)

EYEBROW = PS("Eyebrow", fontSize=7,   fontName="Helvetica-Bold", textColor=INDIGO,    spaceAfter=2,  leading=9)
H1      = PS("H1",      fontSize=20,  fontName="Helvetica-Bold", textColor=NAVY,      spaceAfter=4,  leading=24)
H2      = PS("H2",      fontSize=12,  fontName="Helvetica-Bold", textColor=NAVY,      spaceAfter=3,  leading=16, spaceBefore=6)
H3      = PS("H3",      fontSize=9.5, fontName="Helvetica-Bold", textColor=SLATE_700, spaceAfter=3,  leading=13, spaceBefore=4)
BODY    = PS("Body",    fontSize=9,   fontName="Helvetica",      textColor=SLATE_700, spaceAfter=4,  leading=14, alignment=TA_JUSTIFY)
BODY_L  = PS("BodyL",  fontSize=9,   fontName="Helvetica",      textColor=SLATE_700, spaceAfter=4,  leading=14, alignment=TA_LEFT)
CAPTION = PS("Caption", fontSize=7,   fontName="Helvetica-Oblique", textColor=SLATE_500, leading=10, spaceAfter=4, alignment=TA_CENTER)
MONO    = PS("Mono",   fontSize=7.5, fontName="Courier",         textColor=INDIGO_DARK, leading=11, spaceAfter=2)
LABEL   = PS("Label",  fontSize=7,   fontName="Helvetica-Bold",  textColor=SLATE_500, leading=10)
TAG_ST  = PS("Tag",    fontSize=6.5, fontName="Helvetica-Bold",  textColor=WHITE,      leading=9, alignment=TA_CENTER)

def rule(color=SLATE_200, thick=0.5):
    return HRFlowable(width="100%", thickness=thick, color=color, spaceAfter=3, spaceBefore=3)

def sp(n=5):
    return Spacer(1, n)

# ── Reusable Components ───────────────────────────────────────────────────────

def section_header(num, title):
    label = Paragraph(f"SECTION {num:02d}", EYEBROW)
    heading = Paragraph(title, H1)
    hr = HRFlowable(width="100%", thickness=1.5, color=INDIGO, spaceAfter=8, spaceBefore=2)
    return [label, heading, hr]

def tech_badge(text, color=INDIGO):
    style = PS("badge", fontSize=6.5, fontName="Helvetica-Bold", textColor=WHITE,
               leading=9, alignment=TA_CENTER)
    t = Table([[Paragraph(text, style)]])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), color),
        ("TOPPADDING",    (0,0),(-1,-1), 2),
        ("BOTTOMPADDING", (0,0),(-1,-1), 2),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [3,3,3,3]),
    ]))
    return t

def info_box(text, accent=INDIGO, bg=VIOLET_100):
    t = Table([[Paragraph(text, PS("ib", fontSize=9, fontName="Helvetica",
                                   textColor=SLATE_700, leading=14))]], colWidths=[IW])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), bg),
        ("LINEBEFORE",   (0,0),(0,-1),  3.5, accent),
        ("BOX",          (0,0),(-1,-1), 0.5, VIOLET_200),
        ("LEFTPADDING",  (0,0),(-1,-1), 12),
        ("RIGHTPADDING", (0,0),(-1,-1), 12),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ]))
    return t

def prop_table(rows, col1_w=50*mm):
    col2_w = IW - col1_w
    data = []
    for k, v in rows:
        data.append([
            Paragraph(k, PS("k", fontSize=8, fontName="Helvetica-Bold", textColor=SLATE_700, leading=12)),
            Paragraph(v, PS("v", fontSize=8, fontName="Helvetica", textColor=SLATE_700, leading=12)),
        ])
    t = Table(data, colWidths=[col1_w, col2_w])
    t.setStyle(TableStyle([
        ("GRID",          (0,0),(-1,-1), 0.4, SLATE_200),
        ("BACKGROUND",    (0,0),(0,-1),  SLATE_100),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, SLATE_50]),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
    ]))
    return t

def std_table(headers, rows, col_w=None):
    hrow = [Paragraph(h, PS("th", fontSize=7.5, fontName="Helvetica-Bold",
                             textColor=WHITE, leading=11)) for h in headers]
    drows = [[Paragraph(str(c), PS("td", fontSize=8, fontName="Helvetica",
                                    textColor=SLATE_700, leading=12)) for c in row]
             for row in rows]
    n = len(headers)
    cw = col_w if col_w else [IW/n]*n
    t = Table([hrow] + drows, colWidths=cw)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  NAVY),
        ("LINEABOVE",     (0,1),(-1,1),  1.5, INDIGO),
        ("GRID",          (0,0),(-1,-1), 0.4, SLATE_200),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, SLATE_50]),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
    ]))
    return t

def two_col(left_items, right_items, split=0.5):
    lw = IW * split - 5
    rw = IW * (1-split) - 5
    def make_inner(items, w):
        rows = [[i] for i in items]
        t = Table(rows, colWidths=[w])
        t.setStyle(TableStyle([
            ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
            ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2),
        ]))
        return t
    outer = Table([[make_inner(left_items, lw), make_inner(right_items, rw)]],
                  colWidths=[lw+6, rw+4])
    outer.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
    ]))
    return outer

# ── Diagrams ──────────────────────────────────────────────────────────────────

def arch_diagram():
    """Clean 4-layer architecture diagram with connecting arrows."""
    dw, dh = IW - 6*mm, 120*mm
    d = Drawing(dw, dh)

    layers = [
        (HexColor("#EEF2FF"), INDIGO,      INDIGO_DARK,  "Presentation Layer",
         "React 19  ·  Tailwind CSS  ·  Wouter Router  ·  Role-gated Pages & Layouts"),
        (HexColor("#F0FDF4"), EMERALD,     HexColor("#065F46"), "Orchestration Layer",
         "TanStack Query  ·  Auth Context  ·  Route Guards  ·  Query Caching & Invalidation"),
        (HexColor("#FFFBEB"), AMBER,       HexColor("#92400E"), "Domain Logic Layer",
         "Trust Engine  ·  Bid Processor  ·  Listing Service  ·  Interest Manager"),
        (HexColor("#FFF1F2"), ROSE,        HexColor("#881337"), "Persistence Layer",
         "IndexedDB (Entities)  ·  LocalStorage (Session & Filters)"),
    ]

    block_h = 24
    gap     = 6
    total   = len(layers) * block_h + (len(layers)-1) * gap
    start_y = (dh - total) / 2

    for i, (bg, accent, fg, title, sub) in enumerate(layers):
        y = dh - start_y - (i+1)*block_h - i*gap
        # Shadow
        d.add(Rect(4, y-2, dw-8, block_h, fillColor=HexColor("#E2E8F0"), strokeColor=None, rx=5, ry=5))
        # Card
        d.add(Rect(2, y, dw-8, block_h, fillColor=bg, strokeColor=accent, strokeWidth=1, rx=5, ry=5))
        # Left accent bar
        d.add(Rect(2, y, 5, block_h, fillColor=accent, strokeColor=None, rx=2, ry=2))
        # Layer number circle
        d.add(Circle(dw-22, y + block_h/2, 9, fillColor=accent, strokeColor=None))
        d.add(String(dw-25.5, y + block_h/2 - 4, str(i+1),
                     fontSize=9, fontName="Helvetica-Bold", fillColor=WHITE))
        # Text
        d.add(String(16, y + block_h - 13, title,
                     fontSize=9, fontName="Helvetica-Bold", fillColor=fg))
        d.add(String(16, y + 5, sub,
                     fontSize=7, fontName="Helvetica", fillColor=SLATE_500))
        # Arrow down
        if i < len(layers)-1:
            ax = dw/2
            ay = y - gap/2 + 1
            d.add(Line(ax, y, ax, ay, strokeColor=SLATE_300, strokeWidth=1))
            d.add(Polygon([ax, ay-2, ax-4, ay+3, ax+4, ay+3],
                          fillColor=SLATE_300, strokeColor=None))
    return d


def flow_diagram(steps, colors_list=None):
    """Horizontal step flow with arrows."""
    dw, dh = IW - 6*mm, 60*mm
    d = Drawing(dw, dh)
    n = len(steps)
    arrow_w = 12
    box_w = (dw - (n-1)*arrow_w) / n
    box_h = 38
    y_box = (dh - box_h) / 2

    default_colors = [INDIGO, PURPLE, HexColor("#DB2777"), CYAN, EMERALD]
    if not colors_list:
        colors_list = [default_colors[i % len(default_colors)] for i in range(n)]

    for i, (label, sub) in enumerate(steps):
        x = i * (box_w + arrow_w)
        c = colors_list[i]
        # Shadow
        d.add(Rect(x+2, y_box-2, box_w, box_h, fillColor=HexColor("#CBD5E1"), strokeColor=None, rx=5, ry=5))
        # Box
        d.add(Rect(x, y_box, box_w, box_h, fillColor=c, strokeColor=None, rx=5, ry=5))
        # Step number
        d.add(Circle(x+10, y_box+box_h-9, 7, fillColor=HexColor("#FFFFFF40"), strokeColor=None))
        d.add(String(x+7, y_box+box_h-13, str(i+1), fontSize=7, fontName="Helvetica-Bold", fillColor=WHITE))
        # Labels
        lbl_x = x + box_w/2 - len(label)*3.1
        sub_x = x + box_w/2 - len(sub)*2.3
        d.add(String(max(x+4, lbl_x), y_box+box_h/2, label,
                     fontSize=8, fontName="Helvetica-Bold", fillColor=WHITE))
        d.add(String(max(x+4, sub_x), y_box+8, sub,
                     fontSize=6.5, fontName="Helvetica", fillColor=HexColor("#DBEAFE")))
        # Arrow
        if i < n-1:
            ax = x + box_w + 2
            ay = y_box + box_h/2
            d.add(Line(ax, ay, ax+arrow_w-4, ay, strokeColor=SLATE_500, strokeWidth=1.5))
            d.add(Polygon([ax+arrow_w-4, ay, ax+arrow_w-8, ay+4, ax+arrow_w-8, ay-4],
                          fillColor=SLATE_500, strokeColor=None))
    return d


def trust_score_diagram():
    """Visual trust score breakdown — vertical bar style."""
    dw, dh = IW - 6*mm, 80*mm
    d = Drawing(dw, dh)

    dims = [
        ("Revenue\nVerification", 40, EMERALD,   HexColor("#ECFDF5")),
        ("Domain\nVerification",  30, INDIGO,    HexColor("#EEF2FF")),
        ("Traffic\nVerification", 30, AMBER,     HexColor("#FFFBEB")),
    ]

    bar_area = dw - 60
    bar_gap  = 30
    bar_w    = (bar_area - (len(dims)-1)*bar_gap) / len(dims)
    max_h    = dh - 40
    base_y   = 20
    start_x  = 30

    # Horizontal grid lines
    for pct in [25, 50, 75, 100]:
        gy = base_y + (pct/100) * max_h
        d.add(Line(start_x-5, gy, dw-5, gy, strokeColor=SLATE_200, strokeWidth=0.5))
        d.add(String(2, gy-4, f"{pct}%", fontSize=6, fontName="Helvetica", fillColor=SLATE_300))

    for i, (label, weight, color, bg) in enumerate(dims):
        x = start_x + i * (bar_w + bar_gap)
        bar_h = (weight / 100) * max_h

        # Background bar
        d.add(Rect(x, base_y, bar_w, max_h, fillColor=SLATE_100, strokeColor=None, rx=4, ry=4))
        # Filled bar
        d.add(Rect(x, base_y, bar_w, bar_h, fillColor=color, strokeColor=None, rx=4, ry=4))
        # Weight label on top
        d.add(String(x + bar_w/2 - 8, base_y + bar_h + 4, f"{weight}%",
                     fontSize=9, fontName="Helvetica-Bold", fillColor=color))
        # Dimension label below
        lines = label.split("\n")
        for j, line in enumerate(lines):
            d.add(String(x + bar_w/2 - len(line)*2.8, base_y - 16 + j*10, line,
                         fontSize=7, fontName="Helvetica", fillColor=SLATE_500))

    return d


def data_model_diagram():
    """Entity relationship style diagram."""
    dw, dh = IW - 6*mm, 100*mm
    d = Drawing(dw, dh)

    entities = [
        ("auth-users",           ["id", "role", "email", "name"],                    30,  dh-10, INDIGO),
        ("marketplace-listings", ["id", "title", "askingPrice", "trustScore", "stage"], 160, dh-10, EMERALD),
        ("marketplace-interest", ["id", "listingId", "buyerId", "messages[]"],       30,  dh/2,  AMBER),
        ("mock-listing-bids",    ["id", "listingId", "bidderId", "amount", "stage"], 160, dh/2,  PURPLE),
    ]

    box_w = 130
    box_h = 70

    for (name, fields, x, y_top, color) in entities:
        y = y_top - box_h
        # Shadow
        d.add(Rect(x+3, y-3, box_w, box_h, fillColor=SLATE_200, strokeColor=None, rx=5, ry=5))
        # Box
        d.add(Rect(x, y, box_w, box_h, fillColor=WHITE, strokeColor=color, strokeWidth=1.5, rx=5, ry=5))
        # Header
        d.add(Rect(x, y+box_h-18, box_w, 18, fillColor=color, strokeColor=None, rx=5, ry=5))
        d.add(Rect(x, y+box_h-18, box_w, 9, fillColor=color, strokeColor=None))
        d.add(String(x+8, y+box_h-13, name, fontSize=7.5, fontName="Helvetica-Bold", fillColor=WHITE))
        # Fields
        for j, field in enumerate(fields[:5]):
            fy = y + box_h - 28 - j*9
            prefix = "🔑 " if field == "id" else "· "
            d.add(String(x+8, fy, f"· {field}", fontSize=6.5, fontName="Courier", fillColor=SLATE_500))

    # Relationship lines (simplified)
    # listings → interest
    d.add(Line(160, dh-10-box_h/2, 160, dh/2-box_h/2+5,
               strokeColor=SLATE_300, strokeWidth=1, strokeDashArray=[3,2]))
    # listings → bids
    d.add(Line(290, dh-10-box_h/2, 290, dh/2-box_h/2+5,
               strokeColor=SLATE_300, strokeWidth=1, strokeDashArray=[3,2]))

    return d


def session_flow_diagram():
    """Auth / session state machine."""
    dw, dh = IW - 6*mm, 70*mm
    d = Drawing(dw, dh)

    states = [
        ("Guest",   "No session",     SLATE_500,  50,  dh/2),
        ("Auth\nModal", "Email entry",   INDIGO,    160, dh/2),
        ("Buyer",   "Buyer workspace", EMERALD,   270, dh/2+18),
        ("Founder", "Founder workspace",AMBER,    270, dh/2-18),
    ]

    r = 22
    for (name, sub, color, cx, cy) in states:
        # Shadow
        d.add(Circle(cx+2, cy-2, r, fillColor=SLATE_200, strokeColor=None))
        # Circle
        d.add(Circle(cx, cy, r, fillColor=color, strokeColor=None))
        lines = name.split("\n")
        for j, line in enumerate(lines):
            oy = 3 if len(lines)==1 else 6-j*8
            d.add(String(cx-len(line)*3, cy+oy-4, line, fontSize=7.5, fontName="Helvetica-Bold", fillColor=WHITE))
        d.add(String(cx-len(sub)*2.7, cy-r-10, sub, fontSize=6, fontName="Helvetica", fillColor=SLATE_500))

    # Arrows
    # Guest → Auth Modal
    d.add(Line(72, dh/2, 138, dh/2, strokeColor=INDIGO, strokeWidth=1.5))
    d.add(Polygon([138,dh/2, 133,dh/2+4, 133,dh/2-4], fillColor=INDIGO, strokeColor=None))
    d.add(String(90, dh/2+5, "Gated action", fontSize=6, fontName="Helvetica", fillColor=SLATE_500))

    # Auth Modal → Buyer
    d.add(Line(182, dh/2+4, 248, dh/2+20, strokeColor=EMERALD, strokeWidth=1.5))
    d.add(Polygon([248,dh/2+20, 241,dh/2+19, 243,dh/2+13], fillColor=EMERALD, strokeColor=None))
    d.add(String(195, dh/2+20, "role=buyer", fontSize=6, fontName="Helvetica", fillColor=EMERALD))

    # Auth Modal → Founder
    d.add(Line(182, dh/2-4, 248, dh/2-20, strokeColor=AMBER, strokeWidth=1.5))
    d.add(Polygon([248,dh/2-20, 241,dh/2-20, 243,dh/2-13], fillColor=AMBER, strokeColor=None))
    d.add(String(195, dh/2-22, "role=founder", fontSize=6, fontName="Helvetica", fillColor=AMBER))

    # Logout arrow back
    d.add(Line(270, dh/2+42, 75, dh/2+42, strokeColor=SLATE_300, strokeWidth=1, strokeDashArray=[3,2]))
    d.add(Line(270, dh/2-42, 75, dh/2-42, strokeColor=SLATE_300, strokeWidth=1, strokeDashArray=[3,2]))
    d.add(Line(75, dh/2+42, 75, dh/2-42, strokeColor=SLATE_300, strokeWidth=1, strokeDashArray=[3,2]))
    d.add(String(100, dh/2+44, "logout → session cleared", fontSize=6, fontName="Helvetica", fillColor=SLATE_400 if hasattr(colors,'SLATE_400') else SLATE_300))

    return d


def wrap_diagram(drawing, caption_text, bg=WHITE, border=SLATE_200):
    cap = Paragraph(caption_text, CAPTION)
    t = Table([[drawing], [cap]], colWidths=[IW - 6*mm])
    t.setStyle(TableStyle([
        ("BOX",          (0,0),(-1,-1), 0.75, border),
        ("BACKGROUND",   (0,0),(0,0),   bg),
        ("BACKGROUND",   (0,1),(-1,1),  SLATE_50),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",  (0,0),(-1,-1), 8),
        ("RIGHTPADDING", (0,0),(-1,-1), 8),
    ]))
    return t


# ── Page Templates ─────────────────────────────────────────────────────────────

def cover_bg(canvas, doc):
    canvas.saveState()
    # Full dark BG
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Subtle dot grid
    canvas.setStrokeColor(HexColor("#1E293B"))
    canvas.setLineWidth(0.3)
    for x in range(0, int(W)+1, 20):
        for y in range(0, int(H)+1, 20):
            canvas.circle(x, y, 0.8, fill=1, stroke=0)
    # Left accent bar
    canvas.setFillColor(INDIGO)
    canvas.rect(0, 0, 6, H, fill=1, stroke=0)
    # Top strip
    canvas.setFillColor(INDIGO)
    canvas.rect(0, H-4, W, 4, fill=1, stroke=0)
    # Logo / Brand
    y = H - 80
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 42)
    canvas.drawString(MARGIN + 10, y, "ownerr.live")
    canvas.setFillColor(INDIGO_LT)
    canvas.setFont("Helvetica", 13)
    canvas.drawString(MARGIN + 10, y - 30, "Technical Product Documentation")
    canvas.setFillColor(HexColor("#475569"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN + 10, y - 52, "April 2026  ·  Version 1.0")
    # Divider
    canvas.setStrokeColor(INDIGO)
    canvas.setLineWidth(1)
    canvas.line(MARGIN + 10, y - 62, W - MARGIN, y - 62)
    # Subtitle blocks
    tags = ["React 19", "TypeScript 5", "TanStack Query", "Vite 5", "IndexedDB"]
    bx = MARGIN + 10
    by = y - 110
    for tag in tags:
        tw = len(tag) * 6.5 + 16
        canvas.setFillColor(HexColor("#1E293B"))
        canvas.roundRect(bx, by, tw, 22, 4, fill=1, stroke=0)
        canvas.setFillColor(INDIGO_LT)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(bx + 8, by + 7, tag)
        bx += tw + 8
    # Description
    canvas.setFillColor(HexColor("#94A3B8"))
    canvas.setFont("Helvetica", 9)
    canvas.drawString(MARGIN + 10, y - 148,
        "A browser-native startup acquisition marketplace — full technical reference.")
    # Footer
    canvas.setFillColor(HexColor("#0D1117"))
    canvas.rect(0, 0, W, 30, fill=1, stroke=0)
    canvas.setFillColor(SLATE_500)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN + 10, 11, "ownerr.live  ·  Internal Technical Reference")
    canvas.drawRightString(W - MARGIN, 11, "www.ownerr.live")
    canvas.restoreState()

def toc_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(SLATE_50)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(INDIGO)
    canvas.rect(0, H-4, W, 4, fill=1, stroke=0)
    # Footer
    canvas.setFillColor(SLATE_200)
    canvas.rect(0, 0, W, 26, fill=1, stroke=0)
    canvas.setFillColor(SLATE_500)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 9, "ownerr.live  ·  Technical Documentation")
    canvas.drawRightString(W - MARGIN, 9, f"Page {doc.page}")
    canvas.restoreState()

def body_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(INDIGO)
    canvas.rect(0, H-3, W, 3, fill=1, stroke=0)
    # Footer
    canvas.setFillColor(SLATE_100)
    canvas.rect(0, 0, W, 24, fill=1, stroke=0)
    canvas.setFillColor(SLATE_500)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 8, "ownerr.live  ·  Technical Documentation  ·  April 2026")
    canvas.drawRightString(W - MARGIN, 8, f"Page {doc.page}")
    canvas.restoreState()


# ── Story ─────────────────────────────────────────────────────────────────────

story = []

def pb(): story.append(PageBreak())
def add(*items):
    for item in items:
        if isinstance(item, list):
            story.extend(item)
        else:
            story.append(item)


# ─── Table of Contents ───────────────────────────────────────────────────────
pb()
add(Paragraph("TABLE OF CONTENTS", EYEBROW))
add(Spacer(1,2))
add(Paragraph("What's Inside", H1))
add(rule(INDIGO, 1.5))
add(Spacer(1,8))

toc_items = [
    ("01", "Product Overview",              "Platform purpose, personas, and key capabilities"),
    ("02", "System Architecture",           "Four-layer architecture & layer responsibilities"),
    ("03", "Technology Stack",              "Dependencies, versions, and engineering rationale"),
    ("04", "Core Product Flows",            "Buyer & Founder journeys, auth model"),
    ("05", "Trust Score Engine",            "Verification model, scoring algorithm, score bands"),
    ("06", "Data Architecture",             "Entity model, IndexedDB schema, LocalStorage state"),
    ("07", "Development & Delivery",        "Dev commands, quality gates, migration readiness"),
]

for num, title, desc in toc_items:
    row_data = [
        Paragraph(f"<b>{num}</b>", PS("tn", fontSize=10, fontName="Helvetica-Bold",
                                       textColor=INDIGO, leading=14)),
        Paragraph(f"<b>{title}</b><br/><font size='7' color='#64748B'>{desc}</font>",
                  PS("ti", fontSize=9, fontName="Helvetica", textColor=NAVY, leading=14)),
    ]
    t = Table([row_data], colWidths=[18*mm, IW-18*mm])
    t.setStyle(TableStyle([
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LINEBELOW",     (0,0),(-1,-1), 0.4, SLATE_200),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
        ("BACKGROUND",    (0,0),(-1,-1), WHITE),
    ]))
    add(t)


# ─── 01: Product Overview ────────────────────────────────────────────────────
pb()
add(*section_header(1, "Product Overview"))
add(Paragraph(
    "Ownerr.live is a browser-native startup acquisition marketplace. It connects founders who want to "
    "exit their businesses with buyers seeking verified acquisition targets. The platform is designed for "
    "the sub-$10M segment — a high-volume, historically fragmented space dominated by email threads, "
    "broker intermediaries, and information asymmetry.", BODY))
add(Spacer(1,6))

add(two_col(
    left_items=[
        Paragraph("Who It Serves", H3),
        prop_table([
            ("Founders",  "Founders listing their startup for acquisition — manage verification, respond to interest, track bids"),
            ("Buyers",    "Acqui-hirers, PE roll-ups, and strategic buyers — discover, qualify, and bid on listings"),
            ("Guests",    "Unauthenticated users — browse marketplace with limited listing detail visibility"),
        ], col1_w=22*mm),
    ],
    right_items=[
        Paragraph("Core Capabilities", H3),
        prop_table([
            ("Discovery",     "Filterable marketplace with trust-scored listings"),
            ("Verification",  "Three-dimension trust scoring (revenue, domain, traffic)"),
            ("Engagement",    "In-platform interest threads between buyers and founders"),
            ("Bidding",       "Structured bid submission with stage tracking"),
            ("Access Control","Hard role-scoped routing — buyer vs founder vs guest"),
        ], col1_w=26*mm),
    ],
))
add(Spacer(1,8))

add(info_box(
    "Architecture philosophy: Ownerr is built as a fully browser-native application — zero backend "
    "required to run. All data lives in IndexedDB (entities) and LocalStorage (session). The service "
    "layer is backend-agnostic, meaning every fetch() call to IndexedDB can be swapped 1:1 for a "
    "real API endpoint with no UI-layer changes.",
    accent=EMERALD, bg=EMERALD_LT,
))


# ─── 02: System Architecture ─────────────────────────────────────────────────
pb()
add(*section_header(2, "System Architecture"))
add(Paragraph(
    "The application is structured in four cleanly separated layers. Each layer has a single "
    "responsibility and communicates only with the layer directly beneath it. This mirrors "
    "production microservices patterns while remaining fully deployable as a static SPA today.", BODY))
add(Spacer(1,8))

add(KeepTogether([wrap_diagram(
    arch_diagram(),
    "Figure 1 — Four-Layer System Architecture  ·  ownerr.live",
    bg=SLATE_50,
)]))
add(Spacer(1,10))

add(Paragraph("Layer Responsibilities", H2))
add(std_table(
    ["Layer", "Responsibility", "Key Components", "Backend Migration Path"],
    [
        ["Presentation",  "Render UI, handle routing, enforce role-gated navigation",
         "React 19 pages · Shared layouts · Domain components",
         "Zero refactor — plug REST/GraphQL into query hooks"],
        ["Orchestration", "Auth context, server-state caching, query lifecycle",
         "TanStack Query · Auth Context · Route Guard HOC",
         "Swap mock services for API endpoints 1:1"],
        ["Domain Logic",  "Business rules — trust scoring, bid state machine, listing workflows",
         "TypeScript service classes · Pure functions",
         "Extract directly to serverless functions"],
        ["Persistence",   "Durable entity storage and ephemeral session/filter state",
         "IndexedDB · LocalStorage",
         "Replace with Postgres + Redis with no upstream changes"],
    ],
    col_w=[28*mm, 44*mm, 52*mm, 46*mm],
))


# ─── 03: Technology Stack ────────────────────────────────────────────────────
pb()
add(*section_header(3, "Technology Stack"))
add(Paragraph(
    "Every dependency was chosen against three criteria: production-grade adoption at scale, "
    "an active maintenance ecosystem, and explicit compatibility with the planned backend migration. "
    "No experimental or bespoke libraries are used.", BODY))
add(Spacer(1,8))

add(std_table(
    ["Category", "Technology", "Version", "Why It Was Chosen"],
    [
        ["Framework",   "React",          "19 (RC)",  "Concurrent rendering, Server Components ready, largest talent pool in the industry"],
        ["Language",    "TypeScript",     "5.x",      "Strict end-to-end type safety eliminates runtime shape errors — all entities are fully typed"],
        ["Router",      "Wouter",         "Latest",   "3KB vs React Router's 50KB — SPA-optimal, same declarative API pattern"],
        ["Data Layer",  "TanStack Query", "v5",       "Server-state lifecycle management: caching, invalidation, optimistic updates — 40K+ stars"],
        ["Styling",     "Tailwind CSS",   "v3",       "Utility-first — consistent design tokens, zero CSS specificity debt, fast iteration"],
        ["Build",       "Vite",           "5.x",      "<100ms HMR, optimized tree-shaken production bundles, native ESM dev server"],
        ["Storage",     "IndexedDB",      "Browser",  "Structured, transactional, 50MB+ quota — production-schema-aligned client storage"],
        ["State",       "LocalStorage",   "Browser",  "Ephemeral session token and filter state only — no durable entities stored here"],
    ],
    col_w=[26*mm, 30*mm, 22*mm, IW - 78*mm],
))
add(Spacer(1,8))

add(info_box(
    "The stack places Ownerr in the top decile of modern SaaS codebases by maintainability and "
    "hiring accessibility. A new engineering team can onboard in under two sprint cycles with no "
    "architectural rework required.",
    accent=INDIGO, bg=VIOLET_100,
))


# ─── 04: Core Product Flows ──────────────────────────────────────────────────
pb()
add(*section_header(4, "Core Product Flows"))
add(Paragraph(
    "Ownerr supports two primary user journeys operating in parallel on the same platform. "
    "The Buyer and Founder paths share infrastructure but are isolated at the route and data layers. "
    "Every screen is designed to surface the exact signal needed to advance or exit a deal.", BODY))
add(Spacer(1,6))

add(Paragraph("Buyer Journey", H2))
add(Paragraph("From marketplace discovery through to active deal tracking.", BODY_L))
add(Spacer(1,4))
add(KeepTogether([wrap_diagram(
    flow_diagram([
        ("Discover",  "Browse & filter"),
        ("Qualify",   "Trust score"),
        ("Engage",    "Interest thread"),
        ("Bid",       "Submit offer"),
        ("Track",     "Deal stages"),
    ], [INDIGO, PURPLE, HexColor("#DB2777"), CYAN, EMERALD]),
    "Figure 2 — Buyer Journey  ·  Discovery → Active Deal Tracking",
    bg=SLATE_50,
)]))
add(Spacer(1,8))

add(Paragraph("Founder Journey", H2))
add(Paragraph("From listing creation through verification, engagement, and deal close.", BODY_L))
add(Spacer(1,4))
add(KeepTogether([wrap_diagram(
    flow_diagram([
        ("List",      "Create listing"),
        ("Verify",    "Trust signals"),
        ("Respond",   "Inbox threads"),
        ("Negotiate", "Bid review"),
        ("Close",     "Stage complete"),
    ], [EMERALD, INDIGO, PURPLE, AMBER, HexColor("#DB2777")]),
    "Figure 3 — Founder Journey  ·  Listing Operations → Deal Close",
    bg=SLATE_50,
)]))
add(Spacer(1,8))

add(Paragraph("Authentication & Session Model", H2))
add(Spacer(1,4))
add(KeepTogether([wrap_diagram(
    session_flow_diagram(),
    "Figure 4 — Auth State Machine  ·  Guest → Role-scoped Workspace",
    bg=SLATE_50,
)]))
add(Spacer(1,6))

add(prop_table([
    ("Guest entry",        "Open browse with limited listing detail — no auth required"),
    ("Auth trigger",       "Modal-based — activates on any gated action (bid, message, verify)"),
    ("Role resolution",    "Single auth session resolves to either Buyer or Founder — no mixed states"),
    ("Route guards",       "Declarative HOC wraps all role-sensitive pages — enforced at render time"),
    ("Session store",      "LocalStorage key (ownerr-mock-session-user) with role and user_id payload"),
    ("Logout behaviour",   "Session key purged, all queries invalidated, redirect to guest marketplace root"),
], col1_w=40*mm))


# ─── 05: Trust Score Engine ──────────────────────────────────────────────────
pb()
add(*section_header(5, "Trust Score Engine"))
add(Paragraph(
    "The Trust Score Engine converts raw verification signals into a standardised, comparable quality "
    "indicator across all listings. It is the primary mechanism enabling buyers to make first-pass "
    "qualification decisions before initiating founder contact.", BODY))
add(Spacer(1,8))

add(KeepTogether([wrap_diagram(
    trust_score_diagram(),
    "Figure 5 — Trust Score Dimension Weights  ·  Verification Model",
    bg=WHITE,
)]))
add(Spacer(1,8))

add(two_col(
    left_items=[
        Paragraph("Scoring Algorithm", H3),
        std_table(
            ["Dimension", "Weight", "Condition"],
            [
                ["Revenue Verification", "+40 pts", "revenueVerified === true"],
                ["Domain Verification",  "+30 pts", "domainVerified === true"],
                ["Traffic Verification", "+30 pts", "trafficVerified === true"],
            ],
        ),
    ],
    right_items=[
        Paragraph("Score Bands", H3),
        std_table(
            ["Band", "Range", "Buyer Signal"],
            [
                ["HIGH",   "≥ 70",  "Due-diligence ready"],
                ["MEDIUM", "40–69", "Partially verified"],
                ["LOW",    "< 40",  "Early / unverified"],
            ],
        ),
    ],
))
add(Spacer(1,6))

add(Paragraph("Verification Incentive Loop", H3))
add(Paragraph(
    "The scoring model is transparent to founders by design. Completing all three dimensions achieves "
    "HIGH status, which surfaces the listing first in buyer search results. This creates a self-reinforcing "
    "supply-side quality flywheel — no manual curation or editorial review required.", BODY))

add(Spacer(1,4))
add(info_box(
    "TypeScript implementation: calculateTrustScore(listing: Listing): TrustScore\n"
    "Returns { score: number, band: 'HIGH' | 'MEDIUM' | 'LOW', dimensions: VerificationDimension[] }",
    accent=INDIGO, bg=VIOLET_100,
))


# ─── 06: Data Architecture ───────────────────────────────────────────────────
pb()
add(*section_header(6, "Data Architecture"))
add(Paragraph(
    "The persistence layer is split into two stores that mirror a production Redis/Postgres split: "
    "IndexedDB for durable, structured entity records and LocalStorage for ephemeral session and UI state. "
    "Entity schemas are defined as TypeScript interfaces — a direct 1:1 mapping to relational table definitions.", BODY))
add(Spacer(1,8))

add(KeepTogether([wrap_diagram(
    data_model_diagram(),
    "Figure 6 — Core Entity Model  ·  IndexedDB Schema Overview",
    bg=SLATE_50,
)]))
add(Spacer(1,10))

add(two_col(
    left_items=[
        Paragraph("Durable Entities — IndexedDB", H3),
        prop_table([
            ("auth-users",            "User identity with role, credentials, and profile data"),
            ("marketplace-listings",  "Full listing — title, pricing, metadata, trust flags, stage"),
            ("marketplace-interest",  "Buyer-initiated threads with full message history array"),
            ("mock-listing-bids",     "Bid records: amount, bidder, listing reference, stage"),
        ], col1_w=44*mm),
    ],
    right_items=[
        Paragraph("Ephemeral State — LocalStorage", H3),
        prop_table([
            ("ownerr-mock-session-user",   "Active session: role + user_id payload"),
            ("ownerr-acquire-filters-v1",  "Persisted filter state for marketplace exploration"),
        ], col1_w=44*mm),
        Spacer(1,8),
        Paragraph("Data Integrity Principles", H3),
        prop_table([
            ("Type safety",    "TypeScript interfaces enforce shape at compile time — no runtime surprises"),
            ("Optimistic UI",  "TanStack Query mutation lifecycle handles rollback on failure"),
            ("Invalidation",   "Query keys invalidated on mutation success across related entities"),
            ("Single writer",  "All DB writes go through the service layer — no direct IndexedDB calls from UI"),
        ], col1_w=26*mm),
    ],
))


# ─── 07: Development & Delivery ──────────────────────────────────────────────
pb()
add(*section_header(7, "Development & Delivery"))
add(Paragraph(
    "The development model prioritises engineering velocity and zero-ambiguity handoff. "
    "All workflows are reproducible across environments — enabling demos, code review, "
    "and onboarding without configuration overhead.", BODY))
add(Spacer(1,8))

add(two_col(
    left_items=[
        Paragraph("Local Development", H3),
        prop_table([
            ("Working dir",   "artifacts/ownerr-web-app"),
            ("Install",       "npm install"),
            ("Dev server",    "npm run dev  (Vite HMR, <100ms)"),
            ("Type check",    "npm run typecheck  (zero errors enforced)"),
            ("Production",    "npm run build  (tree-shaken, optimized)"),
            ("Preview",       "npm run serve  (local prod bundle preview)"),
        ], col1_w=26*mm),
    ],
    right_items=[
        Paragraph("Quality Gates", H3),
        prop_table([
            ("TypeScript",   "Strict mode — no any, no implicit returns"),
            ("Linting",      "ESLint + Prettier enforced pre-commit"),
            ("Component API","All props typed — no runtime validation debt"),
            ("Bundle",       "Vite bundle analysis on every production build"),
            ("Build check",  "Deterministic hashed output for cache-busting"),
        ], col1_w=26*mm),
    ],
))
add(Spacer(1,8))

add(Paragraph("Backend Migration Readiness", H2))
add(Paragraph(
    "Every layer of the application is designed to accept a real backend with no architectural changes. "
    "The table below maps each current browser-native implementation to its production equivalent.", BODY))
add(Spacer(1,4))
add(std_table(
    ["Area", "Current (Browser-native)", "Production Target", "Estimated Lift"],
    [
        ["Auth",          "Mock auth · LocalStorage session",      "OAuth 2.0 / JWT · httpOnly cookies",      "2–3 weeks"],
        ["API Layer",     "IndexedDB service layer",               "REST or GraphQL + serverless functions",   "3–4 weeks"],
        ["Database",      "Browser IndexedDB",                     "Postgres (Supabase / RDS) + Redis cache",  "1–2 weeks"],
        ["Verification",  "Boolean flag mock",                     "Stripe · Plaid · GA4 integrations",        "4–6 weeks"],
        ["Payments",      "Not implemented",                       "Stripe Connect (success-fee model)",       "2 weeks"],
        ["Infrastructure","Vite dev · static hosting",             "Vercel / AWS · CDN · CI/CD pipeline",      "1 week"],
        ["Security",      "Frontend only",                         "OWASP hardening · CSP headers · rate limit","2–3 weeks"],
    ],
    col_w=[26*mm, 48*mm, 50*mm, 26*mm],
))
add(Spacer(1,10))

add(rule(INDIGO, 1))
add(Spacer(1,6))
add(Paragraph(
    "This document reflects the implemented state of ownerr.live as of April 2026. "
    "For technical enquiries: <b>hello@ownerr.live</b>",
    PS("foot", fontSize=8, fontName="Helvetica", textColor=SLATE_500,
       leading=12, alignment=TA_CENTER)
))


# ── Document Assembly ──────────────────────────────────────────────────────────

doc = BaseDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=22*mm,
    bottomMargin=20*mm,
)

cover_frame   = Frame(0, 0, W, H, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="cover")
toc_frame     = Frame(MARGIN, 20*mm, IW, H - 42*mm, id="toc")
content_frame = Frame(MARGIN, 20*mm, IW, H - 42*mm, id="body")

doc.addPageTemplates([
    PageTemplate(id="Cover",   frames=[cover_frame],   onPage=cover_bg),
    PageTemplate(id="TOC",     frames=[toc_frame],     onPage=toc_bg),
    PageTemplate(id="Content", frames=[content_frame], onPage=body_bg),
])

final = [NextPageTemplate("TOC"), PageBreak()] + story
# Switch to Content after TOC page
# Find the first section break and insert template switch
# Actually, insert template switch before section 01
toc_end = 1  # after the TOC content
content_switch = [NextPageTemplate("Content")]

# Insert content switch right before section 01 (first pb after TOC)
# The story structure: [pb, toc items..., pb, section01...]
# We need NextPageTemplate("Content") before the first real section
insert_idx = None
pb_count = 0
for idx, item in enumerate(story):
    if isinstance(item, PageBreak):
        pb_count += 1
        if pb_count == 2:  # second PageBreak is start of section 01
            insert_idx = idx
            break

if insert_idx is not None:
    story.insert(insert_idx, NextPageTemplate("Content"))

final = [NextPageTemplate("TOC"), PageBreak()] + story
doc.build(final)
print(f"✓ PDF written → {OUTPUT}")