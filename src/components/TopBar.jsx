import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export default function TopBar({
  onOpenGuide, onLoadSample, onFileUpload, onPrint,
  onOpenJsonImport, onOpenPromptBuilder, onDownloadMd, onClear, onOpenSettings, onOpenLibrary,
  extracting,
}) {
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
      <button
        className="btn icon-btn mobile-only"
        onClick={onOpenSettings}
        aria-label={t('rail.formatting')}
        title={t('rail.formatting')}
      >
        ⚙
      </button>
      <button className="btn lang-btn mobile-only" onClick={() => setLanguage(otherLang)}>
        {otherLangLabel}
      </button>
      <div className="topbar-spacer" />
      <div className="top-actions">
        <button className="btn" onClick={onOpenLibrary}>{t('topbar.library')}</button>
        <button className="btn" onClick={onOpenGuide}>{t('topbar.guide')}</button>
        <button className="btn" onClick={onOpenPromptBuilder}>{t('topbar.promptBuilder')}</button>
        <button className="btn" onClick={onOpenJsonImport}>{t('topbar.jsonImport')}</button>
        <button className="btn" onClick={onLoadSample}>{t('topbar.sample')}</button>
        <label className="btn" onClick={() => fileRef.current?.click()}>
          {extracting ? t('topbar.extracting') : t('topbar.upload')}
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,.docx,.pdf,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            onFileUpload(file);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={onDownloadMd}>{t('topbar.downloadMd')}</button>
        <button className="btn danger" onClick={onClear}>{t('topbar.clear')}</button>
        <button className="btn primary" onClick={onPrint}>{t('topbar.print')}</button>
      </div>
    </div>
  );
}
