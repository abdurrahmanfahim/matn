import React, { useRef } from 'react';

export default function TopBar({ onOpenGuide, onLoadSample, onFileUpload, onPrint }) {
  const fileRef = useRef(null);

  return (
    <div className="topbar">
      <div className="brand">
        <span className="mark">وَرّاق</span>
        <span className="tagline">من نص إلى كتاب</span>
      </div>
      <div className="topbar-spacer" />
      <div className="top-actions">
        <button className="btn" onClick={onOpenGuide}>صيغة النص</button>
        <button className="btn" onClick={onLoadSample}>نص تجريبي</button>
        <label className="btn" onClick={() => fileRef.current?.click()}>رفع ملف</label>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => onFileUpload(ev.target.result);
            reader.readAsText(file, 'UTF-8');
            e.target.value = '';
          }}
        />
        <button className="btn primary" onClick={onPrint}>تصدير PDF</button>
      </div>
    </div>
  );
}
