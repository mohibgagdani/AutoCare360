import PDFDocument from 'pdfkit';

export const PDF_COLORS = Object.freeze({
  navy: '#0b1220',
  blue: '#2563eb',
  sky: '#60a5fa',
  text: '#0f172a',
  muted: '#64748b',
  light: '#f8fafc',
  stripe: '#f1f5f9',
  border: '#e2e8f0',
  green: '#16a34a',
  amber: '#d97706',
  orange: '#ea580c',
  red: '#dc2626',
});

const MARGIN = 40;

// Built-in PDF fonts have no ₹ glyph, so reports use the "Rs." prefix.
export const money = (n, currency = 'INR') => {
  const value = Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return currency === 'INR' ? `Rs. ${value}` : `${currency} ${value}`;
};
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtNumber = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));
export const titleCase = (s = '') => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const STATUS_COLOR = {
  up_to_date: PDF_COLORS.green,
  due_soon: PDF_COLORS.amber,
  due: PDF_COLORS.orange,
  overdue: PDF_COLORS.red,
  completed: PDF_COLORS.blue,
  skipped: PDF_COLORS.muted,
  valid: PDF_COLORS.green,
  expiring_soon: PDF_COLORS.amber,
  expired: PDF_COLORS.red,
};

function drawBrandHeader(doc, title, subtitle) {
  const width = doc.page.width;
  doc.save().rect(0, 0, width, 78).fill(PDF_COLORS.navy).restore();
  doc.font('Helvetica-Bold').fontSize(17).fillColor('#ffffff').text('AutoCare', MARGIN, 26, { continued: true });
  doc.fillColor(PDF_COLORS.sky).text('360');
  doc.font('Helvetica').fontSize(8.5).fillColor('#cbd5e1').text('Complete vehicle maintenance, simplified.', MARGIN, 48);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text(title, 240, 26, { width: width - 240 - MARGIN, align: 'right' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(8.5).fillColor('#cbd5e1').text(subtitle, 240, 44, { width: width - 240 - MARGIN, align: 'right' });
  }
  doc.x = MARGIN;
  doc.y = 100;
}

/** Starts a streamed PDF response. */
export function createPdf(res, { filename, title, subtitle }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: title, Author: 'AutoCare360', Creator: 'AutoCare360' },
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  drawBrandHeader(doc, title, subtitle);
  return doc;
}

/** Adds page footers and ends the document. */
export function finalizePdf(doc) {
  const range = doc.bufferedPageRange();
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow writing inside the margin without triggering a page break
    const y = doc.page.height - 28;
    doc.save().moveTo(MARGIN, y - 8).lineTo(doc.page.width - MARGIN, y - 8).lineWidth(0.5).strokeColor(PDF_COLORS.border).stroke().restore();
    doc.font('Helvetica').fontSize(7.5).fillColor(PDF_COLORS.muted);
    doc.text(`Generated ${generated} · AutoCare360`, MARGIN, y, { lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, doc.page.width - MARGIN - 100, y, { width: 100, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }
  doc.end();
}

const ensureSpace = (doc, height) => {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom - 10) {
    doc.addPage();
    doc.y = MARGIN;
  }
};

export function sectionTitle(doc, text, caption) {
  ensureSpace(doc, 50);
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(PDF_COLORS.text).text(text, MARGIN, doc.y);
  if (caption) doc.font('Helvetica').fontSize(8.5).fillColor(PDF_COLORS.muted).text(caption);
  const y = doc.y + 4;
  doc.save().moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1).strokeColor(PDF_COLORS.blue).stroke().restore();
  doc.y = y + 8;
}

