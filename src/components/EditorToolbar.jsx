import React from 'react';
import { useTranslation } from 'react-i18next';

export default function EditorToolbar({ onBold, onItalic, onChapter, onSub, onVerse }) {
  const { t } = useTranslation();
  return (
    <div className="editor-toolbar">
      <button className="tb-btn" onClick={onBold} title={t('toolbar.bold') + ' (Ctrl+B)'}>
        <strong>B</strong>
      </button>
      <button className="tb-btn" onClick={onItalic} title={t('toolbar.italic') + ' (Ctrl+I)'}>
        <em>I</em>
      </button>
      <span className="tb-sep" />
      <button className="tb-btn tb-wide" onClick={onChapter} title={t('toolbar.chapter')}>
        # {t('toolbar.chapter')}
      </button>
      <button className="tb-btn tb-wide" onClick={onSub} title={t('toolbar.sub')}>
        ## {t('toolbar.sub')}
      </button>
      <button className="tb-btn tb-wide" onClick={onVerse} title={t('toolbar.verse')}>
        &gt; {t('toolbar.verse')}
      </button>
    </div>
  );
}
