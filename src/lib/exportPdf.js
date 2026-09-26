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
//
// Two things this deliberately avoids, both found by testing against a
// real render rather than assumed safe:
//   - Positioning it miles off-screen (e.g. `left: -99999px`). html2canvas
//     clones the target into its own offscreen iframe to render it, and
//     with very large negative offsets it misjudged that iframe's width —
//     the captured canvas came out with the correct height but roughly
//     half the intended width, which then got force-stretched to fit the
//     PDF page and showed up as visibly distorted (squashed/elongated)
//     text, in both Arabic and English content.
//   - Hiding it via a zero-size `overflow: hidden` wrapper. The element's
//     own layout box still measures correctly in the live DOM either way
//     (confirmed directly), but html2canvas's own render pass respects
//     that ancestor clipping when rasterizing, silently cutting off
//     content past the wrapper's bounds — a blank/transparent region
//     that then renders solid black once exported as JPEG (no alpha
//     channel to fall back to).
// Plain `top: 0; left: 0` with a deeply negative z-index sidesteps both:
// the element sits at a normal, non-extreme position, and is hidden
// simply because the app's own opaque UI paints over it — no clipping or
// offset trickery for html2canvas's cloning to misinterpret.
function makePageShell(widthPx, heightPx) {
  const el = document.createElement('div');
  el.id = 'book-page';
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.zIndex = '-9999';
  el.style.pointerEvents = 'none';
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

function removePageShell(el) {
  el.remove();
}

// Copies every inline style (theme background/color/font/direction plus
// the --chapter-bg/--verse-bg/etc. custom properties) from the live
// #book-page onto a shell, so rasterized pages match the preview exactly.
//
// Explicitly skips box-sizing properties (max-width chief among them: the
// live preview sets max-width to the on-screen page-size value, e.g.
// 420px for A5). Copying it verbatim used to silently override the
// shell's own explicit width right after makePageShell had set it,
// capping every render at ~420px regardless of the physical page size —
// which is why the previous fix (correctly sizing the output canvas via
// html2canvas's width/windowWidth options) still left the un-rendered
// remainder of the canvas blank, showing up as a solid black band once
// exported as JPEG (no alpha channel to fall back to).
const SKIP_COPY_PROPS = new Set(['max-width', 'width', 'height', 'min-height', 'min-width']);
function copyThemeVars(source, target) {
  for (let i = 0; i < source.style.length; i++) {
    const prop = source.style[i];
    if (SKIP_COPY_PROPS.has(prop)) continue;
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

  removePageShell(measure);
  return pages.filter((p) => p.length > 0);
}

async function renderPageCanvas(html2canvas, nodes, liveBookPage, widthPx, heightPx, paddingPx) {
  const shell = makePageShell(widthPx, heightPx);
  copyThemeVars(liveBookPage, shell);
  shell.style.padding = `${paddingPx}px`;
  shell.style.boxSizing = 'border-box';
  for (const n of nodes) shell.appendChild(n.cloneNode(true));

  const canvas = await html2canvas(shell, {
    scale: 1,
    width: widthPx,
    height: heightPx,
    windowWidth: widthPx,
    windowHeight: heightPx,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });
  removePageShell(shell);
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
      // Defensive: fit the actual captured aspect ratio into the slot
      // instead of blindly force-stretching to wPt x hPt. Both should
      // already match closely — but if some future change (a new theme
      // property, a very wide unbreakable element) throws that off again,
      // this degrades to a slightly smaller centered image rather than
      // silently stretching text into illegible shapes.
      const canvasRatio = canvas.width / canvas.height;
      const slotRatio = wPt / hPt;
      let drawW = wPt;
      let drawH = hPt;
      let offX = 0;
      let offY = 0;
      if (Math.abs(canvasRatio - slotRatio) / slotRatio > 0.02) {
        if (canvasRatio > slotRatio) {
          drawH = wPt / canvasRatio;
          offY = (hPt - drawH) / 2;
        } else {
          drawW = hPt * canvasRatio;
          offX = (wPt - drawW) / 2;
        }
      }
      pdf.addImage(imgData, 'JPEG', slot.x + offX, slot.y + offY, drawW, drawH);
    }
  }

  pdf.save(filename);
}
