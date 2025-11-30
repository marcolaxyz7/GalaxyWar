const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const players = {};

io.on('connection', (socket) => {
  console.log('Piloto conectado:', socket.id);

  // Inicializa jogador com dados extras (turbo)
  players[socket.id] = {
    x: 0, y: 5, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
    color: Math.random() * 0xffffff,
    thrust: false // Estado do motor
  };

  // Envia lista atual para quem entrou
  socket.emit('currentPlayers', players);

  // Avisa os outros que entrou um novo
  socket.broadcast.emit('newPlayer', { 
    id: socket.id, 
    player: players[socket.id] 
  });

  // Movimento (Agora inclui o thrust/turbo)
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].qx = movementData.qx;
      players[socket.id].qy = movementData.qy;
      players[socket.id].qz = movementData.qz;
      players[socket.id].qw = movementData.qw;
      players[socket.id].thrust = movementData.thrust; // Salva se está acelerando
      
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        ...players[socket.id]
      });
    }
  });

  // --- NOVO: SISTEMA DE TIRO ---
  socket.on('shoot', () => {
    // Avisa a todos (menos quem atirou) para criarem a bala visual
    socket.broadcast.emit('playerShoot', socket.id);
  });

  // --- COMBATE ---
  socket.on('playerHit', (targetId) => {
    // Avisa a vítima que ela morreu
    io.to(targetId).emit('youDied');
    // Avisa todo mundo para explodir a nave visualmente
    io.emit('playerKilled', targetId);
  });

  socket.on('disconnect', () => {
    console.log('Piloto saiu:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SERVIDOR RODANDO NA PORTA: ${PORT}`);
});