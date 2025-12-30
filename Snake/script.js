// P2P Snake Battle with WebRTC + Firebase Signaling
// Automatic connection via room codes!

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import { getDatabase, ref, set, onValue, push, remove, onDisconnect } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDN8WfrI0V7XBr2RYxGdG-ae1s3WJZGECU",
    authDomain: "p2psnake.firebaseapp.com",
    databaseURL: "https://p2psnake-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "p2psnake",
    storageBucket: "p2psnake.firebasestorage.app",
    messagingSenderId: "26141565584",
    appId: "1:26141565584:web:2803e789e121a880b86e15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let peerConnection = null;
let dataChannel = null;
let isHost = false;
let isPlayingBot = false;
let playerName = '';
let opponentName = 'Opponent';
let roomId = null;
let unsubscribers = [];

// STUN servers for NAT traversal
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// DOM Elements - Name
const namePanel = document.getElementById('name-panel');
const playerNameInput = document.getElementById('player-name');
const nameSubmitBtn = document.getElementById('name-submit-btn');

// DOM Elements - Connection
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const hostSection = document.getElementById('host-section');
const guestSection = document.getElementById('guest-section');
const connectionStatus = document.getElementById('connection-status');
const connectionPanel = document.getElementById('connection-panel');
let roomListUnsub = null;

// DOM Elements - Game
const gamePanel = document.getElementById('game-panel');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const winnerBanner = document.getElementById('winner-banner');

// Game constants
const GRID_SIZE = 25;
const CELL_SIZE = canvas.width / GRID_SIZE;
const GROW_INTERVAL = 2000;
const GAME_SPEED = 200;

// Game state
let gameRunning = false;
let gameStartTime = 0;
let gameLoopId = null;
let mySnake = [];
let opponentSnake = [];
let myDirection = { x: 0, y: -1 };
let nextDirection = { x: 0, y: -1 };
let highscores = JSON.parse(localStorage.getItem('snakeHighscores') || '[]');

// Bot state
let botDirection = { x: 0, y: 1 };
let botNextDirection = { x: 0, y: 1 };

// Colors
const MY_COLOR = '#00ff64';
const MY_HEAD_COLOR = '#00cc50';
const OPPONENT_COLOR = '#ff6464';
const OPPONENT_HEAD_COLOR = '#cc5050';

// Generate a random 4-letter room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Name submission
nameSubmitBtn.addEventListener('click', submitName);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitName();
});

function submitName() {
    const name = playerNameInput.value.trim();
    if (name.length > 0) {
        playerName = name;
        namePanel.classList.add('hidden');
        connectionPanel.classList.remove('hidden');
    } else {
        playerNameInput.focus();
    }
}

// Initialize peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Collect ICE candidates and send to Firebase
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && roomId) {
            const candidateRef = ref(db, `rooms/${roomId}/candidates/${isHost ? 'host' : 'guest'}`);
            push(candidateRef, event.candidate.toJSON());
        }
    };

    peerConnection.onconnectionstatechange = () => {
        updateStatus(peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            sendMessage({ type: 'name', name: playerName });
            // Clean up Firebase room after connection is established
            cleanupRoom();
            startGame();
        }
    };

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
    };

    return peerConnection;
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        updateStatus('connected');
        sendMessage({ type: 'name', name: playerName });
        startGame();
    };

    dataChannel.onclose = () => {
        updateStatus('disconnected');
        gameRunning = false;
    };

    dataChannel.onmessage = (event) => {
        handleMessage(JSON.parse(event.data));
    };
}

function sendMessage(msg) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(msg));
    }
}

function handleMessage(msg) {
    switch (msg.type) {
        case 'name':
            opponentName = msg.name;
            break;
        case 'snake':
            opponentSnake = msg.snake;
            break;
        case 'collision':
            handleWin();
            break;
        case 'highscore':
            addHighscore(msg.player, msg.time, false);
            break;
        case 'restart':
            resetGame();
            break;
    }
}

function updateStatus(state) {
    connectionStatus.textContent = `Status: ${state}`;
    connectionStatus.className = 'status';
    if (state === 'connected') {
        connectionStatus.classList.add('connected');
    } else if (state === 'failed' || state === 'disconnected') {
        connectionStatus.classList.add('error');
    }
}

// Clean up Firebase listeners
function cleanupListeners() {
    unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    unsubscribers = [];
}

