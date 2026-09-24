// Builds a single self-contained HTML file of the book — no app, no
// build step, just open it in a browser. Reuses the same parser and
// theme data as the live preview so the export matches exactly.

import { buildDocument, splitTerm } from './parser';
import { PAGE_SIZES, resolveTheme } from './themes';

function escHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineHtml(text) {
  let out = escHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  return out;
}

function paragraphHtml(text, termMode) {
  const split = splitTerm(text, termMode);
  if (split) {
    return `<p><span class="term">${escHtml(split.term)}</span>${inlineHtml(split.rest)}</p>`;
  }
  return `<p>${inlineHtml(text)}</p>`;
}

const FONT_FAMILY_QUERY =
  'family=Noto+Naskh+Arabic:wght@400;500;600;700' +
  '&family=Scheherazade+New:wght@400;700' +
  '&family=Noto+Sans+Arabic:wght@400;500;600;700' +
  '&family=Amiri:ital,wght@0,400;0,700;1,400';

export function buildStandaloneHtml(rawText, { theme, dir, numerals, termMode, pageSize, fontSize = 14.5, customColors, customFont }) {
  const doc = buildDocument(rawText, { numerals });
  const t = resolveTheme(theme, customColors, customFont);

  let body = '';
  if (doc.meta.title) {
    body += `<div class="bk-title"><div class="bk-title-main">${escHtml(doc.meta.title)}</div>`;
    if (doc.meta.subtitle) body += `<div class="bk-title-sub">${escHtml(doc.meta.subtitle)}</div>`;
    body += `</div>`;
  }
  if (doc.toc.length) {
    body += `<div class="bk-toc"><div class="bk-toc-title">${dir === 'rtl' ? 'الفهرس' : 'Table of Contents'}</div>`;
    for (const e of doc.toc) {
      body += `<div class="bk-toc-entry ${e.level === 'main' ? 'main' : 'sub'}"><a href="#${e.id}">${escHtml(e.text)}</a></div>`;
    }
    body += `</div>`;
  }
  for (const block of doc.content) {
    if (block.type === 'chapter') {
      body += `<div class="bk-chapter" id="${block.id}">${escHtml(block.text)}</div>`;
    } else if (block.type === 'sub') {
      body += `<div class="bk-sub" id="${block.id}">${escHtml(block.text)}</div>`;
    } else if (block.type === 'verse') {
      body += `<div class="bk-verse">${block.lines.map((l) => escHtml(l.trim())).join('<br>')}</div>`;
    } else {
      body += paragraphHtml(block.text, termMode);
    }
  }

  const pageWidth = PAGE_SIZES[pageSize];
  const docTitle = doc.meta.title || 'Book';

  return `<!DOCTYPE html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${FONT_FAMILY_QUERY}&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #2a241d;
    display: flex;
    justify-content: center;
    padding: 40px 16px;
    font-family: ${t.fontBody};
  }
  #page {
    background: ${t.pageBg};
    color: ${t.text};
    direction: ${dir};
    text-align: ${dir === 'rtl' ? 'right' : 'left'};
    max-width: ${pageWidth};
    width: 100%;
    line-height: 2;
    font-size: ${fontSize}px;
    padding: 48px 44px;
    box-shadow: 0 10px 40px rgba(0,0,0,.45);
    border-radius: 2px;
  }
  #page .bk-title { text-align: center; margin-bottom: 34px; }
  #page .bk-title-main { font-weight: 700; font-size: 30px; color: ${t.chapterBg}; margin-bottom: 10px; }
  #page .bk-title-sub { font-size: 14px; opacity: .65; }
  #page .bk-toc { margin-bottom: 30px; border-bottom: 1px solid ${t.dotColor}; padding-bottom: 18px; }
  #page .bk-toc-title { text-align: center; font-weight: 700; font-size: 19px; color: ${t.chapterBg}; margin-bottom: 14px; }
  #page .bk-toc-entry { padding: 3px 0; font-size: 12.5px; }
  #page .bk-toc-entry a { color: ${t.chapterBg}; text-decoration: none; font-weight: 600; }
  #page .bk-toc-entry.sub a { color: ${t.subText}; font-weight: 400; padding-inline-start: 16px; display: inline-block; }
  #page .bk-chapter { background: ${t.chapterBg}; color: ${t.chapterText}; font-weight: 700; font-size: 15.5px; padding: 9px 16px; border-radius: 3px; margin: 24px 0 12px 0; text-align: center; }
  #page .bk-sub { color: ${t.subText}; font-weight: 700; font-size: 13.5px; border-inline-start: 3px solid ${t.subBorder}; padding-inline-start: 9px; margin: 16px 0 8px 0; }
  #page p { margin: 0 0 9px 0; }
  #page .term { color: ${t.termColor}; font-weight: 700; }
  #page .bk-verse { background: ${t.verseBg}; border: 1px solid ${t.verseBorder}; border-radius: 3px; padding: 10px 18px; text-align: center; margin: 12px 0; font-size: 13.5px; line-height: 1.95; }
  @media print {
    body { background: #fff; padding: 0; }
    #page { box-shadow: none; max-width: none; }
  }
</style>
</head>
<body>
<div id="page">
${body}
</div>
</body>
</html>
`;
}
