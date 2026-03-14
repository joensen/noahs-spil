// Unicode chess pieces
const PIECES = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
    k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

// Initial board setup
const INITIAL_BOARD = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
];

let board = [];
let selected = null;
let turn = 'white'; // 'white' or 'black'
let legalMoves = [];
let lastMove = null;
let castlingRights = { K: true, Q: true, k: true, q: true };
let enPassantTarget = null; // {row, col} or null
let gameOver = false;

// Clock
let clockEnabled = false;
let whiteTime = 0; // seconds remaining
let blackTime = 0;
let clockInterval = null;

function isWhite(piece) { return piece !== ' ' && piece === piece.toUpperCase(); }
function isBlack(piece) { return piece !== ' ' && piece === piece.toLowerCase(); }
function isOwnPiece(piece) {
    return turn === 'white' ? isWhite(piece) : isBlack(piece);
}
function isEnemyPiece(piece) {
    return turn === 'white' ? isBlack(piece) : isWhite(piece);
}

function copyBoard(b) { return b.map(row => [...row]); }

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function updateClockDisplay() {
    const whiteEl = document.getElementById('whiteTime');
    const blackEl = document.getElementById('blackTime');
    const whiteClock = document.getElementById('whiteClock');
    const blackClock = document.getElementById('blackClock');

    if (!clockEnabled) {
        whiteClock.classList.add('hidden');
        blackClock.classList.add('hidden');
        return;
    }

    whiteClock.classList.remove('hidden');
    blackClock.classList.remove('hidden');

    whiteEl.textContent = formatTime(whiteTime);
    blackEl.textContent = formatTime(blackTime);

    // Active clock highlight
    whiteClock.classList.toggle('active-clock', turn === 'white' && !gameOver);
    blackClock.classList.toggle('active-clock', turn === 'black' && !gameOver);

    // Low time warning (under 30 seconds)
    whiteClock.classList.toggle('time-low', whiteTime <= 30 && whiteTime > 0 && turn === 'white' && !gameOver);
    blackClock.classList.toggle('time-low', blackTime <= 30 && blackTime > 0 && turn === 'black' && !gameOver);
}

function startClock() {
    stopClock();
    if (!clockEnabled) return;
    clockInterval = setInterval(() => {
        if (gameOver) { stopClock(); return; }
        if (turn === 'white') {
            whiteTime--;
            if (whiteTime <= 0) {
                whiteTime = 0;
                gameOver = true;
                stopClock();
                document.getElementById('status').innerHTML = '<span class="turn-indicator black-turn"></span> Sort vinder på tid!';
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                blackTime = 0;
                gameOver = true;
                stopClock();
                document.getElementById('status').innerHTML = '<span class="turn-indicator white-turn"></span> Hvid vinder på tid!';
            }
        }
        updateClockDisplay();
    }, 1000);
}

function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

function startGame(timeInSeconds) {
    clockEnabled = timeInSeconds > 0;
    whiteTime = timeInSeconds;
    blackTime = timeInSeconds;
    document.getElementById('timeSelector').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    init();
}

function init() {
    board = INITIAL_BOARD.map(row => [...row]);
    selected = null;
    turn = 'white';
    legalMoves = [];
    lastMove = null;
    castlingRights = { K: true, Q: true, k: true, q: true };
    enPassantTarget = null;
    gameOver = false;
    stopClock();
    render();
    updateStatus();
    updateClockDisplay();
    if (clockEnabled) startClock();
}

