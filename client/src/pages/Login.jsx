import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { api } from '../api.js';

const ERROR_MESSAGES = {
  denied: 'GitHub sign-in was cancelled. Try again when you are ready.',
  state: 'The sign-in link expired or did not match. Start sign-in again.',
  github: 'GitHub did not complete the sign-in. Try again in a moment.',
  expired: 'Your session has ended. Sign in again to see your capsules.',
};

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);
  const error = ERROR_MESSAGES[params.get('error')];

  // Someone who is already signed in goes straight to their dashboard.
  useEffect(() => {
    let active = true;
    api.me().then(() => active && navigate('/dashboard', { replace: true })).catch(() => {});
    return () => { active = false; };
  }, [navigate]);

  return (
    <div className="login-page">
      <header className="topbar">
        <Logo />
      </header>
      <main className="login-panel">
        <h1>Sign in to AI Capsule</h1>
        <p>
          AI Capsule uses your GitHub account to know which prompts are yours. It only asks
          GitHub for your public profile.
        </p>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {/* A normal link, not fetch: the browser must leave the app and visit GitHub. */}
        <a
          href="/auth/github"
          className="button button-primary button-wide"
          onClick={() => setRedirecting(true)}
          aria-busy={redirecting}
        >
          {redirecting ? 'Opening GitHub…' : 'Continue with GitHub'}
        </a>
      </main>
    </div>
  );
}
