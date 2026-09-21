import { useState } from 'react';
import { CATEGORIES, USEFULNESS, EMPTY_CAPSULE } from '../constants.js';

// Same rules as server/validation.js, checked in the browser first so the user
// gets instant feedback. The server still re-checks everything.
function validate(values) {
  const errors = {};
  for (const field of ['project_name', 'prompt_title', 'prompt_text']) {
    if (!values[field].trim()) errors[field] = 'Required';
  }
  if (values.project_name.length > 120) errors.project_name = 'Must be 120 characters or fewer';
  if (values.prompt_title.length > 120) errors.prompt_title = 'Must be 120 characters or fewer';
  if (values.prompt_version.length > 20) errors.prompt_version = 'Must be 20 characters or fewer';
  if (values.screenshot_url.trim()) {
    try {
      const url = new URL(values.screenshot_url.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.screenshot_url = 'Must be a full http or https URL';
    }
  }
  return errors;
}

function toFormValues(capsule) {
  if (!capsule) return { ...EMPTY_CAPSULE };
  const values = { ...EMPTY_CAPSULE };
  for (const key of Object.keys(EMPTY_CAPSULE)) {
    const v = capsule[key];
    values[key] = typeof EMPTY_CAPSULE[key] === 'boolean' ? Boolean(v) : v ?? '';
  }
  return values;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export default function CapsuleForm({ capsule, projects, saving, serverErrors, onSave, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(capsule));
  const [clientErrors, setClientErrors] = useState({});
  const errors = { ...serverErrors, ...clientErrors };
  const isEdit = Boolean(capsule);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (clientErrors[field]) setClientErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const described = (field) => (errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${field}-error` } : {});

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setClientErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      // Move the user to the first problem instead of leaving it off-screen.
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    onSave(values);
  };

  return (
    <form className="capsule-form" onSubmit={submit} noValidate>
      <h2>{isEdit ? 'Edit capsule' : 'New capsule'}</h2>

      <div className="form-row">
        <Field id="project_name" label="Project" error={errors.project_name}>
          <input id="project_name" list="project-options" value={values.project_name} onChange={set('project_name')} maxLength={120} autoFocus {...described('project_name')} />
          <datalist id="project-options">
            {projects.map((p) => <option key={p} value={p} />)}
          </datalist>
        </Field>
        <Field id="prompt_version" label="Version" error={errors.prompt_version} hint="For example v1, v2">
          <input id="prompt_version" value={values.prompt_version} onChange={set('prompt_version')} maxLength={20} {...described('prompt_version')} />
        </Field>
      </div>

      <Field id="prompt_title" label="Title" error={errors.prompt_title}>
        <input id="prompt_title" value={values.prompt_title} onChange={set('prompt_title')} maxLength={120} {...described('prompt_title')} />
      </Field>

      <Field id="prompt_text" label="Prompt" error={errors.prompt_text}>
        <textarea id="prompt_text" className="mono" rows={5} value={values.prompt_text} onChange={set('prompt_text')} {...described('prompt_text')} />
      </Field>

      <Field id="response_summary" label="What the AI gave back" error={errors.response_summary} hint="A sentence or two is enough">
        <textarea id="response_summary" rows={3} value={values.response_summary} onChange={set('response_summary')} />
      </Field>

      <div className="form-row">
        <Field id="category" label="Category" error={errors.category}>
          <select id="category" value={values.category} onChange={set('category')}>
            <option value="">Not set</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field id="usefulness" label="How useful was it?" error={errors.usefulness}>
          <select id="usefulness" value={values.usefulness} onChange={set('usefulness')}>
            <option value="">Not rated</option>
            {USEFULNESS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      <fieldset className="checks">
        <legend>Follow-up</legend>
        <label className="check">
          <input type="checkbox" checked={values.reviewed} onChange={set('reviewed')} />
          I checked the response
        </label>
        <label className="check">
          <input type="checkbox" checked={values.improved} onChange={set('improved')} />
          The output improved
        </label>
      </fieldset>

      <Field id="screenshot_url" label="Screenshot link" error={errors.screenshot_url} hint="Optional. Paste a full https:// link">
        <input id="screenshot_url" type="url" inputMode="url" value={values.screenshot_url} onChange={set('screenshot_url')} {...described('screenshot_url')} />
      </Field>

      <Field id="notes" label="Notes" error={errors.notes}>
        <textarea id="notes" rows={3} value={values.notes} onChange={set('notes')} />
      </Field>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save capsule'}
        </button>
        <button type="button" className="button button-quiet" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
