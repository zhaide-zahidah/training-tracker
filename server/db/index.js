const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE  = path.join(DATA_DIR, 'training_tracker.db');

let _db  = null;
let _SQL = null;

function save() {
  const data = _db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function _get(sql, params) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) { const r = stmt.getAsObject(); stmt.free(); return r; }
  stmt.free();
  return undefined;
}

function _all(sql, params) {
  const rows = [];
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function _run(sql, params) {
  _db.run(sql, params);
  const lastInsertRowid = (_get('SELECT last_insert_rowid() as id', []) || {}).id || 0;
  const changes         = (_get('SELECT changes() as c', []) || {}).c || 0;
  save();
  return { lastInsertRowid, changes };
}

const dbProxy = {
  prepare(sql) {
    return {
      get(...args)  { return _get(sql, args.flat()); },
      all(...args)  { return _all(sql, args.flat()); },
      run(...args)  { return _run(sql, args.flat()); },
    };
  },
  exec(sql) { _db.run(sql); save(); },
  transaction(fn) {
    return function(arg) {
      _db.run('BEGIN');
      try { fn(arg); _db.run('COMMIT'); save(); }
      catch (e) { _db.run('ROLLBACK'); throw e; }
    };
  },
  pragma() {},
};

async function initDb() {
  if (_db) return dbProxy;
  _SQL = await require('sql.js')();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = fs.existsSync(DB_FILE)
    ? new _SQL.Database(fs.readFileSync(DB_FILE))
    : new _SQL.Database();
  _db.run('PRAGMA foreign_keys=ON;');
  initSchema();
  migrate();
  seedData();
  return dbProxy;
}

function getDb() {
  if (!_db) throw new Error('DB not initialised – await initDb() first');
  return dbProxy;
}

/* ── schema ─────────────────────────────────────────────────────────── */
function initSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      nik               TEXT UNIQUE NOT NULL,
      name              TEXT NOT NULL,
      department        TEXT NOT NULL,
      position          TEXT NOT NULL,
      end_of_contract   TEXT,
      shift             TEXT DEFAULT 'Morning',
      join_date         TEXT NOT NULL,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS training_programs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      category       TEXT NOT NULL,
      duration_hours REAL NOT NULL,
      organizer      TEXT NOT NULL,
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'Planned',
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS training_schedules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
      start_date  TEXT NOT NULL,
      end_date    TEXT NOT NULL,
      location    TEXT,
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS training_participants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL REFERENCES training_schedules(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'Registered',
      score       REAL,
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(schedule_id, employee_id)
    );
    CREATE TABLE IF NOT EXISTS daily_monitoring (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,
      employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      program_id      INTEGER REFERENCES training_programs(id) ON DELETE SET NULL,
      shift           TEXT,
      materi          TEXT,
      kegiatan        TEXT,
      fluency         INTEGER CHECK(fluency BETWEEN 1 AND 5),
      confidence      INTEGER CHECK(confidence BETWEEN 1 AND 5),
      pronunciation   INTEGER CHECK(pronunciation BETWEEN 1 AND 5),
      grammar         INTEGER CHECK(grammar BETWEEN 1 AND 5),
      accuracy        REAL CHECK(accuracy BETWEEN 0 AND 100),
      flashcard_category TEXT,
      roleplay_scenario  TEXT,
      status          TEXT DEFAULT 'Hadir',
      notes           TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS common_mistakes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id  INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
      week_label  TEXT NOT NULL,
      category    TEXT NOT NULL,
      mistake     TEXT NOT NULL,
      frequency   INTEGER DEFAULT 1,
      employees_affected TEXT,
      improvement_strategy TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);
  save();
}

