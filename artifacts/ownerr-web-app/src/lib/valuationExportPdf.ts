import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatShortCurrency } from "@/lib/utils";
import {
  buildValuationExportDocument,
  type ValuationExportBundle,
  type ValuationExportDocument,
} from "@/lib/valuationExport";

type LogoAsset = {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};

const OWNERR_LOGO_PATH = "/Ownerr Logo.svg";
const BRAND_NAME = "Ownerr";

const COLORS = {
  ink: [18, 18, 18] as [number, number, number],
  muted: [100, 100, 96] as [number, number, number],
  mutedLight: [160, 160, 155] as [number, number, number],
  lime: [191, 253, 113] as [number, number, number],
  headerBg: [18, 18, 18] as [number, number, number],
  headerText: [235, 251, 188] as [number, number, number],
  headerSubtext: [160, 160, 155] as [number, number, number],
  rowAlt: [248, 249, 246] as [number, number, number],
  border: [220, 220, 216] as [number, number, number],
};

const MARGIN_X = 48;
const MARGIN_RIGHT = 48;
const MARGIN_TOP_CONTENT = 24;
const FOOTER_H = 40;
const HEADER_BAND_H = 92;

/** Vertical rhythm for the memorandum (pt). */
const LAYOUT = {
  sectionBefore: 30,
  afterSectionRule: 22,
  afterBody: 14,
  betweenBody: 12,
  afterBullet: 8,
  beforeTable: 14,
  afterTable: 22,
  afterTitleBlock: 36,
  newPageTop: 28,
};

const LOGO_MAX_HEIGHT_PT = 48;

/** Avoid em/en dashes in PDF copy (use ASCII hyphen or commas). */
function pdfText(s: string): string {
  const trimmed = s.trim();
  if (trimmed === "—" || trimmed === "–" || trimmed === "-") return "N/A";
  return s
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, "-")
    .replace(/—/g, ", ")
    .replace(/–/g, "-")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}

type JsPDFWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

function logoDisplaySize(
  naturalW: number,
  naturalH: number,
  maxHeight: number,
): { w: number; h: number } {
  if (naturalW <= 0 || naturalH <= 0) return { w: maxHeight, h: maxHeight };
  const h = maxHeight;
  const w = (naturalW / naturalH) * h;
  return { w, h };
}

async function loadOwnerrLogoAsset(
  bg: "white" | "dark",
): Promise<LogoAsset | null> {
  try {
    const res = await fetch(OWNERR_LOGO_PATH);
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const asset = await new Promise<LogoAsset>((resolve, reject) => {
      img.onload = () => {
        const nw = img.naturalWidth || 916;
        const nh = img.naturalHeight || 1145;
        const canvas = document.createElement("canvas");
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.fillStyle = bg === "white" ? "#ffffff" : "#121212";
        ctx.fillRect(0, 0, nw, nh);
        ctx.drawImage(img, 0, 0, nw, nh);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          widthPx: nw,
          heightPx: nh,
        });
      };
      img.onerror = () => reject(new Error("logo"));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return asset;
  } catch {
    return null;
  }
}

function pageSize(doc: jsPDF) {
  return {
    w: doc.internal.pageSize.getWidth(),
    h: doc.internal.pageSize.getHeight(),
  };
}

function tableFinalY(doc: JsPDFWithTable): number {
  return doc.lastAutoTable?.finalY ?? MARGIN_X;
}