// Get raw moves for a piece (doesn't check if move leaves own king in check)
function getRawMoves(b, row, col, cRights, epTarget) {
    const piece = b[row][col];
    if (piece === ' ') return [];
    const moves = [];
    const white = isWhite(piece);
    const friendly = (r, c) => {
        if (r < 0 || r > 7 || c < 0 || c > 7) return true;
        return white ? isWhite(b[r][c]) : isBlack(b[r][c]);
    };
    const enemy = (r, c) => {
        if (r < 0 || r > 7 || c < 0 || c > 7) return false;
        return white ? isBlack(b[r][c]) : isWhite(b[r][c]);
    };
    const empty = (r, c) => r >= 0 && r <= 7 && c >= 0 && c <= 7 && b[r][c] === ' ';

    const type = piece.toUpperCase();

    if (type === 'P') {
        const dir = white ? -1 : 1;
        const startRow = white ? 6 : 1;
        // Forward
        if (empty(row + dir, col)) {
            moves.push([row + dir, col]);
            if (row === startRow && empty(row + 2 * dir, col)) {
                moves.push([row + 2 * dir, col]);
            }
        }
        // Captures
        for (const dc of [-1, 1]) {
            const nr = row + dir, nc = col + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                if (enemy(nr, nc)) moves.push([nr, nc]);
                // En passant
                if (epTarget && epTarget.row === nr && epTarget.col === nc) {
                    moves.push([nr, nc]);
                }
            }
        }
    }

    if (type === 'N') {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 && !friendly(nr, nc)) {
                moves.push([nr, nc]);
            }
        }
    }

    if (type === 'B' || type === 'Q') {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            for (let i = 1; i < 8; i++) {
                const nr = row + dr * i, nc = col + dc * i;
                if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
                if (friendly(nr, nc)) break;
                moves.push([nr, nc]);
                if (enemy(nr, nc)) break;
            }
        }
    }

    if (type === 'R' || type === 'Q') {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            for (let i = 1; i < 8; i++) {
                const nr = row + dr * i, nc = col + dc * i;
                if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
                if (friendly(nr, nc)) break;
                moves.push([nr, nc]);
                if (enemy(nr, nc)) break;
            }
        }
    }

    if (type === 'K') {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 && !friendly(nr, nc)) {
                moves.push([nr, nc]);
            }
        }
        // Castling
        if (cRights) {
            const homeRow = white ? 7 : 0;
            if (row === homeRow && col === 4) {
                const kSide = white ? 'K' : 'k';
                const qSide = white ? 'Q' : 'q';
                // King side
                if (cRights[kSide] && b[homeRow][5] === ' ' && b[homeRow][6] === ' ' && b[homeRow][7] === (white ? 'R' : 'r')) {
                    if (!isSquareAttacked(b, homeRow, 4, white) && !isSquareAttacked(b, homeRow, 5, white) && !isSquareAttacked(b, homeRow, 6, white)) {
                        moves.push([homeRow, 6]);
                    }
                }
                // Queen side
                if (cRights[qSide] && b[homeRow][3] === ' ' && b[homeRow][2] === ' ' && b[homeRow][1] === ' ' && b[homeRow][0] === (white ? 'R' : 'r')) {
                    if (!isSquareAttacked(b, homeRow, 4, white) && !isSquareAttacked(b, homeRow, 3, white) && !isSquareAttacked(b, homeRow, 2, white)) {
                        moves.push([homeRow, 2]);
                    }
                }
            }
        }
    }

    return moves;
}

// Is a square attacked by the opponent of the given color?
function isSquareAttacked(b, row, col, byWhite) {
    // Check from the perspective of the opponent
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = b[r][c];
            if (piece === ' ') continue;
            const pw = isWhite(piece);
            if (pw === byWhite) continue; // same side, skip
            // Get raw moves without castling to avoid recursion
            const type = piece.toUpperCase();
            if (type === 'P') {
                const dir = pw ? -1 : 1;
                if (r + dir === row && (c - 1 === col || c + 1 === col)) return true;
            } else if (type === 'K') {
                if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
            } else {
                const moves = getRawMoves(b, r, c, null, null);
                for (const [mr, mc] of moves) {
                    if (mr === row && mc === col) return true;
                }
            }
        }
    }
    return false;
}

function findKing(b, white) {
    const king = white ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] === king) return [r, c];
        }
    }
    return null;
}

function isInCheck(b, white) {
    const kp = findKing(b, white);
    if (!kp) return false;
    return isSquareAttacked(b, kp[0], kp[1], white);
}

