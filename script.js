// =============================
// MAIN FUNCTION
// =============================
async function startApp() {

    // Discord SDK
    const discordSdk = new window.DiscordSDK(1440848661717192807);
    await discordSdk.ready();

    // رابط السيرفر (Render)
    const SERVER_URL = "wss://barraalsalfaonline.onrender.com";

    let socket;
    let playerId = null;
    let isHost = false;

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

            // Player ID بسيط (لاحقًا نستخدم Discord Identity)
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
            wordBox.textContent = "❌ خطأ في الاتصال — تأكد أن السيرفر يعمل";
        };
    }

    // =============================
    // تحديث قائمة اللاعبين
    // =============================
    function updatePlayerList(players) {
        playerListDiv.innerHTML =
            "اللاعبين المتصلين:<br>" +
            players.map(p => `• لاعب ${p.id}`).join("<br>");
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
}

// شغل التطبيق
startApp();
