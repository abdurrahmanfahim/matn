// Builds a real, downloadable PDF with control over page imposition —
// something the browser's native print dialog can't do (true booklet
// reordering) or doesn't expose consistently (guaranteed background
// colors across every layout). The approach:
//
//   1. Paginate: walk the live #book-page's children, measure each one
//      in an offscreen clone, and bucket them into pages sized to the
//      chosen paper's content area. Chapters always start a fresh page.
//   2. Rasterize: render each page bucket into its own offscreen
//      #book-page-styled container and capture it with html2canvas, so
//      whatever the live preview looks like — theme colors, fonts,
//      RTL/LTR — is exactly what ends up in the PDF.
//   3. Impose: place the rasterized pages onto physical sheets according
//      to the chosen layout (normal / landscape spread / 4-up / booklet)
//      and hand them to jsPDF.
//
// jsPDF and html2canvas are loaded lazily (dynamic import) rather than
// at module scope: they're only needed when someone actually generates a
// PDF this way, and are large enough (~350KB combined) that bundling
// them into the app's main chunk would slow down every load, including
// for people who never touch this feature — a real cost in a PWA that
// aims to work well on slow connections.

// Paper sizes in PDF points (1pt = 1/72in), portrait content page.
const BASE_SIZE_PT = {
  A5: [419.53, 595.28],
  A4: [595.28, 841.89],
  Letter: [612, 792],
};

const RENDER_SCALE = 2; // CSS px per pt at rasterization time
const PAGE_PADDING_PT = 24; // inner margin of each rasterized page

function px(pt) {
  return Math.round(pt * RENDER_SCALE);
}

// Creates a detached container that picks up the app's #book-page CSS
// rules (theme colors, chapter/verse/toc styling) by reusing that ID —
// it's never visible and never coexists with user interaction.
function makePageShell(widthPx, heightPx) {
  const el = document.createElement('div');
  el.id = 'book-page';
  el.style.position = 'fixed';
  el.style.left = '-99999px';
  el.style.top = '0';
  el.style.margin = '0';
  el.style.maxWidth = 'none';
  el.style.width = `${widthPx}px`;
  el.style.height = `${heightPx}px`;
  el.style.overflow = 'hidden';
  el.style.boxShadow = 'none';
  el.style.borderRadius = '0';
  el.style.flexShrink = '0';
  document.body.appendChild(el);
  return el;
}

// Copies every inline style (theme background/color/font/direction plus
// the --chapter-bg/--verse-bg/etc. custom properties) from the live
// #book-page onto a shell, so rasterized pages match the preview exactly.
function copyThemeVars(source, target) {
  for (let i = 0; i < source.style.length; i++) {
    const prop = source.style[i];
    target.style.setProperty(prop, source.style.getPropertyValue(prop));
  }
}

async function paginate(liveBookPage, contentWidthPx, contentHeightPx) {
  const measure = makePageShell(contentWidthPx, 999999);
  copyThemeVars(liveBookPage, measure);
  measure.style.padding = '0';
  measure.style.height = 'auto';

  const children = Array.from(liveBookPage.children);
  const pages = [[]];
  let used = 0;

  for (const child of children) {
    const clone = child.cloneNode(true);
    measure.appendChild(clone);
    const rect = clone.getBoundingClientRect();
    const cs = getComputedStyle(clone);
    const h = rect.height + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
    measure.removeChild(clone);

    const isChapter = child.classList.contains('bk-chapter');
    const startNewPage = used > 0 && (isChapter || used + h > contentHeightPx);
    if (startNewPage) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(child);
    used += h;
  }

  document.body.removeChild(measure);
  return pages.filter((p) => p.length > 0);
}

async function renderPageCanvas(html2canvas, nodes, liveBookPage, widthPx, heightPx, paddingPx) {
  const shell = makePageShell(widthPx, heightPx);
  copyThemeVars(liveBookPage, shell);
  shell.style.padding = `${paddingPx}px`;
  shell.style.boxSizing = 'border-box';
  for (const n of nodes) shell.appendChild(n.cloneNode(true));

  const canvas = await html2canvas(shell, { scale: 1, backgroundColor: null, useCORS: true, logging: false });
  document.body.removeChild(shell);
  return canvas;
}

