// =============================
// CONFIG
// =============================
const SERVER_URL = "https://barraalsalfaonline.onrender.com/";  // أثناء التجربة المحلية

// =============================
// المتغيرات العامة
// =============================
let socket;
let playerUsername;
let isHost = false;
let playerId;
let currentRole = "";

// =============================
// عناصر الواجهة
// =============================
const wordBox = document.getElementById("word-box");
const playerListDiv = document.getElementById("player-list");
const restartBtn = document.getElementById("restart-btn");
const playerStatusDiv = document.getElementById("player-status");
const previousSpecialDiv = document.getElementById("previous-special");

// =============================
// بيانات اللاعب (مؤقت)
playerUsername = "لاعب_" + Math.floor(Math.random() * 1000);
playerId = Math.floor(Math.random() * 999999);

// =============================
// الاتصال بالسيرفر
function connectToServer() {
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        console.log("تم الاتصال بالسيرفر!");
        wordBox.textContent = "تم الاتصال... ننتظر الجولة!";

        socket.send(JSON.stringify({
            type: "join",
            playerId,
            username: playerUsername
        }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // DEBUG: اطبع البيانات القادمة للتأكد
        console.log("Received from server:", data);

        switch (data.type) {

            case "word":
                // عرض الرقم + تحديث الحالة
                wordBox.textContent = data.number;

                // تحديث الدور من status الذي يرسله السيرفر ("special" أو "normal")
                currentRole = data.status;

                playerStatusDiv.textContent =
                    (currentRole === "special") ? "⭐ لاعب خاص" : "لاعب عادي";

                break;

            case "players":
                updatePlayerList(data.players);
                break;

            case "host":
                isHost = true;
                restartBtn.style.display = "inline-block";
                break;

            case "previousSpecial":
                previousSpecialDiv.textContent =
                    "اللاعب الخاص السابق: " + data.username;
                break;

            case "cannotStart":
                wordBox.textContent = "❌ لا يمكن بدء الجولة: " + data.reason;
                break;

            default:
                console.warn("نوع رسالة غير معروف:", data);
        }
    };

    socket.onerror = (err) => {
        console.error("خطأ:", err);
        wordBox.textContent = "❌ خطأ في الاتصال بالسيرفر";
    };

    socket.onclose = () => {
        wordBox.textContent = "❗ تم قطع الاتصال — أعد تحميل الصفحة";
        restartBtn.style.display = "none";
    };
}

// =============================
// تحديث قائمة اللاعبين
function updatePlayerList(players) {
    if (!players || players.length === 0) {
        playerListDiv.textContent = "لا يوجد لاعبون بعد";
        return;
    }

    playerListDiv.innerHTML = players
        .map(p => "• " + p.username)
        .join("<br>");
}

// =============================
// زر إعادة البدء
restartBtn.onclick = () => {
    if (!isHost) return;

    socket.send(JSON.stringify({
        type: "restart",
        playerId
    }));
};

// =============================
// تشغيل الاتصال
connectToServer();



