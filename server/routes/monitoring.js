const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

/* ── Daily Monitoring CRUD ─────────────────────────────────────── */
router.get('/', (req, res) => {
  const db = getDb();
  const { date, program_id, employee_id, week_start, week_end } = req.query;
  let where = [], params = [];

  if (date)        { where.push(`dm.date = ?`);                 params.push(date); }
  if (program_id)  { where.push(`dm.program_id = ?`);           params.push(program_id); }
  if (employee_id) { where.push(`dm.employee_id = ?`);          params.push(employee_id); }
  if (week_start)  { where.push(`dm.date >= ?`);                params.push(week_start); }
  if (week_end)    { where.push(`dm.date <= ?`);                params.push(week_end); }

  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT dm.*, e.name as employee_name, e.department, e.position, e.shift as employee_shift,
      tp.name as program_name
    FROM daily_monitoring dm
    JOIN employees e ON e.id = dm.employee_id
    LEFT JOIN training_programs tp ON tp.id = dm.program_id
    ${wc}
    ORDER BY dm.date DESC, e.name ASC
  `).all(...params);
  res.json(rows);
});

router.get('/dates', (req, res) => {
  const db = getDb();
  const { program_id } = req.query;
  let where = program_id ? 'WHERE program_id = ?' : '';
  let params = program_id ? [program_id] : [];
  const rows = db.prepare(`SELECT DISTINCT date FROM daily_monitoring ${where} ORDER BY date DESC`).all(...params);
  res.json(rows.map(r => r.date));
});

router.get('/summary', (req, res) => {
  const db = getDb();
  const { program_id, week_start, week_end } = req.query;
  let where = [], params = [];
  if (program_id) { where.push(`dm.program_id = ?`); params.push(program_id); }
  if (week_start) { where.push(`dm.date >= ?`);       params.push(week_start); }
  if (week_end)   { where.push(`dm.date <= ?`);       params.push(week_end); }
  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const byEmployee = db.prepare(`
    SELECT e.id, e.name, e.department, e.position,
      COUNT(dm.id) as total_sessions,
      ROUND(AVG(dm.fluency),1) as avg_fluency,
      ROUND(AVG(dm.confidence),1) as avg_confidence,
      ROUND(AVG(dm.pronunciation),1) as avg_pronunciation,
      ROUND(AVG(dm.grammar),1) as avg_grammar,
      ROUND(AVG(dm.accuracy),1) as avg_accuracy,
      SUM(CASE WHEN dm.status='Hadir' THEN 1 ELSE 0 END) as hadir,
      SUM(CASE WHEN dm.status='Absen' THEN 1 ELSE 0 END) as absen
    FROM daily_monitoring dm
    JOIN employees e ON e.id = dm.employee_id
    ${wc}
    GROUP BY e.id ORDER BY e.name
  `).all(...params);

  // Overall stats
  const overall = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      COUNT(DISTINCT employee_id) as total_participants,
      ROUND(AVG(fluency),1) as avg_fluency,
      ROUND(AVG(confidence),1) as avg_confidence,
      ROUND(AVG(accuracy),1) as avg_accuracy
    FROM daily_monitoring dm ${wc}
  `).get(...params);

  // Score over time
  const trend = db.prepare(`
    SELECT dm.date,
      ROUND(AVG(dm.fluency),1) as avg_fluency,
      ROUND(AVG(dm.confidence),1) as avg_confidence,
      ROUND(AVG(dm.pronunciation),1) as avg_pronunciation,
      ROUND(AVG(dm.grammar),1) as avg_grammar,
      ROUND(AVG(dm.accuracy),1) as avg_accuracy,
      COUNT(DISTINCT dm.employee_id) as participants
    FROM daily_monitoring dm ${wc}
    GROUP BY dm.date ORDER BY dm.date
  `).all(...params);

  res.json({ byEmployee, overall, trend });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT dm.*, e.name as employee_name, e.department, e.position,
      tp.name as program_name
    FROM daily_monitoring dm
    JOIN employees e ON e.id = dm.employee_id
    LEFT JOIN training_programs tp ON tp.id = dm.program_id
    WHERE dm.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', requireAdmin, (req, res) => {
  const db = getDb();
  const {
    date, employee_id, program_id, shift, materi, kegiatan,
    fluency, confidence, pronunciation, grammar, accuracy,
    flashcard_category, roleplay_scenario, status, notes
  } = req.body;

  if (!date || !employee_id) return res.status(400).json({ error: 'Tanggal dan pegawai wajib diisi' });

  const result = db.prepare(`
    INSERT INTO daily_monitoring
      (date,employee_id,program_id,shift,materi,kegiatan,fluency,confidence,pronunciation,grammar,accuracy,flashcard_category,roleplay_scenario,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    date, employee_id, program_id || null, shift || null,
    materi || null, kegiatan || null,
    fluency || null, confidence || null, pronunciation || null, grammar || null,
    accuracy || null, flashcard_category || null, roleplay_scenario || null,
    status || 'Hadir', notes || null
  );
  res.status(201).json({ id: result.lastInsertRowid, message: 'Data monitoring ditambahkan' });
});

router.post('/batch', requireAdmin, (req, res) => {
  const db = getDb();
  const { records } = req.body;
  if (!records || !Array.isArray(records)) return res.status(400).json({ error: 'records harus berupa array' });

  const insert = db.prepare(`
    INSERT OR REPLACE INTO daily_monitoring
      (date,employee_id,program_id,shift,materi,kegiatan,fluency,confidence,pronunciation,grammar,accuracy,flashcard_category,roleplay_scenario,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const insertMany = db.transaction(rows => {
    rows.forEach(r => insert.run(
      r.date, r.employee_id, r.program_id || null, r.shift || null,
      r.materi || null, r.kegiatan || null,
      r.fluency || null, r.confidence || null, r.pronunciation || null, r.grammar || null,
      r.accuracy || null, r.flashcard_category || null, r.roleplay_scenario || null,
      r.status || 'Hadir', r.notes || null
    ));
  });
  insertMany(records);
  res.json({ message: `${records.length} record berhasil disimpan` });
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const {
    date, employee_id, program_id, shift, materi, kegiatan,
    fluency, confidence, pronunciation, grammar, accuracy,
    flashcard_category, roleplay_scenario, status, notes
  } = req.body;
  db.prepare(`
    UPDATE daily_monitoring SET
      date=?,employee_id=?,program_id=?,shift=?,materi=?,kegiatan=?,
      fluency=?,confidence=?,pronunciation=?,grammar=?,accuracy=?,
      flashcard_category=?,roleplay_scenario=?,status=?,notes=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    date, employee_id, program_id || null, shift || null,
    materi || null, kegiatan || null,
    fluency || null, confidence || null, pronunciation || null, grammar || null,
    accuracy || null, flashcard_category || null, roleplay_scenario || null,
    status || 'Hadir', notes || null, req.params.id
  );
  res.json({ message: 'Data monitoring diupdate' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM daily_monitoring WHERE id=?`).run(req.params.id);
  res.json({ message: 'Data monitoring dihapus' });
});

/* ── Common Mistakes ─────────────────────────────────────────── */
router.get('/mistakes/list', (req, res) => {
  const db = getDb();
  const { program_id, week_label } = req.query;
  let where = [], params = [];
  if (program_id)  { where.push('program_id = ?');  params.push(program_id); }
  if (week_label)  { where.push('week_label = ?');  params.push(week_label); }
  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM common_mistakes ${wc} ORDER BY week_label DESC, frequency DESC`).all(...params);
  res.json(rows);
});

router.get('/mistakes/weeks', (req, res) => {
  const db = getDb();
  const { program_id } = req.query;
  let where = program_id ? 'WHERE program_id = ?' : '';
  let params = program_id ? [program_id] : [];
  const rows = db.prepare(`SELECT DISTINCT week_label FROM common_mistakes ${where} ORDER BY week_label DESC`).all(...params);
  res.json(rows.map(r => r.week_label));
});

router.post('/mistakes', requireAdmin, (req, res) => {
  const db = getDb();
  const { program_id, week_label, category, mistake, frequency, employees_affected, improvement_strategy } = req.body;
  if (!week_label || !category || !mistake) return res.status(400).json({ error: 'Field wajib tidak lengkap' });
  const result = db.prepare(
    `INSERT INTO common_mistakes (program_id,week_label,category,mistake,frequency,employees_affected,improvement_strategy) VALUES (?,?,?,?,?,?,?)`
  ).run(program_id || null, week_label, category, mistake, frequency || 1, employees_affected || null, improvement_strategy || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Common mistake ditambahkan' });
});

router.put('/mistakes/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { program_id, week_label, category, mistake, frequency, employees_affected, improvement_strategy } = req.body;
  db.prepare(
    `UPDATE common_mistakes SET program_id=?,week_label=?,category=?,mistake=?,frequency=?,employees_affected=?,improvement_strategy=?,updated_at=datetime('now') WHERE id=?`
  ).run(program_id || null, week_label, category, mistake, frequency || 1, employees_affected || null, improvement_strategy || null, req.params.id);
  res.json({ message: 'Common mistake diupdate' });
});

router.delete('/mistakes/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM common_mistakes WHERE id=?`).run(req.params.id);
  res.json({ message: 'Common mistake dihapus' });
});

