const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { training_id } = req.query;
  let where = training_id ? 'WHERE ts.training_id = ?' : '';
  let params = training_id ? [training_id] : [];
  const rows = db.prepare(`
    SELECT ts.*, tp.name as training_name, tp.category, tp.duration_hours, tp.organizer,
      COUNT(DISTINCT tp2.id) as participant_count
    FROM training_schedules ts
    JOIN training_programs tp ON tp.id = ts.training_id
    LEFT JOIN training_participants tp2 ON tp2.schedule_id = ts.id
    ${where}
    GROUP BY ts.id ORDER BY ts.start_date DESC
  `).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const sched = db.prepare(`
    SELECT ts.*, tp.name as training_name, tp.category, tp.duration_hours, tp.organizer, tp.description
    FROM training_schedules ts
    JOIN training_programs tp ON tp.id = ts.training_id
    WHERE ts.id = ?
  `).get(req.params.id);
  if (!sched) return res.status(404).json({ error: 'Not found' });

  const participants = db.prepare(`
    SELECT tp.*, e.name as employee_name, e.nik, e.department, e.position
    FROM training_participants tp
    JOIN employees e ON e.id = tp.employee_id
    WHERE tp.schedule_id = ?
    ORDER BY e.name
  `).all(req.params.id);

  res.json({ ...sched, participants });
});

router.post('/', requireAdmin, (req, res) => {
  const db = getDb();
  const { training_id, start_date, end_date, location, notes } = req.body;
  if (!training_id || !start_date || !end_date)
    return res.status(400).json({ error: 'Field wajib tidak lengkap' });
  const result = db.prepare(`INSERT INTO training_schedules (training_id,start_date,end_date,location,notes) VALUES (?,?,?,?,?)`).run(training_id, start_date, end_date, location || null, notes || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Jadwal training berhasil dibuat' });
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { training_id, start_date, end_date, location, notes } = req.body;
  db.prepare(`UPDATE training_schedules SET training_id=?,start_date=?,end_date=?,location=?,notes=?,updated_at=datetime('now') WHERE id=?`).run(training_id, start_date, end_date, location || null, notes || null, req.params.id);
  res.json({ message: 'Jadwal training berhasil diupdate' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM training_schedules WHERE id=?`).run(req.params.id);
  res.json({ message: 'Jadwal training berhasil dihapus' });
});

// Participants
router.post('/:id/participants', requireAdmin, (req, res) => {
  const db = getDb();
  const { employee_ids } = req.body;
  if (!employee_ids || !Array.isArray(employee_ids))
    return res.status(400).json({ error: 'employee_ids harus berupa array' });

  const insert = db.prepare(`INSERT OR IGNORE INTO training_participants (schedule_id,employee_id,status) VALUES (?,?,'Registered')`);
  const insertMany = db.transaction((ids) => ids.forEach(id => insert.run(req.params.id, id)));
  insertMany(employee_ids);
  res.json({ message: `${employee_ids.length} peserta berhasil didaftarkan` });
});

router.put('/:id/participants/:participantId', requireAdmin, (req, res) => {
  const db = getDb();
  const { status, score, notes } = req.body;
  db.prepare(`UPDATE training_participants SET status=?,score=?,notes=?,updated_at=datetime('now') WHERE id=?`).run(status, score ?? null, notes || null, req.params.participantId);
  res.json({ message: 'Status peserta berhasil diupdate' });
});

router.delete('/:id/participants/:participantId', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM training_participants WHERE id=?`).run(req.params.participantId);
  res.json({ message: 'Peserta berhasil dihapus' });
});

module.exports = router;
