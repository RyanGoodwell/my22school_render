const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';

// Для Render: /tmp (временная база)
const dbPath = process.env.SQLITE_PATH || '/tmp/my22school.db';
const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error('DB error:', err);
  else console.log('Connected to SQLite at', dbPath);
});

// Инициализация таблиц
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    avatar TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    roomId TEXT PRIMARY KEY,
    name TEXT,
    type TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT,
    userId INTEGER,
    text TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT,
    userId INTEGER
  )`);
});

// Регистрация
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).send('Недостаточно данных');
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (email, password, name) VALUES (?, ?, ?)`,
    [email, hashedPassword, name],
    function (err) {
      if (err) return res.status(400).send('Email уже используется');
      res.status(201).send('Пользователь создан');
    }
  );
});

// Логин
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send('Неверные данные');
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  });
});

// Получение профиля
app.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.get(`SELECT * FROM users WHERE id = ?`, [decoded.id], (err, user) => {
      if (err || !user) return res.status(401).send('Неавторизовано');
      res.json(user);
    });
  } catch (err) {
    res.status(401).send('Неавторизовано');
  }
});

// Обновление профиля
app.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const { name, avatar } = req.body;
    db.run(
      `UPDATE users SET name = ?, avatar = ? WHERE id = ?`,
      [name, avatar, id],
      err => {
        if (err) return res.status(500).send('Ошибка');
        res.send('Профиль обновлен');
      }
    );
  } catch (err) {
    res.status(401).send('Неавторизовано');
  }
});

// Создание комнаты
app.post('/rooms', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { id: userId } = jwt.verify(token, JWT_SECRET);
    const roomId = uuidv4();
    const { name, type } = req.body;
    db.run(
      `INSERT INTO rooms (roomId, name, type) VALUES (?, ?, ?)`,
      [roomId, name, type],
      err => {
        if (err) return res.status(500).send('Ошибка');
        db.run(`INSERT INTO room_members (roomId, userId) VALUES (?, ?)`, [roomId, userId], err => {
          if (err) return res.status(500).send('Ошибка');
          res.json({ roomId });
        });
      }
    );
  } catch (err) {
    res.status(401).send('Ошибка');
  }
});

// Получение комнат пользователя
app.get('/rooms', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { id: userId } = jwt.verify(token, JWT_SECRET);
    db.all(
      `SELECT rooms.* FROM rooms JOIN room_members ON rooms.roomId = room_members.roomId WHERE room_members.userId = ?`,
      [userId],
      (err, rooms) => {
        if (err) return res.status(500).send('Ошибка');
        res.json(rooms);
      }
    );
  } catch (err) {
    res.status(401).send('Ошибка');
  }
});

// Получение сообщений комнаты
app.get('/messages/:roomId', (req, res) => {
  const { roomId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    db.all(
      `SELECT messages.*, users.name, users.avatar FROM messages 
       JOIN users ON messages.userId = users.id 
       WHERE messages.roomId = ? ORDER BY messages.id ASC`,
      [roomId],
      (err, messages) => {
        if (err) return res.status(500).send('Ошибка');
        res.json(messages);
      }
    );
  } catch (err) {
    res.status(401).send('Ошибка');
  }
});

// Socket.io
io.on('connection', socket => {
  console.log('Пользователь подключен');
  socket.on('joinRoom', ({ roomId, token }) => {
    try {
      const { id: userId } = jwt.verify(token, JWT_SECRET);
      socket.join(roomId);
      socket.userId = userId;
      socket.roomId = roomId;
    } catch (err) {
      socket.disconnect();
    }
  });

  socket.on('sendMessage', (data, callback) => {
    const { roomId, text } = data;
    if (!socket.userId || socket.roomId !== roomId) return;
    db.run(
      `INSERT INTO messages (roomId, userId, text) VALUES (?, ?, ?)`,
      [roomId, socket.userId, text],
      function (err) {
        if (err) return callback?.({ error: 'Ошибка' });
        const messageId = this.lastID;
        db.get(`SELECT name, avatar FROM users WHERE id = ?`, [socket.userId], (err, user) => {
          if (err) return callback?.({ error: 'Ошибка' });
          const msg = { id: messageId, text, createdAt: new Date(), name: user.name, avatar: user.avatar };
          io.to(roomId).emit('newMessage', msg);
          callback?.({ success: true });
        });
      }
    );
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключен');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Сервер на порту', PORT));
