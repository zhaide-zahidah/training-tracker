require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDb } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/programs',   require('./routes/programs'));
app.use('/api/schedules',  require('./routes/schedules'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

(async () => {
  await initDb();
  app.listen(PORT, '0.0.0.0', () => console.log(`✅  Training Tracker API → http://localhost:${PORT}`));
})();
