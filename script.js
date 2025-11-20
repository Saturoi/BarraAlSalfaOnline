// =============================
// MAIN FUNCTION
// =============================
async function startApp() {

    // =============================
    // Discord SDK
    // =============================
    const discordSdk = new window.DiscordSDK(1440848661717192807);
    await discordSdk.ready();

    // =============================
    // WebSocket Server
    // =============================
    const SERVER_URL = "wss://barraalsalfaonline.onrender.com";

    let socket;
    let playerId = null;
    let playerName = null;
    let isHost = false;

    // عناصر الواجهة
    const wordBox = document.getElementById("word-box");
    const playerListDiv = document.getElementById("player-list");
    const restartBtn = document.getElementById("restart-btn");

    // =============================
    // احصل على معلومات اللاعب
    // =============================
    const user = await discordSdk.commands.getCurrentUser();
    playerId = user.id;
    playerName = user.username;

    console.log("Player connected:", playerId, playerName);

    // =============================
    // اتصال WebSocket
    // =============================
    function connectToServer() {
        socket = new WebSocket(SERVER_URL);

        socket.onopen = () => {
            console.log("WebSocket connected!");
            wordBox.textContent = "تم الاتصال... ننتظر الدور!";

            // إرسال بيانات اللاعب للسيرفر
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

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            wordBox.textContent = "❌ خطأ في الاتصال بالسيرفر";
        };

        socket.onclose = (e) => {
            console.warn("WebSocket closed:", e.code, e.reason);
            wordBox.textContent = "⚠ تم قطع الاتصال بالسيرفر";
        };
    }

    // =============================
    // تحديث قائمة اللاعبين
    // =============================
    function updatePlayerList(players) {
        playerListDiv.innerHTML =
            "اللاعبين المتصلين:<br>" +
            players.map(p => `• ${p.name} (${p.id})`).join("<br>");
    }

    // =============================
    // زر إعادة البدء
    // =============================
    restartBtn.onclick = () => {
        if (!isHost) return;

        socket.send(JSON.stringify({
            type: "restart",
            playerId: playerId
        }));
    };

    // بدء الاتصال
    connectToServer();
}

startApp();
