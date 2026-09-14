import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildPrompt } from '../lib/promptBuilder';

export default function PromptBuilderModal({ open, onClose }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('new'); // 'new' | 'chapter'
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => buildPrompt(mode), [mode]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* clipboard unavailable — user can select manually */
    }
  };

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{t('promptBuilder.title')}</h2>
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>

        <p>{t('promptBuilder.intro')}</p>

        <div className="toggle-pair" style={{ marginBottom: 16 }}>
          <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
            {t('promptBuilder.forNewBook')}
          </button>
          <button className={mode === 'chapter' ? 'active' : ''} onClick={() => setMode('chapter')}>
            {t('promptBuilder.forChapter')}
          </button>
        </div>

        <pre style={{ maxHeight: 320, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>
          {prompt}
        </pre>

        <button className="btn primary" onClick={handleCopy}>
          {copied ? t('promptBuilder.copied') : t('promptBuilder.copy')}
        </button>
      </div>
    </div>
  );
}
