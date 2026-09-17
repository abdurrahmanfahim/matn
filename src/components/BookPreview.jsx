import React from 'react';
import { useTranslation } from 'react-i18next';
import { THEMES, PAGE_SIZES } from '../lib/themes';
import Paragraph from './Paragraph';

export default function BookPreview({ doc, theme, dir, termMode, pageSize }) {
  const { t: tr } = useTranslation();
  const t = THEMES[theme];
  const isEmpty = !doc.meta.title && doc.content.length === 0;

  const pageStyle = {
    background: t.pageBg,
    color: t.text,
    fontFamily: t.fontBody,
    direction: dir,
    textAlign: dir === 'rtl' ? 'right' : 'left',
    maxWidth: PAGE_SIZES[pageSize],
    '--chapter-bg': t.chapterBg,
    '--chapter-text': t.chapterText,
    '--sub-text': t.subText,
    '--sub-border': t.subBorder,
    '--verse-bg': t.verseBg,
    '--verse-border': t.verseBorder,
    '--term-color': t.termColor,
    '--dot-color': t.dotColor,
    '--font-head': t.fontHead,
  };

  return (
    <div id="book-page" style={pageStyle}>
      {isEmpty && (
        <div className="bk-empty">{tr('editor.empty')}</div>
      )}
      {doc.meta.title && (
        <div className="bk-title">
          <div className="bk-title-main">{doc.meta.title}</div>
          {doc.meta.subtitle && <div className="bk-title-sub">{doc.meta.subtitle}</div>}
        </div>
      )}

      {doc.toc.length > 0 && (
        <div className="bk-toc">
          <div className="bk-toc-title">{dir === 'rtl' ? 'الفهرس' : 'Table of Contents'}</div>
          {doc.toc.map((e) => (
            <div key={e.id} className={`bk-toc-entry ${e.level === 'main' ? 'main' : 'sub'}`}>
              <a href={`#${e.id}`}>{e.text}</a>
            </div>
          ))}
        </div>
      )}

      {doc.content.map((block, i) => {
        if (block.type === 'chapter') {
          return (
            <div className="bk-chapter" id={block.id} key={i}>
              {block.text}
            </div>
          );
        }
        if (block.type === 'sub') {
          return (
            <div className="bk-sub" id={block.id} key={i}>
              {block.text}
            </div>
          );
        }
        if (block.type === 'verse') {
          return (
            <div className="bk-verse" key={i}>
              {block.lines.map((l, j) => (
                <React.Fragment key={j}>
                  {l.trim()}
                  {j < block.lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          );
        }
        return <Paragraph text={block.text} termMode={termMode} key={i} />;
      })}
    </div>
  );
}
