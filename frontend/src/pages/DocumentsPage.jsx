import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createDocument, deleteDocument, getDocuments } from '../api/documents.api';
import { addOwnedDocument, removeDocument, setDocuments } from '../store/documentsSlice';
import { showToast } from '../store/toastSlice';
import { useFileImport } from '../hooks/useFileImport';
import { usePdfExport } from '../hooks/usePdfExport';
import ConfirmDialog from '../components/ConfirmDialog';
import DocumentRow from '../components/DocumentRow';
import Dropdown, { MenuItem } from '../components/Dropdown';
import Icon from '../components/Icon';
import './DocumentsPage.scss';

const TABS = [
  { value: 'all', label: 'All documents', short: 'All' },
  { value: 'owned', label: 'Owned by me', short: 'Mine' },
  { value: 'shared', label: 'Shared with me', short: 'Shared' },
];

const SORTS = {
  edited: { label: 'Last edited', compare: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) },
  title: { label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
};

const EMPTY_STATES = {
  all: { icon: 'doc', title: 'No documents yet', text: 'Create a blank document or import a .txt / .md file to get started.' },
  owned: { icon: 'doc', title: "You haven't created any documents", text: 'Documents you create or import will appear here.' },
  shared: { icon: 'people', title: 'Nothing shared with you yet', text: 'When someone shares a document with you, it will show up here.' },
};

const SkeletonRows = () => (
  <ul className="doc-table__body" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <li key={i} className="doc-row doc-row--skeleton">
        <span className="skeleton skeleton--icon" />
        <span className="skeleton skeleton--text" />
      </li>
    ))}
  </ul>
);

const DocumentsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { owned, shared, loaded } = useSelector((s) => s.documents);
  const user = useSelector((s) => s.auth.user);
  const { openPicker, uploading, fileInput } = useFileImport();
  const { exportPdf } = usePdfExport();

  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('edited');
  const [pendingDelete, setPendingDelete] = useState(null);

  // The active tab lives in the URL so refresh / back keep it
  const tab = TABS.some((t) => t.value === searchParams.get('tab')) ? searchParams.get('tab') : 'all';
  const setTab = (value) => setSearchParams(value === 'all' ? {} : { tab: value }, { replace: true });

  const load = async () => {
    setLoadError('');
    const res = await getDocuments();
    if (res.error) {
      setLoadError(res.message);
      return;
    }
    dispatch(setDocuments(res.data));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = { all: owned.length + shared.length, owned: owned.length, shared: shared.length };

  const visible = useMemo(() => {
    const source = tab === 'owned' ? owned : tab === 'shared' ? shared : [...owned, ...shared];
    const q = query.trim().toLowerCase();
    return source.filter((d) => !q || d.title.toLowerCase().includes(q)).sort(SORTS[sort].compare);
  }, [tab, owned, shared, query, sort]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await createDocument();
    setCreating(false);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    dispatch(addOwnedDocument(res.data));
    navigate(`/documents/${res.data.id}`);
  };

  const confirmDelete = async () => {
    const doc = pendingDelete;
    const res = await deleteDocument(doc.id);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    dispatch(removeDocument(doc.id));
    dispatch(showToast({ type: 'success', message: `"${doc.title}" was deleted` }));
  };

  const empty = EMPTY_STATES[tab];

  return (
    <main className="home">
      {fileInput}

      {/* Start a new document */}
      <section className="home__start" aria-labelledby="start-title">
        <div className="home__inner">
          <div className="home__greeting">
            <h1 id="start-title">Start a new document</h1>
            {user && <p>Welcome back, {user.name.split(' ')[0]}.</p>}
          </div>
          <div className="templates">
            <button type="button" className="template" onClick={handleCreate} disabled={creating}>
              <span className="template__page template__page--blank">
                <span className="template__plus" aria-hidden="true">
                  <Icon name="add" size={44} />
                </span>
              </span>
              <span className="template__label">{creating ? 'Creating…' : 'Blank document'}</span>
            </button>
            <button type="button" className="template" onClick={openPicker} disabled={uploading}>
              <span className="template__page template__page--import">
                <Icon name="upload" size={36} />
                <span className="template__formats">.txt · .md</span>
              </span>
              <span className="template__label">{uploading ? 'Importing…' : 'Import a file'}</span>
              <span className="template__hint">Up to 1 MB</span>
            </button>
          </div>
        </div>
      </section>

      {/* Document list */}
      <section className="home__inner home__docs" aria-label="Documents">
        <div className="docs-toolbar">
          <div className="tabs" role="tablist" aria-label="Filter documents">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                className={`tabs__tab${tab === t.value ? ' is-active' : ''}`}
                onClick={() => setTab(t.value)}
              >
                <span className="tabs__label">{t.label}</span>
                <span className="tabs__label tabs__label--short">{t.short}</span>
                {loaded && <span className="tabs__count">{counts[t.value]}</span>}
              </button>
            ))}
          </div>

          <div className="docs-toolbar__right">
            <label className="search">
              <Icon name="search" size={18} />
              <input
                type="search"
                placeholder="Search documents"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search documents by title"
              />
            </label>
            <Dropdown
              label={
                <>
                  <Icon name="sort" size={18} />
                  <span className="sort-label">{SORTS[sort].label}</span>
                </>
              }
              align="right"
              title="Sort documents"
              buttonClassName="btn btn--secondary sort-button"
            >
              {(close) =>
                Object.entries(SORTS).map(([key, option]) => (
                  <MenuItem key={key} label={option.label} active={sort === key} close={close} onSelect={() => setSort(key)} />
                ))
              }
            </Dropdown>
          </div>
        </div>

        {loadError ? (
          <div className="state-card state-card--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn btn--secondary" onClick={load}>
              Try again
            </button>
          </div>
        ) : (
          <div className="doc-table">
            <div className="doc-table__head" aria-hidden="true">
              <span>Name</span>
              <span>Owner</span>
              <span>Last edited</span>
              <span />
            </div>

            {!loaded && <SkeletonRows />}

            {loaded && visible.length > 0 && (
              <ul className="doc-table__body">
                {visible.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} onDelete={setPendingDelete} onDownloadPdf={(d) => exportPdf(d.id)} />
                ))}
              </ul>
            )}

            {loaded && visible.length === 0 && (
              <div className="state-card">
                <span className="state-card__icon" aria-hidden="true">
                  <Icon name={query ? 'search' : empty.icon} size={28} />
                </span>
                <h3>{query ? `No documents match “${query}”` : empty.title}</h3>
                <p>{query ? 'Try a different title or clear the search.' : empty.text}</p>
                {query ? (
                  <button type="button" className="btn btn--secondary" onClick={() => setQuery('')}>
                    Clear search
                  </button>
                ) : (
                  tab !== 'shared' && (
                    <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={creating}>
                      <Icon name="add" size={18} /> New document
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          danger
          title="Delete document?"
          message={`“${pendingDelete.title}” will be permanently deleted${
            pendingDelete.shareCount ? ` and everyone it's shared with will lose access` : ''
          }. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
};

export default DocumentsPage;
