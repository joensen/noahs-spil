const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const PREVIEW_BLOCK = 24;
const EMPTY = 0;

const COLORS = {
    I: "#53d7ff",
    J: "#4d7cff",
    L: "#ff9f43",
    O: "#ffd93d",
    S: "#49d17d",
    T: "#b36bff",
    Z: "#ff5d73"
};

const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

const scoreValues = [0, 100, 300, 500, 800];

const boardCanvas = document.getElementById("tetris");
const boardCtx = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next-piece");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");

let board = [];
let score = 0;
let lines = 0;
let level = 1;
let currentPiece = null;
let nextPiece = null;
let dropCounter = 0;
let lastTime = 0;
let animationFrame = null;
let isRunning = false;
let isPaused = false;

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
}

function randomType() {
    const types = Object.keys(SHAPES);
    return types[Math.floor(Math.random() * types.length)];
}

function createPiece(type = randomType()) {
    return {
        type,
        color: COLORS[type],
        matrix: cloneMatrix(SHAPES[type]),
        x: 0,
        y: 0
    };
}

function resetStats() {
    score = 0;
    lines = 0;
    level = 1;
    updateStats();
}

function updateStats() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
}

function setStatus(message) {
    statusEl.textContent = message;
}

function showOverlay(title, message) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

function startGame() {
    board = createBoard();
    resetStats();
    currentPiece = createPiece();
    nextPiece = createPiece();
    spawnPiece(currentPiece);
    drawNextPiece();
    dropCounter = 0;
    lastTime = 0;
    isRunning = true;
    isPaused = false;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    hideOverlay();
    setStatus("Game on. Keep the stack clean.");

    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }

    draw();
    animationFrame = requestAnimationFrame(update);
}

function spawnPiece(piece) {
    piece.y = 0;
    piece.x = Math.floor((COLS - piece.matrix[0].length) / 2);

    if (collides(board, piece)) {
        endGame();
    }
}

function getDropInterval() {
    return Math.max(120, 800 - (level - 1) * 65);
}

function update(time = 0) {
    if (!isRunning) {
        return;
    }

    const delta = time - lastTime;
    lastTime = time;

    if (!isPaused) {
        dropCounter += delta;
        if (dropCounter >= getDropInterval()) {
            dropPiece();
        }
        draw();
    }

    animationFrame = requestAnimationFrame(update);
}

function drawCell(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
    ctx.strokeStyle = "rgba(7, 17, 31, 0.42)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawMatrix(ctx, matrix, offsetX, offsetY, size, color) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawCell(ctx, x + offsetX, y + offsetY, size, color);
            }
        });
    });
}

function drawBoard() {
    boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    board.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell !== EMPTY) {
                drawCell(boardCtx, x, y, BLOCK, cell);
            }
        });
    });
}

function drawGhostPiece() {
    const ghost = {
        matrix: currentPiece.matrix,
        x: currentPiece.x,
        y: currentPiece.y,
        color: currentPiece.color
    };

    while (!collides(board, ghost)) {
        ghost.y += 1;
    }
    ghost.y -= 1;

    boardCtx.save();
    boardCtx.globalAlpha = 0.24;
    drawMatrix(boardCtx, ghost.matrix, ghost.x, ghost.y, BLOCK, currentPiece.color);
    boardCtx.restore();
}

function drawCurrentPiece() {
    drawMatrix(boardCtx, currentPiece.matrix, currentPiece.x, currentPiece.y, BLOCK, currentPiece.color);
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) {
        return;
    }

    const matrix = nextPiece.matrix;
    const width = matrix[0].length * PREVIEW_BLOCK;
    const height = matrix.length * PREVIEW_BLOCK;
    const offsetX = Math.floor((nextCanvas.width - width) / 2 / PREVIEW_BLOCK);
    const offsetY = Math.floor((nextCanvas.height - height) / 2 / PREVIEW_BLOCK);
    drawMatrix(nextCtx, matrix, offsetX, offsetY, PREVIEW_BLOCK, nextPiece.color);
}

function draw() {
    drawBoard();
    if (currentPiece) {
        drawGhostPiece();
        drawCurrentPiece();
    }
}

function collides(grid, piece) {
    return piece.matrix.some((row, y) => {
        return row.some((value, x) => {
            if (!value) {
                return false;
            }

            const nextX = x + piece.x;
            const nextY = y + piece.y;

            return (
                nextX < 0 ||
                nextX >= COLS ||
                nextY >= ROWS ||
                (nextY >= 0 && grid[nextY][nextX] !== EMPTY)
            );
        });
    });
}

function mergePiece() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[y + currentPiece.y][x + currentPiece.x] = currentPiece.color;
            }
        });
    });
}

function clearLines() {
    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (board[y].every((cell) => cell !== EMPTY)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(EMPTY));
            cleared += 1;
            y += 1;
        }
    }

    if (!cleared) {
        return;
    }

    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    score += scoreValues[cleared] * level;
    updateStats();

    if (cleared === 4) {
        setStatus("Tetris! Four lines cleared.");
    } else {
        setStatus(`${cleared} line${cleared > 1 ? "s" : ""} cleared.`);
    }
}

function lockPiece() {
    mergePiece();
    clearLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    spawnPiece(currentPiece);
    drawNextPiece();
}

function movePiece(direction) {
    if (!isRunning || isPaused) {
        return;
    }

    currentPiece.x += direction;
    if (collides(board, currentPiece)) {
        currentPiece.x -= direction;
    }
}

function rotate(matrix) {
    return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function rotatePiece() {
    if (!isRunning || isPaused) {
        return;
    }

    const original = currentPiece.matrix;
    const rotated = rotate(currentPiece.matrix);
    const kickTests = [0, -1, 1, -2, 2];

    for (const offset of kickTests) {
        currentPiece.matrix = rotated;
        currentPiece.x += offset;

        if (!collides(board, currentPiece)) {
            return;
        }

        currentPiece.x -= offset;
    }

    currentPiece.matrix = original;
}

function dropPiece() {
    if (!isRunning || isPaused) {
        return;
    }

    currentPiece.y += 1;
    dropCounter = 0;

    if (collides(board, currentPiece)) {
        currentPiece.y -= 1;
        lockPiece();
    }
}

function hardDrop() {
    if (!isRunning || isPaused) {
        return;
    }

    while (!collides(board, currentPiece)) {
        currentPiece.y += 1;
    }

    currentPiece.y -= 1;
    score += 20;
    updateStats();
    lockPiece();
}

function togglePause() {
    if (!isRunning) {
        return;
    }

    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";

    if (isPaused) {
        showOverlay("Paused", "Press P or Resume to keep playing.");
        setStatus("Game paused.");
    } else {
        hideOverlay();
        setStatus("Back in it.");
    }
}

function endGame() {
    isRunning = false;
    isPaused = false;
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    showOverlay("Game Over", `Final score: ${score}`);
    setStatus("Board filled up. Start a new round?");

    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(key)) {
        event.preventDefault();
    }

    if (key === "p" || key === "P") {
        togglePause();
        return;
    }

    if (!isRunning || isPaused) {
        return;
    }

    switch (key) {
        case "ArrowLeft":
            movePiece(-1);
            break;
        case "ArrowRight":
            movePiece(1);
            break;
        case "ArrowDown":
            score += 1;
            updateStats();
            dropPiece();
            break;
        case "ArrowUp":
            rotatePiece();
            break;
        case " ":
            hardDrop();
            break;
        default:
            break;
    }
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);

pauseButton.disabled = true;
board = createBoard();
drawNextPiece();
draw();
showOverlay("Ready?", "Press Start Game to begin.");
