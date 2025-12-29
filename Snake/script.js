// P2P Snake Battle with WebRTC
// No server required!

let peerConnection = null;
let dataChannel = null;
let isHost = false;
let isPlayingBot = false;
let playerName = '';
let opponentName = 'Opponent';

// STUN servers for NAT traversal
const config = {
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
const createOfferBtn = document.getElementById('create-offer-btn');
const joinBtn = document.getElementById('join-btn');
const hostSection = document.getElementById('host-section');
const guestSection = document.getElementById('guest-section');
const offerOutput = document.getElementById('offer-output');
const offerInput = document.getElementById('offer-input');
const answerOutput = document.getElementById('answer-output');
const answerInput = document.getElementById('answer-input');
const copyOfferBtn = document.getElementById('copy-offer-btn');
const copyAnswerBtn = document.getElementById('copy-answer-btn');
const createAnswerBtn = document.getElementById('create-answer-btn');
const acceptAnswerBtn = document.getElementById('accept-answer-btn');
const connectionStatus = document.getElementById('connection-status');
const connectionPanel = document.getElementById('connection-panel');

// DOM Elements - Game
const gamePanel = document.getElementById('game-panel');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const winnerBanner = document.getElementById('winner-banner');

// Game constants
const GRID_SIZE = 25;
const CELL_SIZE = canvas.width / GRID_SIZE;
const GROW_INTERVAL = 2000; // Grow every 2 seconds
const GAME_SPEED = 200; // Move every 200ms (half speed)

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
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate === null) {
            if (offerOutput.value) {
                offerOutput.value = btoa(JSON.stringify(peerConnection.localDescription));
            }
            if (answerOutput.value) {
                answerOutput.value = btoa(JSON.stringify(peerConnection.localDescription));
            }
        }
    };

    peerConnection.onconnectionstatechange = () => {
        updateStatus(peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            // Send our name to opponent
            sendMessage({ type: 'name', name: playerName });
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
        // Send our name to opponent
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
            // Opponent reports they hit something
            handleWin();
            break;
        case 'highscore':
            // Opponent sent their highscore to add to our list
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

// Game functions
function startGame() {
    connectionPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');

    // Reset highscores for new connection
    highscores = [];
    localStorage.setItem('snakeHighscores', JSON.stringify(highscores));
    updateHighscoreDisplay();

    resetGame();
}

function resetGame() {
    // Stop any existing game loop
    if (gameLoopId) {
        clearTimeout(gameLoopId);
        gameLoopId = null;
    }

    // Initialize snakes at different positions, facing up/down (not at each other)
    if (isHost) {
        // Host starts on left side, facing up
        mySnake = [{ x: 10, y: 20 }, { x: 10, y: 21 }, { x: 10, y: 22 }];
        myDirection = { x: 0, y: -1 }; // Facing up
    } else {
        // Guest starts on right side, facing down
        mySnake = [{ x: 20, y: 10 }, { x: 20, y: 9 }, { x: 20, y: 8 }];
        myDirection = { x: 0, y: 1 }; // Facing down
    }
    nextDirection = { ...myDirection };

    // Initialize bot snake if playing against bot
    if (isPlayingBot) {
        opponentSnake = [{ x: 20, y: 10 }, { x: 20, y: 9 }, { x: 20, y: 8 }];
        botDirection = { x: 0, y: 1 }; // Facing down
        botNextDirection = { x: 0, y: 1 };
    } else {
        opponentSnake = [];
    }

    gameStartTime = Date.now();
    gameRunning = true;

    // Hide winner banner after a moment
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
    // Apply direction change
    myDirection = { ...nextDirection };

    // Calculate new head position with wrapping
    const head = mySnake[0];
    const newHead = {
        x: (head.x + myDirection.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + myDirection.y + GRID_SIZE) % GRID_SIZE
    };

    // Check collision with opponent snake
    for (const segment of opponentSnake) {
        if (newHead.x === segment.x && newHead.y === segment.y) {
            handleLoss();
            return;
        }
    }

    // Check collision with own snake (except last segment which will move)
    for (let i = 0; i < mySnake.length - 1; i++) {
        if (newHead.x === mySnake[i].x && newHead.y === mySnake[i].y) {
            handleLoss();
            return;
        }
    }

    // Move snake
    mySnake.unshift(newHead);

    // Grow over time (every 2 seconds)
    const elapsed = Date.now() - gameStartTime;
    const targetLength = 3 + Math.floor(elapsed / GROW_INTERVAL);

    while (mySnake.length > targetLength) {
        mySnake.pop();
    }

    // Send position to opponent (or update bot)
    if (isPlayingBot) {
        updateBot();
    } else {
        sendMessage({ type: 'snake', snake: mySnake });
    }
}

// Bot AI
function updateBot() {
    // Apply bot's direction change
    botDirection = { ...botNextDirection };

    // Calculate new head position with wrapping
    const head = opponentSnake[0];
    const newHead = {
        x: (head.x + botDirection.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + botDirection.y + GRID_SIZE) % GRID_SIZE
    };

    // Check if bot hits player's snake
    for (const segment of mySnake) {
        if (newHead.x === segment.x && newHead.y === segment.y) {
            handleWin();
            return;
        }
    }

    // Check if bot hits itself
    for (let i = 0; i < opponentSnake.length - 1; i++) {
        if (newHead.x === opponentSnake[i].x && newHead.y === opponentSnake[i].y) {
            handleWin();
            return;
        }
    }

    // Move bot snake
    opponentSnake.unshift(newHead);

    // Grow over time
    const elapsed = Date.now() - gameStartTime;
    const targetLength = 3 + Math.floor(elapsed / GROW_INTERVAL);

    while (opponentSnake.length > targetLength) {
        opponentSnake.pop();
    }

    // Bot AI: decide next direction
    botDecideDirection();
}

function botDecideDirection() {
    const head = opponentSnake[0];
    const possibleDirs = [];

    // Check all four directions
    const directions = [
        { x: 0, y: -1, name: 'up' },
        { x: 0, y: 1, name: 'down' },
        { x: -1, y: 0, name: 'left' },
        { x: 1, y: 0, name: 'right' }
    ];

    for (const dir of directions) {
        // Can't reverse direction
        if (dir.x === -botDirection.x && dir.y === -botDirection.y) {
            continue;
        }

        const newPos = {
            x: (head.x + dir.x + GRID_SIZE) % GRID_SIZE,
            y: (head.y + dir.y + GRID_SIZE) % GRID_SIZE
        };

        // Check if this position is safe
        let safe = true;

        // Check collision with player
        for (const segment of mySnake) {
            if (newPos.x === segment.x && newPos.y === segment.y) {
                safe = false;
                break;
            }
        }

        // Check collision with self
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

    // Choose a direction (prefer current direction if safe, otherwise random)
    if (possibleDirs.length > 0) {
        // Check if current direction is in safe options
        const currentDirSafe = possibleDirs.find(
            d => d.x === botDirection.x && d.y === botDirection.y
        );

        if (currentDirSafe && Math.random() > 0.2) {
            // 80% chance to keep going straight if safe
            botNextDirection = { x: botDirection.x, y: botDirection.y };
        } else {
            // Pick a random safe direction
            const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            botNextDirection = { x: chosen.x, y: chosen.y };
        }
    }
    // If no safe directions, bot will crash (keeps current direction)
}

function handleLoss() {
    gameRunning = false;
    const survivalTime = Date.now() - gameStartTime;

    // Notify opponent they won (if not playing bot)
    if (!isPlayingBot) {
        sendMessage({ type: 'collision', survivalTime: survivalTime });
    }

    // Show loss banner
    winnerBanner.textContent = `${playerName} crashed! Survived: ${survivalTime}ms`;
    winnerBanner.className = 'you-lose';
    winnerBanner.classList.remove('hidden');

    // When playing bot, add bot's score
    if (isPlayingBot) {
        const botSurvivalTime = Date.now() - gameStartTime;
        addHighscore(opponentName, botSurvivalTime, false);
    }

    // Restart after delay (give time for highscore sync)
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

    // Add to highscores (send to opponent only if not playing bot)
    addHighscore(playerName, mySurvivalTime, !isPlayingBot);

    // Show win banner
    winnerBanner.textContent = `${playerName} wins! Survived: ${mySurvivalTime}ms`;
    winnerBanner.className = 'you-win';
    winnerBanner.classList.remove('hidden');

    // When playing bot, auto restart after delay
    if (isPlayingBot) {
        setTimeout(() => {
            resetGame();
        }, 2500);
    }
}

function addHighscore(player, time, sendToOpponent = false) {
    highscores.push({ player, time, date: new Date().toLocaleDateString() });
    highscores.sort((a, b) => b.time - a.time);
    highscores = highscores.slice(0, 10); // Keep top 10
    localStorage.setItem('snakeHighscores', JSON.stringify(highscores));
    updateHighscoreDisplay();

    // Send highscore to opponent so they have it too
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
    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
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

    // Draw opponent snake
    opponentSnake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? OPPONENT_HEAD_COLOR : OPPONENT_COLOR;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });

    // Draw my snake
    mySnake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? MY_HEAD_COLOR : MY_COLOR;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });

    // Draw survival time
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

    // Handle both touch and click
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDirection(dir);
    });

    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleDirection(dir);
    });
});