function paintRunningFooter(
  doc: jsPDF,
  pageNum: number,
  pageCount: number,
  reportRef: string,
): void {
  const { h } = pageSize(doc);
  const y = h - FOOTER_H + 10;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  const right = rightEdgeX(doc);
  doc.line(MARGIN_X, y - 8, right, y - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  const footerLeft = doc.splitTextToSize(
    `${BRAND_NAME} · Confidential · ${reportRef}`,
    contentWidth(doc) * 0.72,
  );
  doc.text(footerLeft, MARGIN_X, y + 2);
  doc.text(`${pageNum} / ${pageCount}`, right, y + 2, { align: "right" });
}

function rightEdgeX(doc: jsPDF): number {
  return pageSize(doc).w - MARGIN_RIGHT;
}

function contentWidth(doc: jsPDF): number {
  return rightEdgeX(doc) - MARGIN_X;
}

function textX(): number {
  return MARGIN_X;
}

function textWidth(doc: jsPDF): number {
  return contentWidth(doc);
}

/** Leading in pt — must exceed font size to avoid baseline collision in jsPDF. */
function leadingPt(fontSize: number): number {
  return Math.ceil(fontSize * 1.75);
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  reportRef: string,
): number {
  const { h } = pageSize(doc);
  if (y + needed <= h - FOOTER_H - 8) return y;
  const pageCount = doc.getNumberOfPages();
  paintRunningFooter(doc, pageCount, pageCount, reportRef);
  doc.addPage();
  return MARGIN_X + LAYOUT.newPageTop;
}

function addGap(doc: jsPDF, y: number, gap: number, reportRef: string): number {
  y = ensureSpace(doc, y, gap, reportRef);
  return y + gap;
}

function writeSectionTitle(
  doc: jsPDF,
  y: number,
  title: string,
  reportRef: string,
  options?: { first?: boolean },
): number {
  if (!options?.first) {
    y = addGap(doc, y, LAYOUT.sectionBefore, reportRef);
  }
  const cw = contentWidth(doc);
  y = ensureSpace(doc, y, 40, reportRef);

  // Section label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(title.toUpperCase(), MARGIN_X, y);
  y += 11;

  // Full-width gray rule (thin)
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y, MARGIN_X + cw, y);

  // Short lime accent dash over the gray rule
  doc.setDrawColor(...COLORS.lime);
  doc.setLineWidth(2.0);
  doc.line(MARGIN_X, y, MARGIN_X + 48, y);

  return y + LAYOUT.afterSectionRule;
}

function writeLines(
  doc: jsPDF,
  y: number,
  lines: string[],
  x: number,
  reportRef: string,
  fontSize: number,
  lineH: number,
  fontStyle: "normal" | "bold" = "normal",
): number {
  for (const line of lines) {
    y = ensureSpace(doc, y, lineH, reportRef);
    // ensureSpace paints footer at 7pt — restore body font after every page break
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...COLORS.ink);
    doc.text(pdfText(line), x, y);
    y += lineH;
  }
  return y;
}

function writeBody(
  doc: jsPDF,
  y: number,
  text: string,
  reportRef: string,
  fontSize = 9.5,
): number {
  const w = textWidth(doc);
  const lineH = leadingPt(fontSize);
  y = addGap(doc, y, 8, reportRef);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(pdfText(text), w);
  y = writeLines(doc, y, lines, textX(), reportRef, fontSize, lineH);
  return y + LAYOUT.afterBody;
}

function writeBullet(
  doc: jsPDF,
  y: number,
  text: string,
  reportRef: string,
): number {
  const bulletPad = 14;
  const fontSize = 9.5;
  const lineH = leadingPt(fontSize);
  const w = textWidth(doc) - bulletPad;
  const lines = doc.splitTextToSize(pdfText(text), w);
  const blockH = lines.length * lineH + 4;
  y = ensureSpace(doc, y, blockH, reportRef);

  doc.setFillColor(...COLORS.lime);
  doc.rect(textX() + 1, y + 2, 3.5, 3.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...COLORS.ink);
  let lineY = y;
  for (const line of lines) {
    lineY = ensureSpace(doc, lineY, lineH, reportRef);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...COLORS.ink);
    doc.text(line, textX() + bulletPad, lineY);
    lineY += lineH;
  }
  return lineY + LAYOUT.afterBullet;
}

