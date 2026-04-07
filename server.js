const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const MIN_PLAYERS = 3;

// خادم HTTP لإرضاء فحص الصحة (Health Check) الخاص بمنصة Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is UP and Running!');
});

// خادم اللعبة WebSocket
const wss = new WebSocket.Server({ server });

// قائمة السواليف
const words = {
    "001": "شركة آبل",
    "002": "تحريف الإنجيل",
    "003": "يوسف-70",
    "004": "لابتوب",
    "005": "السيسي",
    "006": "شبح موديل 90",
    "007": "إلنترا",
    "008": "باب الحارة",
    "009": "قير عادي",
    "010": "المبرمج Saturoi",
    "011": "أحمد شو تهكر",
    "012": "صالح | oPiiLz",
    "013": "شاورما",
    "014": "بلايستيشن 5",
    "015": "ماينكرافت",
    "016": "موسم الرياض",
    "017": "كبسة سعودية",
    "018": "منسف أردني",
    "019": "دولمة عراقية",
    "020": "كشري مصري",
    "021": "مفتول فلسطيني",
    "022": "بي سي جيمنج",
    "023": "لاق",
    "024": "دروب فريم",
    "025": "برنامج مكسر إحترافي",
    "026": "أهرامات مصر",
    "027": "ديسكورد",
    "028": "سيت أب",
    "029": "سماعة محيطية",
    "030": "أعلان يوتيوب",
    "031": "مدير القروب",
    "032": "أنترنت محدود",
    "033": "أختبارات",
    "034": "بطاقة بنك",
    "035": "رسالة صوتية",
    "036": "نتفلكس",
    "037": "شاحن",
    "038": "جوال أيفون",
    "039": "جوال أندرويد",
    "040": "جوال نوكيا",
    "041": "زحمة سير",
    "042": "طعمية",
    "043": "ببجي",
    "044": "شاشة جيمنج",
    "045": "هكر",
    "046": "شاص غمارة",
    "047": "كامري 2011",
    "048": "ساهر",
    "049": "مايك خربان",
    "050": "شاي كرك",
    "051": "تحديث ويندوز",
    "052": "ياخي حمل لينكس",
    "053": "ون بيس",
    "054": "أتتاك أون تايتن",
    "055": "ديمون سلاير",
    "056": "إم إف قوست",
    "057": "بيم إن جي درايف",
    "058": "فورزا هورايزن",
    "059": "بلايستيشن 2",
    "060": "رزدنت إيفل",
    "061": "دارك",
    "062": "جراند - سان أندرياس",
    "063": "جراند - 5",
    "064": "ستاك 64",
    "065": "تفحيط",
    "066": "بندريتا",
    "067": "ديث نوت (الأنمي)",
    "068": "ديث نوت (الدفتر)",
    "069": "أيم بوت",
    "070": "أبو فلة",
    "071": "دحومي 999",
    "072": "انقطاع الكهرباء",
    "073": "ناروتو",
    "074": "الشكشوكة الإيطالية",
    "075": "هنتر x هنتر",
    "076": "المافيا الإيطالية",
    "078": "إينيشال دي",
    "079": "المحقق كونان",
    "080": "كيف تروض تنين",
    "081": "سبونج بوب",
    "082": "صدام حسين",
    "083": "بوكونو هيرو أكاديمي",
    "084": "الشات العام",
    "085": "ليون سكوت كينيدي",
    "086": "إيلون ماسك",
    "087": "أمونقوص",
    "088": "قوست أوف تسوشيما",
    "089": "وار ثندر",
    "090": "بيكو بارك",
    "091": "ستيم",
    "092": "لعبة برا السالفة !!",
    "093": "تاسك مانيجر",
    "094": "ذكاء اصطناعي",
    "095": "زنجي",
    "096": "صاصوكي",
    "097": "قير أوتوماتيك",
    "098": "شيلات",
    "099": "عصير",
    "100": "مندوب طلبات",
    "101": "أيباد",
    "102": "قلم",
    "103": "كروكس",
    "104": "قارورة ماء",
    "105": "شباك",
    "107": "نبتة زينة",
    "108": "مفتاح",
    "109": "باب",
    "110": "مرايا",
    "111": "بطارية",
    "112": "بسبوسة",
    "113": "مكيف",
    "114": "سيف كاتانا",
    "115": "سيف",
    "116": "درع",
    "117": "ساموراي",
    "118": "قطة",
    "119": "خزنة",
    "120": "شقلاطة جلكسي",
    "121": "طيارة",
    "122": "ساعة يد",
    "123": "علم",
    "124": "صمغ",
    "125": "كونترولر",
    "126": "ألوان",
    "127": "سلك",
    "128": "دفتر",
    "129": "سيارة",
    "130": "باص",
    "131": "آلة حاسبة",
    "132": "ماوس",
    "133": "كيبورد",
    "134": "طاولة",
    "135": "دُمية",
    "136": "كوب / كأس",
    "137": "عنكبوت",
    "138": "حصان",
    "139": "عنترة ابن شداد",
    "140": "امرؤ القيس",
    "141": "أسامة بن لادن",
    "142": "أظافر",
    "143": "مكتب",
    "144": "شاشة 144 هيرتز",
    "145": "تخزين RAM",
    "146": "كتاب",
    "147": "مصحف",
    "148": "نكاشة أسنان",
    "149": "صحن",
    "150": "ملعقة",
    "151": "سكينة",
    "152": "شوكة",
    "153": "إكس بوكس",
    "154": "أبو عبيدة"
};

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
        if (host) host.ws.send(JSON.stringify({ type: 'error', message: 'أقل شي 3 نفر سديك' }));
        return;
    }

    const specialIndex = Math.floor(Math.random() * players.length);
    const wordKeys = Object.keys(words);
    
    // سحب كلمة عشوائية من القائمة المدمجة
    const randomKey = wordKeys[Math.floor(Math.random() * wordKeys.length)];
    const selectedWord = words[randomKey]; 
    const displayNumber = randomKey.padStart(3, '0');

     players.forEach((p, index) => {
        if (index === specialIndex) {
            p.ws.send(JSON.stringify({ type: 'role', status: 'out', word: 'حاول تعرف السالفة!'}));
        } else {
            // تم إزالة الرقم، وستظهر الكلمة فقط
            p.ws.send(JSON.stringify({ type: 'role', status: 'in', word: selectedWord }));
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
