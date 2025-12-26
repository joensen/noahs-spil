// Game state
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
const humanPlayer = 'X';
const botPlayer = 'O';

// Game mode: 'classic' or 'threePiece'
let gameMode = null;

// Three-piece mode state
let humanPiecesPlaced = 0;
let botPiecesPlaced = 0;
const maxPieces = 3;
let phase = 'placement'; // 'placement' or 'movement'
let selectedPiece = null;

// Winning combinations
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// DOM elements
const cells = document.querySelectorAll('.cell');
const status = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const modeSelector = document.getElementById('modeSelector');
const gameInfo = document.getElementById('gameInfo');
const boardElement = document.getElementById('board');
const classicModeBtn = document.getElementById('classicMode');
const threePieceModeBtn = document.getElementById('threePieceMode');
const piecesInfo = document.getElementById('piecesInfo');
const humanPiecesDisplay = document.getElementById('humanPieces');
const botPiecesDisplay = document.getElementById('botPieces');

// Initialize game
function init() {
    classicModeBtn.addEventListener('click', () => startGame('classic'));
    threePieceModeBtn.addEventListener('click', () => startGame('threePiece'));
    restartBtn.addEventListener('click', restartGame);
}

// Start game with selected mode
function startGame(mode) {
    gameMode = mode;
    modeSelector.style.display = 'none';
    gameInfo.style.display = 'block';
    boardElement.style.display = 'grid';
    restartBtn.style.display = 'inline-block';

    if (mode === 'threePiece') {
        piecesInfo.style.display = 'flex';
        updatePiecesDisplay();
    }

    setupCellListeners();
    status.textContent = 'Din tur';
}

// Setup cell event listeners based on mode
function setupCellListeners() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);

        if (gameMode === 'threePiece') {
            cell.setAttribute('draggable', 'false');
            cell.addEventListener('dragstart', handleDragStart);
            cell.addEventListener('dragend', handleDragEnd);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
            cell.addEventListener('dragenter', handleDragEnter);
            cell.addEventListener('dragleave', handleDragLeave);
        }
    });
}

// Handle cell click
function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (!gameActive || currentPlayer === botPlayer) {
        return;
    }

    if (gameMode === 'classic') {
        handleClassicClick(clickedCell, clickedCellIndex);
    } else {
        handleThreePieceClick(clickedCell, clickedCellIndex);
    }
}

// Handle classic mode click
function handleClassicClick(clickedCell, clickedCellIndex) {
    if (board[clickedCellIndex] !== '') {
        return;
    }

    updateCell(clickedCell, clickedCellIndex);
    checkResult();

    if (gameActive && currentPlayer === botPlayer) {
        setTimeout(() => {
            botMove();
        }, 500);
    }
}

// Handle three-piece mode click
function handleThreePieceClick(clickedCell, clickedCellIndex) {
    if (phase === 'placement') {
        if (board[clickedCellIndex] !== '') {
            return;
        }

        updateCell(clickedCell, clickedCellIndex);
        humanPiecesPlaced++;
        updatePiecesDisplay();

        if (checkResult()) return;

        // Switch to bot player
        currentPlayer = botPlayer;
        status.textContent = 'Computeren tænker...';

        // Check if placement phase is over
        if (humanPiecesPlaced >= maxPieces && botPiecesPlaced >= maxPieces) {
            phase = 'movement';
            enableDragging();
        }

        if (gameActive) {
            setTimeout(() => {
                botMoveThreePiece();
            }, 500);
        }
    } else if (phase === 'movement') {
        // In movement phase, clicking selects a piece (for mobile/fallback)
        if (board[clickedCellIndex] === humanPlayer) {
            clearSelection();
            selectedPiece = clickedCellIndex;
            clickedCell.classList.add('selected');
            status.textContent = 'Vælg hvor du vil flytte hen';
        } else if (selectedPiece !== null && board[clickedCellIndex] === '') {
            // Move the piece
            movePiece(selectedPiece, clickedCellIndex);
        }
    }
}

// Enable dragging for player pieces in movement phase
function enableDragging() {
    cells.forEach((cell, index) => {
        if (board[index] === humanPlayer) {
            cell.setAttribute('draggable', 'true');
            cell.classList.add('draggable');
        }
    });
    status.textContent = 'Træk en brik for at flytte den';
}

// Update draggable state
function updateDraggable() {
    if (gameMode !== 'threePiece' || phase !== 'movement') return;

    cells.forEach((cell, index) => {
        if (board[index] === humanPlayer && currentPlayer === humanPlayer) {
            cell.setAttribute('draggable', 'true');
            cell.classList.add('draggable');
        } else {
            cell.setAttribute('draggable', 'false');
            cell.classList.remove('draggable');
        }
    });
}

// Drag and drop handlers
function handleDragStart(e) {
    if (phase !== 'movement' || currentPlayer !== humanPlayer) {
        e.preventDefault();
        return;
    }

    const index = parseInt(e.target.getAttribute('data-index'));
    if (board[index] !== humanPlayer) {
        e.preventDefault();
        return;
    }

    selectedPiece = index;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    clearDropTargets();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const index = parseInt(e.target.getAttribute('data-index'));
    if (board[index] === '') {
        e.target.classList.add('drop-target');
    }
}

