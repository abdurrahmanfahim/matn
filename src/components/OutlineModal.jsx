import React from 'react';
import { useTranslation } from 'react-i18next';

export default function OutlineModal({ open, onClose, toc, onJump }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{t('outline.title')}</h2>
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>

        {toc.length === 0 && <p>{t('outline.empty')}</p>}

        <div className="library-list">
          {toc.map((e) => (
            <div
              key={e.id}
              className={`outline-row ${e.level === 'main' ? 'main' : 'sub'}`}
              onClick={() => onJump(e.id)}
            >
              {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