function computeSheetPlan(layout, pageCount, wPt, hPt) {
  if (layout === 'landscape') {
    return {
      sheetSize: [wPt * 2, hPt],
      sheetCount: Math.ceil(pageCount / 2),
      slotsFor: (sheetIndex) => {
        const a = sheetIndex * 2;
        const b = a + 1;
        const slots = [{ page: a, x: 0, y: 0 }];
        if (b < pageCount) slots.push({ page: b, x: wPt, y: 0 });
        return slots;
      },
    };
  }
  if (layout === 'fourup') {
    const positions = [[0, 0], [wPt, 0], [0, hPt], [wPt, hPt]];
    return {
      sheetSize: [wPt * 2, hPt * 2],
      sheetCount: Math.ceil(pageCount / 4),
      slotsFor: (sheetIndex) => {
        const base = sheetIndex * 4;
        const slots = [];
        for (let k = 0; k < 4; k++) {
          const p = base + k;
          if (p < pageCount) slots.push({ page: p, x: positions[k][0], y: positions[k][1] });
        }
        return slots;
      },
    };
  }
  if (layout === 'booklet') {
    const n = Math.ceil(pageCount / 4) * 4; // pad to a multiple of 4 (blank pages)
    const sides = []; // each entry: [leftPageIdx|null, rightPageIdx|null]
    for (let s = 0; s < n / 4; s++) {
      sides.push([n - 1 - 2 * s, 2 * s]); // front (recto)
      sides.push([2 * s + 1, n - 2 - 2 * s]); // back (verso)
    }
    return {
      sheetSize: [wPt * 2, hPt],
      sheetCount: sides.length,
      slotsFor: (sheetIndex) => {
        const [left, right] = sides[sheetIndex];
        const slots = [];
        if (left < pageCount) slots.push({ page: left, x: 0, y: 0 });
        if (right < pageCount) slots.push({ page: right, x: wPt, y: 0 });
        return slots;
      },
    };
  }
  // normal: one page per sheet
  return {
    sheetSize: [wPt, hPt],
    sheetCount: pageCount,
    slotsFor: (sheetIndex) => [{ page: sheetIndex, x: 0, y: 0 }],
  };
}

// layout: 'normal' | 'landscape' | 'fourup' | 'booklet'
export async function buildImpositionPdf(liveBookPage, { pageSize = 'A5', layout = 'normal', filename = 'book.pdf', onProgress } = {}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
  }

  const [wPt, hPt] = BASE_SIZE_PT[pageSize] || BASE_SIZE_PT.A5;
  const wPx = px(wPt);
  const hPx = px(hPt);
  const padPx = px(PAGE_PADDING_PT);
  const contentW = wPx - padPx * 2;
  const contentH = hPx - padPx * 2;

  const pageBuckets = await paginate(liveBookPage, contentW, contentH);
  const total = pageBuckets.length;

  const canvases = [];
  for (let i = 0; i < pageBuckets.length; i++) {
    onProgress?.(i + 1, total);
    canvases.push(await renderPageCanvas(html2canvas, pageBuckets[i], liveBookPage, wPx, hPx, padPx));
  }

  const plan = computeSheetPlan(layout, canvases.length, wPt, hPt);
  const [sheetW, sheetH] = plan.sheetSize;
  const orientation = sheetW > sheetH ? 'landscape' : 'portrait';

  const pdf = new jsPDF({ unit: 'pt', format: [sheetW, sheetH], orientation });
  for (let s = 0; s < plan.sheetCount; s++) {
    if (s > 0) pdf.addPage([sheetW, sheetH], orientation);
    for (const slot of plan.slotsFor(s)) {
      const canvas = canvases[slot.page];
      if (!canvas) continue;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', slot.x, slot.y, wPt, hPt);
    }
  }

  pdf.save(filename);
}
