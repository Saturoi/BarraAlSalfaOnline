const WebSocket = require('ws');
const fs = require('fs');

// =============================
// CONFIG
// =============================
const PORT = process.env.PORT || 10000;
const MIN_PLAYERS = 3;
const MIN_NUMBER = 1;
const MAX_NUMBER = 999;

// =============================
// STATE
// =============================
const wss = new WebSocket.Server({ port: PORT });
let players = [];        // { playerId, username, ws, status }
let currentSpecial = null;
let previousSpecial = null;
let usedNumbers = [];

// =============================
// HELPERS
// =============================
function log(...args) { console.log('[SERVER]', ...args); }

function broadcastPlayers() {
  const list = players.map((p, idx) => ({
    playerId: p.playerId,
    username: p.username,
    isHost: idx === 0,
    status: p.status || 'waiting'
  }));
  const payload = JSON.stringify({ type: 'players', players: list });
  players.forEach(p => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
  });
}

function sendToPlayer(p, obj) {
  if (p.ws && p.ws.readyState === WebSocket.OPEN) {
    p.ws.send(JSON.stringify(obj));
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chooseUniqueNumber(exclude = []) {
  const MAX_ATTEMPTS = 2000;
  let attempts = 0;
  while (attempts < MAX_ATTEMPTS) {
    const n = randInt(MIN_NUMBER, MAX_NUMBER);
    if (!exclude.includes(n)) return n;
    attempts++;
  }
  for (let i = MIN_NUMBER; i <= MAX_NUMBER; i++) {
    if (!exclude.includes(i)) return i;
  }
  return null;
}

function setHostIfNeeded() {
  if (players.length === 0) return;
  sendToPlayer(players[0], { type: 'host' });
  broadcastPlayers();
}

function resetStatuses() {
  players.forEach(p => p.status = 'waiting');
  currentSpecial = null;
  usedNumbers = [];
}

// =============================
// CORE: START ROUND
// =============================
function startRound() {
  if (players.length < MIN_PLAYERS) {
    log(`Cannot start: need at least ${MIN_PLAYERS} players.`);
    if (players[0]) sendToPlayer(players[0], { type: 'cannotStart', reason: 'Need at least 3 players' });
    return;
  }

  previousSpecial = currentSpecial ? { ...currentSpecial } : null;
  usedNumbers = [];

  const specialIndex = Math.floor(Math.random() * players.length);
  const specialPlayer = players[specialIndex];
  currentSpecial = { playerId: specialPlayer.playerId, username: specialPlayer.username };

  const normalNum = chooseUniqueNumber(usedNumbers);
  usedNumbers.push(normalNum);
  const specialNum = chooseUniqueNumber(usedNumbers);
  usedNumbers.push(specialNum);

  players.forEach(p => {
    if (p.playerId === currentSpecial.playerId) {
      p.status = 'special';
      sendToPlayer(p, { type: 'word', number: specialNum, status: 'special' });
    } else {
      p.status = 'normal';
      sendToPlayer(p, { type: 'word', number: normalNum, status: 'normal' });
    }
  });

  broadcastPlayers();
  log(`Round started. Special: ${currentSpecial.username}. NormalNum=${normalNum}, SpecialNum=${specialNum}`);
}

// =============================
// WebSocket Server
// =============================
wss.on('connection', (ws) => {
  log('New connection');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch (e) { log('Invalid JSON'); return; }

    switch (data.type) {
      case 'join':
        if (!data.playerId || !data.username) return;
        players = players.filter(p => p.playerId !== data.playerId);
        players.push({ playerId: data.playerId, username: data.username, ws, status: 'waiting' });
        sendToPlayer(players[players.length - 1], { type: 'joined', playerId: data.playerId });
        setHostIfNeeded();
        broadcastPlayers();
        break;

      case 'restart':
        if (players.length === 0 || players[0].playerId !== data.playerId) {
          const requester = players.find(p => p.playerId === data.playerId);
          if (requester) sendToPlayer(requester, { type: 'error', message: 'Only the host can restart' });
          return;
        }
        const prevName = previousSpecial ? previousSpecial.username : (currentSpecial ? currentSpecial.username : 'لا يوجد');
        players.forEach(p => sendToPlayer(p, { type: 'previousSpecial', username: prevName }));
        startRound();
        break;

      default:
        log('Unknown message type:', data.type);
    }
  });

  ws.on('close', () => {
    const left = players.find(p => p.ws === ws);
    players = players.filter(p => p.ws !== ws);
    if (players.length > 0) setHostIfNeeded();
    else resetStatuses();
    broadcastPlayers();
  });

  ws.on('error', (err) => log('Client ws error:', err));
});

// =============================
// Heartbeat
// =============================
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) ws.terminate();
    else { ws.isAlive = false; ws.ping(() => {}); }
  });
}, 30000);

log(`Game server running on port ${PORT}`);


