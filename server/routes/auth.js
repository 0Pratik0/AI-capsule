import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

// GitHub OAuth web application flow, followed by Express issuing its own JWT.
//
// 1. /auth/github           redirects the browser to GitHub with a random state value.
// 2. GitHub redirects back  to /auth/github/callback with ?code and ?state.
// 3. The callback checks the state, swaps the code for a GitHub access token,
//    and reads the GitHub user profile.
// 4. Express signs its OWN application JWT (sub = GitHub user id) and stores it
//    in a Secure, HttpOnly cookie named "token". The GitHub access token is
//    used once and then discarded; it is never sent to the browser.

export const TOKEN_COOKIE = 'token';
const STATE_COOKIE = 'oauth_state';

// Secure + HttpOnly on every auth cookie. SameSite=Lax lets the cookie be sent
// on the top-level redirect back from GitHub while still blocking it on
// cross-site POST, PUT and DELETE requests. Browsers accept Secure cookies on
// http://localhost, so these options are the same locally and in the cloud.
const baseCookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

export function tokenCookieOptions(maxAgeMs) {
  return { ...baseCookieOptions, maxAge: maxAgeMs };
}

export function createAuthRouter(config, { fetchImpl = fetch } = {}) {
  const router = Router();

  router.get('/github', (req, res) => {
    // The state value protects the callback against login CSRF: the callback
    // only continues if GitHub returns the same value we stored in the cookie.
    const state = crypto.randomBytes(24).toString('hex');
    res.cookie(STATE_COOKIE, state, { ...baseCookieOptions, maxAge: 10 * 60 * 1000 });

    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: config.githubCallbackUrl,
      scope: 'read:user',
      state,
      allow_signup: 'true',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  router.get('/github/callback', async (req, res) => {
    const failTo = (reason) => res.redirect(`${config.clientUrl}/login?error=${reason}`);
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, baseCookieOptions);

    if (error) {
      return failTo('denied');
    }
    if (typeof code !== 'string' || typeof state !== 'string' || !expectedState || state !== expectedState) {
      return failTo('state');
    }

    try {
      const tokenResponse = await fetchImpl('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          code,
          redirect_uri: config.githubCallbackUrl,
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        return failTo('github');
      }

      const userResponse = await fetchImpl('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'ai-capsule',
        },
      });
      const githubUser = await userResponse.json();
      if (!userResponse.ok || githubUser.id === undefined) {
        return failTo('github');
      }

      const appToken = jwt.sign(
        { login: githubUser.login, avatar_url: githubUser.avatar_url },
        config.jwtSecret,
        { subject: String(githubUser.id), expiresIn: config.jwtExpiresIn, algorithm: 'HS256' }
      );
      const { exp } = jwt.decode(appToken);
      res.cookie(TOKEN_COOKIE, appToken, tokenCookieOptions(exp * 1000 - Date.now()));
      return res.redirect(`${config.clientUrl}/dashboard`);
    } catch (err) {
      console.error('GitHub OAuth callback failed:', err.message);
      return failTo('github');
    }
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(TOKEN_COOKIE, baseCookieOptions);
    res.status(204).end();
  });

  return router;
}
