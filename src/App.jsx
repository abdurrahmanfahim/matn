import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import TopBar from './components/TopBar';
import Rail from './components/Rail';
import BookPreview from './components/BookPreview';
import GuideModal from './components/GuideModal';
import JsonImportModal from './components/JsonImportModal';
import PromptBuilderModal from './components/PromptBuilderModal';
import { SAMPLE_AR, SAMPLE_EN } from './lib/sample';
import './App.css';

function detectLang() {
  try {
    const saved = localStorage.getItem('warraq_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) { /* ignore */ }
  return 'en';
}

function defaultStateFor(lang) {
  return {
    theme: 'emerald',
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    numerals: lang === 'ar' ? 'arabic' : 'latin',
    termMode: 'auto',
    pageSize: 'A5',
  };
}

function loadInitial() {
  const lang = detectLang();
  const DEFAULT_STATE = defaultStateFor(lang);
  try {
    const savedState = localStorage.getItem('warraq_state');
    const savedDraft = localStorage.getItem('warraq_draft');
    return {
      settings: savedState ? { ...DEFAULT_STATE, ...JSON.parse(savedState) } : DEFAULT_STATE,
      text: savedDraft || (lang === 'ar' ? SAMPLE_AR : SAMPLE_EN),
    };
  } catch (e) {
    return { settings: DEFAULT_STATE, text: lang === 'ar' ? SAMPLE_AR : SAMPLE_EN };
  }
}

export default function App() {
  const { t, i18n } = useTranslation();
  const initial = loadInitial();
  const [text, setText] = useState(initial.text);
  const [theme, setTheme] = useState(initial.settings.theme);
  const [dir, setDir] = useState(initial.settings.dir);
  const [numerals, setNumerals] = useState(initial.settings.numerals);
  const [termMode, setTermMode] = useState(initial.settings.termMode);
  const [pageSize, setPageSize] = useState(initial.settings.pageSize);
  const [guideOpen, setGuideOpen] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('warraq_draft', text);
      localStorage.setItem(
        'warraq_state',
        JSON.stringify({ theme, dir, numerals, termMode, pageSize })
      );
    } catch (e) {
      /* storage unavailable — ignore */
    }
  }, [text, theme, dir, numerals, termMode, pageSize]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      setGuideOpen(false);
      setJsonImportOpen(false);
      setPromptBuilderOpen(false);
      setRailOpen(false);
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
  const handleClear = useCallback(() => {
    if (window.confirm(t('topbar.clearConfirm'))) {
      setText('');
    }
  }, [t]);

  return (
    <div className="app-shell">
      <TopBar
        onOpenGuide={() => setGuideOpen(true)}
        onLoadSample={handleLoadSample}
        onFileUpload={setText}
        onPrint={handlePrint}
        onOpenJsonImport={() => setJsonImportOpen(true)}
        onOpenPromptBuilder={() => setPromptBuilderOpen(true)}
        onDownloadMd={handleDownloadMd}
        onClear={handleClear}
        onOpenSettings={() => setRailOpen(true)}
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
            <div className="pane-label">{t('editor.label')}</div>
            <textarea
              id="editor"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir={dir}
              style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
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
    </div>
  );
}
