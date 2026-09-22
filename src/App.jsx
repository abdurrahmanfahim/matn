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
import EditorToolbar from './components/EditorToolbar';
import OutlineModal from './components/OutlineModal';
const CodeEditor = React.lazy(() => import('./components/CodeEditor'));
import { SAMPLE_AR, SAMPLE_EN } from './lib/sample';
import { buildDocument } from './lib/parser';
import { THEMES, CUSTOM_COLOR_KEYS } from './lib/themes';
import { extractDocx, extractPdf, isDocx, isPdf } from './lib/fileExtract';
import { buildStandaloneHtml } from './lib/exportHtml';
import { buildEpub } from './lib/exportEpub';
import {
  getAllBooks, getBook, getActiveBookId, setActiveBookId,
  createBook, updateBookText, updateBookSettings, deleteBook, migrateLegacyDraft,
  renameBook, duplicateBook,
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

function defaultCustomColors() {
  const c = {};
  CUSTOM_COLOR_KEYS.forEach((k) => { c[k] = THEMES.custom[k]; });
  return c;
}

function defaultSettingsFor(lang) {
  return {
    theme: 'emerald',
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    numerals: lang === 'ar' ? 'arabic' : 'latin',
    termMode: 'auto',
    pageSize: 'A5',
    customColors: defaultCustomColors(),
    customFont: 'Noto Naskh Arabic',
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
  const [customColors, setCustomColors] = useState(initialSettings.customColors);
  const [customFont, setCustomFont] = useState(initialSettings.customFont);

  const [guideOpen, setGuideOpen] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [books, setBooks] = useState(() => getAllBooks());
  const [extracting, setExtracting] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [mobileView, setMobileView] = useState('edit');
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const syncingRef = useRef(false);
  const handleDownloadMdRef = useRef();
  const wrapSelectionRef = useRef();

  const doc = useMemo(() => buildDocument(text, { numerals }), [text, numerals]);

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
    updateBookSettings(activeBookId, { theme, dir, numerals, termMode, pageSize, customColors, customFont });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, dir, numerals, termMode, pageSize, customColors, customFont, activeBookId]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setGuideOpen(false);
        setJsonImportOpen(false);
        setPromptBuilderOpen(false);
        setLibraryOpen(false);
        setRailOpen(false);
        setFindReplaceOpen(false);
        setOutlineOpen(false);
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
      } else if ((e.key === 'b' || e.key === 'B') && editorRef.current?.hasFocus) {
        e.preventDefault();
        wrapSelectionRef.current?.('**');
      } else if ((e.key === 'i' || e.key === 'I') && editorRef.current?.hasFocus) {
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
    styleTag.textContent = `@media print {
      @page {
        size: ${pageSize};
        margin: 1.8cm;
        @bottom-center { content: counter(page); }
      }
    }`;
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
    setCustomColors(settings.customColors);
    setCustomFont(settings.customFont);
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
    const html = buildStandaloneHtml(text, { theme, dir, numerals, termMode, pageSize, customColors, customFont });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [text, theme, dir, numerals, termMode, pageSize, customColors, customFont]);

  const handleDownloadEpub = useCallback(async () => {
    try {
      const blob = await buildEpub(doc, { theme, dir, termMode, customColors, customFont });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'book.epub';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(t('topbar.epubError'));
    }
  }, [doc, theme, dir, termMode, customColors, customFont, t]);

  const wrapSelection = useCallback((marker) => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    el.replaceRange(start, end, marker + selected + marker, start + marker.length, end + marker.length);
  }, []);
  useEffect(() => { wrapSelectionRef.current = wrapSelection; }, [wrapSelection]);

  const insertLinePrefix = useCallback((prefix, placeholder) => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const lineStart = current.lastIndexOf('\n', start - 1) + 1;
    const hasSelection = end > start;
    const insertion = prefix + (hasSelection ? '' : placeholder || '');
    if (hasSelection) {
      el.replaceRange(lineStart, lineStart, prefix, lineStart + prefix.length, end + prefix.length);
    } else if (placeholder) {
      // select the placeholder so typing immediately replaces it
      el.replaceRange(
        lineStart, lineStart, insertion,
        lineStart + prefix.length, lineStart + prefix.length + placeholder.length
      );
    } else {
      const cursorPos = lineStart + insertion.length;
      el.replaceRange(lineStart, lineStart, insertion, cursorPos, cursorPos);
    }
  }, []);

  const insertVerse = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const block = selected
      ? selected.split('\n').map((l) => `> ${l}`).join('\n')
      : '> ';
    const cursorPos = start + block.length;
    el.replaceRange(start, end, block, cursorPos, cursorPos);
  }, []);

  const handleEditorScroll = useCallback(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const el = editorRef.current;
    const target = previewRef.current;
    if (!el || !target) return;
    const denom = el.scrollHeight - el.clientHeight;
    const ratio = denom > 0 ? el.scrollTop / denom : 0;
    syncingRef.current = true;
    const targetDenom = target.scrollHeight - target.clientHeight;
    target.scrollTop = ratio * Math.max(0, targetDenom);
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const el = editorRef.current;
    const source = previewRef.current;
    if (!el || !source) return;
    const denom = source.scrollHeight - source.clientHeight;
    const ratio = denom > 0 ? source.scrollTop / denom : 0;
    syncingRef.current = true;
    const targetDenom = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * Math.max(0, targetDenom);
  }, []);

  const handleJumpToSection = useCallback((id) => {
    const target = previewRef.current?.querySelector(`#${id}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOutlineOpen(false);
    setMobileView('preview');
  }, []);

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

  const handleRenameBook = useCallback((id, title) => {
    renameBook(id, title);
    refreshBooks();
  }, [refreshBooks]);

  const handleDuplicateBook = useCallback((id, copySuffix) => {
    duplicateBook(id, copySuffix);
    refreshBooks();
  }, [refreshBooks]);

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
        onDownloadEpub={handleDownloadEpub}
        onClear={handleClear}
        onOpenSettings={() => setRailOpen(true)}
        onOpenLibrary={() => { refreshBooks(); setLibraryOpen(true); }}
        onOpenFind={() => setFindReplaceOpen(true)}
        onOpenOutline={() => setOutlineOpen(true)}
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
          customColors={customColors} setCustomColors={setCustomColors}
          customFont={customFont} setCustomFont={setCustomFont}
          mobileOpen={railOpen}
          onClose={() => setRailOpen(false)}
        />
        <div className="panes">
          <div className="mobile-view-tabs">
            <button className={mobileView === 'edit' ? 'active' : ''} onClick={() => setMobileView('edit')}>
              {t('editor.tabEdit')}
            </button>
            <button className={mobileView === 'preview' ? 'active' : ''} onClick={() => setMobileView('preview')}>
              {t('editor.tabPreview')}
            </button>
          </div>
          <div className={`editor-pane ${mobileView === 'preview' ? 'mobile-hidden' : ''}`}>
            <div className="pane-label">
              <span>{t('editor.label')}</span>
              {wordCount > 0 && (
                <span className="pane-stats">
                  {t('editor.stats', { words: wordCount, pages: estPages })}
                </span>
              )}
            </div>
            <EditorToolbar
              onBold={() => wrapSelection('**')}
              onItalic={() => wrapSelection('*')}
              onChapter={() => insertLinePrefix('# ', t('toolbar.chapterPlaceholder'))}
              onSub={() => insertLinePrefix('## ', t('toolbar.subPlaceholder'))}
              onVerse={insertVerse}
            />
            <div className="cm-wrap">
              <React.Suspense fallback={<div className="cm-loading">{t('editor.loading')}</div>}>
                <CodeEditor
                  ref={editorRef}
                  value={text}
                  onChange={(val) => setText(val)}
                  onScroll={handleEditorScroll}
                  dir={dir}
                  spellCheck={false}
                />
              </React.Suspense>
            </div>
            <FindReplace
              open={findReplaceOpen}
              onClose={() => setFindReplaceOpen(false)}
              text={text}
              setText={setText}
              editorRef={editorRef}
            />
          </div>
          <div
            className={`preview-pane ${mobileView === 'edit' ? 'mobile-hidden' : ''}`}
            ref={previewRef}
            onScroll={handlePreviewScroll}
          >
            <BookPreview
              doc={doc}
              theme={theme}
              dir={dir}
              termMode={termMode}
              pageSize={pageSize}
              customColors={customColors}
              customFont={customFont}
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
        onRenameBook={handleRenameBook}
        onDuplicateBook={handleDuplicateBook}
        onBooksRestored={refreshBooks}
      />
      <OutlineModal
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        toc={doc.toc}
        onJump={handleJumpToSection}
      />
    </div>
  );
}
