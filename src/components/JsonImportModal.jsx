import React, { useState } from 'react';
import { bookJsonToMarkdown, chapterJsonToMarkdown } from '../lib/jsonSchema';

export default function JsonImportModal({ open, onClose, onApply }) {
  const [mode, setMode] = useState('new'); // 'new' | 'chapter'
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  if (!open) return null;

  const handleApply = () => {
    setError('');
    setOk('');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setError('تعذّر قراءة JSON — تأكّد من صحة الصيغة. (' + e.message + ')');
      return;
    }
    try {
      if (mode === 'new') {
        const md = bookJsonToMarkdown(parsed);
        onApply(md, 'replace');
        setOk('تم إنشاء الكتاب من الـ JSON بنجاح.');
      } else {
        const md = chapterJsonToMarkdown(parsed);
        onApply(md, 'append');
        setOk('تمت إضافة الفصل/الفصول بنجاح.');
      }
      setRaw('');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>استيراد JSON</h2>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>

        <div className="toggle-pair" style={{ marginBottom: 16 }}>
          <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
            كتاب جديد (استبدال)
          </button>
          <button className={mode === 'chapter' ? 'active' : ''} onClick={() => setMode('chapter')}>
            إضافة فصل (إلحاق)
          </button>
        </div>

        <p>
          {mode === 'new'
            ? 'الصق هنا JSON بالصيغة الكاملة للكتاب (title, subtitle, chapters) — سيستبدل هذا محتوى المحرّر بالكامل.'
            : 'الصق هنا JSON لفصل واحد أو مصفوفة فصول — ستُضاف إلى نهاية الكتاب الحالي دون حذف أي شيء.'}
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='{ "title": "...", "chapters": [ ... ] }'
          style={{
            width: '100%', minHeight: 220, direction: 'ltr', textAlign: 'left',
            fontFamily: "'SF Mono','Consolas',monospace", fontSize: 12.5,
            background: 'var(--ink)', color: 'var(--parchment)',
            border: '1px solid var(--ink-3)', borderRadius: 4, padding: 12,
            marginBottom: 12, resize: 'vertical',
          }}
        />

        {error && <p style={{ color: '#d16a5a' }}>{error}</p>}
        {ok && <p style={{ color: '#7fae7a' }}>{ok}</p>}

        <button className="btn primary" onClick={handleApply}>
          {mode === 'new' ? 'إنشاء الكتاب' : 'إضافة إلى الكتاب'}
        </button>
      </div>
    </div>
  );
}
