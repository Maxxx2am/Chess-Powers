const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGame', (room) => {
    socket.join(room);
    if (!players[room]) {
      players[room] = [];
    }
    
    let role = players[room].length === 0 ? 'w' : (players[room].length === 1 ? 'b' : 'spectator');
    players[room].push({ id: socket.id, role: role });
    
    socket.emit('roleAssign', role);
    io.to(room).emit('playerJoined', players[room].length);
    
    console.log(`User ${socket.id} joined room ${room} as ${role}`);
  });

  socket.on('move', (data) => {
    // Relay move to other player in the room
    socket.to(data.room).emit('move', data);
  });

  socket.on('gameStateUpdate', (data) => {
    // Relay full game state update (e.g., after armory phase)
    socket.to(data.room).emit('gameStateUpdate', data);
  });

  socket.on('syncSetup', (data) => {
    // Sync armory setup
    socket.to(data.room).emit('syncSetup', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const room in players) {
      players[room] = players[room].filter(p => p.id !== socket.id);
      io.to(room).emit('playerJoined', players[room].length);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