// Clean up Firebase room
function cleanupRoom() {
    if (roomId) {
        remove(ref(db, `rooms/${roomId}`));
    }
    cleanupListeners();
}

// Host: Create a room
async function createRoom() {
    isHost = true;
    roomId = generateRoomCode();

    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    document.getElementById('play-bot-btn').disabled = true;
    hostSection.classList.remove('hidden');
    updateStatus('creating room...');

    createPeerConnection();
    dataChannel = peerConnection.createDataChannel('game');
    setupDataChannel();

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise(resolve => {
        if (peerConnection.iceGatheringState === 'complete') {
            resolve();
        } else {
            peerConnection.addEventListener('icegatheringstatechange', () => {
                if (peerConnection.iceGatheringState === 'complete') {
                    resolve();
                }
            });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        }
    });

    // Store offer in Firebase
    const roomRef = ref(db, `rooms/${roomId}`);
    await set(roomRef, {
        offer: {
            type: peerConnection.localDescription.type,
            sdp: peerConnection.localDescription.sdp
        },
        hostName: playerName,
        created: Date.now()
    });

    // Set up cleanup on disconnect
    onDisconnect(roomRef).remove();

    updateStatus('waiting for opponent...');

    // Listen for answer
    const answerRef = ref(db, `rooms/${roomId}/answer`);
    const answerUnsub = onValue(answerRef, async (snapshot) => {
        const answer = snapshot.val();
        if (answer && peerConnection.signalingState !== 'stable') {
            await peerConnection.setRemoteDescription(answer);
            updateStatus('connecting...');
        }
    });
    unsubscribers.push(answerUnsub);

    // Listen for guest ICE candidates
    const guestCandidatesRef = ref(db, `rooms/${roomId}/candidates/guest`);
    const candidatesUnsub = onValue(guestCandidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (candidates) {
            Object.values(candidates).forEach(candidate => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            });
        }
    });
    unsubscribers.push(candidatesUnsub);
}

// Start listening for available rooms
function startListeningForRooms() {
    const roomsRef = ref(db, 'rooms');
    roomListUnsub = onValue(roomsRef, (snapshot) => {
        const rooms = snapshot.val();
        renderRoomList(rooms);
    });
}

// Stop listening for rooms
function stopListeningForRooms() {
    if (roomListUnsub) {
        roomListUnsub();
        roomListUnsub = null;
    }
}

// Render the room list
function renderRoomList(rooms) {
    const roomListEl = document.getElementById('room-list');
    roomListEl.innerHTML = '';

    if (!rooms || Object.keys(rooms).length === 0) {
        roomListEl.innerHTML = '<p class="no-rooms">No rooms available. Ask a friend to create one!</p>';
        return;
    }

    for (const [code, room] of Object.entries(rooms)) {
        // Skip rooms that already have an answer (someone is joining)
        if (room.answer) continue;

        const roomEl = document.createElement('div');
        roomEl.className = 'room-item';
        roomEl.innerHTML = `
            <span class="room-host">${room.hostName || 'Unknown'}</span>
            <button class="btn primary" data-room="${code}">Join</button>
        `;
        roomEl.querySelector('button').addEventListener('click', () => joinRoom(code, room));
        roomListEl.appendChild(roomEl);
    }

    // If all rooms have answers, show no rooms message
    if (roomListEl.children.length === 0) {
        roomListEl.innerHTML = '<p class="no-rooms">No rooms available. Ask a friend to create one!</p>';
    }
}

// Guest: Join a room
async function joinRoom(code, roomData) {
    roomId = code;
    isHost = false;

    // Stop listening for rooms
    stopListeningForRooms();

    // Disable all join buttons
    document.querySelectorAll('#room-list button').forEach(btn => btn.disabled = true);

    updateStatus('joining room...');

    createPeerConnection();

    // Set remote description (the offer)
    await peerConnection.setRemoteDescription(roomData.offer);

    // Create and send answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise(resolve => {
        if (peerConnection.iceGatheringState === 'complete') {
            resolve();
        } else {
            peerConnection.addEventListener('icegatheringstatechange', () => {
                if (peerConnection.iceGatheringState === 'complete') {
                    resolve();
                }
            });
            setTimeout(resolve, 5000);
        }
    });

    // Store answer in Firebase
    await set(ref(db, `rooms/${roomId}/answer`), {
        type: peerConnection.localDescription.type,
        sdp: peerConnection.localDescription.sdp
    });

    updateStatus('connecting...');

    // Listen for host ICE candidates
    const hostCandidatesRef = ref(db, `rooms/${roomId}/candidates/host`);
    const candidatesUnsub = onValue(hostCandidatesRef, (snapshot) => {
        const candidates = snapshot.val();
        if (candidates) {
            Object.values(candidates).forEach(candidate => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            });
        }
    });
    unsubscribers.push(candidatesUnsub);
}

