import { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import { EDITOR_TOOLS, INLINE_TOOLBAR } from '../editor/tools';
import './DocumentEditor.scss';

/**
 * Thin React wrapper around Editor.js.
 * The editor is created once per mount; parents remount it (key) to load another document.
 * onReady(editor, holderElement) hands the instance to the toolbar.
 */
const DocumentEditor = ({ initialData, readOnly = false, onChange, onReady }) => {
  const holderRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    // Each instance gets its own element: Editor.js clears its holder on destroy, and in
    // React StrictMode the first instance is destroyed after the second one mounts.
    const holder = document.createElement('div');
    holderRef.current.appendChild(holder);
    let destroyed = false;
    let ready = false;

    const editor = new EditorJS({
      holder,
      data: initialData,
      readOnly,
      tools: EDITOR_TOOLS,
      inlineToolbar: INLINE_TOOLBAR,
      // No extra clickable space under the last block: the page view measures this height
      // for pagination, and handles clicks on empty paper itself
      minHeight: 24,
      placeholder: readOnly ? '' : 'Start typing, or use the toolbar above to add headings and lists',
      autofocus: !readOnly && !initialData?.blocks?.length,
      // Only report real edits: never while the document is still loading or while this
      // instance is being torn down (unmount, StrictMode, hot reload), so it can't save an empty doc
      onChange: async (api) => {
        if (!ready || destroyed || readOnly) return;
        const content = await api.saver.save();
        if (!destroyed) onChangeRef.current?.(content);
      },
    });

    editor.isReady
      .then(() => {
        if (destroyed) return;
        ready = true;
        onReadyRef.current?.(editor, holder);
      })
      .catch(() => {});

    return () => {
      destroyed = true;
      editor.isReady
        .then(() => editor.destroy())
        .catch(() => {})
        .finally(() => holder.remove());
    };
    // initialData / readOnly are only read on mount on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={holderRef} className={`document-editor${readOnly ? ' document-editor--readonly' : ''}`} />;
};

export default DocumentEditor;
