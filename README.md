# 🎓 Training Tracker – HR Learning & Development

Aplikasi web manajemen training karyawan untuk tim HR L&D.

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


