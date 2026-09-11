import React from 'react';
import { splitTerm } from '../lib/parser';

// Very small inline-markdown renderer: **bold** and *italic*.
// Returns an array of React nodes (strings + <strong>/<em> elements).
function renderInline(text) {
  const nodes = [];
  let remaining = text;
  const pattern = /(\*\*(.+?)\*\*|\*([^*]+?)\*)/;
  let key = 0;
  while (remaining.length) {
    const m = remaining.match(pattern);
    if (!m) {
      nodes.push(remaining);
      break;
    }
    const idx = m.index;
    if (idx > 0) nodes.push(remaining.slice(0, idx));
    if (m[2] !== undefined) {
      nodes.push(<strong key={key++}>{m[2]}</strong>);
    } else {
      nodes.push(<em key={key++}>{m[3]}</em>);
    }
    remaining = remaining.slice(idx + m[0].length);
  }
  return nodes;
}

export default function Paragraph({ text, termMode }) {
  const split = splitTerm(text, termMode);
  if (split) {
    return (
      <p>
        <span className="term">{split.term}</span>
        {renderInline(split.rest)}
      </p>
    );
  }
  return <p>{renderInline(text)}</p>;
}
