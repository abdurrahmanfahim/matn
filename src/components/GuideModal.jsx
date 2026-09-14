import React from 'react';
import { useTranslation } from 'react-i18next';

export default function GuideModal({ open, onClose }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{t('guide.title')}</h2>
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>
        <p>{t('guide.intro')}</p>

        <h4>{t('guide.frontmatterTitle')}</h4>
        <pre>{`---\ntitle: Book title\nsubtitle: Subtitle\n---`}</pre>

        <h4>{t('guide.chapterTitle')}</h4>
        <pre># Chapter title</pre>

        <h4>{t('guide.subTitle')}</h4>
        <pre>## Item title</pre>

        <h4>{t('guide.verseTitle')}</h4>
        <pre>{`> First line of verse\n> Second line of verse`}</pre>

        <h4>{t('guide.termTitle')}</h4>
        <p>{t('guide.termBody')}</p>

        <h4>{t('guide.paraTitle')}</h4>
        <p>{t('guide.paraBody')}</p>
      </div>
    </div>
  );
}
