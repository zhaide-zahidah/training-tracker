const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { search, category, status } = req.query;
  let where = [];
  let params = [];

  if (search) { where.push(`name LIKE ?`); params.push(`%${search}%`); }
  if (category) { where.push(`category = ?`); params.push(category); }
  if (status) { where.push(`status = ?`); params.push(status); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT tp.*, COUNT(DISTINCT ts.id) as schedule_count FROM training_programs tp LEFT JOIN training_schedules ts ON ts.training_id = tp.id ${whereClause} GROUP BY tp.id ORDER BY tp.created_at DESC`).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const prog = db.prepare(`SELECT * FROM training_programs WHERE id = ?`).get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Not found' });
  res.json(prog);
});

router.post('/', requireAdmin, (req, res) => {
  const db = getDb();
  const { name, category, duration_hours, organizer, description, status } = req.body;
  if (!name || !category || !duration_hours || !organizer)
    return res.status(400).json({ error: 'Field wajib tidak lengkap' });
  const result = db.prepare(`INSERT INTO training_programs (name,category,duration_hours,organizer,description,status) VALUES (?,?,?,?,?,?)`).run(name, category, duration_hours, organizer, description || null, status || 'Planned');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Program training berhasil ditambahkan' });
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { name, category, duration_hours, organizer, description, status } = req.body;
  db.prepare(`UPDATE training_programs SET name=?,category=?,duration_hours=?,organizer=?,description=?,status=?,updated_at=datetime('now') WHERE id=?`).run(name, category, duration_hours, organizer, description || null, status, req.params.id);
  res.json({ message: 'Program training berhasil diupdate' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM training_programs WHERE id=?`).run(req.params.id);
  res.json({ message: 'Program training berhasil dihapus' });
});

module.exports = router;
