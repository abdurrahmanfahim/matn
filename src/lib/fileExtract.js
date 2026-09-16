// Extracts text from uploaded .docx and .pdf files and converts it into
// وَرّاق's simplified Markdown format as best as possible.
//
// DOCX: mammoth converts Word "Heading 1"/"Heading 2" styles into real
// <h1>/<h2> tags, which we map onto our "#"/"##" markup — so headings
// typed in Word carry over as real chapters/sub-headings, not just text.
//
// PDF: PDF has no reliable structural markup, so we can only recover
// plain paragraphs (grouped by blank-line gaps). Headings/chapters will
// need to be marked up by hand afterwards, or reconstructed via the
// "Create via AI" prompt.
//
// Both libraries are fairly heavy (mammoth, and especially pdfjs-dist),
// so they're dynamically imported here rather than at the top of the
// module — most people never upload a .docx/.pdf, and shouldn't have to
// download that code on first load just in case.

function htmlToMarkdown(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines = [];

  const inline = (el) => {
    let out = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const inner = inline(node);
        if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
        else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
        else if (tag === 'br') out += ' ';
        else out += inner;
      }
    });
    return out;
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const text = inline(node).replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (tag === 'h1') lines.push(`# ${text}`);
    else if (tag === 'h2' || tag === 'h3' || tag === 'h4') lines.push(`## ${text}`);
    else if (tag === 'blockquote') {
      text.split('\n').forEach((l) => l.trim() && lines.push(`> ${l.trim()}`));
    } else if (tag === 'li') lines.push(text);
    else lines.push(text);
    lines.push('');
  });

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractDocx(arrayBuffer) {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return htmlToMarkdown(result.value);
}

export async function extractPdf(arrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const paragraphs = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let currentLine = '';
    let lastY = null;
    const pageLines = [];

    content.items.forEach((item) => {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) pageLines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += item.str + (item.hasEOL ? '' : ' ');
      lastY = y;
    });
    if (currentLine.trim()) pageLines.push(currentLine.trim());

    // Merge wrapped lines into paragraphs: a line that doesn't end with
    // sentence-ending punctuation likely continues on the next line.
    let para = '';
    pageLines.forEach((line) => {
      para += (para ? ' ' : '') + line;
      if (/[.!؟?:؛;]\s*$/.test(line) || line.length < 40) {
        paragraphs.push(para.trim());
        para = '';
      }
    });
    if (para.trim()) paragraphs.push(para.trim());
  }

  return paragraphs.filter(Boolean).join('\n\n');
}

export function isDocx(file) {
  return /\.docx$/i.test(file.name) || file.type.includes('officedocument.wordprocessingml');
}

export function isPdf(file) {
  return /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
}
