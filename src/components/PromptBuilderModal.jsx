import React, { useState, useMemo } from 'react';
import { buildPrompt } from '../lib/promptBuilder';

export default function PromptBuilderModal({ open, onClose }) {
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
          <h2>إنشاء عبر الذكاء الاصطناعي</h2>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>

        <p>
          انسخ هذا الطلب، والصقه في أي أداة ذكاء اصطناعي (ChatGPT، Gemini، Claude...) مع نص
          كتابك الخام في آخره. ثم الصق الناتج (JSON) في نافذة «استيراد JSON».
        </p>

        <div className="toggle-pair" style={{ marginBottom: 16 }}>
          <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
            لكتاب جديد
          </button>
          <button className={mode === 'chapter' ? 'active' : ''} onClick={() => setMode('chapter')}>
            لإضافة فصل
          </button>
        </div>

        <pre style={{ maxHeight: 320, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>
          {prompt}
        </pre>

        <button className="btn primary" onClick={handleCopy}>
          {copied ? 'تم النسخ ✓' : 'نسخ الطلب'}
        </button>
      </div>
    </div>
  );
}