function addCompactTable(
  doc: jsPDF,
  y: number,
  head: string[],
  body: string[][],
  reportRef: string,
  options?: { valueColumnAlign?: "left" | "right" },
): number {
  y = addGap(doc, y, LAYOUT.beforeTable, reportRef);
  const valueAlign = options?.valueColumnAlign ?? "right";
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_RIGHT, bottom: FOOTER_H + 14 },
    head: [head.map((c) => pdfText(c))],
    body: body.map((row) => row.map((cell) => pdfText(String(cell)))),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
      minCellHeight: 16,
      overflow: "linebreak",
      lineColor: COLORS.border,
      lineWidth: 0.25,
      textColor: COLORS.ink,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.headerText,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold", textColor: COLORS.muted },
      1: { cellWidth: "auto", halign: valueAlign },
    },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    theme: "grid",
  });
  return tableFinalY(doc as JsPDFWithTable) + LAYOUT.afterTable;
}

function scoreBandLabel(score: number): string {
  if (score >= 70) return "strong";
  if (score >= 55) return "moderate";
  if (score >= 40) return "mixed";
  return "soft";
}

function buildConsultantView(
  bundle: ValuationExportBundle,
  model: ValuationExportDocument,
) {
  const { inputs, outputs } = bundle;
  const arr = inputs.arr > 0 ? inputs.arr : Math.max(0, inputs.mrr) * 12;
  const ltvCac =
    inputs.cac > 0 && inputs.ltv > 0
      ? (inputs.ltv / inputs.cac).toFixed(1)
      : null;

  const valuationParagraph = model.hasValuation
    ? `Our desk synthesis places implied enterprise value between ${model.rangeLabel}, anchored at ${model.midpointLabel} (model confidence ${outputs.confidencePct}/100). The band reflects ${inputs.industry} comparables at the ${inputs.stage} stage, ${formatShortCurrency(arr)} ARR equivalent, and adjustments for growth (${inputs.monthlyGrowthPct.toFixed(1)}% MoM), churn (${inputs.churnPctMonthly.toFixed(1)}% monthly), and burn discipline (${inputs.burnMultiple.toFixed(1)}×). This is a planning range, not a fairness opinion, and should be tightened with verified revenue artifacts before external outreach.`
    : `We were unable to anchor a quantitative enterprise value band because recurring revenue inputs were incomplete. The qualitative assessment below still applies; re-run the synthesis once MRR or ARR is verified.`;

  const driversParagraph = `Market-facing indices read ${scoreBandLabel(outputs.acquisitionHeat)} on acquisition appetite (${outputs.acquisitionHeat}/100) and ${scoreBandLabel(outputs.investorInterest)} on investor demand (${outputs.investorInterest}/100), with growth integrity at ${outputs.growthQuality}/100. ${
    outputs.acquisitionHeat > outputs.investorInterest + 6
      ? "Corporate M&A heat currently exceeds incremental venture appetite, which favors structured strategic dialogues over a broad VC process."
      : "Strategic and venture interest are closer in band; sequencing and narrative discipline will matter more than headline scores."
  } ${ltvCac ? `Unit economics (LTV/CAC ~${ltvCac}×) ${Number(ltvCac) >= 3 ? "support" : "constrain"} multiple expansion versus category medians.` : ""}`;

  const timingParagraph = `The timing corridor is characterized as "${outputs.marketTiming}," with capital efficiency at ${
    inputs.burnMultiple > 0
      ? `${inputs.burnMultiple.toFixed(1)}× burn`
      : "an unmeasured burn multiple"
  } and ${inputs.runwayMonths} months runway. Liquidity signal: ${outputs.liquiditySignal}. Suggested process horizon: ${outputs.suggestedTimeline}.`;

  const topInsights = [...model.insights]
    .sort((a, b) => b.confidence_pct - a.confidence_pct)
    .slice(0, 4);

  const capitalEff =
    model.marketTiming.find((r) => r.label === "Capital efficiency anchor")
      ?.value ?? "—";
  const snapshotRows: string[][] = model.hasValuation
    ? [
        ["Implied EV range", model.rangeLabel],
        ["Midpoint anchor", model.midpointLabel],
        ["Model confidence", `${outputs.confidencePct} / 100`],
        ["Acquisition appetite", `${outputs.acquisitionHeat} / 100`],
        ["Investor demand", `${outputs.investorInterest} / 100`],
        ["Growth integrity", `${outputs.growthQuality} / 100`],
        ["Market timing", outputs.marketTiming],
        ["Capital efficiency", capitalEff],
      ]
    : [["Status", "Qualitative memo only (revenue anchor required)"]];

  return {
    valuationParagraph,
    driversParagraph,
    timingParagraph,
    topInsights,
    snapshotRows,
  };
}

