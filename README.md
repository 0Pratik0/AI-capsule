# AI Capsule

A private library for saving and improving AI prompts. Built with React, Node.js + Express and SQLite, with GitHub OAuth sign-in and a JWT stored in an HttpOnly cookie.

CSE3CWA / CSE5006 Assignment 3, Semester 2 2026.

> **TODO before submission:** replace every line marked TODO with your own details and results.

## Deployed application

| | |
|---|---|
| Public URL | TODO: https://YOUR-APP.onrender.com |
| Cloud platform | Render (free web service) |
| Health check | TODO: https://YOUR-APP.onrender.com/api/health |

The free Render service sleeps when idle. The first request after a break can take up to about a minute while it starts.

## Run it locally

Requirements: Node.js 22 or newer.

```bash
npm install                 # installs the Express server dependencies
cp .env.example .env        # then fill in the values (see Environment variables)
npm run build               # installs the React dependencies and builds React into client/dist
npm run dev:server          # starts Express on http://localhost:3000 and loads .env
```

Open http://localhost:3000. Express serves the built React app and the API from the same address.

For live-reloading React while you work, run the two parts separately:

```bash
npm run dev:server          # terminal 1: Express on :3000 (set CLIENT_URL=http://localhost:5173 in .env)
npm run dev:client          # terminal 2: Vite on :5173, forwards /api and /auth to :3000
```

Automated tests (35 checks for the 401 rules, validation, ownership and the OAuth cookie):

```bash
npm test
```

## Deploying to Render

1. Push the repository to GitHub (the `.gitignore` keeps out `node_modules`, `client/dist`, `.env` and the database file).
2. On Render, create a **Web Service** from the repository.
3. Runtime: Node. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Add the environment variables listed below in the service's **Environment** tab.
5. Create a GitHub OAuth App for production with homepage `https://YOUR-APP.onrender.com` and callback URL `https://YOUR-APP.onrender.com/auth/github/callback`, and put its client ID and secret into Render.

## Project structure

```
server/
  index.js                 starts the server
  app.js                   Express setup, routes, serves the React build
  config.js                reads environment variables, stops startup if one is missing
  db.js                    opens SQLite and creates the capsules table
  validation.js            checks every POST and PUT body before it reaches the database
  middleware/requireAuth.js  JWT verification for protected routes
  routes/auth.js           GitHub OAuth login, callback and logout
  routes/capsules.js       CRUD routes for /api/capsules
client/                    React app (Vite)
  src/pages/               Landing, Login, Dashboard
  src/components/          capsule form, capsule detail, version label, logo
  src/api.js               every call from React to Express
tests/api.test.js          automated API tests
```

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page explaining AI Capsule |
| `/login` | Public | Starts GitHub OAuth sign-in |
| `/dashboard` | Protected | The signed-in user's capsules. Express redirects to `/login` if there is no valid token |
| `GET /api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/capsules` | Protected | List the signed-in user's capsules |
| `POST /api/capsules` | Protected | Create a capsule owned by the signed-in user |
| `PUT /api/capsules/:id` | Protected | Replace one of the signed-in user's capsules |
| `DELETE /api/capsules/:id` | Protected | Delete one of the signed-in user's capsules |
| `GET /api/me` | Protected | The signed-in user's GitHub login and avatar, for the header |
| `GET /auth/github` | Public | Redirects to GitHub to sign in |
| `GET /auth/github/callback` | Public | GitHub returns here; Express issues the app JWT |
| `POST /auth/logout` | Public | Clears the token cookie |

### Responses

| Situation | Status | Body |
|---|---|---|
| No token, fake token, expired token, token signed with another secret | 401 | `{ "error": "Unauthorized" }` |
| Body fails validation | 400 | `{ "error": "Validation failed", "details": { "field": "message" } }` |
| Body is not valid JSON | 400 | `{ "error": "Request body is not valid JSON" }` |
| `:id` is not a positive whole number | 400 | `{ "error": "Capsule id must be a positive whole number" }` |
| Capsule does not exist, or belongs to another user | 404 | `{ "error": "Capsule not found" }` |
| Created | 201 | the new capsule |
| Updated | 200 | the updated capsule |
| Deleted | 204 | no body |

Another user's capsule returns 404 rather than 403 on purpose. A 403 would confirm that the id exists; a 404 tells the caller nothing about other people's records.

### How React talks to Express

