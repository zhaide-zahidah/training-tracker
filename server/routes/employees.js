const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { search, department, page = 1, limit = 100 } = req.query;
  let where = [], params = [];
  if (search) { where.push(`(name LIKE ? OR nik LIKE ?)`); params.push(`%${search}%`, `%${search}%`); }
  if (department) { where.push(`department = ?`); params.push(department); }
  const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total = db.prepare(`SELECT COUNT(*) as c FROM employees ${wc}`).get(...params).c;
  const rows  = db.prepare(`SELECT * FROM employees ${wc} ORDER BY name LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/departments', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT DISTINCT department FROM employees ORDER BY department`).all();
  res.json(rows.map(r => r.department));
});

router.get('/export/csv', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT nik,name,department,position,shift,end_of_contract,join_date FROM employees ORDER BY name`).all();
  const headers = ['NIK','Nama','Departemen','Jabatan','Shift','End of Contract','Tanggal Bergabung'];
  const csv = [headers.join(','), ...rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=karyawan.csv');
  res.send(csv);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  res.json(emp);
});

router.post('/', requireAdmin, (req, res) => {
  const db = getDb();
  const { nik, name, department, position, end_of_contract, shift, join_date } = req.body;
  if (!nik || !name || !department || !position || !join_date)
    return res.status(400).json({ error: 'Field wajib tidak lengkap' });
  try {
    const result = db.prepare(
      `INSERT INTO employees (nik,name,department,position,end_of_contract,shift,join_date) VALUES (?,?,?,?,?,?,?)`
    ).run(nik, name, department, position, end_of_contract || null, shift || 'Morning', join_date);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Karyawan berhasil ditambahkan' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'NIK sudah digunakan' });
    throw e;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { nik, name, department, position, end_of_contract, shift, join_date } = req.body;
  try {
    db.prepare(
      `UPDATE employees SET nik=?,name=?,department=?,position=?,end_of_contract=?,shift=?,join_date=?,updated_at=datetime('now') WHERE id=?`
    ).run(nik, name, department, position, end_of_contract || null, shift || 'Morning', join_date, req.params.id);
    res.json({ message: 'Karyawan berhasil diupdate' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'NIK sudah digunakan' });
    throw e;
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM employees WHERE id=?`).run(req.params.id);
  res.json({ message: 'Karyawan berhasil dihapus' });
});

module.exports = router;
