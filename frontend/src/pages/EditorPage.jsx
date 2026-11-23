import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createDocument, deleteDocument, getDocument, updateDocument } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import { useFileImport } from '../hooks/useFileImport';
import { usePdfExport } from '../hooks/usePdfExport';
import { useEditorCommands } from '../editor/useEditorCommands';
import { PAGE_SIZES, withDefaults } from '../editor/pageSettings';
import { documentStats } from '../editor/stats';
import DocumentEditor from '../components/DocumentEditor';
import EditorMenuBar from '../components/EditorMenuBar';
import EditorToolbar from '../components/EditorToolbar';
import PageView from '../components/PageView';
import PageSetupDialog from '../components/PageSetupDialog';
import ShareDialog from '../components/ShareDialog';
import Icon from '../components/Icon';
import UserMenu from '../components/UserMenu';
import SaveStatus from '../components/SaveStatus';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import { ROLE_LABELS } from '../utils/format';
import './EditorPage.scss';

const AUTOSAVE_DELAY_MS = 800;
const ZOOM_STORAGE_KEY = 'docs.zoom';

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
  const { exportPdf } = usePdfExport();

  const [doc, setDoc] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('saved');
  const [shareOpen, setShareOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [zoom, setZoom] = useState(loadZoom);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [pageCount, setPageCount] = useState(1);

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
      setStats(documentStats(res.data.content));
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
    setStats(documentStats(content));
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
    downloadPdf: () => exportPdf(id, { beforeExport: canEdit ? saveLatest : undefined }),
    deleteDocument: () => setConfirmDeleteOpen(true),
    editHeader: () => focusField(headerRef),
    editFooter: () => focusField(footerRef),
    togglePageNumbers: () => saveSettings({ ...doc.settings, showPageNumbers: !doc.settings.showPageNumbers }),
  };

  // Before exporting: take the latest content straight from the editor (its change event is
  // debounced, so the newest keystrokes may not have reached us yet), then wait for it to save.
  const saveLatest = async () => {
    if (editorRef.current) {
      clearTimeout(timer.current);
      pendingContent.current = await editorRef.current.save();
    }
    await flushSaves();
  };

  // Waits until every pending edit is saved. Gives up after ~10s.
  const flushSaves = async () => {
    for (let attempt = 0; attempt < 100 && (pendingContent.current || saving.current); attempt += 1) {
      if (pendingContent.current && !saving.current) await saveContent();
      else await new Promise((resolve) => setTimeout(resolve, 100));
      if (pendingContent.current && !saving.current && attempt > 3) break; // save keeps failing
    }
    if (pendingContent.current) {
      dispatch(showToast({ type: 'error', message: 'Latest changes are not saved yet, so the PDF may be out of date' }));
    }
  };

  const performDelete = async () => {
    const res = await deleteDocument(id);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    pendingContent.current = null; // nothing left to save
    dispatch(showToast({ type: 'success', message: `"${doc.title}" was deleted` }));
    navigate('/');
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
              <SaveStatus status={status} onRetry={saveContent} />
            ) : (
              <span className="view-only-chip">
                <Icon name="eye" size={16} />
                View only
              </span>
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
            <span className="docs-topbar__shared-by" title={`Owned by ${doc.owner.name} (${doc.owner.email})`}>
              <Avatar name={doc.owner.name} email={doc.owner.email} size={24} />
              <span>
                Shared by <strong>{doc.owner.name.split(' ')[0]}</strong>
              </span>
              <span className={`badge badge--${doc.role}`}>{ROLE_LABELS[doc.role]}</span>
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
          onPageCountChange={setPageCount}
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

      <footer className="docs-statusbar" aria-label="Document information">
        <span>
          {stats.words.toLocaleString()} {stats.words === 1 ? 'word' : 'words'}
        </span>
        <span className="docs-statusbar__muted">{stats.characters.toLocaleString()} characters</span>
        <span className="docs-statusbar__sep" aria-hidden="true" />
        <span>
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
        <span className="docs-statusbar__muted">
          {PAGE_SIZES[doc.settings.pageSize].label} · {doc.settings.orientation}
        </span>
        <span className="docs-statusbar__spacer" />
        {!canEdit && <span className="docs-statusbar__muted">You can view and print this document</span>}
        <span className="docs-statusbar__muted">{Math.round(zoom * 100)}%</span>
      </footer>

      {fileInput}

      {shareOpen && (
        <ShareDialog documentId={doc.id} documentTitle={doc.title} owner={doc.owner} onClose={() => setShareOpen(false)} />
      )}
      {confirmDeleteOpen && (
        <ConfirmDialog
          danger
          title="Delete document?"
          message={`“${doc.title}” will be permanently deleted and everyone it's shared with will lose access. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={performDelete}
          onClose={() => setConfirmDeleteOpen(false)}
        />
      )}
      {pageSetupOpen && (
        <PageSetupDialog settings={doc.settings} onApply={saveSettings} onClose={() => setPageSetupOpen(false)} />
      )}
    </div>
  );
};

export default EditorPage;
