// Request validation for POST and PUT /api/capsules.
//
// Lesson from Assignment 2: the database must not be the first line of defence.
// Every field is checked here, in Express, before any SQL runs. Bad input gets a
// 400 with a message for each field that failed, so the frontend can show it.

export const CATEGORIES = ['Coding', 'Writing', 'Research', 'Debugging', 'Study', 'Other'];
export const USEFULNESS = ['Good', 'Needs Improvement', 'Not Useful'];

const LIMITS = {
  project_name: 120,
  prompt_title: 120,
  prompt_version: 20,
  prompt_text: 10000,
  response_summary: 5000,
  screenshot_url: 2048,
  notes: 5000,
};

// Fields the client is allowed to send. Anything else (including user_id, id
// and created_at) is never read, so the browser cannot choose the owner.
const REQUIRED_TEXT = ['project_name', 'prompt_title', 'prompt_text'];
const OPTIONAL_TEXT = ['prompt_version', 'response_summary', 'notes'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkLength(field, value, errors) {
  if (value.length > LIMITS[field]) {
    errors[field] = `Must be ${LIMITS[field]} characters or fewer`;
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates a capsule body. Used for both CREATE and UPDATE: PUT replaces the
 * whole record, so it has the same rules as POST.
 * Returns { value } on success or { errors } on failure.
 */
export function validateCapsule(body) {
  if (!isPlainObject(body)) {
    return { errors: { body: 'Request body must be a JSON object' } };
  }

  const errors = {};
  const value = {};

  for (const field of REQUIRED_TEXT) {
    const raw = body[field];
    if (typeof raw !== 'string') {
      errors[field] = raw === undefined || raw === null ? 'Required' : 'Must be text';
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
      errors[field] = 'Required';
      continue;
    }
    checkLength(field, trimmed, errors);
    value[field] = trimmed;
  }

  for (const field of OPTIONAL_TEXT) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') {
      value[field] = null;
      continue;
    }
    if (typeof raw !== 'string') {
      errors[field] = 'Must be text';
      continue;
    }
    const trimmed = raw.trim();
    checkLength(field, trimmed, errors);
    value[field] = trimmed === '' ? null : trimmed;
  }

  // Category and usefulness come from fixed lists. Matching is exact and
  // case-sensitive ("Coding" is accepted, "coding" is rejected).
  for (const [field, allowed] of [['category', CATEGORIES], ['usefulness', USEFULNESS]]) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') {
      value[field] = null;
    } else if (typeof raw !== 'string' || !allowed.includes(raw)) {
      errors[field] = `Must be one of: ${allowed.join(', ')}`;
    } else {
      value[field] = raw;
    }
  }

  // reviewed and improved must be real JSON booleans. The string "true" or the
  // number 1 is rejected rather than silently coerced.
  for (const field of ['reviewed', 'improved']) {
    const raw = body[field];
    if (raw === undefined) {
      value[field] = false;
    } else if (typeof raw !== 'boolean') {
      errors[field] = 'Must be true or false';
    } else {
      value[field] = raw;
    }
  }

  const url = body.screenshot_url;
  if (url === undefined || url === null || url === '') {
    value.screenshot_url = null;
  } else if (typeof url !== 'string' || !isHttpUrl(url.trim())) {
    errors.screenshot_url = 'Must be a full http or https URL';
  } else {
    checkLength('screenshot_url', url.trim(), errors);
    value.screenshot_url = url.trim();
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  return { value };
}

/**
 * Validates the :id route parameter. Only positive whole numbers are valid.
 * Returns the number, or null if the id is malformed.
 */
export function parseCapsuleId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw)) {
    return null;
  }
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
