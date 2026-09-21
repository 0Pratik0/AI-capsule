// Central place for configuration. Every secret comes from environment
// variables; nothing sensitive is hard-coded or committed.

const REQUIRED = ['JWT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'];

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    // Fail fast: a server that starts without a JWT secret would either crash
    // on the first login or, worse, sign tokens with an empty secret.
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return {
    port: Number(env.PORT) || 3000,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '2h',
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    githubCallbackUrl: env.GITHUB_CALLBACK_URL,
    // Only used in local development, where Vite serves React on another port.
    // In production React and Express share one URL, so this stays empty.
    clientUrl: env.CLIENT_URL || '',
    dbPath: env.DB_PATH || './data/capsules.db',
  };
}
