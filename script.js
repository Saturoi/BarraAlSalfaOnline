// هذا الكود يكتشف تلقائياً رابط السيرفر (سواء كنت تجرب على هاتفك أو رفعته على الإنترنت)
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const SERVER_URL = `${protocol}//${window.location.host}`;


let socket;
let isHost = false;

// عناصر الواجهة
const joinScreen = document.getElementById("join-screen");
const gameScreen = document.getElementById("game-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");

const wordBox = document.getElementById("word-box");
const playerStatusDiv = document.getElementById("player-status");
const playerListDiv = document.getElementById("player-list");
const restartBtn = document.getElementById("restart-btn");

// وظيفة الاتصال
function connectToServer(chosenName) {
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        // إخفاء شاشة الدخول وإظهار اللعبة
        joinScreen.style.display = "none";
        gameScreen.style.display = "block";
        
        // إرسال الاسم للسيرفر
        socket.send(JSON.stringify({ type: "join", username: chosenName }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case "players":
                playerListDiv.innerHTML = data.players.map(p => 
                    `<li>${p.username} ${p.isHost ? '👑' : ''}</li>`
                ).join("");
                break;

            case "host":
                isHost = true;
                restartBtn.style.display = "block";
                break;

            case "role":
                if (data.status === "out") {
                    playerStatusDiv.textContent = "🕵️ أنت برا السالفة!";
                    playerStatusDiv.className = "status out";
                } else {
                    playerStatusDiv.textContent = "👥 أنت في السالفة";
                    playerStatusDiv.className = "status in";
                }
                wordBox.textContent = data.word;
                break;

            case "error":
                alert(data.message);
                break;
        }
    };

    socket.onclose = () => {
        alert("❌ انقطع الاتصال بالسيرفر");
        location.reload(); // إعادة تحميل الصفحة للعودة لشاشة الدخول
    };
}

// عند الضغط على زر انضمام
joinBtn.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    if (name.length < 2) {
        alert("يرجى إدخال اسم مكون من حرفين على الأقل");
        return;
    }
    connectToServer(name);
});

// زر إعادة البدء للمضيف
restartBtn.addEventListener("click", () => {
    if (isHost && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "restart" }));
    }
});