/** Row of KPI boxes. */
export function statBoxes(doc, stats) {
  ensureSpace(doc, 60);
  const gap = 8;
  const width = (doc.page.width - MARGIN * 2 - gap * (stats.length - 1)) / stats.length;
  const top = doc.y;
  stats.forEach((s, i) => {
    const x = MARGIN + i * (width + gap);
    doc.save().roundedRect(x, top, width, 50, 6).fill(PDF_COLORS.light).restore();
    doc.save().roundedRect(x, top, width, 50, 6).lineWidth(0.6).strokeColor(PDF_COLORS.border).stroke().restore();
    doc.font('Helvetica').fontSize(7.5).fillColor(PDF_COLORS.muted).text(s.label.toUpperCase(), x + 10, top + 10, { width: width - 20 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(s.color || PDF_COLORS.text).text(String(s.value), x + 10, top + 24, { width: width - 20 });
  });
  doc.x = MARGIN;
  doc.y = top + 62;
}

/** Two-column key/value grid. */
export function keyValueGrid(doc, pairs, columns = 2) {
  const colWidth = (doc.page.width - MARGIN * 2) / columns;
  const rows = Math.ceil(pairs.length / columns);
  for (let r = 0; r < rows; r += 1) {
    ensureSpace(doc, 26);
    const top = doc.y;
    for (let c = 0; c < columns; c += 1) {
      const pair = pairs[r * columns + c];
      if (!pair) continue;
      const x = MARGIN + c * colWidth;
      doc.font('Helvetica').fontSize(7.5).fillColor(PDF_COLORS.muted).text(pair[0].toUpperCase(), x, top, { width: colWidth - 12 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(PDF_COLORS.text).text(pair[1] ?? '—', x, top + 10, { width: colWidth - 12 });
    }
    doc.x = MARGIN;
    doc.y = top + 28;
  }
}

/**
 * Paginated table.
 * @param {{ header:string, width:number, align?:string, value:(row)=>any, color?:(row)=>string }[]} columns
 *        widths are relative weights.
 */
export function table(doc, columns, rows, { emptyText = 'No records' } = {}) {
  const tableWidth = doc.page.width - MARGIN * 2;
  const totalWeight = columns.reduce((s, c) => s + (c.width || 1), 0);
  const widths = columns.map((c) => ((c.width || 1) / totalWeight) * tableWidth);
  const pad = 5;
  const fontSize = 8;

  const drawHeader = () => {
    const top = doc.y;
    doc.save().rect(MARGIN, top, tableWidth, 20).fill(PDF_COLORS.navy).restore();
    let x = MARGIN;
    columns.forEach((c, i) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff').text(c.header.toUpperCase(), x + pad, top + 6.5, {
        width: widths[i] - pad * 2,
        align: c.align || 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i];
    });
    doc.y = top + 20;
  };

  ensureSpace(doc, 40);
  drawHeader();

  if (!rows.length) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(PDF_COLORS.muted).text(emptyText, MARGIN + pad, doc.y + 8);
    doc.y += 12;
    doc.x = MARGIN;
    return;
  }

  rows.forEach((row, index) => {
    const cells = columns.map((c) => {
      const v = c.value(row);
      return v === null || v === undefined || v === '' ? '—' : String(v);
    });
    doc.font('Helvetica').fontSize(fontSize);
    const height =
      Math.max(...cells.map((text, i) => doc.heightOfString(text, { width: widths[i] - pad * 2 }))) + pad * 2;

    if (doc.y + height > doc.page.height - doc.page.margins.bottom - 10) {
      doc.addPage();
      doc.y = MARGIN;
      drawHeader();
    }
    const top = doc.y;
    if (index % 2 === 1) doc.save().rect(MARGIN, top, tableWidth, height).fill(PDF_COLORS.stripe).restore();
    let x = MARGIN;
    cells.forEach((text, i) => {
      const color = columns[i].color?.(row) || PDF_COLORS.text;
      doc
        .font(columns[i].bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fontSize)
        .fillColor(color)
        .text(text, x + pad, top + pad, { width: widths[i] - pad * 2, align: columns[i].align || 'left' });
      x += widths[i];
    });
    doc.save().moveTo(MARGIN, top + height).lineTo(MARGIN + tableWidth, top + height).lineWidth(0.4).strokeColor(PDF_COLORS.border).stroke().restore();
    doc.y = top + height;
  });
  doc.x = MARGIN;
  doc.moveDown(0.5);
}

export function paragraph(doc, text, { color = PDF_COLORS.muted, size = 9 } = {}) {
  ensureSpace(doc, 30);
  doc.font('Helvetica').fontSize(size).fillColor(color).text(text, MARGIN, doc.y, { width: doc.page.width - MARGIN * 2 });
}
