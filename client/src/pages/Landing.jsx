import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import VersionPill from '../components/VersionPill.jsx';

// One real-looking prompt shown across three versions: the thing AI Capsule
// is for, shown directly instead of described.
const SAMPLE_VERSIONS = [
  {
    version: 'v1',
    text: 'Why does my Node server fail?',
    result: 'Generic checklist. Did not mention the host.',
    usefulness: 'Needs Improvement',
  },
  {
    version: 'v2',
    text: 'My Express app runs locally but crashes on Render with "Cannot find module". Why?',
    result: 'Pointed at devDependencies not installed in production.',
    usefulness: 'Good',
  },
  {
    version: 'v3',
    text: 'Same as v2, plus my package.json and the Render build log. What should the build and start commands be?',
    result: 'Exact commands. Fixed on the first try.',
    usefulness: 'Good',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="topbar">
        <Logo />
        <Link to="/login" className="button button-quiet">Sign in</Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>Keep the prompts that worked.</h1>
            <p className="lede">
              AI Capsule is a private library for the prompts you use with ChatGPT, Copilot,
              Gemini and Claude. Save each prompt with its project, version and what the AI gave
              back, then come back and improve it.
            </p>
            <Link to="/login" className="button button-primary">Sign in with GitHub</Link>
          </div>

          <ol className="evolution" aria-label="Example: one prompt improved over three versions">
            {SAMPLE_VERSIONS.map((v) => (
              <li key={v.version} className="evolution-step">
                <VersionPill version={v.version} />
                <p className="prompt-text">{v.text}</p>
                <p className="evolution-result">
                  {v.result}
                  <span className={`usefulness usefulness-${v.usefulness === 'Good' ? 'good' : 'weak'}`}>
                    {v.usefulness}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="explain">
          <div>
            <h2>What a capsule holds</h2>
            <p>
              The prompt itself, a short summary of the response, the project it belongs to, a
              version like v1 or v2, a category, your rating, whether you checked the answer and
              whether it improved, plus notes and a screenshot link.
            </p>
          </div>
          <div>
            <h2>Only yours</h2>
            <p>
              You sign in with GitHub. Every capsule is tied to your GitHub account, and the server
              only ever returns your own records to you.
            </p>
          </div>
          <div>
            <h2>Edit as you go</h2>
            <p>
              Add a capsule when a prompt works, update it when you find a better version, and
              delete the ones you no longer need.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>AI Capsule, built for CSE3CWA / CSE5006 Assignment 3.</p>
      </footer>
    </div>
  );
}
