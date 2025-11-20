const WebSocket = require('ws');

// =============================
// CONFIG
// =============================
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

// قائمة الكلمات المبدئية (يمكن تطويرها لاحقًا)
const wordsList = {
    1: "عجلات شتوية",
    2: "نملة طائرة",
    3: "سيف خشبي",
    4: "روبوت كسول",
    5: "جرة مخلل",
    6: "حذاء مقلوب"
};

// =============================
// حالة اللعبة
// =============================
let players = []; // كل لاعب: {id, name, ws}
let currentWord = {}; // {normalWord, specialWord, specialPlayerId}

// =============================
// توصيل اللاعبين
// =============================
wss.on('connection', (ws) => {

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'join') {
                // إضافة اللاعب للقائمة
                const player = {
                    id: data.playerId,
                    name: data.playerName,
                    ws: ws
                };
                players.push(player);

                // تحديد المضيف (اللاعب الأول)
                if (players.length === 1) {
                    ws.send(JSON.stringify({ type: 'host' }));
                }

                broadcastPlayers();
                startRound(); // يبدأ الجولة إذا أردنا فور انضمام أول لاعب
            }

            if (data.type === 'restart') {
                // إعادة البدء: مسح حالة اللعبة وإعلام الجميع
                currentWord = {};
                players.forEach(p => p.ws.send(JSON.stringify({ type: 'word', word: "جارِ الاتصال بالسيرفر..." })));
                startRound();
            }

        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    ws.on('close', () => {
        // إزالة اللاعب عند الخروج
        players = players.filter(p => p.ws !== ws);
        broadcastPlayers();
    });
});

// =============================
// إرسال قائمة اللاعبين
// =============================
function broadcastPlayers() {
    const list = players.map(p => ({ id: p.id, name: p.name }));
    players.forEach(p => {
        p.ws.send(JSON.stringify({ type: 'players', players: list }));
    });
}

// =============================
// بدء الجولة
// =============================
function startRound() {
    if (players.length === 0) return;

    // اختيار لاعب برا السالفة عشوائيًا
    const specialIndex = Math.floor(Math.random() * players.length);
    const specialPlayer = players[specialIndex];

    // اختيار رقم عشوائي للكلمة العادية
    const normalNumbers = Object.keys(wordsList).map(n => parseInt(n));
    let normalIndex = Math.floor(Math.random() * normalNumbers.length);
    let normalWord = wordsList[normalNumbers[normalIndex]];

    // اختيار كلمة خاصة للاعب المختار مختلفة عن الكلمة العادية
    let specialIndexNum;
    do {
        specialIndexNum = Math.floor(Math.random() * normalNumbers.length);
    } while (normalNumbers[specialIndexNum] === normalNumbers[normalIndex]);
    let specialWord = wordsList[normalNumbers[specialIndexNum]];

    currentWord = {
        normalWord,
        specialWord,
        specialPlayerId: specialPlayer.id
    };

    // إرسال الكلمات لكل لاعب
    players.forEach(p => {
        if (p.id === specialPlayer.id) {
            p.ws.send(JSON.stringify({ type: 'word', word: specialWord }));
        } else {
            p.ws.send(JSON.stringify({ type: 'word', word: normalWord }));
        }
    });
}
