import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="3" y="10" width="26" height="12" rx="6" fill="var(--amber)" />
        <path d="M16 10H9a6 6 0 0 0 0 12h7z" fill="var(--green)" />
      </svg>
      <span>AI Capsule</span>
    </Link>
  );
}
