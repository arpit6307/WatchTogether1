const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Multer for video uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Video upload endpoint
app.post('/upload', upload.single('video'), (req, res) => {
  res.json({ videoPath: `/uploads/${req.file.filename}` });
});

// Socket.io for real-time sync
io.on('connection', (socket) => {
  socket.on('join-room', (room, username) => {
    socket.join(room);
    socket.to(room).emit('chat-message', `${username} joined the room`);

    socket.on('chat-message', msg => {
      io.to(room).emit('chat-message', `${username}: ${msg}`);
    });

    socket.on('video-action', data => {
      socket.to(room).emit('video-action', data);
    });

    socket.on('youtube', data => {
      socket.to(room).emit('youtube', data);
    });

    socket.on('disconnect', () => {
      socket.to(room).emit('chat-message', `${username} left the room`);
    });
  });
});

// Start the server
server.listen(3000, () => console.log('🚀 Server running at http://localhost:3000'));