// Get legal moves for a piece (filters out moves that leave king in check)
function getLegalMoves(b, row, col, cRights, epTarget) {
    const piece = b[row][col];
    if (piece === ' ') return [];
    const white = isWhite(piece);
    const raw = getRawMoves(b, row, col, cRights, epTarget);
    const legal = [];

    for (const [tr, tc] of raw) {
        const nb = copyBoard(b);
        // Handle en passant capture
        if (piece.toUpperCase() === 'P' && epTarget && tr === epTarget.row && tc === epTarget.col) {
            const capturedRow = white ? tr + 1 : tr - 1;
            nb[capturedRow][tc] = ' ';
        }
        // Handle castling rook move
        if (piece.toUpperCase() === 'K' && Math.abs(tc - col) === 2) {
            const homeRow = white ? 7 : 0;
            if (tc === 6) { nb[homeRow][5] = nb[homeRow][7]; nb[homeRow][7] = ' '; }
            if (tc === 2) { nb[homeRow][3] = nb[homeRow][0]; nb[homeRow][0] = ' '; }
        }
        nb[tr][tc] = nb[row][col];
        nb[row][col] = ' ';
        if (!isInCheck(nb, white)) {
            legal.push([tr, tc]);
        }
    }
    return legal;
}

// Check if the current side has any legal moves
function hasLegalMoves(b, white, cRights, epTarget) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = b[r][c];
            if (piece === ' ') continue;
            if (isWhite(piece) !== white) continue;
            if (getLegalMoves(b, r, c, cRights, epTarget).length > 0) return true;
        }
    }
    return false;
}

function makeMove(fromRow, fromCol, toRow, toCol, promotionPiece) {
    const piece = board[fromRow][fromCol];
    const white = isWhite(piece);

    // En passant capture
    if (piece.toUpperCase() === 'P' && enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedRow = white ? toRow + 1 : toRow - 1;
        board[capturedRow][toCol] = ' ';
    }

    // Castling rook move
    if (piece.toUpperCase() === 'K' && Math.abs(toCol - fromCol) === 2) {
        const homeRow = white ? 7 : 0;
        if (toCol === 6) { board[homeRow][5] = board[homeRow][7]; board[homeRow][7] = ' '; }
        if (toCol === 2) { board[homeRow][3] = board[homeRow][0]; board[homeRow][0] = ' '; }
    }

    // Update castling rights
    if (piece === 'K') { castlingRights.K = false; castlingRights.Q = false; }
    if (piece === 'k') { castlingRights.k = false; castlingRights.q = false; }
    if (piece === 'R' && fromRow === 7 && fromCol === 7) castlingRights.K = false;
    if (piece === 'R' && fromRow === 7 && fromCol === 0) castlingRights.Q = false;
    if (piece === 'r' && fromRow === 0 && fromCol === 7) castlingRights.k = false;
    if (piece === 'r' && fromRow === 0 && fromCol === 0) castlingRights.q = false;
    // If a rook is captured
    if (toRow === 0 && toCol === 7) castlingRights.k = false;
    if (toRow === 0 && toCol === 0) castlingRights.q = false;
    if (toRow === 7 && toCol === 7) castlingRights.K = false;
    if (toRow === 7 && toCol === 0) castlingRights.Q = false;

    // En passant target
    if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
    } else {
        enPassantTarget = null;
    }

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = ' ';

    // Promotion
    const promoRow = white ? 0 : 7;
    if (piece.toUpperCase() === 'P' && toRow === promoRow) {
        if (promotionPiece) {
            board[toRow][toCol] = promotionPiece;
        } else {
            // Will be handled by promotion UI
            return { needsPromotion: true, row: toRow, col: toCol };
        }
    }

    lastMove = { from: [fromRow, fromCol], to: [toRow, toCol] };
    turn = turn === 'white' ? 'black' : 'white';
    selected = null;
    legalMoves = [];
    updateClockDisplay();

    return { needsPromotion: false };
}

