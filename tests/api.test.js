// Automated checks for the security and CRUD rules in the assignment.
// Run with: npm test
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { openDatabase } from '../server/db.js';
import { createApp } from '../server/app.js';

const config = {
  port: 0,
  jwtSecret: 'test-secret-that-is-at-least-32-characters-long',
  jwtExpiresIn: '1h',
  githubClientId: 'test-client-id',
  githubClientSecret: 'test-client-secret',
  githubCallbackUrl: 'http://localhost:3000/auth/github/callback',
  clientUrl: '',
  dbPath: ':memory:',
};

// Fake GitHub so the OAuth callback can be tested without the internet.
async function fakeGithubFetch(url) {
  if (url.startsWith('https://github.com/login/oauth/access_token')) {
    return { ok: true, json: async () => ({ access_token: 'gho_fake' }) };
  }
  return { ok: true, json: async () => ({ id: 555, login: 'octocat', avatar_url: 'https://example.com/a.png' }) };
}

const app = createApp(config, openDatabase(':memory:'), { fetchImpl: fakeGithubFetch });
const cookieFor = (userId) => `token=${jwt.sign({ login: `user${userId}` }, config.jwtSecret, { subject: userId, expiresIn: '1h' })}`;
const alice = cookieFor('1001');
const bob = cookieFor('2002');

const validCapsule = {
  project_name: 'SmartFarm Irrigation',
  prompt_title: 'Debug cloud deployment',
  prompt_version: 'v1',
  prompt_text: 'Why does my Node server fail?',
  response_summary: 'Check start command',
  category: 'Coding',
  usefulness: 'Good',
  reviewed: true,
  improved: false,
  screenshot_url: 'https://example.com/shot.png',
  notes: 'Tested and worked',
};

describe('public routes', () => {
  test('GET /api/health returns { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });
});

describe('JWT protection', () => {
  const routes = [
    ['get', '/api/capsules'],
    ['post', '/api/capsules'],
    ['put', '/api/capsules/1'],
    ['delete', '/api/capsules/1'],
  ];

  for (const [method, path] of routes) {
    test(`${method.toUpperCase()} ${path} with no token returns 401`, async () => {
      const res = await request(app)[method](path).send(validCapsule);
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, { error: 'Unauthorized' });
    });

    test(`${method.toUpperCase()} ${path} with token=fake-token-123 returns 401`, async () => {
      const res = await request(app)[method](path).set('Cookie', 'token=fake-token-123').send(validCapsule);
      assert.equal(res.status, 401);
    });
  }

  test('a token signed with a different secret is rejected', async () => {
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough-xx', { subject: '1001' });
    const res = await request(app).get('/api/capsules').set('Cookie', `token=${forged}`);
    assert.equal(res.status, 401);
  });

  test('an expired token is rejected', async () => {
    const expired = jwt.sign({}, config.jwtSecret, { subject: '1001', expiresIn: -10 });
    const res = await request(app).get('/api/capsules').set('Cookie', `token=${expired}`);
    assert.equal(res.status, 401);
  });

  test('a token with alg "none" is rejected', async () => {
    const unsigned = jwt.sign({}, null, { subject: '1001', algorithm: 'none' });
    const res = await request(app).get('/api/capsules').set('Cookie', `token=${unsigned}`);
    assert.equal(res.status, 401);
  });

  test('the token in an Authorization header is ignored (cookie only)', async () => {
    const token = alice.replace('token=', '');
    const res = await request(app).get('/api/capsules').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  });
});

