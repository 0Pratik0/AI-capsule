import { Router } from 'express';
import { toCapsule } from '../db.js';
import { validateCapsule, parseCapsuleId } from '../validation.js';

// CRUD routes for /api/capsules. requireAuth is applied to the whole router,
// so GET, POST, PUT and DELETE are all protected by the same JWT check.
//
// Ownership rule: every query includes "user_id = ?" with the id taken from
// the verified JWT (req.user.id). A record owned by someone else behaves
// exactly like a record that does not exist (404), so one user cannot even
// confirm that another user's record id exists.
export function createCapsulesRouter(db, requireAuth) {
  const router = Router();
  router.use(requireAuth);

  const statements = {
    list: db.prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC, id DESC'),
    getOwned: db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?'),
    insert: db.prepare(`
      INSERT INTO capsules (
        user_id, project_name, prompt_title, prompt_version, prompt_text,
        response_summary, category, usefulness, reviewed, improved,
        screenshot_url, notes
      ) VALUES (
        @user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
        @response_summary, @category, @usefulness, @reviewed, @improved,
        @screenshot_url, @notes
      )`),
    update: db.prepare(`
      UPDATE capsules SET
        project_name = @project_name, prompt_title = @prompt_title,
        prompt_version = @prompt_version, prompt_text = @prompt_text,
        response_summary = @response_summary, category = @category,
        usefulness = @usefulness, reviewed = @reviewed, improved = @improved,
        screenshot_url = @screenshot_url, notes = @notes
      WHERE id = @id AND user_id = @user_id`),
    remove: db.prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?'),
  };

  // SQLite has no boolean type, so true/false are stored as 1/0.
  const toRow = (value, userId) => ({
    ...value,
    reviewed: value.reviewed ? 1 : 0,
    improved: value.improved ? 1 : 0,
    user_id: userId,
  });

  // READ: only the signed-in user's records.
  router.get('/', (req, res) => {
    const rows = statements.list.all(req.user.id);
    res.json(rows.map(toCapsule));
  });

  // CREATE: the owner is always the signed-in user.
  router.post('/', (req, res) => {
    const { value, errors } = validateCapsule(req.body);
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = statements.insert.run(toRow(value, req.user.id));
    const created = statements.getOwned.get(result.lastInsertRowid, req.user.id);
    res.status(201).json(toCapsule(created));
  });

  // UPDATE: replaces the whole record, only if the signed-in user owns it.
  router.put('/:id', (req, res) => {
    const id = parseCapsuleId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Capsule id must be a positive whole number' });
    }
    const { value, errors } = validateCapsule(req.body);
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const result = statements.update.run({ ...toRow(value, req.user.id), id });
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Capsule not found' });
    }
    res.json(toCapsule(statements.getOwned.get(id, req.user.id)));
  });

  // DELETE: removes the record, only if the signed-in user owns it.
  router.delete('/:id', (req, res) => {
    const id = parseCapsuleId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Capsule id must be a positive whole number' });
    }
    const result = statements.remove.run(id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Capsule not found' });
    }
    res.status(204).end();
  });

  return router;
}