function handleDragLeave(e) {
    e.target.classList.remove('drop-target');
}

function handleDrop(e) {
    e.preventDefault();
    clearDropTargets();

    const targetIndex = parseInt(e.target.getAttribute('data-index'));
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (board[targetIndex] === '' && board[sourceIndex] === humanPlayer) {
        movePiece(sourceIndex, targetIndex);
    }
}

function clearDropTargets() {
    cells.forEach(cell => cell.classList.remove('drop-target'));
}

function clearSelection() {
    cells.forEach(cell => cell.classList.remove('selected'));
    selectedPiece = null;
}

// Move a piece from one cell to another
function movePiece(fromIndex, toIndex) {
    const player = board[fromIndex];

    // Clear old cell
    board[fromIndex] = '';
    cells[fromIndex].textContent = '';
    cells[fromIndex].classList.remove('taken', 'x', 'o', 'draggable', 'selected');
    cells[fromIndex].setAttribute('draggable', 'false');

    // Fill new cell
    board[toIndex] = player;
    cells[toIndex].textContent = player;
    cells[toIndex].classList.add('taken', player.toLowerCase());

    clearSelection();

    if (checkResult()) return;

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (currentPlayer === botPlayer) {
        status.textContent = 'Computeren tænker...';
        updateDraggable();
        setTimeout(() => {
            botMoveThreePiece();
        }, 500);
    } else {
        status.textContent = 'Træk en brik for at flytte den';
        updateDraggable();
    }
}

// Update pieces display
function updatePiecesDisplay() {
    if (humanPiecesDisplay && botPiecesDisplay) {
        humanPiecesDisplay.textContent = maxPieces - humanPiecesPlaced;
        botPiecesDisplay.textContent = maxPieces - botPiecesPlaced;
    }
}

// Update cell
function updateCell(cell, index) {
    board[index] = currentPlayer;
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer.toLowerCase());
}

// Classic bot move using minimax algorithm
function botMove() {
    if (!gameActive) return;

    let move;

    // 2% chance bot makes a random move (not optimal)
    if (Math.random() < 0.02) {
        move = getRandomMove();
    } else {
        move = findBestMove();
    }

    const cell = cells[move];

    updateCell(cell, move);
    checkResult();
}

// Bot move for three-piece mode
function botMoveThreePiece() {
    if (!gameActive) return;

    if (phase === 'placement') {
        let move;

        // 2% chance for random move
        if (Math.random() < 0.02) {
            move = getRandomMove();
        } else {
            move = findBestMove();
        }

        if (move === -1) return;

        const cell = cells[move];
        updateCell(cell, move);
        botPiecesPlaced++;
        updatePiecesDisplay();

        if (checkResult()) return;

        // Check if placement phase is over
        if (humanPiecesPlaced >= maxPieces && botPiecesPlaced >= maxPieces) {
            phase = 'movement';
            currentPlayer = humanPlayer;
            status.textContent = 'Træk en brik for at flytte den';
            enableDragging();
        } else {
            currentPlayer = humanPlayer;
            status.textContent = 'Din tur - placer en brik';
        }
    } else {
        // Movement phase for bot
        const bestMove = findBestBotMove();

        if (bestMove) {
            setTimeout(() => {
                // Animate the bot move
                const fromCell = cells[bestMove.from];
                const toCell = cells[bestMove.to];

                // Clear old cell
                board[bestMove.from] = '';
                fromCell.textContent = '';
                fromCell.classList.remove('taken', 'o');

                // Fill new cell
                board[bestMove.to] = botPlayer;
                toCell.textContent = botPlayer;
                toCell.classList.add('taken', 'o');

                if (checkResult()) return;

                currentPlayer = humanPlayer;
                status.textContent = 'Træk en brik for at flytte den';
                updateDraggable();
            }, 300);
        }
    }
}

// Find best move for bot in movement phase
function findBestBotMove() {
    const botPositions = [];
    const emptyPositions = [];

    for (let i = 0; i < 9; i++) {
        if (board[i] === botPlayer) botPositions.push(i);
        if (board[i] === '') emptyPositions.push(i);
    }

    let bestScore = -Infinity;
    let bestMove = null;

    // Try all possible moves
    for (const from of botPositions) {
        for (const to of emptyPositions) {
            // Simulate move
            board[from] = '';
            board[to] = botPlayer;

            const score = minimaxMovement(board, 4, false, -Infinity, Infinity);

            // Undo move
            board[from] = botPlayer;
            board[to] = '';

            if (score > bestScore) {
                bestScore = score;
                bestMove = { from, to };
            }
        }
    }

    // Add some randomness (2% chance of random move)
    if (Math.random() < 0.02 && botPositions.length > 0 && emptyPositions.length > 0) {
        const randomFrom = botPositions[Math.floor(Math.random() * botPositions.length)];
        const randomTo = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        return { from: randomFrom, to: randomTo };
    }

    return bestMove;
}

