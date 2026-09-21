# Requirements checklist

Every requirement in the brief, where it lives in the code, and how it is proven. Tick the Evidence column as each item is confirmed on the **deployed** app.

## A. Full-stack CRUD (35)

| Requirement | Where | Proof | Done |
|---|---|---|---|
| React talks to Express | `client/src/api.js` | Video: dashboard loads records | [ ] |
| CREATE via POST /api/capsules | `server/routes/capsules.js` | Test + video | [ ] |
| READ own records via GET | same | Test + video | [ ] |
| UPDATE via PUT /api/capsules/:id | same | Test + video | [ ] |
| DELETE via DELETE /api/capsules/:id | same | Test + video | [ ] |
| Schema matches spec | `server/db.js` | Code | [x] |

## B. Cloud deployment (25)

| Requirement | Proof | Done |
|---|---|---|
| Public HTTPS URL, not localhost | Video: address bar | [ ] |
| Frontend and API work in cloud | Video | [ ] |
| `/api/health` returns `{"status":"ok"}` | Video | [ ] |
| Cloud settings shown | Video: Render dashboard | [ ] |

## C. OAuth + JWT (15)

| Requirement | Where | Done |
|---|---|---|
| GitHub OAuth works | `server/routes/auth.js` | [ ] |
| Express issues its own JWT (not the GitHub token) | `auth.js` callback, `jwt.sign` | [x] |
| JWT verified server-side | `middleware/requireAuth.js` | [x] |
| Cookie named `token`, HttpOnly, Secure | `auth.js` `baseCookieOptions` | [x] |
| Secrets only in env vars, `.env` git-ignored | `config.js`, `.gitignore` | [x] |

## D. Protected API (15)

| Requirement | Where | Done |
|---|---|---|
| No token: 401 | Test 1, video | [ ] |
| Fake token: 401 | Test 2, video | [ ] |
| All four CRUD routes use the middleware | `router.use(requireAuth)` in `capsules.js` | [x] |
| Owner comes from JWT, queries filter on it | `capsules.js` | [x] |

## E. README, video, config (10)

| Requirement | Done |
|---|---|
| README: URL + platform | [ ] |
| README: install and run commands | [x] |
| README: routes and how React calls Express | [x] |
| README: OAuth provider, JWT issue/store/verify | [x] |
| README: env var names, no values | [x] |
| README: DB setup, ownership, persistence | [x] |
| README: both cURL commands **and real results** | [ ] |
| README: one honest limitation | [ ] |
| README: AI statement, one corrected problem, one decision | [ ] |
| Video 3 to 5 minutes, MP4, audio checked | [ ] |
| Video shows env var names, no secret values | [ ] |

## Lessons carried over from Assignment 2 feedback

| Assignment 2 deduction | What this build does |
|---|---|
| Validation left to database constraints | `server/validation.js` checks types, booleans, lists, URL and lengths before SQL |
| No guard for missing data | 404 for missing or foreign ids, 400 for bad ids and bad JSON, empty/loading/error states in the dashboard |
| Video over 5 minutes | Scripted video, target about 4 minutes 15 seconds |
| A required case not demonstrated | Video script follows Section 13 in order |
| Assumption never stated | Case-sensitive matching and 404-not-403 are stated in the README and should be said in the video |
| Unstyled form states | Loading, empty, error, saving, success and delete confirmation states |
