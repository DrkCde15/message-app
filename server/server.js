// npm install express sqlite3 ws cors body-parser

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 4001;

app.use(cors());
app.use(bodyParser.json());

// Inicializar banco de dados SQLite
const db = new sqlite3.Database('./messages.db', (err) => {
  if (err) console.error('Erro ao conectar ao banco:', err);
  else console.log('Conectado ao banco de dados SQLite');
});

// Criar tabelas
db.serialize(() => {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de mensagens
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  // Inserir usuários de exemplo
  db.run(`INSERT OR IGNORE INTO users (id, username, password) VALUES (1, 'usuario1', '123456')`);
  db.run(`INSERT OR IGNORE INTO users (id, username, password) VALUES (2, 'usuario2', '123456')`);
});

// WebSocket Server
const wss = new WebSocket.Server({ port: 4002 });
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado');

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    
    if (msg.type === 'register') {
      clients.set(msg.userId, ws);
      console.log(`Usuário ${msg.userId} registrado no WebSocket`);
    }
  });

  ws.on('close', () => {
    for (let [userId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(userId);
        console.log(`Usuário ${userId} desconectado`);
      }
    }
  });
});

// Função para enviar mensagem via WebSocket
function sendToUser(userId, message) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

// ==================== ROTAS API ====================

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', 
    [username, password], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
      
      res.json({ user });
    });
});

// Listar usuários (exceto o atual)
app.get('/api/users/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all('SELECT id, username FROM users WHERE id != ?', [userId], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users });
  });
});

// Buscar mensagens entre dois usuários
app.get('/api/messages/:userId/:contactId', (req, res) => {
  const { userId, contactId } = req.params;
  
  db.all(`
    SELECT m.*, u.username as sender_name 
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `, [userId, contactId, contactId, userId], (err, messages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ messages });
  });
});

// Enviar mensagem
app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, message } = req.body;
  
  db.run(
    'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
    [sender_id, receiver_id, message],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newMessage = {
        id: this.lastID,
        sender_id,
        receiver_id,
        message,
        created_at: new Date().toISOString()
      };
      
      // Enviar via WebSocket para o destinatário
      sendToUser(receiver_id, { type: 'new_message', message: newMessage });
      
      res.json({ message: newMessage });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`WebSocket rodando na porta 4002`);
});