// Minimax for movement phase with alpha-beta pruning
function minimaxMovement(board, depth, isMaximizing, alpha, beta) {
    const winner = checkWinner();

    if (winner === botPlayer) return 10;
    if (winner === humanPlayer) return -10;
    if (depth === 0) return evaluateBoard();

    const positions = [];
    const emptyPositions = [];
    const player = isMaximizing ? botPlayer : humanPlayer;

    for (let i = 0; i < 9; i++) {
        if (board[i] === player) positions.push(i);
        if (board[i] === '') emptyPositions.push(i);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const from of positions) {
            for (const to of emptyPositions) {
                board[from] = '';
                board[to] = player;

                const evalScore = minimaxMovement(board, depth - 1, false, alpha, beta);

                board[from] = player;
                board[to] = '';

                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const from of positions) {
            for (const to of emptyPositions) {
                board[from] = '';
                board[to] = player;

                const evalScore = minimaxMovement(board, depth - 1, true, alpha, beta);

                board[from] = player;
                board[to] = '';

                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Simple board evaluation
function evaluateBoard() {
    let score = 0;

    for (const condition of winningConditions) {
        const [a, b, c] = condition;
        const line = [board[a], board[b], board[c]];

        const botCount = line.filter(x => x === botPlayer).length;
        const humanCount = line.filter(x => x === humanPlayer).length;
        const emptyCount = line.filter(x => x === '').length;

        if (botCount === 2 && emptyCount === 1) score += 3;
        if (humanCount === 2 && emptyCount === 1) score -= 3;
        if (botCount === 1 && emptyCount === 2) score += 1;
        if (humanCount === 1 && emptyCount === 2) score -= 1;
    }

    // Center control bonus
    if (board[4] === botPlayer) score += 2;
    if (board[4] === humanPlayer) score -= 2;

    return score;
}

// Get a random available move
function getRandomMove() {
    const availableMoves = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            availableMoves.push(i);
        }
    }
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// Find best move using minimax
function findBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = botPlayer;
            let score = minimax(board, 0, false);
            board[i] = '';

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

// Minimax algorithm
function minimax(board, depth, isMaximizing) {
    const winner = checkWinner();

    if (winner === botPlayer) return 10 - depth;
    if (winner === humanPlayer) return depth - 10;
    if (!board.includes('')) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = botPlayer;
                let score = minimax(board, depth + 1, false);
                board[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = humanPlayer;
                let score = minimax(board, depth + 1, true);
                board[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// Check winner for minimax
function checkWinner() {
    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// Check for win or draw
function checkResult() {
    let roundWon = false;
    let winningCombination = [];

    for (let i = 0; i < winningConditions.length; i++) {
        const condition = winningConditions[i];
        const a = board[condition[0]];
        const b = board[condition[1]];
        const c = board[condition[2]];

        if (a === '' || b === '' || c === '') {
            continue;
        }

        if (a === b && b === c) {
            roundWon = true;
            winningCombination = condition;
            break;
        }
    }

    if (roundWon) {
        if (currentPlayer === humanPlayer) {
            status.textContent = 'Du vinder!';
        } else {
            status.textContent = 'Computeren vinder!';
        }
        gameActive = false;
        highlightWinningCells(winningCombination);
        disableDragging();
        return true;
    }

    // Check for draw (only in classic mode)
    if (gameMode === 'classic' && !board.includes('')) {
        status.textContent = 'Uafgjort!';
        gameActive = false;
        return true;
    }

    // Switch player (only for classic mode, three-piece handles this differently)
    if (gameMode === 'classic') {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        if (currentPlayer === humanPlayer) {
            status.textContent = 'Din tur';
        } else {
            status.textContent = 'Computeren tænker...';
        }
    }

    return false;
}

// Disable dragging
function disableDragging() {
    cells.forEach(cell => {
        cell.setAttribute('draggable', 'false');
        cell.classList.remove('draggable', 'selected');
    });
}

// Highlight winning cells
function highlightWinningCells(combination) {
    combination.forEach(index => {
        cells[index].classList.add('winning');
    });
}

// Restart game
function restartGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = humanPlayer;
    gameActive = true;
    humanPiecesPlaced = 0;
    botPiecesPlaced = 0;
    phase = 'placement';
    selectedPiece = null;

    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winning', 'draggable', 'selected', 'dragging', 'drop-target');
        cell.setAttribute('draggable', 'false');
    });

    if (gameMode === 'threePiece') {
        updatePiecesDisplay();
        status.textContent = 'Din tur - placer en brik';
    } else {
        status.textContent = 'Din tur';
    }

    // Show mode selector to allow changing mode
    modeSelector.style.display = 'block';
    gameInfo.style.display = 'none';
    boardElement.style.display = 'none';
    restartBtn.style.display = 'none';
    piecesInfo.style.display = 'none';
    gameMode = null;
}

// Start the game
init();
