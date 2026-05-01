# 🎓 Training Tracker – HR Learning & Development

Aplikasi web manajemen training karyawan untuk tim HR L&D.

## Stack Teknologi

| Layer    | Teknologi                        |
|----------|----------------------------------|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend  | Node.js + Express.js             |
| Database | SQLite via sql.js (pure JS, no native binaries) |
| Auth     | JWT (disimpan di localStorage)   |
| Charts   | Recharts                         |

## Struktur Folder

```
training-tracker/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # Layout, UI primitives
│   │   ├── context/      # AuthContext
│   │   ├── pages/        # Dashboard, Employees, Programs, Schedules, Reports
│   │   └── utils/        # axios instance
│   └── package.json
├── server/               # Express backend
│   ├── db/               # sql.js database layer + seed data
│   ├── middleware/        # JWT auth middleware
│   ├── routes/           # auth, employees, programs, schedules, dashboard
│   ├── data/             # SQLite DB file (auto-created)
│   ├── .env              # Environment variables
│   └── index.js
└── README.md
```

## Cara Menjalankan

### Prasyarat
- Node.js v18+ 
- npm v9+

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Konfigurasi Environment (Opsional)

File `server/.env` sudah tersedia dengan konfigurasi default:

```env
PORT=3001
JWT_SECRET=training_tracker_secret_2024_HR_LnD
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
VIEWER_USERNAME=viewer
VIEWER_PASSWORD=viewer123
```

### 3. Jalankan Backend

```bash
cd server
node index.js
# Server berjalan di http://localhost:3001
```

### 4. Jalankan Frontend (terminal baru)

```bash
cd client
npm run dev
# Frontend berjalan di http://localhost:5173
```

### 5. Buka Aplikasi

Buka browser ke: **http://localhost:5173**

## Akun Default

| Role   | Username | Password   | Akses                  |
|--------|----------|------------|------------------------|
| Admin  | admin    | admin123   | Penuh (CRUD semua data)|
| Viewer | viewer   | viewer123  | Baca saja              |

## Fitur Lengkap

### 1. Dashboard
- Kartu statistik: total karyawan, program, jam training bulan ini, completion rate
- Bar chart: training per departemen
- Line chart: tren training 12 bulan terakhir
- Tabel 5 training terbaru
- Daftar karyawan yang belum pernah training

### 2. Manajemen Karyawan
- CRUD karyawan (NIK, Nama, Departemen, Jabatan, Email, Tanggal Bergabung)
- Search dan filter per departemen
- Export CSV

### 3. Program Training
- CRUD program (Nama, Kategori, Durasi, Penyelenggara, Deskripsi, Status)
- Filter per kategori dan status
- Kategori: Hard Skill, Soft Skill, Compliance, Leadership
- Status: Planned, Active, Completed, Cancelled

### 4. Penjadwalan Training
- Buat jadwal untuk program training
- Assign karyawan sebagai peserta (multi-select)
- Update status peserta: Registered → Attended/Completed/Absent
- Input nilai post-test (0–100) dan catatan per peserta
- Inline editing status peserta

### 5. Laporan
- Laporan per karyawan: riwayat semua training
- Laporan per program: daftar peserta dan statusnya
- Laporan per departemen: rekapitulasi agregat
- Filter periode (tahun & bulan)
- Export CSV untuk semua jenis laporan

### 6. Autentikasi
- Login dengan JWT
- Role Admin: akses penuh
- Role Viewer: read-only, tombol edit/hapus disembunyikan
- Token disimpan di localStorage, expire 8 jam

## API Endpoints

```
POST   /api/auth/login

GET    /api/employees
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
GET    /api/employees/export/csv

GET    /api/programs
POST   /api/programs
PUT    /api/programs/:id
DELETE /api/programs/:id

GET    /api/schedules
GET    /api/schedules/:id
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
POST   /api/schedules/:id/participants
PUT    /api/schedules/:id/participants/:pid
DELETE /api/schedules/:id/participants/:pid

GET    /api/dashboard/summary
GET    /api/dashboard/by-employee
GET    /api/dashboard/by-program
GET    /api/dashboard/by-department
GET    /api/dashboard/export-csv
```

## Data Seed

Aplikasi otomatis mengisi data dummy saat pertama kali dijalankan:
- **30 karyawan** dari 8 departemen (IT, HR, Finance, Operations, Marketing, Sales, Legal, Procurement)
- **10 program training** dengan kategori beragam
- **8 jadwal training** dengan peserta dan nilai

## Database

Database SQLite tersimpan di `server/data/training_tracker.db`.  
File ini otomatis dibuat saat server pertama kali dijalankan.  
Untuk reset data: hapus file tersebut dan restart server.

---

## Update: Fitur Baru

### Perubahan Karyawan
- Kolom **Email** diganti menjadi **End of Contract** (tanggal kontrak berakhir)
- Ditambah kolom **Shift** (Morning/Afternoon/Evening/Split)
- Indikator warna otomatis: merah jika kontrak berakhir, oranye jika ≤30 hari lagi

### 7. Daily Monitoring (English Storytelling Mastery)
- **Tab Daily Report Phase 1**: Input materi, kegiatan, dan skor bahasa Inggris (Fluency, Confidence, Pronunciation, Grammar 1-5)
- **Tab Daily Report (Flashcard/Roleplay)**: Input kategori flashcard, skenario roleplay, dan akurasi (%)
- Tampilan dikelompokkan per tanggal (seperti spreadsheet)
- Filter per tanggal, program, dan nama pegawai
- Export CSV

### 8. Progress Summary
- **Weekly Progress Summary**: Rekap rata-rata skor per pegawai (Total Praktik, Avg Fluency/Confidence/Pronunciation/Grammar, Avg Akurasi, Hadir/Absen)
- **Bar chart** tren skor dari waktu ke waktu
- **Common Mistakes** (Kategori yang Perlu Fokus): Input kesalahan umum per minggu, frekuensi, pegawai terdampak, dan strategi perbaikan
- Filter per program dan label minggu

### Navigasi Sidebar Baru
```
Menu Utama: Dashboard, Karyawan, Program Training, Penjadwalan
English Storytelling: Daily Monitoring, Progress Summary
Laporan: Laporan
```
