const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate);

router.get('/summary', (req, res) => {
  const db = getDb();
  const totalEmployees = db.prepare(`SELECT COUNT(*) as c FROM employees`).get().c;
  const totalPrograms = db.prepare(`SELECT COUNT(*) as c FROM training_programs`).get().c;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  
  const hoursThisMonth = db.prepare(`
    SELECT COALESCE(SUM(tp2.duration_hours), 0) as hours
    FROM training_participants tp
    JOIN training_schedules ts ON ts.id = tp.schedule_id
    JOIN training_programs tp2 ON tp2.id = ts.training_id
    WHERE strftime('%Y-%m', ts.start_date) = ? AND tp.status IN ('Attended','Completed')
  `).get(thisMonth).hours;

  const completionData = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('Attended','Completed') THEN 1 ELSE 0 END) as completed
    FROM training_participants
  `).get();
  const completionRate = completionData.total > 0 ? Math.round((completionData.completed / completionData.total) * 100) : 0;

  const byDepartment = db.prepare(`
    SELECT e.department, COUNT(tp.id) as count
    FROM training_participants tp
    JOIN employees e ON e.id = tp.employee_id
    WHERE tp.status IN ('Attended','Completed')
    GROUP BY e.department ORDER BY count DESC
  `).all();

  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', ts.start_date) as month, COUNT(tp.id) as count
    FROM training_participants tp
    JOIN training_schedules ts ON ts.id = tp.schedule_id
    WHERE ts.start_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month
  `).all();

  const recentTrainings = db.prepare(`
    SELECT ts.id, tp.name, ts.start_date, ts.end_date, tp.category, tp.organizer,
      COUNT(tp2.id) as participant_count
    FROM training_schedules ts
    JOIN training_programs tp ON tp.id = ts.training_id
    LEFT JOIN training_participants tp2 ON tp2.schedule_id = ts.id
    GROUP BY ts.id ORDER BY ts.created_at DESC LIMIT 5
  `).all();

  const neverTrained = db.prepare(`
    SELECT e.id, e.name, e.department, e.position
    FROM employees e
    LEFT JOIN training_participants tp ON tp.employee_id = e.id
    WHERE tp.id IS NULL
    ORDER BY e.department, e.name
    LIMIT 10
  `).all();

  res.json({ totalEmployees, totalPrograms, hoursThisMonth, completionRate, byDepartment, monthlyTrend, recentTrainings, neverTrained });
});

// Reports
router.get('/by-employee', (req, res) => {
  const db = getDb();
  const { employee_id, year, month } = req.query;
  let where = ['1=1'];
  let params = [];

  if (employee_id) { where.push('e.id = ?'); params.push(employee_id); }
  if (year) { where.push(`strftime('%Y', ts.start_date) = ?`); params.push(year); }
  if (month) { where.push(`strftime('%m', ts.start_date) = ?`); params.push(String(month).padStart(2,'0')); }

  const rows = db.prepare(`
    SELECT e.nik, e.name, e.department, e.position,
      tp.name as training_name, tp.category, tp.organizer, tp.duration_hours,
      ts.start_date, ts.end_date, p.status, p.score, p.notes
    FROM training_participants p
    JOIN employees e ON e.id = p.employee_id
    JOIN training_schedules ts ON ts.id = p.schedule_id
    JOIN training_programs tp ON tp.id = ts.training_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.name, ts.start_date DESC
  `).all(...params);
  res.json(rows);
});

router.get('/by-program', (req, res) => {
  const db = getDb();
  const { training_id, year, month } = req.query;
  let where = ['1=1'];
  let params = [];

  if (training_id) { where.push('tp.id = ?'); params.push(training_id); }
  if (year) { where.push(`strftime('%Y', ts.start_date) = ?`); params.push(year); }
  if (month) { where.push(`strftime('%m', ts.start_date) = ?`); params.push(String(month).padStart(2,'0')); }

  const rows = db.prepare(`
    SELECT tp.name as training_name, tp.category, tp.organizer, tp.duration_hours,
      ts.start_date, ts.end_date, e.name as employee_name, e.nik, e.department, e.position,
      p.status, p.score, p.notes
    FROM training_participants p
    JOIN employees e ON e.id = p.employee_id
    JOIN training_schedules ts ON ts.id = p.schedule_id
    JOIN training_programs tp ON tp.id = ts.training_id
    WHERE ${where.join(' AND ')}
    ORDER BY tp.name, ts.start_date, e.name
  `).all(...params);
  res.json(rows);
});

