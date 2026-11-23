import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../store/toastSlice';
import {
  clearFormatting,
  getEditorSelection,
  insertDivider,
  readFormatState,
  setTextStyle,
  toggleInline,
  toggleList,
  toggleQuote,
  toggleWrapper,
} from './formatting';

const EMPTY_STATE = {
  index: -1,
  blockType: null,
  textStyle: 'paragraph',
  listStyle: null,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  highlight: false,
  code: false,
  link: false,
};

// Google Docs style shortcuts for block styles (Editor.js already handles ⌘B / ⌘I / ⌘U / ⌘K)
const TEXT_STYLE_KEYS = { Digit0: 'paragraph', Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit4: 'h4' };
const LIST_KEYS = { Digit7: 'ordered', Digit8: 'unordered', Digit9: 'checklist' };

/**
 * Exposes formatting commands for the toolbar/menus and tracks the formatting at the caret.
 * onStructureChange is called after block-level changes so the page can autosave.
 */
export const useEditorCommands = ({ editorRef, holderRef, enabled, onStructureChange }) => {
  const dispatch = useDispatch();
  const [state, setState] = useState(EMPTY_STATE);
  const lastIndex = useRef(-1);

  const info = useCallback((message) => dispatch(showToast({ type: 'info', message })), [dispatch]);

  const refresh = useCallback(() => {
    const editor = editorRef.current;
    const holder = holderRef.current;
    if (!editor || !holder) return;
    // When focus moves to the toolbar the selection leaves the editor: keep the last state
    const next = readFormatState(editor, holder);
    if (!next) return;
    lastIndex.current = next.index;
    setState(next);
  }, [editorRef, holderRef]);

  // selectionchange is the main signal; mouseup/keyup are a fallback for environments
  // that don't fire it reliably for contenteditable elements
  useEffect(() => {
    const refreshSoon = () => requestAnimationFrame(refresh);
    document.addEventListener('selectionchange', refresh);
    document.addEventListener('mouseup', refreshSoon);
    document.addEventListener('keyup', refreshSoon);
    return () => {
      document.removeEventListener('selectionchange', refresh);
      document.removeEventListener('mouseup', refreshSoon);
      document.removeEventListener('keyup', refreshSoon);
    };
  }, [refresh]);

  const runBlock = useCallback(
    async (action) => {
      const editor = editorRef.current;
      if (!editor || !enabled) return;
      try {
        await action(editor, lastIndex.current);
        onStructureChange?.();
      } catch {
        info("This block can't be changed to that style");
      }
      requestAnimationFrame(refresh);
    },
    [editorRef, enabled, onStructureChange, info, refresh],
  );

  const commands = {
    inline: (style) => {
      if (!enabled) return;
      if (!getEditorSelection(holderRef.current)) {
        info('Click inside the document first');
        return;
      }
      toggleInline(style);
      refresh();
    },
    wrap: (style) => {
      if (!enabled) return;
      const result = toggleWrapper(holderRef.current, style);
      if (!result.ok) info(result.reason);
      refresh();
    },
    clearFormatting: () => {
      if (!enabled) return;
      const result = clearFormatting(holderRef.current);
      if (!result.ok) info(result.reason);
      refresh();
    },
    textStyle: (style) => runBlock((editor, index) => setTextStyle(editor, index, style)),
    list: (style) => runBlock((editor, index) => toggleList(editor, index, style)),
    quote: () => runBlock((editor, index) => toggleQuote(editor, index)),
    divider: () => runBlock((editor, index) => insertDivider(editor, index)),
    undo: () => enabled && document.execCommand('undo'),
    redo: () => enabled && document.execCommand('redo'),
  };

  // Keyboard shortcuts for block styles, only while typing in the document
  const commandsRef = useRef(commands);
  useEffect(() => {
    commandsRef.current = commands;
  });
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || !holderRef.current?.contains(e.target)) return;
      if (e.altKey && TEXT_STYLE_KEYS[e.code]) {
        e.preventDefault();
        commandsRef.current.textStyle(TEXT_STYLE_KEYS[e.code]);
      } else if (e.shiftKey && LIST_KEYS[e.code]) {
        e.preventDefault();
        commandsRef.current.list(LIST_KEYS[e.code]);
      } else if (e.code === 'Backslash') {
        e.preventDefault();
        commandsRef.current.clearFormatting();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [holderRef]);

  return { state, commands };
};
