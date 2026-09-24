import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import DropdownMenu from './DropdownMenu';

export default function TopBar({
  onOpenGuide, onLoadSample, onFileUpload, onPrint,
  onOpenJsonImport, onOpenPromptBuilder, onDownloadMd, onDownloadHtml, onDownloadEpub, onClear, onOpenSettings, onOpenLibrary,
  onOpenFind, onOpenOutline, extracting,
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
        <button className="btn desktop-only" onClick={onOpenLibrary}>{t('topbar.library')}</button>
        <button className="btn desktop-only" onClick={onOpenOutline}>{t('topbar.outline')}</button>
        <span className="tb-divider desktop-only" />
        <button className="btn desktop-only" onClick={onOpenGuide}>{t('topbar.guide')}</button>
        <button className="btn desktop-only" onClick={onOpenPromptBuilder}>{t('topbar.promptBuilder')}</button>
        <button className="btn desktop-only" onClick={onOpenJsonImport}>{t('topbar.jsonImport')}</button>
        <button className="btn desktop-only" onClick={onLoadSample}>{t('topbar.sample')}</button>
        <label className="btn desktop-only" onClick={() => fileRef.current?.click()}>
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

        {/* Icon-only on mobile (space is too tight for full labels), full
            text button on desktop — same pattern as the settings gear above. */}
        <button
          className="btn icon-btn mobile-only"
          onClick={onOpenFind}
          aria-label={t('topbar.find')}
          title={t('topbar.find')}
        >
          🔍
        </button>
        <button className="btn desktop-only" onClick={onOpenFind}>{t('topbar.find')}</button>
        <span className="tb-divider desktop-only" />
        <DropdownMenu label={t('topbar.export')} className="desktop-only">
          <button onClick={onDownloadMd}>{t('topbar.downloadMd')}</button>
          <button onClick={onDownloadHtml}>{t('topbar.downloadHtml')}</button>
          <button onClick={onDownloadEpub}>{t('topbar.downloadEpub')}</button>
        </DropdownMenu>
        <button className="btn danger desktop-only" onClick={onClear}>{t('topbar.clear')}</button>

        <button
          className="btn primary icon-btn mobile-only"
          onClick={onPrint}
          aria-label={t('topbar.print')}
          title={t('topbar.print')}
        >
          ⬇
        </button>
        <button className="btn primary desktop-only" onClick={onPrint}>{t('topbar.print')}</button>

        {/* Mobile-only overflow menu: everything the desktop-only buttons above
            cover, collapsed so the row above never needs horizontal scrolling. */}
        <DropdownMenu label={t('topbar.more')} className="mobile-only">
          <button onClick={onOpenLibrary}>{t('topbar.library')}</button>
          <button onClick={onOpenOutline}>{t('topbar.outline')}</button>
          <button onClick={onOpenGuide}>{t('topbar.guide')}</button>
          <button onClick={onOpenPromptBuilder}>{t('topbar.promptBuilder')}</button>
          <button onClick={onOpenJsonImport}>{t('topbar.jsonImport')}</button>
          <button onClick={onLoadSample}>{t('topbar.sample')}</button>
          <label onClick={() => fileRef.current?.click()}>
            {extracting ? t('topbar.extracting') : t('topbar.upload')}
          </label>
          <button onClick={onDownloadMd}>{t('topbar.downloadMd')}</button>
          <button onClick={onDownloadHtml}>{t('topbar.downloadHtml')}</button>
          <button onClick={onDownloadEpub}>{t('topbar.downloadEpub')}</button>
          <button onClick={onClear}>{t('topbar.clear')}</button>
        </DropdownMenu>
      </div>
    </div>
  );
}
