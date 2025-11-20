async function startApp() {

    // Discord SDK
    const discordSdk = new window.DiscordSDK(1440848661717192807);
    await discordSdk.ready();

    const SERVER_URL = "wss://barraalsalfaonline.onrender.com"; // ضع رابط Render هنا

    let socket;
    let playerId = null;
    let playerName = null;
    let isHost = false;

    const wordBox = document.getElementById("word-box");
    const playerListDiv = document.getElementById("player-list");
    const restartBtn = document.getElementById("restart-btn");

    const user = await discordSdk.commands.getCurrentUser();
    playerId = user.id;
    playerName = user.username;

    console.log("Player connected:", playerId, playerName);

    function connectToServer() {
        socket = new WebSocket(SERVER_URL);

        socket.onopen = () => {
            console.log("WebSocket connected!");
            wordBox.textContent = "تم الاتصال... ننتظر الدور!";

            socket.send(JSON.stringify({
                type: "join",
                playerId: playerId,
                playerName: playerName
            }));
        };

        socket.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "word") wordBox.textContent = data.word;
            if (data.type === "players") updatePlayerList(data.players);
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
            console.warn("WS closed:", e.code, e.reason);
            wordBox.textContent = "⚠ تم قطع الاتصال بالسيرفر";
        };
    }

    function updatePlayerList(players) {
        playerListDiv.innerHTML =
            "اللاعبين المتصلين:<br>" +
            players.map(p => `• ${p.name} (${p.id})`).join("<br>");
    }

    restartBtn.onclick = () => {
        if (!isHost) return;
        socket.send(JSON.stringify({ type: "restart", playerId: playerId }));
    };

    connectToServer();
}

startApp();
