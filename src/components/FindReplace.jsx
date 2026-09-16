import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function FindReplace({ open, onClose, text, setText, editorRef }) {
  const { t } = useTranslation();
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);

  const matches = useMemo(() => {
    if (!find) return [];
    const re = new RegExp(escapeRegex(find), 'gi');
    const result = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      result.push([m.index, m.index + m[0].length]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return result;
  }, [find, text]);

  useEffect(() => { setMatchIdx(0); }, [find]);

  const selectMatch = useCallback((idx) => {
    if (!matches.length || !editorRef.current) return;
    const clamped = ((idx % matches.length) + matches.length) % matches.length;
    const [start, end] = matches[clamped];
    const el = editorRef.current;
    el.focus();
    el.setSelectionRange(start, end);
    setMatchIdx(clamped);
  }, [matches, editorRef]);

  useEffect(() => {
    if (open && matches.length) selectMatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length, open]);

  if (!open) return null;

  const handleNext = () => selectMatch(matchIdx + 1);
  const handlePrev = () => selectMatch(matchIdx - 1);

  const handleReplaceOne = () => {
    if (!matches.length) return;
    const [start, end] = matches[matchIdx];
    const next = text.slice(0, start) + replace + text.slice(end);
    setText(next);
  };

  const handleReplaceAll = () => {
    if (!find) return;
    const re = new RegExp(escapeRegex(find), 'gi');
    setText(text.replace(re, replace));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.shiftKey ? handlePrev() : handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="find-replace-bar" onKeyDown={handleKeyDown}>
      <input
        autoFocus
        className="fr-input"
        placeholder={t('findReplace.find')}
        value={find}
        onChange={(e) => setFind(e.target.value)}
      />
      <span className="fr-count">
        {find ? (matches.length ? `${matchIdx + 1}/${matches.length}` : '0/0') : ''}
      </span>
      <button className="btn small" onClick={handlePrev} disabled={!matches.length}>↑</button>
      <button className="btn small" onClick={handleNext} disabled={!matches.length}>↓</button>
      <input
        className="fr-input"
        placeholder={t('findReplace.replace')}
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
      />
      <button className="btn small" onClick={handleReplaceOne} disabled={!matches.length}>
        {t('findReplace.replaceOne')}
      </button>
      <button className="btn small" onClick={handleReplaceAll} disabled={!find}>
        {t('findReplace.replaceAll')}
      </button>
      <button className="btn small" onClick={onClose}>{t('close')}</button>
    </div>
  );
}