function updateStatus() {
    const statusEl = document.getElementById('status');
    const white = turn === 'white';
    const inCheck = isInCheck(board, white);
    const hasMove = hasLegalMoves(board, white, castlingRights, enPassantTarget);

    if (!hasMove) {
        gameOver = true;
        if (inCheck) {
            statusEl.innerHTML = '<span class="turn-indicator ' + (white ? 'black-turn' : 'white-turn') + '"></span> ' + (white ? 'Sort' : 'Hvid') + ' vinder! Skakmat!';
        } else {
            statusEl.innerHTML = 'Uafgjort! Pat.';
        }
    } else if (inCheck) {
        statusEl.innerHTML = '<span class="turn-indicator ' + (white ? 'white-turn' : 'black-turn') + '"></span> ' + (white ? 'Hvid' : 'Sort') + ' er i skak!';
    } else {
        statusEl.innerHTML = '<span class="turn-indicator ' + (white ? 'white-turn' : 'black-turn') + '"></span> ' + (white ? 'Hvid' : 'Sort') + 's tur';
    }
}

function showPromotion(row, col) {
    const modal = document.getElementById('promotionModal');
    const choices = document.getElementById('promotionChoices');
    const isW = row === 0; // white pawns promote on row 0
    const pieces = isW ? ['Q','R','B','N'] : ['q','r','b','n'];

    choices.innerHTML = '';
    for (const p of pieces) {
        const btn = document.createElement('button');
        btn.className = 'promo-btn';
        btn.textContent = PIECES[p];
        btn.onclick = () => {
            board[row][col] = p;
            modal.classList.remove('active');
            lastMove = { from: lastMove ? lastMove.from : [row, col], to: [row, col] };
            turn = turn === 'white' ? 'black' : 'white';
            selected = null;
            legalMoves = [];
            updateClockDisplay();
            render();
            updateStatus();
        };
        choices.appendChild(btn);
    }
    modal.classList.add('active');
}

function render() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    const white = turn === 'white';
    const kingPos = findKing(board, white);
    const inCheck = isInCheck(board, white);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

            // Last move highlight
            if (lastMove) {
                if ((r === lastMove.from[0] && c === lastMove.from[1]) ||
                    (r === lastMove.to[0] && c === lastMove.to[1])) {
                    sq.classList.add('last-move');
                }
            }

            // Check highlight
            if (inCheck && kingPos && r === kingPos[0] && c === kingPos[1]) {
                sq.classList.add('in-check');
            }

            // Selected highlight
            if (selected && r === selected[0] && c === selected[1]) {
                sq.classList.add('selected');
            }

            // Legal move dots
            const isLegal = legalMoves.some(m => m[0] === r && m[1] === c);
            if (isLegal) {
                if (board[r][c] !== ' ' || (enPassantTarget && r === enPassantTarget.row && c === enPassantTarget.col)) {
                    sq.classList.add('legal-capture');
                } else {
                    sq.classList.add('legal-move');
                }
            }

            // Piece
            if (board[r][c] !== ' ') {
                const span = document.createElement('span');
                span.textContent = PIECES[board[r][c]];
                span.className = isWhite(board[r][c]) ? 'white-piece' : 'black-piece';
                sq.appendChild(span);
            }

            sq.addEventListener('click', () => onSquareClick(r, c));
            boardEl.appendChild(sq);
        }
    }
}

function onSquareClick(row, col) {
    if (gameOver) return;

    const piece = board[row][col];

    // If a piece is selected and we click a legal move square
    if (selected) {
        const isLegal = legalMoves.some(m => m[0] === row && m[1] === col);
        if (isLegal) {
            const result = makeMove(selected[0], selected[1], row, col);
            if (result.needsPromotion) {
                // Keep lastMove for promotion UI
                lastMove = { from: [selected[0], selected[1]], to: [row, col] };
                render();
                showPromotion(result.row, result.col);
                return;
            }
            render();
            updateStatus();
            return;
        }
    }

    // Select own piece
    if (isOwnPiece(piece)) {
        selected = [row, col];
        legalMoves = getLegalMoves(board, row, col, castlingRights, enPassantTarget);
        render();
    } else {
        selected = null;
        legalMoves = [];
        render();
    }
}

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('timeSelector').style.display = 'block';
    stopClock();
});

// Time selector buttons
document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const time = parseInt(btn.dataset.time, 10);
        startGame(time);
    });
});
