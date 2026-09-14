import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export default function TopBar({ onOpenGuide, onLoadSample, onFileUpload, onPrint, onOpenJsonImport, onOpenPromptBuilder }) {
  const fileRef = useRef(null);
  const { t, i18n } = useTranslation();
  const otherLang = i18n.language === 'ar' ? 'en' : 'ar';
  const otherLangLabel = otherLang === 'ar' ? 'العربية' : 'English';

  return (
    <div className="topbar">
      <div className="brand">
        <span className="mark">{t('brand.mark')}</span>
        <span className="tagline">{t('brand.tagline')}</span>
      </div>
      <button className="btn lang-btn mobile-only" onClick={() => setLanguage(otherLang)}>
        {otherLangLabel}
      </button>
      <div className="topbar-spacer" />
      <div className="top-actions">
        <button className="btn" onClick={onOpenGuide}>{t('topbar.guide')}</button>
        <button className="btn" onClick={onOpenPromptBuilder}>{t('topbar.promptBuilder')}</button>
        <button className="btn" onClick={onOpenJsonImport}>{t('topbar.jsonImport')}</button>
        <button className="btn" onClick={onLoadSample}>{t('topbar.sample')}</button>
        <label className="btn" onClick={() => fileRef.current?.click()}>{t('topbar.upload')}</label>
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
        <button className="btn primary" onClick={onPrint}>{t('topbar.print')}</button>
      </div>
    </div>
  );
}
