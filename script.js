// =============================
// CONFIG
// =============================

// تحميل Discord Embedded App SDK من المتصفح (من CDN)
const discordSdk = new window.DiscordSDK("1440848661717192807");

// رابط السيرفر (WebSocket)
const SERVER_URL = "wss://barraalsalfaonline.onrender.com";

let socket;
let playerId = null;
let playerName = null;
let isHost = false; // اللاعب الأول

// عناصر الواجهة
const wordBox = document.getElementById("word-box");
const playerListDiv = document.getElementById("player-list");
const restartBtn = document.getElementById("restart-btn");

// =======================================
// 1) تفعيل Discord SDK
// =======================================
async function initDiscord() {
    await discordSdk.ready();  
    console.log("Discord SDK ready!");

    // الحصول على معلومات اللاعب الحالي
    const user = await discordSdk.commands.getCurrentUser();
    
    playerId = user.id;         // ID حقيقي من ديسكورد
    playerName = user.username; // اسم اللاعب
    
    console.log("Player:", playerId, playerName);
}

// =======================================
// 2) الاتصال بالسيرفر عبر WebSocket
// =======================================
function connectToServer() {
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        wordBox.textContent = "متصل بالسيرفر...";

        // إرسال بيانات اللاعب عند الاتصال
        socket.send(JSON.stringify({
            type: "join",
            playerId: playerId,
            playerName: playerName
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
        wordBox.textContent = "❌ خطأ في الاتصال بالسيرفر";
    };
}

// =======================================
// 3) عرض قائمة اللاعبين
// =======================================
function updatePlayerList(players) {
    playerListDiv.innerHTML =
        "اللاعبين المتصلين:<br>" +
        players.map(p => `• ${p.name} (${p.id})`).join("<br>");
}

// =======================================
// 4) زر إعادة البدء
// =======================================
restartBtn.onclick = () => {
    if (!isHost) return; // فقط المضيف
    
    socket.send(JSON.stringify({
        type: "restart",
        playerId: playerId
    }));
};

// =======================================
// 5) تشغيل البرنامج
// =======================================
async function start() {
    await initDiscord();
    connectToServer();
}

start();