function paintMemorandumHeader(
  doc: jsPDF,
  model: ValuationExportDocument,
  logo: LogoAsset | null,
): number {
  const { w } = pageSize(doc);
  const cw = contentWidth(doc);

  // Dark header band (matches reference PDF)
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, w, HEADER_BAND_H, "F");

  let logoW = 0;
  let logoH = 0;
  let logoY = 0;
  if (logo) {
    const size = logoDisplaySize(
      logo.widthPx,
      logo.heightPx,
      LOGO_MAX_HEIGHT_PT,
    );
    logoW = size.w;
    logoH = size.h;
    logoY = (HEADER_BAND_H - logoH) / 2;
    doc.addImage(logo.dataUrl, "PNG", MARGIN_X, logoY, logoW, logoH);
  }

  const brandX = MARGIN_X + (logo ? logoW + 14 : 0);
  const brandMid = logo ? logoY + logoH / 2 : HEADER_BAND_H / 2;

  // Brand name in lime-tinted cream on dark bg
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.headerText);
  doc.text(BRAND_NAME, brandX, brandMid - 2);

  // Subtitle in muted light on dark bg
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.headerSubtext);
  doc.text("Venture synthesis intelligence", brandX, brandMid + 12);

  // CONFIDENTIAL block — top-right, light text on dark
  const metaX = rightEdgeX(doc);
  const metaMaxW = 118;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.headerSubtext);
  const metaY = HEADER_BAND_H / 2 - 14;
  doc.text("CONFIDENTIAL", metaX, metaY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const refLines = doc.splitTextToSize(model.reportRef, metaMaxW);
  let metaLineY = metaY + leadingPt(7);
  for (const line of refLines) {
    doc.text(line, metaX, metaLineY, { align: "right" });
    metaLineY += leadingPt(7);
  }
  const dateLines = doc.splitTextToSize(model.generatedAt, metaMaxW);
  for (const line of dateLines) {
    doc.text(line, metaX, metaLineY, { align: "right" });
    metaLineY += leadingPt(7);
  }

  // Transition line after dark band: short lime accent only (no gray rule)
  let y = HEADER_BAND_H + MARGIN_TOP_CONTENT;
  doc.setDrawColor(...COLORS.lime);
  doc.setLineWidth(2.0);
  doc.line(MARGIN_X, y, MARGIN_X + 48, y);
  y += 22;

  doc.setTextColor(...COLORS.ink);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize("Executive Valuation Memorandum", cw);
  y = writeLines(
    doc,
    y,
    titleLines,
    MARGIN_X,
    model.reportRef,
    17,
    leadingPt(17),
    "bold",
  );

  const companyLines = doc.splitTextToSize(model.companyName, cw);
  y = writeLines(
    doc,
    y,
    companyLines,
    MARGIN_X,
    model.reportRef,
    12,
    leadingPt(12),
    "bold",
  );

  doc.setTextColor(...COLORS.muted);
  const subLines = doc.splitTextToSize(
    "Prepared for diligence · Final synthesis",
    cw,
  );
  y = writeLines(
    doc,
    y,
    subLines,
    MARGIN_X,
    model.reportRef,
    8.5,
    leadingPt(8.5),
    "normal",
  );

  return y + LAYOUT.afterTitleBlock;
}