describe('CRUD and ownership', () => {
  let aliceId;

  before(async () => {
    const res = await request(app).post('/api/capsules').set('Cookie', alice).send(validCapsule);
    aliceId = res.body.id;
  });

  test('CREATE returns 201 with the saved record', async () => {
    const res = await request(app).post('/api/capsules').set('Cookie', alice).send({ ...validCapsule, prompt_version: 'v2' });
    assert.equal(res.status, 201);
    assert.equal(res.body.prompt_version, 'v2');
    assert.equal(res.body.reviewed, true);
    assert.ok(res.body.created_at);
  });

  test('CREATE ignores a user_id sent by the browser', async () => {
    const res = await request(app).post('/api/capsules').set('Cookie', alice).send({ ...validCapsule, user_id: '2002' });
    assert.equal(res.status, 201);
    const bobList = await request(app).get('/api/capsules').set('Cookie', bob);
    assert.equal(bobList.body.length, 0, 'the record must belong to alice, not bob');
  });

  test('READ returns only the signed-in user\'s records', async () => {
    await request(app).post('/api/capsules').set('Cookie', bob).send({ ...validCapsule, prompt_title: 'Bob only' });
    const aliceList = await request(app).get('/api/capsules').set('Cookie', alice);
    const bobList = await request(app).get('/api/capsules').set('Cookie', bob);
    assert.equal(aliceList.status, 200);
    assert.ok(aliceList.body.every((c) => c.prompt_title !== 'Bob only'));
    assert.equal(bobList.body.length, 1);
    assert.equal(bobList.body[0].prompt_title, 'Bob only');
  });

  test('UPDATE changes the owner\'s record', async () => {
    const res = await request(app).put(`/api/capsules/${aliceId}`).set('Cookie', alice).send({ ...validCapsule, prompt_version: 'v3', improved: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.prompt_version, 'v3');
    assert.equal(res.body.improved, true);
  });

  test('UPDATE of another user\'s record returns 404 and changes nothing', async () => {
    const res = await request(app).put(`/api/capsules/${aliceId}`).set('Cookie', bob).send({ ...validCapsule, prompt_title: 'Hijacked' });
    assert.equal(res.status, 404);
    const list = await request(app).get('/api/capsules').set('Cookie', alice);
    assert.ok(list.body.every((c) => c.prompt_title !== 'Hijacked'));
  });

  test('DELETE of another user\'s record returns 404 and keeps it', async () => {
    const res = await request(app).delete(`/api/capsules/${aliceId}`).set('Cookie', bob);
    assert.equal(res.status, 404);
    const list = await request(app).get('/api/capsules').set('Cookie', alice);
    assert.ok(list.body.some((c) => c.id === aliceId));
  });

  test('DELETE removes the owner\'s record', async () => {
    const res = await request(app).delete(`/api/capsules/${aliceId}`).set('Cookie', alice);
    assert.equal(res.status, 204);
    const again = await request(app).delete(`/api/capsules/${aliceId}`).set('Cookie', alice);
    assert.equal(again.status, 404);
  });

  test('UPDATE and DELETE of a missing id return 404', async () => {
    assert.equal((await request(app).put('/api/capsules/999999').set('Cookie', alice).send(validCapsule)).status, 404);
    assert.equal((await request(app).delete('/api/capsules/999999').set('Cookie', alice)).status, 404);
  });

  test('a malformed id returns 400', async () => {
    for (const bad of ['abc', '0', '-1', '1.5', '01']) {
      const res = await request(app).delete(`/api/capsules/${bad}`).set('Cookie', alice);
      assert.equal(res.status, 400, `id "${bad}" should be rejected`);
    }
  });
});

describe('request validation', () => {
  const post = (body) => request(app).post('/api/capsules').set('Cookie', alice).send(body);

  test('missing required fields are listed', async () => {
    const res = await post({});
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ['project_name', 'prompt_text', 'prompt_title']);
  });

  test('whitespace-only required text is rejected', async () => {
    const res = await post({ ...validCapsule, prompt_title: '   ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.details.prompt_title, 'Required');
  });

  test('reviewed and improved must be JSON booleans, not strings or numbers', async () => {
    const res = await post({ ...validCapsule, reviewed: 'true', improved: 1 });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.reviewed);
    assert.ok(res.body.details.improved);
  });

  test('text fields must be strings', async () => {
    const res = await post({ ...validCapsule, prompt_text: 42, notes: ['x'] });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.prompt_text);
    assert.ok(res.body.details.notes);
  });

  test('category and usefulness matching is case-sensitive', async () => {
    const res = await post({ ...validCapsule, category: 'coding', usefulness: 'good' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.category);
    assert.ok(res.body.details.usefulness);
  });

  test('screenshot_url must be an http(s) URL', async () => {
    for (const bad of ['not a url', 'javascript:alert(1)', 'ftp://example.com/a.png']) {
      const res = await post({ ...validCapsule, screenshot_url: bad });
      assert.equal(res.status, 400, `"${bad}" should be rejected`);
    }
  });

  test('over-length text is rejected', async () => {
    const res = await post({ ...validCapsule, prompt_title: 'x'.repeat(121) });
    assert.equal(res.status, 400);
  });

  test('malformed JSON returns a JSON 400', async () => {
    const res = await request(app).post('/api/capsules').set('Cookie', alice).set('Content-Type', 'application/json').send('{"bad json');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Request body is not valid JSON');
  });

  test('a JSON array body is rejected', async () => {
    const res = await post([validCapsule]);
    assert.equal(res.status, 400);
  });
});

describe('OAuth login', () => {
  test('/auth/github redirects to GitHub with a state value', async () => {
    const res = await request(app).get('/auth/github');
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    assert.match(res.headers.location, /state=[a-f0-9]{48}/);
  });

  test('callback with a mismatched state is refused', async () => {
    const res = await request(app).get('/auth/github/callback?code=abc&state=wrong').set('Cookie', 'oauth_state=right');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/login?error=state');
    assert.ok(!(res.headers['set-cookie'] || []).some((c) => c.startsWith('token=ey')));
  });

  test('successful callback issues an HttpOnly, Secure app JWT cookie named token', async () => {
    const res = await request(app).get('/auth/github/callback?code=abc&state=s1').set('Cookie', 'oauth_state=s1');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/dashboard');
    const tokenCookie = res.headers['set-cookie'].find((c) => c.startsWith('token='));
    assert.ok(tokenCookie, 'token cookie must be set');
    assert.match(tokenCookie, /HttpOnly/);
    assert.match(tokenCookie, /Secure/);
    const value = tokenCookie.split(';')[0].slice('token='.length);
    const payload = jwt.verify(value, config.jwtSecret);
    assert.equal(payload.sub, '555', 'sub must be the GitHub user id');
    assert.ok(!value.includes('gho_fake'), 'the GitHub access token must not be in the app JWT');
  });

  test('/dashboard without a token redirects to /login', async () => {
    const res = await request(app).get('/dashboard');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/login');
  });
});
