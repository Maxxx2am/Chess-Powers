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

let rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createGame', (data) => {
    const room = data.room;
    socket.join(room);
    rooms[room] = {
      settings: {
        orbCount: data.orbCount
      },
      players: [{ id: socket.id, role: 'w' }]
    };
    socket.emit('roleAssign', 'w');
    console.log(`User ${socket.id} created room ${room} with ${data.orbCount} orbs`);
  });

  socket.on('joinGame', (room) => {
    if (!rooms[room]) {
      socket.emit('errorMsg', 'Room does not exist');
      return;
    }
    
    socket.join(room);
    let role = rooms[room].players.length === 1 ? 'b' : 'spectator';
    rooms[room].players.push({ id: socket.id, role: role });
    
    socket.emit('roleAssign', role);
    socket.emit('syncSettings', rooms[room].settings);
    io.to(room).emit('playerJoined', rooms[room].players.length);
    
    console.log(`User ${socket.id} joined room ${room} as ${role}`);
  });

  socket.on('move', (data) => {
    socket.to(data.room).emit('move', data);
  });

  socket.on('abilityAction', (data) => {
    socket.to(data.room).emit('abilityAction', data);
  });

  socket.on('gameStateUpdate', (data) => {
    socket.to(data.room).emit('gameStateUpdate', data);
  });

  socket.on('syncSetup', (data) => {
    socket.to(data.room).emit('syncSetup', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit('playerJoined', rooms[room].players.length);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