/* ── migration: handle old DB with email column ─────────────────────── */
function migrate() {
  try {
    // Check if email column exists (old schema)
    const cols = _all(`PRAGMA table_info(employees)`, []);
    const hasEmail = cols.some(c => c.name === 'email');
    const hasEOC   = cols.some(c => c.name === 'end_of_contract');
    const hasShift = cols.some(c => c.name === 'shift');

    if (hasEmail && !hasEOC) {
      // Rename email → end_of_contract via table recreation
      _db.run('BEGIN');
      _db.run(`ALTER TABLE employees RENAME TO employees_old`);
      _db.run(`
        CREATE TABLE employees (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          nik               TEXT UNIQUE NOT NULL,
          name              TEXT NOT NULL,
          department        TEXT NOT NULL,
          position          TEXT NOT NULL,
          end_of_contract   TEXT,
          shift             TEXT DEFAULT 'Morning',
          join_date         TEXT NOT NULL,
          created_at        TEXT DEFAULT (datetime('now')),
          updated_at        TEXT DEFAULT (datetime('now'))
        )
      `);
      _db.run(`
        INSERT INTO employees (id,nik,name,department,position,end_of_contract,join_date,created_at,updated_at)
        SELECT id,nik,name,department,position,email,join_date,created_at,updated_at FROM employees_old
      `);
      _db.run(`DROP TABLE employees_old`);
      _db.run('COMMIT');
      console.log('✅ Migrated: email → end_of_contract');
    } else if (!hasShift && hasEOC) {
      _db.run(`ALTER TABLE employees ADD COLUMN shift TEXT DEFAULT 'Morning'`);
      console.log('✅ Migrated: added shift column');
    }
    save();
  } catch(e) {
    console.error('Migration warning:', e.message);
  }
}

