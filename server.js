const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

// إعداد السيرفر لتقديم الملفات
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// إخبار السيرفر بتقديم ملفات HTML و CSS الموجودة في نفس المجلد
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// قراءة الكلمات من الملف
let words = {};
try {
    words = JSON.parse(fs.readFileSync('words.json', 'utf8'));
} catch (e) {
    console.error("خطأ في قراءة ملف words.json");
}

let players = [];
const MIN_PLAYERS = 3;

function broadcastPlayers() {
    const list = players.map(p => ({
        id: p.id,
        username: p.username,
        isHost: p.isHost
    }));
    players.forEach(p => p.ws.send(JSON.stringify({ type: 'players', players: list })));
}

function assignHost() {
    if (players.length > 0 && !players.find(p => p.isHost)) {
        players[0].isHost = true;
        players[0].ws.send(JSON.stringify({ type: 'host' }));
    }
}

function startRound() {
    if (players.length < MIN_PLAYERS) {
        const host = players.find(p => p.isHost);
        if (host) host.ws.send(JSON.stringify({ type: 'error', message: 'نحتاج 3 لاعبين على الأقل لبدء اللعبة.' }));
        return;
    }

    const specialIndex = Math.floor(Math.random() * players.length);
    const wordKeys = Object.keys(words);
    const randomKey = wordKeys[Math.floor(Math.random() * wordKeys.length)];
    const selectedWord = words[randomKey]; 
    const displayNumber = randomKey.padStart(3, '0');

    players.forEach((p, index) => {
        if (index === specialIndex) {
            p.ws.send(JSON.stringify({ type: 'role', status: 'out', word: '❓ لا يوجد (أنت برا السالفة!)' }));
        } else {
            p.ws.send(JSON.stringify({ type: 'role', status: 'in', word: `${selectedWord} (رقم ${displayNumber})` }));
        }
    });
}

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substring(2, 9);
    let currentPlayer = { id: playerId, username: 'لاعب', ws: ws, isHost: false };

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            currentPlayer.username = data.username;
            players.push(currentPlayer);
            assignHost();
            broadcastPlayers();
        }
        if (data.type === 'restart' && currentPlayer.isHost) {
            startRound();
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p.id !== playerId);
        assignHost();
        broadcastPlayers();
    });
});

// تشغيل السيرفر
server.listen(PORT, () => {
    console.log(`🚀 اللعبة تعمل الآن! افتح المتصفح على الرابط: http://localhost:${PORT}`);
});