// WebRTC Connection Setup
createOfferBtn.addEventListener('click', async () => {
    isHost = true;
    createOfferBtn.disabled = true;
    joinBtn.disabled = true;
    hostSection.classList.remove('hidden');

    createPeerConnection();
    dataChannel = peerConnection.createDataChannel('game');
    setupDataChannel();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    offerOutput.value = 'Gathering connection info...';
    setTimeout(() => {
        if (offerOutput.value === 'Gathering connection info...') {
            offerOutput.value = btoa(JSON.stringify(peerConnection.localDescription));
        }
    }, 2000);
});

acceptAnswerBtn.addEventListener('click', async () => {
    try {
        const answer = JSON.parse(atob(answerInput.value.trim()));
        await peerConnection.setRemoteDescription(answer);
        updateStatus('connecting...');
    } catch (e) {
        alert('Invalid answer! Make sure you copied the entire text.');
        console.error(e);
    }
});

joinBtn.addEventListener('click', () => {
    isHost = false;
    createOfferBtn.disabled = true;
    joinBtn.disabled = true;
    guestSection.classList.remove('hidden');
});

createAnswerBtn.addEventListener('click', async () => {
    try {
        const offer = JSON.parse(atob(offerInput.value.trim()));
        createPeerConnection();
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        answerOutput.value = 'Gathering connection info...';
        setTimeout(() => {
            if (answerOutput.value === 'Gathering connection info...') {
                answerOutput.value = btoa(JSON.stringify(peerConnection.localDescription));
            }
        }, 2000);

        updateStatus('waiting for connection...');
    } catch (e) {
        alert('Invalid offer! Make sure you copied the entire text.');
        console.error(e);
    }
});

copyOfferBtn.addEventListener('click', () => {
    offerOutput.select();
    navigator.clipboard.writeText(offerOutput.value);
    copyOfferBtn.textContent = 'Copied!';
    setTimeout(() => copyOfferBtn.textContent = 'Copy Offer', 2000);
});

copyAnswerBtn.addEventListener('click', () => {
    answerOutput.select();
    navigator.clipboard.writeText(answerOutput.value);
    copyAnswerBtn.textContent = 'Copied!';
    setTimeout(() => copyAnswerBtn.textContent = 'Copy Answer', 2000);
});

// Play against bot
const playBotBtn = document.getElementById('play-bot-btn');
playBotBtn.addEventListener('click', () => {
    isHost = true;
    isPlayingBot = true;
    opponentName = 'Snake Bot';
    createOfferBtn.disabled = true;
    joinBtn.disabled = true;
    playBotBtn.disabled = true;
    startGame();
});

// Initial highscore display
updateHighscoreDisplay();
