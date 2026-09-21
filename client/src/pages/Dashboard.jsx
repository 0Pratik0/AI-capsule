import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import VersionPill from '../components/VersionPill.jsx';
import CapsuleForm from '../components/CapsuleForm.jsx';
import CapsuleDetail from '../components/CapsuleDetail.jsx';
import { api, AuthError, ApiError } from '../api.js';

// Groups capsules by project so versions of related prompts sit together.
function groupByProject(capsules) {
  const groups = new Map();
  for (const capsule of capsules) {
    if (!groups.has(capsule.project_name)) groups.set(capsule.project_name, []);
    groups.get(capsule.project_name).push(capsule);
  }
  return [...groups.entries()];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // view | create | edit
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  // Any 401 means the JWT is missing, invalid or expired: go back to sign in.
  const handleError = useCallback((err, fallback) => {
    if (err instanceof AuthError) {
      navigate('/login?error=expired', { replace: true });
      return true;
    }
    setActionError(err instanceof ApiError ? err.message : fallback);
    return false;
  }, [navigate]);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError('');
    try {
      const [me, list] = await Promise.all([api.me(), api.listCapsules()]);
      setUser(me);
      setCapsules(list);
      setStatus('ready');
    } catch (err) {
      if (err instanceof AuthError) {
        navigate('/login?error=expired', { replace: true });
        return;
      }
      setLoadError(err.message || 'Could not load your capsules.');
      setStatus('error');
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const selected = capsules.find((c) => c.id === selectedId) || null;
  const groups = useMemo(() => groupByProject(capsules), [capsules]);
  const projects = useMemo(() => groups.map(([name]) => name), [groups]);

  const openCreate = () => { setMode('create'); setServerErrors({}); setActionError(''); };
  const openCapsule = (id) => { setSelectedId(id); setMode('view'); setServerErrors({}); setActionError(''); };
  const closePane = () => { setSelectedId(null); setMode('view'); setServerErrors({}); setActionError(''); };

  // A record deleted in another tab (or by a restart on ephemeral storage)
  // comes back as 404. Drop it locally and say so, instead of failing silently.
  const forgetMissing = (id) => {
    setCapsules((prev) => prev.filter((c) => c.id !== id));
    closePane();
    setActionError('That capsule no longer exists. The list has been refreshed.');
  };

  const save = async (values) => {
    setSaving(true);
    setServerErrors({});
    setActionError('');
    try {
      if (mode === 'create') {
        const created = await api.createCapsule(values);
        setCapsules((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setToast('Capsule saved');
      } else {
        const updated = await api.updateCapsule(selectedId, values);
        setCapsules((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setToast('Changes saved');
      }
      setMode('view');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return forgetMissing(selectedId);
      if (err instanceof ApiError && err.details) setServerErrors(err.details);
      handleError(err, 'Could not save the capsule.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setActionError('');
    try {
      await api.deleteCapsule(selectedId);
      setCapsules((prev) => prev.filter((c) => c.id !== selectedId));
      closePane();
      setToast('Capsule deleted');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return forgetMissing(selectedId);
      handleError(err, 'Could not delete the capsule.');
    } finally {
      setDeleting(false);
    }
  };

  const signOut = async () => {
    try { await api.logout(); } catch { /* the cookie is cleared server-side either way */ }
    navigate('/', { replace: true });
  };

  const paneOpen = mode !== 'view' || selected !== null;

  return (
    <div className="app-shell">
      <header className="topbar topbar-app">
        <Logo to="/dashboard" />
        {user && (
          <div className="user">
            {user.avatar_url && <img src={user.avatar_url} alt="" width="28" height="28" />}
            <span>{user.login}</span>
            <button type="button" className="button button-small button-quiet" onClick={signOut}>Sign out</button>
          </div>
        )}
      </header>

      <div className={`dashboard${paneOpen ? ' pane-open' : ''}`}>
        <section className="list-pane" aria-label="Your capsules">
          <div className="list-head">
            <h1>Your capsules</h1>
            {status === 'ready' && <span className="count">{capsules.length}</span>}
            <button type="button" className="button button-primary" onClick={openCreate} disabled={status !== 'ready'}>
              New capsule
            </button>
          </div>

          {status === 'loading' && (
            <div className="list-state" aria-busy="true">
              <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
              <p className="muted">Loading your capsules. A sleeping server can take up to a minute to wake.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="list-state">
              <p className="notice notice-error" role="alert">{loadError}</p>
              <button type="button" className="button button-quiet" onClick={load}>Try again</button>
            </div>
          )}

          {status === 'ready' && capsules.length === 0 && (
            <div className="list-state empty">
              <h2>No capsules yet</h2>
              <p>Save a prompt that worked, or one you want to improve. It will show up here.</p>
              <button type="button" className="button button-primary" onClick={openCreate}>Save your first prompt</button>
            </div>
          )}

          {status === 'ready' && capsules.length > 0 && groups.map(([project, items]) => (
            <div className="project-group" key={project}>
              <h2 className="project-name">{project}</h2>
              <ul>
                {items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`capsule-row${c.id === selectedId && mode !== 'create' ? ' is-selected' : ''}`}
                      onClick={() => openCapsule(c.id)}
                      aria-current={c.id === selectedId ? 'true' : undefined}
                    >
                      <span className="row-title">{c.prompt_title}</span>
                      <VersionPill version={c.prompt_version} />
                      <span className="row-meta">
                        {[c.category, c.usefulness].filter(Boolean).join(', ') || 'No category'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="detail-pane" aria-live="polite">
          {paneOpen && (
            <button type="button" className="button button-small button-quiet back-link" onClick={closePane}>
              Back to list
            </button>
          )}
          {actionError && <p className="notice notice-error" role="alert">{actionError}</p>}

          {mode === 'create' && (
            <CapsuleForm key="create" projects={projects} saving={saving} serverErrors={serverErrors} onSave={save} onCancel={() => setMode('view')} />
          )}
          {mode === 'edit' && selected && (
            <CapsuleForm key={`edit-${selected.id}`} capsule={selected} projects={projects} saving={saving} serverErrors={serverErrors} onSave={save} onCancel={() => setMode('view')} />
          )}
          {mode === 'view' && selected && (
            <CapsuleDetail key={selected.id} capsule={selected} deleting={deleting} onEdit={() => setMode('edit')} onDelete={remove} />
          )}
          {!paneOpen && status === 'ready' && capsules.length > 0 && (
            <p className="pane-hint">Choose a capsule to see it, or add a new one.</p>
          )}
        </section>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
