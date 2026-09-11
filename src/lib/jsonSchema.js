// Converts the وَرّاق JSON book/chapter schema into the internal Markdown
// format that the parser already understands. This keeps a single source
// of truth for rendering — JSON is just an alternate way to fill the editor.

function itemsToMd(items) {
  return (items || [])
    .map((it) => {
      if (it.type === 'sub') return `## ${it.title || ''}`;
      if (it.type === 'verse') return (it.lines || []).map((l) => `> ${l}`).join('\n');
      if (it.type === 'p') return it.text || '';
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function chapterToMd(ch) {
  const body = itemsToMd(ch.items);
  return `# ${ch.title || ''}${body ? '\n\n' + body : ''}`;
}

// Full new-book JSON -> complete Markdown document (with frontmatter).
export function bookJsonToMarkdown(book) {
  if (!book || typeof book !== 'object') throw new Error('JSON غير صالح: يجب أن يكون كائناً.');
  let fm = '';
  if (book.title || book.subtitle) {
    fm = '---\n';
    if (book.title) fm += `title: ${book.title}\n`;
    if (book.subtitle) fm += `subtitle: ${book.subtitle}\n`;
    fm += '---\n\n';
  }
  const chapters = Array.isArray(book.chapters) ? book.chapters : [];
  if (!chapters.length) throw new Error('لا يوجد مصفوفة "chapters" في الـ JSON.');
  return fm + chapters.map(chapterToMd).join('\n\n');
}

// Add-chapter JSON (single chapter object, or array of chapter objects,
// or {chapters:[...]} ) -> Markdown fragment to append to the current book.
export function chapterJsonToMarkdown(input) {
  if (!input || typeof input !== 'object') throw new Error('JSON غير صالح: يجب أن يكون كائناً أو مصفوفة.');
  let chapters;
  if (Array.isArray(input)) chapters = input;
  else if (Array.isArray(input.chapters)) chapters = input.chapters;
  else if (input.title !== undefined || input.items !== undefined) chapters = [input];
  else throw new Error('تعذّر إيجاد فصل صالح في الـ JSON.');
  if (!chapters.length) throw new Error('لا توجد فصول في الـ JSON.');
  return chapters.map(chapterToMd).join('\n\n');
}
