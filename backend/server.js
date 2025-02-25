require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Update CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Socket.io setup with correct CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);

// Socket middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Join a private room for the user
  socket.join(socket.userId);

  socket.on('send_message', (message) => {
    // Broadcast to sender and receiver
    io.to(message.senderId._id).emit('new_message', message);
    io.to(message.receiverId._id).emit('new_message', message);
  });

  socket.on('message_update', ({ messageId, updates, receiverId }) => {
    io.to(socket.userId).to(receiverId).emit('message_updated', {
      messageId,
      updates
    });
  });

  socket.on('message_like', (data) => {
    // Broadcast the like update to both sender and receiver
    io.to(data.senderId).emit('message_updated', data.message);
    io.to(data.receiverId).emit('message_updated', data.message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err)); 