// =====================
// DEPENDENCIES
// =====================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

// =====================
// CONFIG
// =====================
const HTTP_PORT = 4001;
const WS_PORT = 4002;
const JWT_SECRET = 'super_secret_key'; // depois jogar em env
const JWT_EXPIRES = '15m';

// =====================
// APP
// =====================
const app = express();
app.use(cors());
app.use(bodyParser.json());

// =====================
// DATABASE
// =====================
const db = new sqlite3.Database('./messages.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // usuários de teste
  db.run(
    `INSERT OR IGNORE INTO users (id, username, password)
     VALUES (1, 'usuario1', '123456')`
  );
  db.run(
    `INSERT OR IGNORE INTO users (id, username, password)
     VALUES (2, 'usuario2', '123456')`
  );
});

// =====================
// AUTH MIDDLEWARE
// =====================
function authJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(401);
    req.user = decoded;
    next();
  });
}

// =====================
// LOGIN
// =====================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) return res.sendStatus(500);
      if (!user) return res.sendStatus(401);

      // comparação simples (hardening vem depois)
      if (user.password !== password) {
        return res.sendStatus(401);
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );

      res.json({ token });
    }
  );
});

// =====================
// USERS
// =====================
app.get('/api/users', authJWT, (req, res) => {
  db.all(
    'SELECT id, username FROM users WHERE id != ?',
    [req.user.id],
    (err, users) => {
      if (err) return res.sendStatus(500);
      res.json({ users });
    }
  );
});

// =====================
// MESSAGES
// =====================
app.get('/api/messages/:contactId', authJWT, (req, res) => {
  const contactId = req.params.contactId;

  db.all(
    `
    SELECT * FROM messages
    WHERE
      (sender_id = ? AND receiver_id = ?)
      OR
      (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
    `,
    [req.user.id, contactId, contactId, req.user.id],
    (err, messages) => {
      if (err) return res.sendStatus(500);
      res.json({ messages });
    }
  );
});

app.post('/api/messages', authJWT, (req, res) => {
  const { receiver_id, message } = req.body;

  db.run(
    `
    INSERT INTO messages (sender_id, receiver_id, message)
    VALUES (?, ?, ?)
    `,
    [req.user.id, receiver_id, message],
    function (err) {
      if (err) return res.sendStatus(500);

      const payload = {
        id: this.lastID,
        sender_id: req.user.id,
        receiver_id,
        message,
        created_at: new Date().toISOString()
      };

      sendToUser(receiver_id, {
        type: 'new_message',
        message: payload
      });

      res.json({ ok: true });
    }
  );
});

// =====================
// HTTP SERVER
// =====================
app.listen(HTTP_PORT, () => {
  console.log(`HTTP API rodando na porta ${HTTP_PORT}`);
});

// =====================
// WEBSOCKET
// =====================
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'register') {
        jwt.verify(data.token, JWT_SECRET, (err, decoded) => {
          if (err) {
            ws.close();
            return;
          }
          clients.set(decoded.id, ws);
        });
      }
    } catch {
      ws.close();
    }
  });

  ws.on('close', () => {
    for (const [id, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(id);
      }
    }
  });
});

function sendToUser(userId, payload) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(payload));
  }
}

console.log(`WebSocket rodando na porta ${WS_PORT}`);
