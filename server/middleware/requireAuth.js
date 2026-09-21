import jwt from 'jsonwebtoken';

// JWT authentication middleware. Every /api/capsules route goes through this.
//
// It reads the application JWT from the HttpOnly cookie named "token" and
// verifies its signature and expiry with JWT_SECRET. Only a token this server
// signed is accepted, so a made-up cookie such as token=fake-token-123 fails.
export function createRequireAuth(jwtSecret) {
  return function requireAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || payload.sub === '') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // The user's identity comes only from the verified token, never from the
      // request body, query string or any header the browser controls.
      req.user = { id: payload.sub, login: payload.login, avatarUrl: payload.avatar_url };
      return next();
    } catch {
      // Covers a bad signature, a malformed token and an expired token.
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
