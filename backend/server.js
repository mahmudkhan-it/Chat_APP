const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const MongoStore = require('connect-mongo');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

mongoose.connect('mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(express.static('../public'));
app.use(express.json());

app.use(session({
  secret: 'very-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/chatApp' }),
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: 'Username taken' });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  req.session.user = { username };
  res.json({ message: 'Registered successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  req.session.user = { username };
  res.json({ message: 'Login successful' });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Middleware for session check
function authMiddleware(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Not logged in' });
}

app.get('/api/check', authMiddleware, (req, res) => {
  res.json({ user: req.session.user });
});

io.use((socket, next) => {
  const req = socket.request;
  session({
    secret: 'very-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/chatApp' })
  })(req, {}, next);
});

io.on('connection', socket => {
  const req = socket.request;
  const user = req.session.user;
  if (!user) return;

  Message.find().sort({ createdAt: 1 }).limit(100).then(messages => {
    socket.emit('loadMessages', messages);
  });

  socket.on('sendMessage', async data => {
    const newMessage = new Message({
      username: user.username,
      text: data.text,
      image: data.image
    });
    await newMessage.save();
    io.emit('newMessage', newMessage);
  });

  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
