// The two-tone capsule used for a prompt's version label.
export default function VersionPill({ version }) {
  return (
    <span className="pill" aria-label={`Version ${version || 'not set'}`}>
      <span className="pill-left" aria-hidden="true" />
      <span className="pill-right">{version || 'n/a'}</span>
    </span>
  );
}
