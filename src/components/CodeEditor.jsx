import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { keymap } from '@codemirror/view';
import { insertNewlineAndIndent } from '@codemirror/commands';
import { Prec } from '@codemirror/state';

// The markdown language's default keymap "smart-continues" certain
// block types (lists, blockquotes) on Enter. That's a nice touch for
// real Markdown authoring, but surprising for people coming from a
// plain textarea — override Enter back to a plain newline, at the
// highest precedence so it always wins over the language's own keymap.
const plainEnter = Prec.highest(keymap.of([{ key: 'Enter', run: insertNewlineAndIndent }]));

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#151210',
    color: '#d8cfc0',
    height: '100%',
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily: "'SF Mono','Consolas',monospace",
    padding: '16px',
    caretColor: '#d8cfc0',
  },
  '.cm-scroller': { fontFamily: "'SF Mono','Consolas',monospace", overflow: 'auto' },
  '&.cm-focused': { outline: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.035)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(184,146,90,0.28) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(184,146,90,0.28) !important' },
  '.cm-cursor': { borderLeftColor: '#d4ac74' },
}, { dark: true });

// Matches our simplified Markdown subset: #/## headings, **bold**,
// *italic*, and "> " verse lines.
const syntaxColors = HighlightStyle.define([
  { tag: tags.heading1, color: '#d4ac74', fontWeight: '700' },
  { tag: tags.heading2, color: '#d4ac74', fontWeight: '700' },
  { tag: tags.heading, color: '#d4ac74', fontWeight: '700' },
  { tag: tags.strong, color: '#e8c9a0', fontWeight: '700' },
  { tag: tags.emphasis, color: '#e8c9a0', fontStyle: 'italic' },
  { tag: tags.quote, color: '#9c9184' },
  { tag: tags.monospace, color: '#b9ab8f' },
  { tag: tags.processingInstruction, color: '#7d7466' },
]);

const CodeEditor = forwardRef(function CodeEditor({ value, onChange, dir, onScroll, spellCheck }, ref) {
  const viewRef = useRef(null);
  const onScrollRef = useRef(onScroll);
  useEffect(() => { onScrollRef.current = onScroll; }, [onScroll]);

  useImperativeHandle(ref, () => ({
    focus() { viewRef.current?.focus(); },
    get value() { return viewRef.current?.state.doc.toString() ?? ''; },
    get selectionStart() { return viewRef.current?.state.selection.main.from ?? 0; },
    get selectionEnd() { return viewRef.current?.state.selection.main.to ?? 0; },
    setSelectionRange(start, end) {
      const v = viewRef.current;
      if (!v) return;
      v.dispatch({
        selection: { anchor: start, head: end },
        effects: EditorView.scrollIntoView(start, { y: 'nearest' }),
      });
    },
    // Atomically replace [from, to) with `insert`, and set the resulting
    // selection — all in one CodeMirror transaction, so there's no race
    // between updating the document and restoring the cursor/selection
    // (React state / onChange only finds out about it afterwards).
    replaceRange(from, to, insertText, selFrom, selTo) {
      const v = viewRef.current;
      if (!v) return;
      v.dispatch({
        changes: { from, to, insert: insertText },
        selection: { anchor: selFrom, head: selTo },
        scrollIntoView: true,
      });
      v.focus();
    },
    get scrollTop() { return viewRef.current?.scrollDOM.scrollTop ?? 0; },
    set scrollTop(val) { if (viewRef.current) viewRef.current.scrollDOM.scrollTop = val; },
    get scrollHeight() { return viewRef.current?.scrollDOM.scrollHeight ?? 0; },
    get clientHeight() { return viewRef.current?.scrollDOM.clientHeight ?? 0; },
    get hasFocus() { return viewRef.current?.hasFocus ?? false; },
  }), []);

  const handleCreateEditor = (view) => {
    viewRef.current = view;
    view.scrollDOM.addEventListener('scroll', () => onScrollRef.current?.());
  };

  return (
    <CodeMirror
      key={dir}
      value={value}
      onChange={onChange}
      height="100%"
      theme={darkTheme}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLineGutter: false,
        highlightActiveLine: true,
        autocompletion: false,
        closeBrackets: false,
      }}
      extensions={[
        markdown(),
        plainEnter,
        syntaxHighlighting(syntaxColors),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ dir, spellcheck: spellCheck ? 'true' : 'false' }),
      ]}
      onCreateEditor={handleCreateEditor}
    />
  );
});

export default CodeEditor;
