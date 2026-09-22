import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportAllBooksJson, importBooksJson } from '../lib/library';

export default function LibraryModal({
  open, onClose, books, activeBookId,
  onOpenBook, onDeleteBook, onNewBook, onRenameBook, onDuplicateBook, onBooksRestored,
}) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef(null);
  const [notice, setNotice] = useState('');
  if (!open) return null;

  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm(t('library.deleteConfirm'))) {
      onDeleteBook(id);
    }
  };

  const handleRename = (e, book) => {
    e.stopPropagation();
    const next = window.prompt(t('library.renamePrompt'), book.title || '');
    if (next && next.trim()) onRenameBook(book.id, next.trim());
  };

  const handleDuplicate = (e, id) => {
    e.stopPropagation();
    onDuplicateBook(id, t('library.copySuffix'));
  };

  const handleBackup = () => {
    const json = exportAllBooksJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warraq-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importBooksJson(ev.target.result, 'merge');
        setNotice(t('library.restoreSuccess', { added: result.added }));
        onBooksRestored();
      } catch (err) {
        setNotice(t('library.restoreError'));
      }
    };
    reader.readAsText(file, 'UTF-8');
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

        <div className="library-toolbar">
          <button className="btn primary" onClick={onNewBook}>{t('library.newBook')}</button>
          <button className="btn" onClick={handleBackup}>{t('library.backup')}</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>{t('library.restore')}</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestoreFile} />
        </div>
        {notice && <p>{notice}</p>}

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
              <div className="library-row-actions">
                <button className="btn small" onClick={(e) => handleRename(e, b)}>{t('library.rename')}</button>
                <button className="btn small" onClick={(e) => handleDuplicate(e, b.id)}>{t('library.duplicate')}</button>
                <button className="btn danger small" onClick={(e) => handleDelete(e, b.id)}>
                  {t('library.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
