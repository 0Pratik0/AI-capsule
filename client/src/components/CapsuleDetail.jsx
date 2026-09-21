import { useState } from 'react';
import VersionPill from './VersionPill.jsx';

// SQLite CURRENT_TIMESTAMP is UTC in the form "YYYY-MM-DD HH:MM:SS".
function formatCreated(value) {
  if (!value) return 'Unknown';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CapsuleDetail({ capsule, deleting, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(capsule.prompt_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="capsule-detail">
      <header className="detail-head">
        <p className="detail-project">{capsule.project_name}</p>
        <h2>{capsule.prompt_title}</h2>
        <VersionPill version={capsule.prompt_version} />
      </header>

      <dl className="facts">
        <div><dt>Category</dt><dd>{capsule.category || 'Not set'}</dd></div>
        <div><dt>Usefulness</dt><dd>{capsule.usefulness || 'Not rated'}</dd></div>
        <div><dt>Checked</dt><dd>{capsule.reviewed ? 'Yes' : 'No'}</dd></div>
        <div><dt>Improved</dt><dd>{capsule.improved ? 'Yes' : 'No'}</dd></div>
        <div><dt>Saved</dt><dd>{formatCreated(capsule.created_at)}</dd></div>
      </dl>

      <section className="detail-block">
        <div className="block-head">
          <h3>Prompt</h3>
          <button type="button" className="button button-small button-quiet" onClick={copy}>
            {copied ? 'Copied' : 'Copy prompt'}
          </button>
        </div>
        <pre className="prompt-text prompt-block">{capsule.prompt_text}</pre>
      </section>

      <section className="detail-block">
        <h3>What the AI gave back</h3>
        <p>{capsule.response_summary || <span className="muted">No summary yet.</span>}</p>
      </section>

      <section className="detail-block">
        <h3>Notes</h3>
        <p>{capsule.notes || <span className="muted">No notes yet.</span>}</p>
      </section>

      {capsule.screenshot_url && (
        <section className="detail-block">
          <h3>Screenshot</h3>
          <a href={capsule.screenshot_url} target="_blank" rel="noopener noreferrer" className="break">
            {capsule.screenshot_url}
          </a>
        </section>
      )}

      <footer className="detail-actions">
        {confirming ? (
          <div className="confirm" role="alertdialog" aria-labelledby="confirm-text">
            <p id="confirm-text">Delete this capsule? This cannot be undone.</p>
            <button type="button" className="button button-danger" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete capsule'}
            </button>
            <button type="button" className="button button-quiet" onClick={() => setConfirming(false)} disabled={deleting}>
              Keep it
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="button button-primary" onClick={onEdit}>Edit</button>
            <button type="button" className="button button-quiet button-danger-text" onClick={() => setConfirming(true)}>Delete</button>
          </>
        )}
      </footer>
    </article>
  );
}
