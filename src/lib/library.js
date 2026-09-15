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
    title: deriveTitle(text, fallbackTitle),
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
