import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createDocument, deleteDocument, getDocument, updateDocument } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import { useFileImport } from '../hooks/useFileImport';
import { useEditorCommands } from '../editor/useEditorCommands';
import { withDefaults } from '../editor/pageSettings';
import DocumentEditor from '../components/DocumentEditor';
import EditorMenuBar from '../components/EditorMenuBar';
import EditorToolbar from '../components/EditorToolbar';
import PageView from '../components/PageView';
import PageSetupDialog from '../components/PageSetupDialog';
import ShareDialog from '../components/ShareDialog';
import Icon from '../components/Icon';
import UserMenu from '../components/UserMenu';
import { ROLE_LABELS } from '../utils/format';
import './EditorPage.scss';

const AUTOSAVE_DELAY_MS = 800;
const ZOOM_STORAGE_KEY = 'docs.zoom';

const STATUS_LABELS = {
  saved: 'All changes saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Could not save',
};

// Zoom is a per-viewer preference, so it lives in localStorage rather than the document
const loadZoom = () => {
  try {
    return Number(localStorage.getItem(ZOOM_STORAGE_KEY)) || 1;
  } catch {
    return 1;
  }
};

const EditorPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { openPicker, fileInput } = useFileImport();

  const [doc, setDoc] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('saved');
  const [shareOpen, setShareOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [zoom, setZoom] = useState(loadZoom);

  // Autosave state lives in refs so the debounced save always sees the latest content
  const pendingContent = useRef(null);
  const saving = useRef(false);
  const timer = useRef(null);

  const editorRef = useRef(null);
  const holderRef = useRef(null);
  const titleRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);

  const canEdit = Boolean(doc && doc.role !== 'viewer');
  const isOwner = doc?.role === 'owner';

  useEffect(() => {
    setDoc(null);
    setLoadError(null);
    (async () => {
      const res = await getDocument(id);
      if (res.error) {
        setLoadError(res);
        return;
      }
      setDoc({ ...res.data, settings: withDefaults(res.data.settings) });
      setTitle(res.data.title);
    })();
  }, [id]);

  // ---------- Saving ----------

  const saveContent = async () => {
    clearTimeout(timer.current);
    if (saving.current || !pendingContent.current) return;

    const content = pendingContent.current;
    pendingContent.current = null;
    saving.current = true;
    setStatus('saving');

    const res = await updateDocument(id, { content });
    saving.current = false;

    if (res.error) {
      pendingContent.current ??= content; // keep it so the next change or Ctrl+S retries
      setStatus('error');
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }

    // More edits arrived while this request was in flight
    if (pendingContent.current) {
      saveContent();
      return;
    }
    setStatus('saved');
    setDoc((d) => ({ ...d, updatedAt: res.data.updatedAt }));
  };

  const handleContentChange = (content) => {
    pendingContent.current = content;
    setStatus('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(saveContent, AUTOSAVE_DELAY_MS);
  };

  // Block-level toolbar actions: read the editor and queue an autosave
  const handleStructureChange = useCallback(async () => {
    if (!editorRef.current) return;
    handleContentChange(await editorRef.current.save());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async (next) => {
    const previous = doc.settings;
    setDoc((d) => ({ ...d, settings: next }));
    setStatus('saving');

    const res = await updateDocument(id, { settings: next });
    if (res.error) {
      setDoc((d) => ({ ...d, settings: previous }));
      setStatus('error');
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setDoc((d) => ({ ...d, settings: withDefaults(res.data.settings), updatedAt: res.data.updatedAt }));
    setStatus(pendingContent.current ? 'unsaved' : 'saved');
  };

  const handleRename = async () => {
    const next = title.trim();
    if (next === doc.title) return;
    if (!next) {
      setTitle(doc.title);
      dispatch(showToast({ type: 'error', message: 'Title cannot be empty' }));
      return;
    }

    const res = await updateDocument(id, { title: next });
    if (res.error) {
      setTitle(doc.title);
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setDoc((d) => ({ ...d, title: res.data.title, updatedAt: res.data.updatedAt }));
    setTitle(res.data.title);
  };

  // Ctrl/Cmd+S saves immediately, and warn before leaving with unsaved changes
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveContent();
      }
    };
    const onBeforeUnload = (e) => {
      if (pendingContent.current || saving.current) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // Flush anything left when navigating away inside the app
      if (pendingContent.current) saveContent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- Toolbar & menus ----------

  const { state, commands } = useEditorCommands({
    editorRef,
    holderRef,
    enabled: canEdit,
    onStructureChange: handleStructureChange,
  });

  const handleEditorReady = useCallback((editor, holder) => {
    editorRef.current = editor;
    holderRef.current = holder;
  }, []);

  const changeZoom = (level) => {
    setZoom(level);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(level));
    } catch {
      // storage unavailable (private mode): zoom just isn't remembered
    }
  };

  const focusField = (ref) => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    ref.current?.focus();
  };

  const actions = {
    newDocument: async () => {
      const res = await createDocument();
      if (res.error) {
        dispatch(showToast({ type: 'error', message: res.message }));
        return;
      }
      navigate(`/documents/${res.data.id}`);
    },
    importFile: openPicker,
    rename: () => {
      titleRef.current?.focus();
      titleRef.current?.select();
    },
    share: () => setShareOpen(true),
    pageSetup: () => setPageSetupOpen(true),
    print: () => window.print(),
    deleteDocument: async () => {
      if (!window.confirm(`Delete "${doc.title}"? This also removes access for everyone it is shared with.`)) return;
      const res = await deleteDocument(id);
      if (res.error) {
        dispatch(showToast({ type: 'error', message: res.message }));
        return;
      }
      pendingContent.current = null;
      dispatch(showToast({ type: 'success', message: res.message }));
      navigate('/');
    },
    editHeader: () => focusField(headerRef),
    editFooter: () => focusField(footerRef),
    togglePageNumbers: () => saveSettings({ ...doc.settings, showPageNumbers: !doc.settings.showPageNumbers }),
  };

  // ---------- Render ----------

  if (loadError) {
    const notFound = loadError.error.status === 404;
    return (
      <main className="page page-message">
        <h1>{notFound ? 'Document not found' : 'Could not open document'}</h1>
        <p>{notFound ? "It may have been deleted, or it hasn't been shared with you." : loadError.message}</p>
        <Link to="/" className="btn btn--primary">Back to documents</Link>
      </main>
    );
  }

  if (!doc) return <main className="page page-message">Loading document…</main>;

  return (
    <div className="docs-editor">
      <header className="docs-topbar">
        <Link to="/" className="docs-topbar__logo" title="Back to documents">
          <Icon name="doc" size={34} />
        </Link>

        <div className="docs-topbar__main">
          <div className="docs-topbar__title-row">
            <input
              ref={titleRef}
              className="docs-topbar__title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              readOnly={!canEdit}
              maxLength={200}
              size={Math.max(title.length, 8)}
              aria-label="Document title"
            />
            {canEdit ? (
              <span className={`docs-topbar__status docs-topbar__status--${status}`}>{STATUS_LABELS[status]}</span>
            ) : (
              <span className="badge badge--viewer">{ROLE_LABELS.viewer}</span>
            )}
          </div>
          <EditorMenuBar
            commands={commands}
            state={state}
            canEdit={canEdit}
            isOwner={isOwner}
            settings={doc.settings}
            actions={actions}
          />
        </div>

        <div className="docs-topbar__right">
          {isOwner ? (
            <button type="button" className="btn btn--primary docs-topbar__share" onClick={() => setShareOpen(true)}>
              <Icon name="share" size={18} />
              Share
            </button>
          ) : (
            <span className="docs-topbar__shared-by">
              Shared by {doc.owner.name}
              {doc.role === 'editor' && <span className="badge badge--editor">{ROLE_LABELS.editor}</span>}
            </span>
          )}
          <UserMenu />
        </div>
      </header>

      <EditorToolbar
        state={state}
        commands={commands}
        canEdit={canEdit}
        holderRef={holderRef}
        zoom={zoom}
        onZoomChange={changeZoom}
        onPrint={actions.print}
        onPageSetup={actions.pageSetup}
        onLinkChanged={handleStructureChange}
      />

      <div className="docs-canvas">
        <PageView
          settings={doc.settings}
          zoom={zoom}
          canEdit={canEdit}
          headerRef={headerRef}
          footerRef={footerRef}
          onSettingsChange={saveSettings}
          onEmptyAreaClick={() => editorRef.current?.caret.setToLastBlock('end')}
        >
          <DocumentEditor
            key={doc.id}
            initialData={doc.content}
            readOnly={!canEdit}
            onChange={handleContentChange}
            onReady={handleEditorReady}
          />
        </PageView>
      </div>

      {fileInput}

      {shareOpen && (
        <ShareDialog documentId={doc.id} documentTitle={doc.title} owner={doc.owner} onClose={() => setShareOpen(false)} />
      )}
      {pageSetupOpen && (
        <PageSetupDialog settings={doc.settings} onApply={saveSettings} onClose={() => setPageSetupOpen(false)} />
      )}
    </div>
  );
};

export default EditorPage;
