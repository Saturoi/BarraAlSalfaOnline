const WebSocket = require('ws');
const fs = require('fs');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);

// قراءة الكلمات من ملف JSON
let wordsList = {};
try {
    wordsList = JSON.parse(fs.readFileSync('./words.json'));
} catch (err) {
    console.error("Error loading words.json, using default words");
    wordsList = {
        587: "عجلات شتوية",
        124: "نملة طائرة",
        921: "سيف خشبي",
        33: "روبوت كسول",
        14: "جرة مخلل",
        999: "حذاء مقلوب"
    };
}

// حالة اللعبة
let players = [];
let currentWord = {};

// =============================
// اتصالات اللاعبين
// =============================
wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'join') {
                const player = { id: data.playerId, name: data.playerName, ws };
                players.push(player);

                // تعيين المضيف
                if (players.length === 1) {
                    ws.send(JSON.stringify({ type: 'host' }));
                }

                broadcastPlayers();
                startRound();
            }

            if (data.type === 'restart') {
                console.log(`Restart requested by player ${data.playerId}`);
                currentWord = {};
                players.forEach(p => p.ws.send(JSON.stringify({ type: 'word', word: "جارِ الاتصال بالسيرفر..." })));
                startRound();
            }

        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p.ws !== ws);
        broadcastPlayers();
    });

    ws.on('error', (err) => console.error("WebSocket client error:", err));
});

// =============================
// إرسال قائمة اللاعبين
// =============================
function broadcastPlayers() {
    const list = players.map(p => ({ id: p.id, name: p.name }));
    players.forEach(p => p.ws.send(JSON.stringify({ type: 'players', players: list })));
}

// =============================
// بدء الجولة
// =============================
function startRound() {
    if (players.length === 0) return;

    const specialIndex = Math.floor(Math.random() * players.length);
    const specialPlayer = players[specialIndex];

    const numbers = Object.keys(wordsList).map(n => parseInt(n));
    let normalIndex = Math.floor(Math.random() * numbers.length);
    let normalWord = wordsList[numbers[normalIndex]];

    let specialIndexNum;
    do {
        specialIndexNum = Math.floor(Math.random() * numbers.length);
    } while (numbers[specialIndexNum] === numbers[normalIndex]);
    let specialWord = wordsList[numbers[specialIndexNum]];

    currentWord = {
        normalWord,
        specialWord,
        specialPlayerId: specialPlayer.id
    };

    players.forEach(p => {
        const wordToSend = (p.id === specialPlayer.id) ? specialWord : normalWord;
        p.ws.send(JSON.stringify({ type: 'word', word: wordToSend }));
    });

    console.log("Round started:", currentWord);
}
