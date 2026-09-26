import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import DropdownMenu from './DropdownMenu';

export default function TopBar({
  onOpenGuide, onLoadSample, onFileUpload, onPrint,
  onOpenJsonImport, onOpenPromptBuilder, onDownloadMd, onDownloadHtml, onDownloadEpub, onClear, onOpenSettings, onOpenLibrary,
  onOpenFind, onOpenOutline, onOpenPrintLayout, extracting,
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
        <button className="btn nav-desktop" onClick={onOpenLibrary}>{t('topbar.library')}</button>
        <span className="tb-divider nav-desktop" />
        <button className="btn nav-desktop" onClick={onOpenGuide}>{t('topbar.guide')}</button>
        <button className="btn nav-desktop" onClick={onOpenPromptBuilder}>{t('topbar.promptBuilder')}</button>
        <button className="btn nav-desktop" onClick={onOpenJsonImport}>{t('topbar.jsonImport')}</button>
        <button className="btn nav-desktop" onClick={onLoadSample}>{t('topbar.sample')}</button>
        <label className="btn nav-desktop" onClick={() => fileRef.current?.click()}>
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

        {/* Three widths, three densities: icon-only below 768px (no room for
            labels), text labels from 768px up (tablets have room to spare
            even though the full desktop row still doesn't fit), and the
            complete flat row only from 1200px up — measured directly
            against this row's own rendered width, not guessed. */}
        <button
          className="btn icon-btn nav-compact"
          onClick={onOpenOutline}
          aria-label={t('topbar.outline')}
          title={t('topbar.outline')}
        >
          📑
        </button>
        <button className="btn nav-tablet" onClick={onOpenOutline}>{t('topbar.outline')}</button>

        <button
          className="btn icon-btn nav-compact"
          onClick={onOpenFind}
          aria-label={t('topbar.find')}
          title={t('topbar.find')}
        >
          🔍
        </button>
        <button className="btn nav-tablet" onClick={onOpenFind}>{t('topbar.find')}</button>
        <span className="tb-divider nav-desktop" />
        <DropdownMenu label={t('topbar.export')} className="nav-tablet">
          <button onClick={onDownloadMd}>{t('topbar.downloadMd')}</button>
          <button onClick={onDownloadHtml}>{t('topbar.downloadHtml')}</button>
          <button onClick={onDownloadEpub}>{t('topbar.downloadEpub')}</button>
          <button onClick={onOpenPrintLayout}>{t('topbar.printLayoutMenu')}</button>
        </DropdownMenu>
        <button className="btn danger nav-desktop" onClick={onClear}>{t('topbar.clear')}</button>

        <button
          className="btn primary icon-btn nav-compact"
          onClick={onPrint}
          aria-label={t('topbar.print')}
          title={t('topbar.print')}
        >
          ⬇
        </button>
        <button className="btn primary nav-tablet" onClick={onPrint}>{t('topbar.print')}</button>

        {/* Overflow menu for everything the nav-desktop buttons above cover —
            visible any time this row isn't at full desktop width (i.e. below
            1200px), so tablets and phones alike can still reach these. */}
        <DropdownMenu label={t('topbar.more')} className="nav-below-desktop">
          <button onClick={onOpenLibrary}>{t('topbar.library')}</button>
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
          <button onClick={onOpenPrintLayout}>{t('topbar.printLayoutMenu')}</button>
          <button onClick={onClear}>{t('topbar.clear')}</button>
        </DropdownMenu>
      </div>
    </div>
  );
}
