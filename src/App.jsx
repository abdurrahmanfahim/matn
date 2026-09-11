import React, { useState, useEffect, useCallback } from 'react';
import TopBar from './components/TopBar';
import Rail from './components/Rail';
import BookPreview from './components/BookPreview';
import GuideModal from './components/GuideModal';
import JsonImportModal from './components/JsonImportModal';
import PromptBuilderModal from './components/PromptBuilderModal';
import { SAMPLE } from './lib/sample';
import './App.css';

const DEFAULT_STATE = {
  theme: 'emerald',
  dir: 'rtl',
  numerals: 'arabic',
  termMode: 'auto',
  pageSize: 'A5',
};

function loadInitial() {
  try {
    const savedState = localStorage.getItem('warraq_state');
    const savedDraft = localStorage.getItem('warraq_draft');
    return {
      settings: savedState ? { ...DEFAULT_STATE, ...JSON.parse(savedState) } : DEFAULT_STATE,
      text: savedDraft || SAMPLE,
    };
  } catch (e) {
    return { settings: DEFAULT_STATE, text: SAMPLE };
  }
}

export default function App() {
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
    let styleTag = document.getElementById('print-page-size');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'print-page-size';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `@media print { @page { size: ${pageSize}; margin: 1.8cm; } }`;
  }, [pageSize]);

  const handlePrint = useCallback(() => window.print(), []);
  const handleLoadSample = useCallback(() => setText(SAMPLE), []);
  const handleJsonApply = useCallback((md, applyMode) => {
    if (applyMode === 'replace') {
      setText(md);
    } else {
      setText((prev) => (prev.trim() ? prev.replace(/\s*$/, '') + '\n\n' + md : md));
    }
  }, []);

  return (
    <div className="app-shell">
      <TopBar
        onOpenGuide={() => setGuideOpen(true)}
        onLoadSample={handleLoadSample}
        onFileUpload={setText}
        onPrint={handlePrint}
        onOpenJsonImport={() => setJsonImportOpen(true)}
        onOpenPromptBuilder={() => setPromptBuilderOpen(true)}
      />
      <div className="workspace">
        <Rail
          theme={theme} setTheme={setTheme}
          dir={dir} setDir={setDir}
          numerals={numerals} setNumerals={setNumerals}
          termMode={termMode} setTermMode={setTermMode}
          pageSize={pageSize} setPageSize={setPageSize}
        />
        <div className="panes">
          <div className="editor-pane">
            <div className="pane-label">النص المصدر (Markdown)</div>
            <textarea
              id="editor"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
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