// Game functions
function startGame() {
    connectionPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');

    highscores = [];
    localStorage.setItem('snakeHighscores', JSON.stringify(highscores));
    updateHighscoreDisplay();

    resetGame();
}

function resetGame() {
    if (gameLoopId) {
        clearTimeout(gameLoopId);
        gameLoopId = null;
    }

    if (isHost) {
        mySnake = [{ x: 10, y: 20 }, { x: 10, y: 21 }, { x: 10, y: 22 }];
        myDirection = { x: 0, y: -1 };
    } else {
        mySnake = [{ x: 20, y: 10 }, { x: 20, y: 9 }, { x: 20, y: 8 }];
        myDirection = { x: 0, y: 1 };
    }
    nextDirection = { ...myDirection };

    if (isPlayingBot) {
        opponentSnake = [{ x: 20, y: 10 }, { x: 20, y: 9 }, { x: 20, y: 8 }];
        botDirection = { x: 0, y: 1 };
        botNextDirection = { x: 0, y: 1 };
    } else {
        opponentSnake = [];
    }

    gameStartTime = Date.now();
    gameRunning = true;

    setTimeout(() => {
        winnerBanner.classList.add('hidden');
    }, 2000);

    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;

    update();
    draw();

    gameLoopId = setTimeout(gameLoop, GAME_SPEED);
}

function update() {
    myDirection = { ...nextDirection };

    const head = mySnake[0];
    const newHead = {
        x: (head.x + myDirection.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + myDirection.y + GRID_SIZE) % GRID_SIZE
    };

    for (const segment of opponentSnake) {
        if (newHead.x === segment.x && newHead.y === segment.y) {
            handleLoss();
            return;
        }
    }

    for (let i = 0; i < mySnake.length - 1; i++) {
        if (newHead.x === mySnake[i].x && newHead.y === mySnake[i].y) {
            handleLoss();
            return;
        }
    }

    mySnake.unshift(newHead);

    const elapsed = Date.now() - gameStartTime;
    const targetLength = 3 + Math.floor(elapsed / GROW_INTERVAL);

    while (mySnake.length > targetLength) {
        mySnake.pop();
    }

    if (isPlayingBot) {
        updateBot();
    } else {
        sendMessage({ type: 'snake', snake: mySnake });
    }
}

function updateBot() {
    botDirection = { ...botNextDirection };

    const head = opponentSnake[0];
    const newHead = {
        x: (head.x + botDirection.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + botDirection.y + GRID_SIZE) % GRID_SIZE
    };

    for (const segment of mySnake) {
        if (newHead.x === segment.x && newHead.y === segment.y) {
            handleWin();
            return;
        }
    }

    for (let i = 0; i < opponentSnake.length - 1; i++) {
        if (newHead.x === opponentSnake[i].x && newHead.y === opponentSnake[i].y) {
            handleWin();
            return;
        }
    }

    opponentSnake.unshift(newHead);

    const elapsed = Date.now() - gameStartTime;
    const targetLength = 3 + Math.floor(elapsed / GROW_INTERVAL);

    while (opponentSnake.length > targetLength) {
        opponentSnake.pop();
    }

    botDecideDirection();
}

