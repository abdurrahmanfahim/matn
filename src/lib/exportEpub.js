// Builds a real EPUB3 file (a specially-structured zip) from the current
// book, using the same parsed document the live preview renders from.
// Deliberately minimal but spec-valid: mimetype stored uncompressed,
// container.xml, an OPF package document, an EPUB3 nav document (also
// used as the EPUB2 toc.ncx fallback for older readers), one XHTML file
// per chapter, and a small stylesheet carrying the current theme's
// colors so the exported book still looks like itself.

import { resolveTheme } from './themes';

function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineXhtml(text) {
  let out = esc(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  return out;
}

function paragraphXhtml(text, termMode) {
  if (termMode === 'auto') {
    const latinColon = text.indexOf(':');
    const arabicColon = text.indexOf('：');
    let colonPos = -1;
    if (latinColon > -1 && arabicColon > -1) colonPos = Math.min(latinColon, arabicColon);
    else colonPos = Math.max(latinColon, arabicColon);
    if (colonPos > -1 && colonPos <= 60 && !/\*\*(.+?)\*\*/.test(text)) {
      const term = text.slice(0, colonPos + 1);
      const rest = text.slice(colonPos + 1);
      return `<p><span class="term">${esc(term)}</span>${inlineXhtml(rest)}</p>`;
    }
  }
  return `<p>${inlineXhtml(text)}</p>`;
}

function uuid() {
  return 'urn:uuid:' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Groups the flat content list into { title, id, items[] } chapters.
// Anything before the first "#" heading becomes an untitled lead-in
// chapter (only created if such content actually exists).
function groupIntoChapters(content, introTitle) {
  const chapters = [];
  let current = null;
  for (const block of content) {
    if (block.type === 'chapter') {
      current = { title: block.text, id: block.id, items: [] };
      chapters.push(current);
    } else {
      if (!current) {
        current = { title: introTitle, id: 'intro', items: [] };
        chapters.push(current);
      }
      current.items.push(block);
    }
  }
  return chapters;
}

function chapterBodyXhtml(items, termMode) {
  let html = '';
  for (const block of items) {
    if (block.type === 'sub') {
      html += `<h2 id="${block.id}">${esc(block.text)}</h2>\n`;
    } else if (block.type === 'verse') {
      html += `<div class="verse">${block.lines.map((l) => esc(l.trim())).join('<br/>')}</div>\n`;
    } else {
      html += paragraphXhtml(block.text, termMode) + '\n';
    }
  }
  return html;
}

export async function buildEpub(doc, { theme, dir, termMode, customColors, customFont }) {
  const { default: JSZip } = await import('jszip');
  const t = resolveTheme(theme, customColors, customFont);
  const lang = dir === 'rtl' ? 'ar' : 'en';
  const introTitle = dir === 'rtl' ? 'مقدمة' : 'Introduction';
  const title = doc.meta.title || (dir === 'rtl' ? 'كتاب بلا عنوان' : 'Untitled Book');
  const chapters = groupIntoChapters(doc.content, introTitle);
  const bookId = uuid();

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const css = `
body { font-family: serif; direction: ${dir}; line-height: 1.8; margin: 1em; color: ${t.text}; background: ${t.pageBg}; }
h1.chapter-title { background: ${t.chapterBg}; color: ${t.chapterText}; padding: 0.5em 0.8em; border-radius: 3px; text-align: center; }
h2 { color: ${t.subText}; border-inline-start: 3px solid ${t.subBorder}; padding-inline-start: 0.5em; }
.verse { background: ${t.verseBg}; border: 1px solid ${t.verseBorder}; border-radius: 3px; padding: 0.6em 1em; text-align: center; margin: 0.8em 0; }
.term { color: ${t.termColor}; font-weight: bold; }
`;
  zip.file('OEBPS/style.css', css);

  // Chapter XHTML files
  chapters.forEach((ch, i) => {
    const body = chapterBodyXhtml(ch.items, termMode);
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <title>${esc(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1 class="chapter-title" id="${ch.id}">${esc(ch.title)}</h1>
  ${body}
</body>
</html>`;
    zip.file(`OEBPS/chapter-${i + 1}.xhtml`, xhtml);
  });

  // EPUB3 nav document (doubles as the human-readable TOC)
  const navItems = chapters.map((ch, i) => `<li><a href="chapter-${i + 1}.xhtml">${esc(ch.title)}</a></li>`).join('\n');
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"/><title>${esc(dir === 'rtl' ? 'الفهرس' : 'Contents')}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${esc(dir === 'rtl' ? 'الفهرس' : 'Contents')}</h1>
    <ol>${navItems}</ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  // EPUB2 toc.ncx fallback (older reading systems still expect this)
  const navPoints = chapters.map((ch, i) => `
    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${esc(ch.title)}</text></navLabel>
      <content src="chapter-${i + 1}.xhtml"/>
    </navPoint>`).join('');
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
  </head>
  <docTitle><text>${esc(title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // Package document
  const manifestItems = chapters.map((ch, i) =>
    `<item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n    ');
  const spineItems = chapters.map((ch, i) => `<itemref idref="chapter-${i + 1}"/>`).join('\n    ');

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${esc(title)}</dc:title>
    <dc:language>${lang}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx" page-progression-direction="${dir}">
    ${spineItems}
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', opf);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