/* ── seed ───────────────────────────────────────────────────────────── */
function seedData() {
  const c = _get('SELECT COUNT(*) as c FROM employees', []);
  if (c && c.c > 0) return;

  const depts  = ['Frontline','Frontline','Frontline','Housekeeping','F&B','Engineering','Security','Finance'];
  const posMap = {
    Frontline:   ['Front Office Agent','Receptionist','Concierge','Guest Relations'],
    Housekeeping:['Housekeeping Supervisor','Room Attendant','Laundry Staff','Public Area Attendant'],
    'F&B':       ['Waiter','Bartender','Kitchen Staff','F&B Supervisor'],
    Engineering: ['Technician','Maintenance Staff','IT Support','Engineer'],
    Security:    ['Security Guard','Security Supervisor','CCTV Operator','Security Staff'],
    Finance:     ['Accountant','Finance Staff','Cashier','Finance Manager'],
  };
  const names = [
    'Windy','Araseli','Puji','Susi','Rosa','Dilla','Asti','Elisa','Intan','Sindi',
    'Rini','Wahyuni','Bayu','Citra','Dewi','Eko','Fitri','Galih','Hendra','Indah',
    'Joko','Kartini','Lestari','Maya','Nadia','Oki','Putri','Rizky','Sinta','Tono',
  ];
  const shifts = ['Morning','Afternoon','Evening','Split'];
  const contracts = ['2025-12-31','2026-03-31','2026-06-30','2026-09-30','2027-01-01'];

  _db.run('BEGIN');
  names.forEach((name, i) => {
    const dept  = depts[i % depts.length];
    const pos   = (posMap[dept] || posMap['Frontline'])[i % 4];
    const nik   = `FO${String(i + 1).padStart(3, '0')}`;
    const shift = shifts[i % shifts.length];
    const eoc   = contracts[i % contracts.length];
    const year  = 2023 + Math.floor(i / 15);
    const month = String((i % 12) + 1).padStart(2, '0');
    _db.run(
      `INSERT INTO employees (nik,name,department,position,end_of_contract,shift,join_date) VALUES (?,?,?,?,?,?,?)`,
      [nik, name, dept, pos, eoc, shift, `${year}-${month}-01`]
    );
  });
  _db.run('COMMIT');

  _db.run('BEGIN');
  [
    ['English Storytelling Mastery','Soft Skill',120,'Internal','Program peningkatan kemampuan bahasa Inggris untuk Frontline staff melalui storytelling, roleplay, dan flashcard','Active'],
    ['Basic English for Service','Soft Skill',40,'Internal','Dasar-dasar bahasa Inggris untuk pelayanan tamu','Active'],
    ['Grooming & Appearance','Soft Skill',8,'Internal','Standar penampilan dan grooming untuk frontline','Completed'],
    ['Fire Safety Awareness','Compliance',4,'Internal','Keselamatan kebakaran dan prosedur darurat','Completed'],
    ['Customer Service Excellence','Soft Skill',16,'Eksternal','Pelayanan prima dan penanganan keluhan tamu','Active'],
    ['Leadership for Supervisors','Leadership',24,'Internal','Kepemimpinan untuk level supervisor','Planned'],
  ].forEach(([n,c,d,o,desc,s]) =>
    _db.run(`INSERT INTO training_programs (name,category,duration_hours,organizer,description,status) VALUES (?,?,?,?,?,?)`, [n,c,d,o,desc,s])
  );
  _db.run('COMMIT');

  // Seed daily monitoring data
  const materials = ['1. Self Introduction','2. My Job & Role','3. Places in Rumah Atsiri','4. Daily Routines','5. Guest Handling'];
  const flashcards = ['Greeting Phrases','Room Service Vocab','Complaint Handling','Check-in Procedure','Local Attractions'];
  const scenarios  = ['Guest Check-in','Handling Complaint','Room Service Order','Concierge Assistance','Late Check-out'];
  const dates = ['2026-01-20','2026-01-22','2026-01-23','2026-01-28','2026-02-03','2026-02-04','2026-02-10'];

  _db.run('BEGIN');
  for (let d = 0; d < dates.length; d++) {
    for (let e = 1; e <= 8; e++) {
      const fl = 2 + Math.floor(Math.random() * 3);
      const co = 2 + Math.floor(Math.random() * 3);
      const pr = 2 + Math.floor(Math.random() * 3);
      const gr = 2 + Math.floor(Math.random() * 3);
      const ac = 75 + Math.floor(Math.random() * 20);
      _db.run(`INSERT INTO daily_monitoring
        (date,employee_id,program_id,shift,materi,kegiatan,fluency,confidence,pronunciation,grammar,accuracy,flashcard_category,roleplay_scenario,status)
        VALUES (?,?,1,?,?,?,?,?,?,?,?,?,?,'Hadir')`,
        [dates[d], e, shifts[e%4], materials[d%5],
         d < 4 ? 'Drill materi dan roleplay dengan tamu' : 'Flashcard practice dan scenario roleplay',
         fl, co, pr, gr, ac, flashcards[d%5], scenarios[e%5]]
      );
    }
  }
  _db.run('COMMIT');

  // Seed common mistakes
  _db.run('BEGIN');
  [
    [1,'Week 1 (20-24 Jan)','Pronunciation','Pengucapan "th" tidak jelas','8','Windy, Araseli, Puji','Drill "th" sound setiap hari'],
    [1,'Week 1 (20-24 Jan)','Grammar','Penggunaan simple present tense salah','6','Rosa, Dilla','Review grammar rules dan latihan kalimat'],
    [1,'Week 2 (27-31 Jan)','Fluency','Terlalu banyak jeda saat berbicara','7','Susi, Asti, Elisa','Speed reading exercise, shadowing native speaker'],
    [1,'Week 2 (27-31 Jan)','Vocabulary','Kosakata pelayanan tamu terbatas','5','Intan, Sindi','Flashcard vocabulary building setiap sesi'],
    [1,'Week 3 (3-7 Feb)','Confidence','Ragu-ragu saat roleplay dengan tamu','9','Rini, Wahyuni','Pair practice, positive reinforcement'],
  ].forEach(([pid,wl,cat,mistake,freq,emps,strategy]) =>
    _db.run(`INSERT INTO common_mistakes (program_id,week_label,category,mistake,frequency,employees_affected,improvement_strategy) VALUES (?,?,?,?,?,?,?)`,
      [pid,wl,cat,mistake,parseInt(freq),emps,strategy])
  );
  _db.run('COMMIT');
  save();
}

module.exports = { initDb, getDb };
