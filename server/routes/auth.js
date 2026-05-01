const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const USERS = [
  { username: process.env.ADMIN_USERNAME || 'zahidah', password: process.env.ADMIN_PASSWORD || 'zahidah16', role: 'admin', name: 'Zahidah' },
  { username: process.env.VIEWER_USERNAME || 'viewer', password: process.env.VIEWER_PASSWORD || 'viewer123', role: 'viewer', name: 'Viewer' },
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });
  const token = jwt.sign({ username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { username: user.username, role: user.role, name: user.name } });
});

module.exports = router;
