// Multi-book library, backed by localStorage. Each book is autosaved as
// the user types — there's no explicit "save" step, similar to a doc app.

const BOOKS_KEY = 'warraq_books';
const ACTIVE_KEY = 'warraq_active_book_id';
const LEGACY_DRAFT_KEY = 'warraq_draft';
const LEGACY_STATE_KEY = 'warraq_state';

function readBooks() {
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeBooks(books) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch (e) {
    /* storage unavailable or full — ignore */
  }
}

function makeId() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Pull a readable title out of the book text: prefer the frontmatter
// `title:` field, otherwise fall back to the first non-empty line.
export function deriveTitle(text, fallback) {
  if (!text) return fallback;
  const fm = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fm) {
    const titleLine = fm[1].split('\n').find((l) => /^title\s*:/.test(l.trim()));
    if (titleLine) {
      const val = titleLine.split(':').slice(1).join(':').trim();
      if (val) return val;
    }
  }
  const line = text.split('\n').map((l) => l.trim()).find((l) => l && l !== '---');
  if (line) return line.replace(/^#+\s*/, '').slice(0, 60);
  return fallback;
}

export function getAllBooks() {
  return readBooks().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getBook(id) {
  return readBooks().find((b) => b.id === id) || null;
}

export function getActiveBookId() {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch (e) {
    return null;
  }
}

export function setActiveBookId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch (e) { /* ignore */ }
}

export function createBook(text, fallbackTitle, settings) {
  const books = readBooks();
  const now = Date.now();
  const book = {
    id: makeId(),
    title: deriveTitle(text, fallbackTitle),
    text: text || '',
    settings: settings || {},
    createdAt: now,
    updatedAt: now,
  };
  books.push(book);
  writeBooks(books);
  setActiveBookId(book.id);
  return book;
}

export function updateBookText(id, text, fallbackTitle) {
  const books = readBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  books[idx] = {
    ...books[idx],
    text,
    title: books[idx].titlePinned ? books[idx].title : deriveTitle(text, fallbackTitle),
    updatedAt: Date.now(),
  };
  writeBooks(books);
  return books[idx];
}

export function updateBookSettings(id, settings) {
  const books = readBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  books[idx] = { ...books[idx], settings: { ...books[idx].settings, ...settings }, updatedAt: books[idx].updatedAt };
  writeBooks(books);
  return books[idx];
}

export function deleteBook(id) {
  const books = readBooks().filter((b) => b.id !== id);
  writeBooks(books);
  if (getActiveBookId() === id) {
    setActiveBookId(books.length ? books.sort((a, b) => b.updatedAt - a.updatedAt)[0].id : null);
  }
}

// Sets an explicit, user-chosen title that overrides the auto-derived
// one from now on (persists across further text edits).
export function renameBook(id, title) {
  const books = readBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  books[idx] = { ...books[idx], title, titlePinned: true, updatedAt: Date.now() };
  writeBooks(books);
  return books[idx];
}

export function duplicateBook(id, copySuffix) {
  const books = readBooks();
  const source = books.find((b) => b.id === id);
  if (!source) return null;
  const now = Date.now();
  const copy = {
    ...source,
    id: makeId(),
    title: `${source.title || ''} ${copySuffix}`.trim(),
    createdAt: now,
    updatedAt: now,
  };
  books.push(copy);
  writeBooks(books);
  return copy;
}

// Whole-library backup: every book as a single downloadable JSON blob,
// since everything otherwise only lives in this browser's localStorage.
export function exportAllBooksJson() {
  return JSON.stringify({ warraqBackup: 1, exportedAt: Date.now(), books: readBooks() }, null, 2);
}

// Restores from a previously exported backup. mode 'merge' adds the
// backed-up books alongside whatever is already here (skipping any
// whose id already exists, so re-importing the same backup twice is
// harmless); mode 'replace' wipes the current library first.
export function importBooksJson(jsonString, mode) {
  const parsed = JSON.parse(jsonString);
  const incoming = Array.isArray(parsed) ? parsed : parsed.books;
  if (!Array.isArray(incoming)) throw new Error('Not a valid Warraq backup file.');
  const existing = mode === 'replace' ? [] : readBooks();
  const existingIds = new Set(existing.map((b) => b.id));
  let added = 0;
  for (const b of incoming) {
    if (!b || typeof b.text !== 'string') continue;
    if (existingIds.has(b.id)) continue;
    existing.push(b);
    existingIds.add(b.id);
    added++;
  }
  writeBooks(existing);
  return { total: existing.length, added };
}

// One-time migration from the old single-draft storage (pre-library
// versions of the app) into the new multi-book format.
export function migrateLegacyDraft(fallbackTitle) {
  try {
    const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacy && legacy.trim()) {
      let settings = {};
      try {
        const legacyState = localStorage.getItem(LEGACY_STATE_KEY);
        if (legacyState) settings = JSON.parse(legacyState);
      } catch (e) { /* ignore */ }
      const book = createBook(legacy, fallbackTitle, settings);
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      localStorage.removeItem(LEGACY_STATE_KEY);
      return book;
    }
  } catch (e) { /* ignore */ }
  return null;
}