/* ── Export CSV ──────────────────────────────────────────────── */
router.get('/export/csv', (req, res) => {
  const db = getDb();
  const { program_id, week_start, week_end } = req.query;
  let where = [], params = [];
  if (program_id) { where.push(`dm.program_id = ?`); params.push(program_id); }
  if (week_start) { where.push(`dm.date >= ?`);       params.push(week_start); }
  if (week_end)   { where.push(`dm.date <= ?`);       params.push(week_end); }
  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT dm.date, e.name, e.department, dm.shift, dm.materi, dm.kegiatan,
      dm.fluency, dm.confidence, dm.pronunciation, dm.grammar, dm.accuracy,
      dm.flashcard_category, dm.roleplay_scenario, dm.status, dm.notes
    FROM daily_monitoring dm
    JOIN employees e ON e.id = dm.employee_id
    ${wc} ORDER BY dm.date DESC, e.name
  `).all(...params);

  const headers = ['Tanggal','Nama','Departemen','Shift','Materi','Kegiatan','Fluency','Confidence','Pronunciation','Grammar','Accuracy(%)','Kategori Flashcard','Skenario Roleplay','Status','Catatan'];
  const csv = [headers.join(','), ...rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=daily_monitoring.csv');
  res.send(csv);
});

module.exports = router;
