import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TopBar from './components/TopBar';
import Rail from './components/Rail';
import BookPreview from './components/BookPreview';
import GuideModal from './components/GuideModal';
import JsonImportModal from './components/JsonImportModal';
import PromptBuilderModal from './components/PromptBuilderModal';
import LibraryModal from './components/LibraryModal';
import FindReplace from './components/FindReplace';
import { SAMPLE_AR, SAMPLE_EN } from './lib/sample';
import { extractDocx, extractPdf, isDocx, isPdf } from './lib/fileExtract';
import { buildStandaloneHtml } from './lib/exportHtml';
import {
  getAllBooks, getBook, getActiveBookId, setActiveBookId,
  createBook, updateBookText, updateBookSettings, deleteBook, migrateLegacyDraft,
} from './lib/library';
import './App.css';

const WORDS_PER_PAGE = 220;

function detectLang() {
  try {
    const saved = localStorage.getItem('warraq_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) { /* ignore */ }
  return 'en';
}

function defaultSettingsFor(lang) {
  return {
    theme: 'emerald',
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    numerals: lang === 'ar' ? 'arabic' : 'latin',
    termMode: 'auto',
    pageSize: 'A5',
  };
}

function fallbackTitleFor(lang) {
  return lang === 'ar' ? 'كتاب بلا عنوان' : 'Untitled Book';
}

// Resolve which book should be open when the app first loads: the last
// active one, a migrated legacy draft, the most recently edited book, or
// (only if the library is completely empty) a fresh sample book.
function loadInitialBook() {
  const lang = detectLang();
  const fallbackTitle = fallbackTitleFor(lang);

  let book = null;
  const activeId = getActiveBookId();
  if (activeId) book = getBook(activeId);

  if (!book) book = migrateLegacyDraft(fallbackTitle);

  if (!book) {
    const existing = getAllBooks();
    if (existing.length) {
      book = existing[0];
      setActiveBookId(book.id);
    }
  }

  if (!book) {
    book = createBook(lang === 'ar' ? SAMPLE_AR : SAMPLE_EN, fallbackTitle, defaultSettingsFor(lang));
  }

  return book;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const initialBook = useRef(loadInitialBook()).current;
  const initialSettings = { ...defaultSettingsFor(i18n.language), ...(initialBook.settings || {}) };

  const [activeBookId, setActiveBookIdState] = useState(initialBook.id);
  const [text, setText] = useState(initialBook.text);
  const [theme, setTheme] = useState(initialSettings.theme);
  const [dir, setDir] = useState(initialSettings.dir);
  const [numerals, setNumerals] = useState(initialSettings.numerals);
  const [termMode, setTermMode] = useState(initialSettings.termMode);
  const [pageSize, setPageSize] = useState(initialSettings.pageSize);

  const [guideOpen, setGuideOpen] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [books, setBooks] = useState(() => getAllBooks());
  const [extracting, setExtracting] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const editorRef = useRef(null);
  const handleDownloadMdRef = useRef();
  const wrapSelectionRef = useRef();

  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);
  const estPages = wordCount ? Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE)) : 0;

  const refreshBooks = useCallback(() => setBooks(getAllBooks()), []);

  // Autosave text to the active book.
  useEffect(() => {
    updateBookText(activeBookId, text, fallbackTitleFor(i18n.language));
    refreshBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, activeBookId]);

  // Autosave per-book settings.
  useEffect(() => {
    updateBookSettings(activeBookId, { theme, dir, numerals, termMode, pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, dir, numerals, termMode, pageSize, activeBookId]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setGuideOpen(false);
        setJsonImportOpen(false);
        setPromptBuilderOpen(false);
        setLibraryOpen(false);
        setRailOpen(false);
        setFindReplaceOpen(false);
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFindReplaceOpen(true);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleDownloadMdRef.current?.();
      } else if ((e.key === 'b' || e.key === 'B') && document.activeElement === editorRef.current) {
        e.preventDefault();
        wrapSelectionRef.current?.('**');
      } else if ((e.key === 'i' || e.key === 'I') && document.activeElement === editorRef.current) {
        e.preventDefault();
        wrapSelectionRef.current?.('*');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    let styleTag = document.getElementById('print-page-size');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'print-page-size';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `@media print { @page { size: ${pageSize}; margin: 1.8cm; } }`;
  }, [pageSize]);

  const switchToBook = useCallback((book) => {
    const settings = { ...defaultSettingsFor(i18n.language), ...(book.settings || {}) };
    setActiveBookIdState(book.id);
    setActiveBookId(book.id);
    setText(book.text);
    setTheme(settings.theme);
    setDir(settings.dir);
    setNumerals(settings.numerals);
    setTermMode(settings.termMode);
    setPageSize(settings.pageSize);
  }, [i18n.language]);

  const handlePrint = useCallback(() => window.print(), []);
  const handleLoadSample = useCallback(() => {
    setText(i18n.language === 'ar' ? SAMPLE_AR : SAMPLE_EN);
  }, [i18n.language]);
  const handleJsonApply = useCallback((md, applyMode) => {
    if (applyMode === 'replace') {
      setText(md);
    } else {
      setText((prev) => (prev.trim() ? prev.replace(/\s*$/, '') + '\n\n' + md : md));
    }
  }, []);
  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text]);
  useEffect(() => { handleDownloadMdRef.current = handleDownloadMd; }, [handleDownloadMd]);

  const handleDownloadHtml = useCallback(() => {
    const html = buildStandaloneHtml(text, { theme, dir, numerals, termMode, pageSize });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text, theme, dir, numerals, termMode, pageSize]);

  const wrapSelection = useCallback((marker) => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setText((prev) => {
      const next = prev.slice(0, start) + marker + prev.slice(start, end) + marker + prev.slice(end);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + marker.length, end + marker.length);
      });
      return next;
    });
  }, []);
  useEffect(() => { wrapSelectionRef.current = wrapSelection; }, [wrapSelection]);
  const handleClear = useCallback(() => {
    if (window.confirm(t('topbar.clearConfirm'))) {
      setText('');
    }
  }, [t]);

  const handleFileSelected = useCallback(async (file) => {
    if (isDocx(file)) {
      setExtracting(true);
      try {
        const buf = await file.arrayBuffer();
        const md = await extractDocx(buf);
        setText(md);
      } catch (e) {
        window.alert(t('topbar.extractError'));
      } finally {
        setExtracting(false);
      }
      return;
    }
    if (isPdf(file)) {
      setExtracting(true);
      try {
        const buf = await file.arrayBuffer();
        const md = await extractPdf(buf);
        setText(md);
      } catch (e) {
        window.alert(t('topbar.extractError'));
      } finally {
        setExtracting(false);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file, 'UTF-8');
  }, [t]);

  const handleNewBook = useCallback(() => {
    const book = createBook('', fallbackTitleFor(i18n.language), defaultSettingsFor(i18n.language));
    refreshBooks();
    switchToBook(book);
    setLibraryOpen(false);
  }, [i18n.language, switchToBook, refreshBooks]);

  const handleOpenBook = useCallback((id) => {
    const book = getBook(id);
    if (book) switchToBook(book);
    setLibraryOpen(false);
  }, [switchToBook]);

  const handleDeleteBook = useCallback((id) => {
    deleteBook(id);
    const remaining = getAllBooks();
    setBooks(remaining);
    if (id === activeBookId) {
      if (remaining.length) {
        switchToBook(remaining[0]);
      } else {
        const book = createBook(
          i18n.language === 'ar' ? SAMPLE_AR : SAMPLE_EN,
          fallbackTitleFor(i18n.language),
          defaultSettingsFor(i18n.language)
        );
        refreshBooks();
        switchToBook(book);
      }
    }
  }, [activeBookId, switchToBook, i18n.language, refreshBooks]);

  return (
    <div className="app-shell">
      <TopBar
        onOpenGuide={() => setGuideOpen(true)}
        onLoadSample={handleLoadSample}
        onFileUpload={handleFileSelected}
        onPrint={handlePrint}
        onOpenJsonImport={() => setJsonImportOpen(true)}
        onOpenPromptBuilder={() => setPromptBuilderOpen(true)}
        onDownloadMd={handleDownloadMd}
        onDownloadHtml={handleDownloadHtml}
        onClear={handleClear}
        onOpenSettings={() => setRailOpen(true)}
        onOpenLibrary={() => { refreshBooks(); setLibraryOpen(true); }}
        onOpenFind={() => setFindReplaceOpen(true)}
        extracting={extracting}
      />
      <div className="workspace">
        {railOpen && <div className="rail-backdrop" onClick={() => setRailOpen(false)} />}
        <Rail
          theme={theme} setTheme={setTheme}
          dir={dir} setDir={setDir}
          numerals={numerals} setNumerals={setNumerals}
          termMode={termMode} setTermMode={setTermMode}
          pageSize={pageSize} setPageSize={setPageSize}
          mobileOpen={railOpen}
          onClose={() => setRailOpen(false)}
        />
        <div className="panes">
          <div className="editor-pane">
            <div className="pane-label">
              <span>{t('editor.label')}</span>
              {wordCount > 0 && (
                <span className="pane-stats">
                  {t('editor.stats', { words: wordCount, pages: estPages })}
                </span>
              )}
            </div>
            <textarea
              id="editor"
              ref={editorRef}
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir={dir}
              style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
            />
            <FindReplace
              open={findReplaceOpen}
              onClose={() => setFindReplaceOpen(false)}
              text={text}
              setText={setText}
              editorRef={editorRef}
            />
          </div>
          <div className="preview-pane">
            <BookPreview
              rawText={text}
              theme={theme}
              dir={dir}
              numerals={numerals}
              termMode={termMode}
              pageSize={pageSize}
            />
          </div>
        </div>
      </div>
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <JsonImportModal
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        onApply={handleJsonApply}
      />
      <PromptBuilderModal open={promptBuilderOpen} onClose={() => setPromptBuilderOpen(false)} />
      <LibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        books={books}
        activeBookId={activeBookId}
        onOpenBook={handleOpenBook}
        onDeleteBook={handleDeleteBook}
        onNewBook={handleNewBook}
      />
    </div>
  );
}
