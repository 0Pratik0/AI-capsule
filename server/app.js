import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { createRequireAuth } from './middleware/requireAuth.js';
import { createCapsulesRouter } from './routes/capsules.js';
import { createAuthRouter } from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');

export function createApp(config, db, options = {}) {
  const app = express();
  const requireAuth = createRequireAuth(config.jwtSecret);

  // Render and Azure put a proxy in front of the app; this makes Express
  // trust the HTTPS information that proxy forwards.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  // Public health check.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Tells the React app who is signed in. Protected by the same middleware.
  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ id: req.user.id, login: req.user.login, avatar_url: req.user.avatarUrl });
  });

  // Protected CRUD API.
  app.use('/api/capsules', createCapsulesRouter(db, requireAuth));

  // Any other /api path is a JSON 404, never the React page.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // OAuth login, callback and logout.
  app.use('/auth', createAuthRouter(config, options));

  // Server-side guard for the dashboard page: without a valid token the
  // browser is redirected to /login before any of the app is served.
  app.get('/dashboard', (req, res, next) => {
    try {
      jwt.verify(req.cookies?.token ?? '', config.jwtSecret, { algorithms: ['HS256'] });
      return next();
    } catch {
      return res.redirect('/login');
    }
  });

  // Serve the built React app from the same URL as the API. One origin means
  // no CORS setup and no cross-site cookie problems.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  // Consistent JSON errors, including malformed JSON bodies.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}
