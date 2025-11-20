// server.js
// Simple game server for "برا السالفة"
// Express + WebSocket (ws)
// In-memory state (single room). Designed for Render / local dev.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
// IMPORTANT: set PUBLIC_WS_URL in Render env to something like "wss://your-service.onrender.com/game"
// If not set, /join will attempt to infer from request (may not work behind proxies).
const PUBLIC_WS_URL = process.env.PUBLIC_WS_URL || null;

// ----- In-memory game state -----
const state = {
    players: [], // { id, name, ws, is_out (bool), word_id (number) }
    owner: null, // user id of the "owner" (player 1)
    status: 'waiting' // "waiting" | "running"
};

// helper: broadcast JSON to all connected players
function broadcast(obj) {
    const txt = JSON.stringify(obj);
    state.players.forEach(p => {
        if (p.ws && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(txt);
        }
    });
}

// helper: send update_state to all (without sending ws objects)
function sendUpdateState() {
    const safePlayers = state.players.map(p => ({
        id: p.id,
        name: p.name,
        is_out: p.is_out,
        word_id: p.word_id
    }));
    broadcast({
        type: 'update_state',
        state: {
            players: safePlayers,
            owner: state.owner,
            status: state.status
        }
    });
}

// choose random integer in [min, max]
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// assign the "out" player and word ids; then broadcast
function assignRound() {
    if (state.players.length === 0) {
        state.status = 'waiting';
        state.owner = null;
        sendUpdateState();
        return;
    }

    // ensure owner: player 0 in list (first to join)
    if (!state.owner) {
        state.owner = state.players[0].id;
    } else {
        // if owner disconnected, pick first present
        const ownerStillHere = state.players.find(p => p.id === state.owner);
        if (!ownerStillHere) {
            state.owner = state.players[0].id;
        }
    }

    // pick out player randomly among players
    const outIndex = randInt(0, state.players.length - 1);
    const outId = state.players[outIndex].id;

    // pick two distinct numbers between 1 and 8
    let a = randInt(1, 8);
    let b = randInt(1, 8);
    while (b === a) b = randInt(1, 8);

    // assign word_id and is_out flags
    state.players.forEach(p => {
        if (p.id === outId) {
            p.is_out = true;
            p.word_id = b;
        } else {
            p.is_out = false;
            p.word_id = a;
        }
    });

    state.status = 'running';
    sendUpdateState();
}

// remove player by ws (called on close) or by id
function removePlayerByWS(ws) {
    const idx = state.players.findIndex(p => p.ws === ws);
    if (idx !== -1) {
        state.players.splice(idx, 1);
    }
    // if owner gone, reset owner to first if exists
    if (state.players.length === 0) {
        state.owner = null;
        state.status = 'waiting';
    } else {
        state.owner = state.players[0].id;
    }
    // broadcast updated (players list with no word_id until assigned)
    sendUpdateState();
}

// ----- HTTP endpoints -----

// POST /join
// optional flow: frontend posts to /join to get ws URL to connect to
app.post('/join', (req, res) => {
    const { user_id, username } = req.body || {};
    if (!user_id || !username) {
        return res.status(400).json({ ok: false, error: 'user_id and username required' });
    }

    // Build ws url
    let wsUrl = PUBLIC_WS_URL;
    if (!wsUrl) {
        // attempt to infer (may fail behind proxy); prefer setting PUBLIC_WS_URL env var
        const proto = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('host');
        wsUrl = `${proto === 'https' ? 'wss' : 'ws'}://${host}/game`;
    }

    // reply with ws url
    res.json({ ok: true, ws_url: wsUrl });
});

// POST /restart
app.post('/restart', (req, res) => {
    const { user_id } = req.body || {};
    if (!user_id) {
        return res.status(400).json({ ok: false, error: 'user_id required' });
    }
    if (!state.owner || user_id !== state.owner) {
        return res.status(403).json({ ok: false, error: 'only the owner can restart' });
    }

    // clear per-round assignments then reassign
    state.players.forEach(p => {
        p.word_id = null;
        p.is_out = false;
    });

    assignRound();
    res.json({ ok: true });
});

// simple health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

// ----- create HTTP & WebSocket servers -----
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// handle websocket upgrade on /game
server.on('upgrade', (request, socket, head) => {
    const { url } = request;
    if (url === '/game') {
        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', (ws, request) => {
    // Expect the client to send an init message immediately:
    // { type: 'init', user_id: '123', username: 'Ali' }
    let initialized = false;
    let playerId = null;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (!initialized) {
                if (msg.type === 'init' && msg.user_id && msg.username) {
                    playerId = msg.user_id;
                    const username = msg.username;

                    // avoid duplicate entries: if same user_id reconnects, remove old
                    const oldIdx = state.players.findIndex(p => p.id === playerId);
                    if (oldIdx !== -1) {
                        // close old ws if present
                        const old = state.players[oldIdx];
                        try { if (old.ws && old.ws.readyState === WebSocket.OPEN) old.ws.close(); } catch(e){};
                        state.players.splice(oldIdx, 1);
                    }

                    // add player
                    const p = {
                        id: playerId,
                        name: username,
                        ws: ws,
                        is_out: false,
                        word_id: null
                    };
                    state.players.push(p);

                    // set owner if none
                    if (!state.owner) state.owner = playerId;

                    initialized = true;

                    // Immediately notify all of new players list (but word_id may be null until assignRound)
                    sendUpdateState();

                    // Optionally auto-start a round when a minimum players reached or when first player joined
                    // For simplicity, we will auto-assign when at least 2 players (you can change to 3+)
                    if (state.players.length >= 2 && state.status !== 'running') {
                        assignRound();
                    }
                } else {
                    // invalid init; ignore
                    ws.send(JSON.stringify({ type: 'error', message: 'send init first: {type:\"init\", user_id, username}' }));
                }
            } else {
                // Server doesn't expect many client messages via WS in current design.
                // But we could support chat or client requests later.
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            }
        } catch (err) {
            console.error('ws message parse error', err);
        }
    });

    ws.on('close', () => {
        removePlayerByWS(ws);
    });

    ws.on('error', () => {
        removePlayerByWS(ws);
    });
});

// start server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    if (PUBLIC_WS_URL) {
        console.log(`Public WS URL (env): ${PUBLIC_WS_URL}`);
    } else {
        console.log(`No PUBLIC_WS_URL env set; /join will try to infer ws URL from request`);
    }
});