In the cloud, Express serves the built React files and the API from one URL, so there is no CORS setup and the cookie is a normal same-site cookie. All API calls are in `client/src/api.js` and use `fetch` with `credentials: 'same-origin'`. React never reads the token (it can't, because the cookie is HttpOnly); the browser attaches it automatically. If any call returns 401, the dashboard sends the user back to `/login`.

## Validation rules

Checked in Express (`server/validation.js`) before any SQL runs. The React form checks the same rules first for quick feedback, but the server is the one that decides.

| Field | Rule |
|---|---|
| `project_name`, `prompt_title` | Required text, trimmed, not blank, 120 characters max |
| `prompt_text` | Required text, trimmed, not blank, 10,000 characters max |
| `prompt_version` | Optional text, 20 characters max |
| `response_summary`, `notes` | Optional text, 5,000 characters max |
| `category` | Optional. One of `Coding`, `Writing`, `Research`, `Debugging`, `Study`, `Other` |
| `usefulness` | Optional. One of `Good`, `Needs Improvement`, `Not Useful` |
| `reviewed`, `improved` | Must be JSON `true` or `false`. The string `"true"` or the number `1` is rejected. Default `false` |
| `screenshot_url` | Optional. Must be a full `http://` or `https://` URL |
| `user_id`, `id`, `created_at` | Never read from the request, even if sent |

Category and usefulness matching is **exact and case-sensitive**: `Coding` is accepted, `coding` is rejected with a 400.

PUT replaces the whole record, so it uses exactly the same rules as POST.

## OAuth and the application JWT

GitHub OAuth is used, as recommended.

1. **Start.** `/login` has a link to `/auth/github`. Express creates a random `state` value, stores it in a short-lived HttpOnly cookie, and redirects the browser to GitHub.
2. **Callback.** GitHub sends the browser back to `/auth/github/callback?code=...&state=...`. Express checks that `state` matches the cookie (this stops login CSRF), then swaps the `code` for a GitHub access token and reads the user's GitHub profile.
3. **Issue.** Express signs its **own** JWT with `JWT_SECRET` using HS256. The JWT's `sub` is the GitHub user id, and it expires after `JWT_EXPIRES_IN` (2 hours by default). The GitHub access token is used once and thrown away; it never reaches the browser and is not inside the app JWT.
4. **Store.** The JWT is set as a cookie named `token` with `HttpOnly`, `Secure`, `SameSite=Lax` and a max age matching the JWT expiry. It is never put in localStorage or an Authorization header.
5. **Verify.** `server/middleware/requireAuth.js` runs on every `/api/capsules` route (`router.use(requireAuth)` covers GET, POST, PUT and DELETE). It calls `jwt.verify` with the secret and only allows HS256, so a made-up value like `fake-token-123`, a token signed with a different secret, an expired token or an unsigned `alg: none` token all get 401.

`SameSite=Lax` is needed because the cookie is set during a redirect that started on github.com. `Strict` would drop it on that first navigation. `Lax` still stops the cookie being sent on cross-site POST, PUT and DELETE requests.

## Environment variables

Names only. Real values live in `.env` locally (git-ignored) and in Render's Environment settings in the cloud.

| Name | Purpose |
|---|---|
| `JWT_SECRET` | Signs and verifies the app JWT. At least 32 characters; the server refuses to start otherwise |
| `JWT_EXPIRES_IN` | Login lifetime, e.g. `2h` |
| `GITHUB_CLIENT_ID` | From the GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From the GitHub OAuth App |
| `GITHUB_CALLBACK_URL` | Must match the OAuth App's callback URL exactly |
| `CLIENT_URL` | Local development with Vite only. Empty in the cloud |
| `DB_PATH` | SQLite file path. Default `./data/capsules.db` |
| `PORT` | Set by Render automatically. Default 3000 locally |

If `JWT_SECRET` or any GitHub variable is missing, the server stops at startup with a message naming what is missing, rather than starting and failing on the first login.

## Database and storage

- SQLite through `better-sqlite3`. `server/db.js` creates the `data/` folder and runs the `CREATE TABLE IF NOT EXISTS capsules (...)` statement from the assignment specification, unchanged, every time the server starts. It also adds an index on `user_id`, since every query filters on it.
- **Ownership:** `user_id` stores the GitHub user id taken from the verified JWT's `sub`. Every SELECT, UPDATE and DELETE includes `WHERE ... AND user_id = ?`, so a query can never touch another user's row.
- SQLite has no boolean type, so `reviewed` and `improved` are stored as 0 and 1 and converted back to `true`/`false` before being sent to React.
- **Persistence on Render: ephemeral.** Render's free web service has a temporary filesystem. The SQLite file is lost whenever the service restarts, sleeps and wakes, or is redeployed. Records survive while the service stays running. Render PostgreSQL or a paid persistent disk would fix this; neither was needed for the assignment.

## Required cURL checks

Run against the deployed URL.

```bash
# Test 1: no authentication
curl -i https://YOUR-APP.onrender.com/api/capsules

# Test 2: fake / invalid JWT
curl -i -H "Cookie: token=fake-token-123" https://YOUR-APP.onrender.com/api/capsules
```

Results obtained:

```
TODO: paste the first lines of the real output for each test, e.g.
HTTP/2 401
...
{"error":"Unauthorized"}
```

## Known limitation

TODO: pick one and say it in your own words. Suggestions based on how this build actually behaves:

- Data on Render's free tier is ephemeral (see Database and storage).
- Signing out clears the cookie, but a JWT copied before sign-out stays valid until it expires, because the server does not keep a list of revoked tokens.
- The first visit after the service has been idle can take up to a minute while Render wakes it up.

## AI-assisted development

TODO: write this section yourself. It has to reflect what you actually did. The marker wants:

- **Tools used:** e.g. Claude (Anthropic).
- **One problem found and corrected in AI-generated code or configuration.** Describe a real one you hit.
- **How OAuth, JWT verification and the protected API were verified:** e.g. the two cURL tests against the deployed URL, a real GitHub login, and `npm test` (which covers no token, fake token, wrong-secret token, expired token, `alg: none`, and the cookie flags set by the callback).
- **How CRUD and ownership were verified:** e.g. `npm test` signs tokens for two different users and checks that user B gets 404 when trying to update or delete user A's record, and that a `user_id` sent in the body is ignored. Also tested by hand in the deployed app.
- **One decision you made and can explain:** e.g. serving React and Express from one Render service so the cookie is same-site and no CORS is needed, or returning 404 instead of 403 for another user's record.