export async function downloadValuationPdfImpl(
  bundle: ValuationExportBundle,
): Promise<void> {
  const model = buildValuationExportDocument(bundle);
  const view = buildConsultantView(bundle, model);

  // Use letter format, pt units
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // Load logo with dark background to match header
  const logo = await loadOwnerrLogoAsset("dark");

  // ── PAGE 1 HEADER ──────────────────────────────────────────────────────────
  let y = paintMemorandumHeader(doc, model, logo);

  // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
  y = writeSectionTitle(doc, y, "Executive summary", model.reportRef, {
    first: true,
  });
  y = writeBody(doc, y, model.executiveSummary, model.reportRef);
  y = addCompactTable(
    doc,
    y,
    ["Metric", "Reading"],
    view.snapshotRows,
    model.reportRef,
  );

  // ── VALUATION ASSESSMENT ───────────────────────────────────────────────────
  y = writeSectionTitle(doc, y, "Valuation assessment", model.reportRef);
  y = writeBody(doc, y, view.valuationParagraph, model.reportRef);
  y = addGap(doc, y, LAYOUT.betweenBody, model.reportRef);
  y = writeBody(doc, y, view.driversParagraph, model.reportRef);
  y = addGap(doc, y, LAYOUT.betweenBody, model.reportRef);
  y = writeBody(doc, y, view.timingParagraph, model.reportRef);

  // ── STRATEGIC IMPLICATIONS ─────────────────────────────────────────────────
  y = writeSectionTitle(doc, y, "Strategic implications", model.reportRef);
  const lead =
    "The following conclusions follow directly from submitted operating data and composite market indices. They are intended to inform board conversation, buyer outreach, or financing sequencing, not to replace confirmatory diligence.";
  y = writeBody(doc, y, lead, model.reportRef, 9);
  y = addGap(doc, y, 6, model.reportRef);
  for (const point of model.narrative) {
    y = writeBullet(doc, y, point.text, model.reportRef);
  }

  // ── PRIORITY INTELLIGENCE THEMES ───────────────────────────────────────────
  y = writeSectionTitle(
    doc,
    y,
    "Priority intelligence themes",
    model.reportRef,
  );
  if (view.topInsights.length === 0) {
    y = writeBody(
      doc,
      y,
      "No supplemental intelligence cards were generated for this run.",
      model.reportRef,
    );
  } else {
    y = addGap(doc, y, 6, model.reportRef);
    for (const card of view.topInsights) {
      const line = `${card.title} (${card.confidence_pct}% confidence): ${card.explanation} Supporting metrics: ${card.referenced_metrics}. ${card.market_reasoning}`;
      y = writeBullet(doc, y, line, model.reportRef);
    }
  }

  // ── SUBMITTED OPERATING PROFILE ────────────────────────────────────────────
  y = writeSectionTitle(doc, y, "Submitted operating profile", model.reportRef);
  y = writeBody(
    doc,
    y,
    "Figures below are as provided by the company and feed the synthesis engine. Validate revenue, retention, and customer counts independently before circulation.",
    model.reportRef,
    9,
  );
  const profileRows = model.questionnaire
    .map((r) => [r.label, r.value] as [string, string])
    .filter(([, v]) => v !== "—" && pdfText(v) !== "N/A")
    .map(([label, value]) => [pdfText(label), pdfText(value)]);
  const engineRows = model.modelEngineInputs.map((r) => [r.label, r.value]);
  y = addCompactTable(
    doc,
    y,
    ["Input", "Submitted value"],
    [...profileRows, ...engineRows],
    model.reportRef,
    { valueColumnAlign: "left" },
  );

  // ── SCOPE & RELIANCE ───────────────────────────────────────────────────────
  y = writeSectionTitle(doc, y, "Scope & reliance", model.reportRef);
  const closing = `This memorandum is produced by ${BRAND_NAME} from founder-submitted inputs and comparative desk models. It does not constitute investment advice, a fairness opinion, or audited financial statements. Ranges and scores are scenario outputs for planning; confirmatory diligence remains essential. Reference ${model.reportRef}.`;
  y = writeBody(doc, y, closing, model.reportRef, 8.5);

  // ── RUNNING FOOTERS (all pages) ────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    paintRunningFooter(doc, i, pageCount, model.reportRef);
  }

  // ── SAVE ───────────────────────────────────────────────────────────────────
  const namePart = sanitizeFilenamePart(
    model.companyName === "Subject company" ? "valuation" : model.companyName,
  );
  doc.save(`Ownerr-Executive-Valuation-Report-${namePart}.pdf`);
}
