// All calls to the Express API go through here.
//
// The JWT lives in an HttpOnly cookie, so JavaScript never reads or stores it.
// The browser attaches the cookie automatically because the API is on the
// same origin as the React app ("credentials: same-origin").

export class AuthError extends Error {}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  if (response.status === 401) {
    throw new AuthError('Your session has ended. Sign in again.');
  }
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data?.details);
  }
  return data;
}

export const api = {
  me: () => request('/api/me'),
  listCapsules: () => request('/api/capsules'),
  createCapsule: (capsule) => request('/api/capsules', { method: 'POST', body: capsule }),
  updateCapsule: (id, capsule) => request(`/api/capsules/${id}`, { method: 'PUT', body: capsule }),
  deleteCapsule: (id) => request(`/api/capsules/${id}`, { method: 'DELETE' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};
