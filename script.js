// =============================
// CONFIG
// =============================

import { DiscordSDK, Events } from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(1440848661717192807);

await discordSdk.ready();

// بعدها تقدر ترسل وتستقبل أحداث من Discord


// لاحقًا سنضع رابط السيرفر الذي تستضيفه على Render
const SERVER_URL = "wss://barraalsalfaonline.onrender.com";

let socket;
let playerId = null;
let isHost = false;  // اللاعب 1

// عناصر الواجهة
const wordBox = document.getElementById("word-box");
const playerListDiv = document.getElementById("player-list");
const restartBtn = document.getElementById("restart-btn");

// =============================
// الاتصال بالسيرفر
// =============================
function connectToServer() {
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        wordBox.textContent = "تم الاتصال... ننتظر الدور!";

        // Discord Activities API — استرجاع معلومات اللاعب
        // في النسخة الأولى سنستخدم Player ID بسيط
        playerId = Math.floor(Math.random() * 999999);

        socket.send(JSON.stringify({
            type: "join",
            playerId: playerId
        }));
    };

    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "word") {
            wordBox.textContent = data.word;
        }

        if (data.type === "players") {
            updatePlayerList(data.players);
        }

        if (data.type === "host") {
            isHost = true;
            restartBtn.style.display = "inline-block";
        }
    };

    socket.onerror = () => {
        wordBox.textContent = "❌ خطأ في الاتصال — تأكد من أن السيرفر يعمل";
    };
}

// =============================
// تحديث قائمة اللاعبين
// =============================
function updatePlayerList(players) {
    playerListDiv.innerHTML = "اللاعبين المتصلين:<br>" +
        players.map(p => "• لاعب " + p.id).join("<br>");
}

// =============================
// زر إعادة البدء
// =============================
restartBtn.onclick = () => {
    socket.send(JSON.stringify({
        type: "restart",
        playerId: playerId
    }));
};

// ابدأ الاتصال
connectToServer();

