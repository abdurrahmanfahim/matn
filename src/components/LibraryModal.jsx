import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LibraryModal({ open, onClose, books, activeBookId, onOpenBook, onDeleteBook, onNewBook }) {
  const { t, i18n } = useTranslation();
  if (!open) return null;

  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm(t('library.deleteConfirm'))) {
      onDeleteBook(id);
    }
  };

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{t('library.title')}</h2>
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>

        <button className="btn primary" style={{ marginBottom: 16 }} onClick={onNewBook}>
          {t('library.newBook')}
        </button>

        {books.length === 0 && <p>{t('library.empty')}</p>}

        <div className="library-list">
          {books.map((b) => (
            <div
              key={b.id}
              className={`library-row ${b.id === activeBookId ? 'active' : ''}`}
              onClick={() => onOpenBook(b.id)}
            >
              <div className="library-row-info">
                <div className="library-row-title">
                  {b.title || t('library.untitled')}
                  {b.id === activeBookId && <span className="library-badge">{t('library.current')}</span>}
                </div>
                <div className="library-row-date">
                  {new Date(b.updatedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <button className="btn danger small" onClick={(e) => handleDelete(e, b.id)}>
                {t('library.delete')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
