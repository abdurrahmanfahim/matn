import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LAYOUTS = ['normal', 'landscape', 'fourup', 'booklet'];
const ICON_SHEETS = { normal: 1, landscape: 2, fourup: 4, booklet: 2 };

function LayoutIcon({ layout }) {
  return (
    <div className={`print-layout-icon print-layout-icon-${layout}`}>
      {Array.from({ length: ICON_SHEETS[layout] }).map((_, i) => (
        <span className="sheet" key={i} />
      ))}
    </div>
  );
}

export default function PrintLayoutModal({ open, onClose, getBookPageEl, pageSize }) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(false);

  if (!open) return null;

  const handleGenerate = async () => {
    const el = getBookPageEl();
    if (!el) return;
    setBusy(true);
    setError(false);
    setProgress(null);
    try {
      const { buildImpositionPdf } = await import('../lib/exportPdf');
      await buildImpositionPdf(el, {
        pageSize,
        layout,
        filename: 'book.pdf',
        onProgress: (done, total) => setProgress({ done, total }),
      });
      onClose();
    } catch (e) {
      setError(true);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (!busy && e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{t('printLayout.title')}</h2>
          <button className="btn" onClick={onClose} disabled={busy}>{t('close')}</button>
        </div>

        <div className="print-layout-grid">
          {LAYOUTS.map((key) => (
            <div
              key={key}
              className={`print-layout-chip ${layout === key ? 'active' : ''}`}
              onClick={() => !busy && setLayout(key)}
              onKeyDown={(e) => { if (!busy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setLayout(key); } }}
              role="button"
              tabIndex={0}
              aria-pressed={layout === key}
            >
              <LayoutIcon layout={key} />
              <div className="name">{t(`printLayout.${key}`)}</div>
            </div>
          ))}
        </div>

        <p className="print-layout-desc">{t(`printLayout.${layout}Desc`)}</p>

        {error && <p className="print-layout-error">{t('printLayout.error')}</p>}

        <button className="btn primary print-layout-generate" onClick={handleGenerate} disabled={busy}>
          {busy
            ? (progress ? t('printLayout.generatingProgress', { done: progress.done, total: progress.total }) : t('printLayout.generating'))
            : t('printLayout.generate')}
        </button>
      </div>
    </div>
  );
}