router.get('/by-department', (req, res) => {
  const db = getDb();
  const { department, year, month } = req.query;
  let where = ['1=1'];
  let params = [];

  if (department) { where.push('e.department = ?'); params.push(department); }
  if (year) { where.push(`strftime('%Y', ts.start_date) = ?`); params.push(year); }
  if (month) { where.push(`strftime('%m', ts.start_date) = ?`); params.push(String(month).padStart(2,'0')); }

  const rows = db.prepare(`
    SELECT e.department,
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(p.id) as total_participations,
      SUM(CASE WHEN p.status IN ('Attended','Completed') THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN p.status = 'Absent' THEN 1 ELSE 0 END) as absent,
      ROUND(AVG(CASE WHEN p.score IS NOT NULL THEN p.score END), 1) as avg_score,
      ROUND(SUM(tp.duration_hours * CASE WHEN p.status IN ('Attended','Completed') THEN 1 ELSE 0 END), 1) as total_hours
    FROM employees e
    LEFT JOIN training_participants p ON p.employee_id = e.id
    LEFT JOIN training_schedules ts ON ts.id = p.schedule_id
    LEFT JOIN training_programs tp ON tp.id = ts.training_id
    WHERE ${where.join(' AND ')}
    GROUP BY e.department ORDER BY total_participations DESC
  `).all(...params);
  res.json(rows);
});

router.get('/export-csv', (req, res) => {
  const db = getDb();
  const { type = 'employee', ...filters } = req.query;
  
  let rows, headers, filename;
  
  if (type === 'employee') {
    let where = ['1=1']; let params = [];
    if (filters.employee_id) { where.push('e.id = ?'); params.push(filters.employee_id); }
    if (filters.year) { where.push(`strftime('%Y', ts.start_date) = ?`); params.push(filters.year); }
    rows = db.prepare(`SELECT e.nik,e.name,e.department,e.position,tp.name as training_name,tp.category,tp.organizer,tp.duration_hours,ts.start_date,ts.end_date,p.status,p.score,p.notes FROM training_participants p JOIN employees e ON e.id=p.employee_id JOIN training_schedules ts ON ts.id=p.schedule_id JOIN training_programs tp ON tp.id=ts.training_id WHERE ${where.join(' AND ')} ORDER BY e.name,ts.start_date DESC`).all(...params);
    headers = ['NIK','Nama','Departemen','Jabatan','Nama Training','Kategori','Penyelenggara','Durasi (Jam)','Tanggal Mulai','Tanggal Selesai','Status','Skor','Catatan'];
    filename = 'laporan_per_karyawan.csv';
  } else if (type === 'department') {
    let where = ['1=1']; let params = [];
    if (filters.department) { where.push('e.department = ?'); params.push(filters.department); }
    if (filters.year) { where.push(`strftime('%Y', ts.start_date) = ?`); params.push(filters.year); }
    rows = db.prepare(`SELECT e.department,COUNT(DISTINCT e.id) as total_employees,COUNT(p.id) as total_participations,SUM(CASE WHEN p.status IN ('Attended','Completed') THEN 1 ELSE 0 END) as completed,SUM(CASE WHEN p.status='Absent' THEN 1 ELSE 0 END) as absent,ROUND(AVG(CASE WHEN p.score IS NOT NULL THEN p.score END),1) as avg_score,ROUND(SUM(tp.duration_hours*CASE WHEN p.status IN ('Attended','Completed') THEN 1 ELSE 0 END),1) as total_hours FROM employees e LEFT JOIN training_participants p ON p.employee_id=e.id LEFT JOIN training_schedules ts ON ts.id=p.schedule_id LEFT JOIN training_programs tp ON tp.id=ts.training_id WHERE ${where.join(' AND ')} GROUP BY e.department ORDER BY total_participations DESC`).all(...params);
    headers = ['Departemen','Total Karyawan','Total Partisipasi','Selesai','Absen','Rata-rata Skor','Total Jam'];
    filename = 'laporan_per_departemen.csv';
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const csv = [headers.join(','), ...rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(csv);
});

module.exports = router;