function botDecideDirection() {
    const head = opponentSnake[0];
    const possibleDirs = [];

    const directions = [
        { x: 0, y: -1, name: 'up' },
        { x: 0, y: 1, name: 'down' },
        { x: -1, y: 0, name: 'left' },
        { x: 1, y: 0, name: 'right' }
    ];

    for (const dir of directions) {
        if (dir.x === -botDirection.x && dir.y === -botDirection.y) {
            continue;
        }

        const newPos = {
            x: (head.x + dir.x + GRID_SIZE) % GRID_SIZE,
            y: (head.y + dir.y + GRID_SIZE) % GRID_SIZE
        };

        let safe = true;

        for (const segment of mySnake) {
            if (newPos.x === segment.x && newPos.y === segment.y) {
                safe = false;
                break;
            }
        }

        if (safe) {
            for (const segment of opponentSnake) {
                if (newPos.x === segment.x && newPos.y === segment.y) {
                    safe = false;
                    break;
                }
            }
        }

        if (safe) {
            possibleDirs.push(dir);
        }
    }

    if (possibleDirs.length > 0) {
        const currentDirSafe = possibleDirs.find(
            d => d.x === botDirection.x && d.y === botDirection.y
        );

        if (currentDirSafe && Math.random() > 0.2) {
            botNextDirection = { x: botDirection.x, y: botDirection.y };
        } else {
            const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            botNextDirection = { x: chosen.x, y: chosen.y };
        }
    }
}

function handleLoss() {
    gameRunning = false;
    const survivalTime = Date.now() - gameStartTime;

    if (!isPlayingBot) {
        sendMessage({ type: 'collision', survivalTime: survivalTime });
    }

    winnerBanner.textContent = `${playerName} crashed! Survived: ${survivalTime}ms`;
    winnerBanner.className = 'you-lose';
    winnerBanner.classList.remove('hidden');

    if (isPlayingBot) {
        const botSurvivalTime = Date.now() - gameStartTime;
        addHighscore(opponentName, botSurvivalTime, false);
    }

    setTimeout(() => {
        if (!isPlayingBot) {
            sendMessage({ type: 'restart' });
        }
        resetGame();
    }, 2500);
}

function handleWin() {
    gameRunning = false;
    const mySurvivalTime = Date.now() - gameStartTime;

    addHighscore(playerName, mySurvivalTime, !isPlayingBot);

    winnerBanner.textContent = `${playerName} wins! Survived: ${mySurvivalTime}ms`;
    winnerBanner.className = 'you-win';
    winnerBanner.classList.remove('hidden');

    if (isPlayingBot) {
        setTimeout(() => {
            resetGame();
        }, 2500);
    }
}

function addHighscore(player, time, sendToOpponent = false) {
    highscores.push({ player, time, date: new Date().toLocaleDateString() });
    highscores.sort((a, b) => b.time - a.time);
    highscores = highscores.slice(0, 10);
    localStorage.setItem('snakeHighscores', JSON.stringify(highscores));
    updateHighscoreDisplay();

    if (sendToOpponent) {
        sendMessage({ type: 'highscore', player, time });
    }
}

function updateHighscoreDisplay() {
    const list = document.getElementById('highscore-list');
    if (!list) return;

    list.innerHTML = '';
    highscores.forEach((score, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="player-name">${score.player}</span> <span class="score-time">${score.time}</span>`;
        list.appendChild(li);
    });

    if (highscores.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No high scores yet!';
        li.style.color = '#666';
        list.appendChild(li);
    }
}

function draw() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    opponentSnake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? OPPONENT_HEAD_COLOR : OPPONENT_COLOR;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });

    mySnake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? MY_HEAD_COLOR : MY_COLOR;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });

    const elapsed = Date.now() - gameStartTime;
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`Time: ${elapsed}ms`, 10, 24);
}

// Input handling
function handleDirection(dir) {
    if (!gameRunning) return;

    switch (dir) {
        case 'up':
            if (myDirection.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'down':
            if (myDirection.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'left':
            if (myDirection.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'right':
            if (myDirection.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            handleDirection('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            handleDirection('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            handleDirection('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            handleDirection('right');
            break;
    }
});

// D-pad touch/click handling
document.querySelectorAll('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.dir;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDirection(dir);
    });

    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleDirection(dir);
    });
});

// Connection button handlers
createRoomBtn.addEventListener('click', createRoom);

joinRoomBtn.addEventListener('click', () => {
    isHost = false;
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    document.getElementById('play-bot-btn').disabled = true;
    guestSection.classList.remove('hidden');
    startListeningForRooms();
});

// Play against bot
const playBotBtn = document.getElementById('play-bot-btn');
playBotBtn.addEventListener('click', () => {
    isHost = true;
    isPlayingBot = true;
    opponentName = 'Snake Bot';
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    playBotBtn.disabled = true;
    startGame();
});

// Initial highscore display
updateHighscoreDisplay();
