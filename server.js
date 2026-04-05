const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path'); // 👈 أضفنا هذه المكتبة لضمان مسار الملف

const PORT = process.env.PORT || 10000;
const MIN_PLAYERS = 3;

// خادم HTTP لإرضاء فحص الصحة (Health Check) الخاص بمنصة Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is UP and Running!');
});

// خادم اللعبة WebSocket
const wss = new WebSocket.Server({ server });

// قراءة الكلمات من الملف بشكل آمن ومضمون
let words = {};
try {
    const filePath = path.join(__dirname, 'words.json'); // 👈 تحديد المسار بدقة
    words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log("✅ تم قراءة ملف الكلمات بنجاح، عدد الكلمات:", Object.keys(words).length);
} catch (e) {
    console.error("❌ خطأ في قراءة ملف words.json:", e.message);
}

let players = [];

// إرسال قائمة اللاعبين
function broadcastPlayers() {
    const list = players.map(p => ({
        id: p.id,
        username: p.username,
        isHost: p.isHost
    }));
    players.forEach(p => p.ws.send(JSON.stringify({ type: 'players', players: list })));
}

// تحديد المضيف (أول لاعب)
function assignHost() {
    if (players.length > 0 && !players.find(p => p.isHost)) {
        players[0].isHost = true;
        players[0].ws.send(JSON.stringify({ type: 'host' }));
    }
}

// بدء الجولة وتوزيع الكلمات
function startRound() {
    if (players.length < MIN_PLAYERS) {
        const host = players.find(p => p.isHost);
        if (host) host.ws.send(JSON.stringify({ type: 'error', message: 'نحتاج 3 لاعبين على الأقل لبدء اللعبة.' }));
        return;
    }

    const specialIndex = Math.floor(Math.random() * players.length);
    const wordKeys = Object.keys(words);
    
    let selectedWord = "كلمة افتراضية";
    let displayNumber = "000";

    if (wordKeys.length > 0) {
        const randomKey = wordKeys[Math.floor(Math.random() * wordKeys.length)];
        selectedWord = words[randomKey]; 
        displayNumber = randomKey.padStart(3, '0');
    } else {
        console.warn("⚠️ تحذير: قائمة الكلمات فارغة أو لم يتم قراءتها!");
    }

    players.forEach((p, index) => {
        if (index === specialIndex) {
            p.ws.send(JSON.stringify({ type: 'role', status: 'out', word: '❓ لا يوجد (أنت برا السالفة!)' }));
        } else {
            p.ws.send(JSON.stringify({ type: 'role', status: 'in', word: `${selectedWord} (رقم ${displayNumber})` }));
        }
    });
}

// استقبال الاتصالات
wss.on('connection', (ws) => {
    const connectionId = Math.random().toString(36).substring(2, 9);
    let currentPlayer = { id: connectionId, username: 'لاعب', ws: ws, isHost: false };

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        if (data.type === 'join') {
            currentPlayer.username = data.username || "بدون اسم";
            players.push(currentPlayer);
            assignHost();
            broadcastPlayers();
        }

        if (data.type === 'restart' && currentPlayer.isHost) {
            startRound();
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p.id !== currentPlayer.id);
        assignHost(); 
        broadcastPlayers();
    });
});

// تشغيل السيرفر
server.listen(PORT, () => {
    console.log(`🚀 Game Server is running on port ${PORT}`);
});
