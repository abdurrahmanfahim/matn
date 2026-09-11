// Parser for وَرّاق's simplified Markdown book format.

const AR_DIGITS = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
export function toArabicDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => AR_DIGITS[d]);
}

export function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  let meta = {};
  let body = text;
  if (m) {
    body = text.slice(m[0].length);
    m[1].split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > -1) {
        meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });
  }
  return { meta, body };
}

// Block types: {type:'chapter'|'sub', text} | {type:'verse', lines:[]} | {type:'p', text}
export function parseBody(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paraBuf = [];

  const flushPara = () => {
    if (paraBuf.length) {
      const text = paraBuf.join(' ').trim();
      if (text) blocks.push({ type: 'p', text });
      paraBuf = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#\s+/.test(line)) {
      flushPara();
      blocks.push({ type: 'chapter', text: line.replace(/^#\s+/, '').trim() });
      i++;
    } else if (/^##\s+/.test(line)) {
      flushPara();
      blocks.push({ type: 'sub', text: line.replace(/^##\s+/, '').trim() });
      i++;
    } else if (/^>\s?/.test(line)) {
      flushPara();
      const verseLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        verseLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'verse', lines: verseLines });
    } else if (line.trim() === '') {
      flushPara();
      i++;
    } else {
      paraBuf.push(line.trim());
      i++;
    }
  }
  flushPara();
  return blocks;
}

// Build a render-ready structure: title/subtitle, TOC entries, and content blocks
// annotated with numbering + anchor ids.
export function buildDocument(rawText, { numerals = 'arabic' } = {}) {
  const { meta, body } = parseFrontmatter(rawText);
  const blocks = parseBody(body);

  const numeralOf = (n) => (numerals === 'arabic' ? toArabicDigits(n) : String(n));

  let counter = 0;
  let anchorId = 0;
  const toc = [];
  const content = [];

  for (const block of blocks) {
    if (block.type === 'chapter') {
      counter = 0;
      anchorId++;
      const id = `bk${anchorId}`;
      toc.push({ level: 'main', id, text: block.text });
      content.push({ type: 'chapter', id, text: block.text });
    } else if (block.type === 'sub') {
      counter++;
      anchorId++;
      const id = `bk${anchorId}`;
      const label = `${numeralOf(counter)}. ${block.text}`;
      toc.push({ level: 'sub', id, text: label });
      content.push({ type: 'sub', id, text: label });
    } else if (block.type === 'verse') {
      content.push({ type: 'verse', lines: block.lines });
    } else {
      content.push({ type: 'p', text: block.text });
    }
  }

  return { meta, toc, content };
}

// Splits a paragraph into a possible {term, rest} pair using the first colon
// found within the first 60 characters, unless the text already contains
// explicit **bold** markdown (handled separately by the inline formatter).
export function splitTerm(text, termMode) {
  if (termMode !== 'auto') return null;
  if (/\*\*(.+?)\*\*/.test(text)) return null;
  const latinColon = text.indexOf(':');
  const arabicColon = text.indexOf('：');
  let colonPos = -1;
  if (latinColon > -1 && arabicColon > -1) colonPos = Math.min(latinColon, arabicColon);
  else colonPos = Math.max(latinColon, arabicColon);
  if (colonPos > -1 && colonPos <= 60) {
    return { term: text.slice(0, colonPos + 1), rest: text.slice(colonPos + 1) };
  }
  return null;
}
