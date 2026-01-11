/**
 * オセロで白黒つけるぜ！ - Premium Othello Game Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & Configuration ---
    const BOARD_SIZE = 8;
    const EMPTY = 0;
    const BLACK = 1;
    const WHITE = 2;
    const CPU_THINK_TIME = 1200; // 1.2s human-like delay

    // Weight matrix for medium-level CPU (corners and edges priority)
    const BOARD_WEIGHTS = [
        [100, -20, 10,  5,  5, 10, -20, 100],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [ 10,  -2,  5,  1,  1,  5,  -2,  10],
        [  5,  -2,  1,  0,  0,  1,  -2,   5],
        [  5,  -2,  1,  0,  0,  1,  -2,   5],
        [ 10,  -2,  5,  1,  1,  5,  -2,  10],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [100, -20, 10,  5,  5, 10, -20, 100]
    ];

    // --- State ---
    let board = [];
    let currentTurn = BLACK;
    let gameMode = 'solo'; // 'solo' or 'duo'
    let isCpuThinking = false;
    let stats = {
        wins: 0,
        losses: 0,
        draws: 0,
        lastMode: 'solo'
    };

    // --- DOM Elements ---
    const boardEl = document.getElementById('board');
    const blackCountEl = document.getElementById('black-count');
    const whiteCountEl = document.getElementById('white-count');
    const statusMsgEl = document.getElementById('status-message');
    const turnMarkerEl = document.getElementById('current-turn-marker');
    const btnSolo = document.getElementById('btn-solo');
    const btnDuo = document.getElementById('btn-duo');
    const btnReset = document.getElementById('btn-reset');
    const modal = document.getElementById('game-over-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const btnModalClose = document.getElementById('btn-modal-close');
    const statWinsEl = document.getElementById('stat-wins');
    const statLossesEl = document.getElementById('stat-losses');
    const statDrawsEl = document.getElementById('stat-draws');

    // --- Initialization ---
    function init() {
        loadStats();
        setupBoard();
        updateUI();
        
        // Listeners
        btnSolo.onclick = () => setMode('solo');
        btnDuo.onclick = () => setMode('duo');
        btnReset.onclick = () => resetGame();
        btnModalClose.onclick = () => {
            modal.classList.add('hidden');
            resetGame();
        };

        // Resume last mode
        setMode(stats.lastMode);
    }

    function setupBoard() {
        board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        
        // Initial 4 pieces
        board[3][3] = WHITE;
        board[3][4] = BLACK;
        board[4][3] = BLACK;
        board[4][4] = WHITE;
        
        currentTurn = BLACK;
        renderBoard();
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        const validMoves = getValidMoves(currentTurn);

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (board[r][c] !== EMPTY) {
                    const piece = document.createElement('div');
                    piece.className = 'piece';
                    // Black is front, White is back (rotated 180deg in CSS)
                    if (board[r][c] === WHITE) {
                        piece.classList.add('flipping');
                    }
                    
                    const front = document.createElement('div');
                    front.className = 'side front';
                    const back = document.createElement('div');
                    back.className = 'side back';
                    
                    piece.appendChild(front);
                    piece.appendChild(back);
                    cell.appendChild(piece);
                } else if (validMoves.some(m => m.r === r && m.c === c) && !isCpuThinking) {
                    cell.classList.add('hint');
                }

                cell.onclick = () => handleCellClick(r, c);
                boardEl.appendChild(cell);
            }
        }
    }

    // --- Game Logic ---
    function handleCellClick(r, c) {
        if (isCpuThinking) return;
        if (gameMode === 'solo' && currentTurn === WHITE) return;

        if (placePiece(r, c, currentTurn)) {
            afterMove();
        }
    }

    function placePiece(r, c, color) {
        const flips = getFlips(r, c, color);
        if (flips.length === 0 || board[r][c] !== EMPTY) return false;

        // Visual Ripple Effect
        boardEl.classList.remove('ripple');
        void boardEl.offsetWidth; // Trigger reflow
        boardEl.classList.add('ripple');

        board[r][c] = color;
        
        // Update Board State
        flips.forEach(f => {
            board[f.r][f.c] = color;
        });

        return true;
    }

    function getFlips(r, c, color) {
        if (board[r][c] !== EMPTY) return [];
        const opponent = color === BLACK ? WHITE : BLACK;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        let totalFlips = [];

        directions.forEach(([dr, dc]) => {
            let tempFlips = [];
            let currR = r + dr;
            let currC = c + dc;

            while (currR >= 0 && currR < BOARD_SIZE && currC >= 0 && currC < BOARD_SIZE) {
                if (board[currR][currC] === opponent) {
                    tempFlips.push({ r: currR, c: currC });
                } else if (board[currR][currC] === color) {
                    totalFlips = totalFlips.concat(tempFlips);
                    break;
                } else {
                    break;
                }
                currR += dr;
                currC += dc;
            }
        });

        return totalFlips;
    }

    function getValidMoves(color) {
        const moves = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (getFlips(r, c, color).length > 0) {
                    moves.push({ r, c });
                }
            }
        }
        return moves;
    }

    function afterMove() {
        const nextColor = currentTurn === BLACK ? WHITE : BLACK;
        const nextMoves = getValidMoves(nextColor);

        if (nextMoves.length > 0) {
            currentTurn = nextColor;
        } else {
            // Check if current player still has moves (Double Pass)
            const currentMoves = getValidMoves(currentTurn);
            if (currentMoves.length === 0) {
                endGame();
                return;
            }
            // Pass logic (show message)
            statusMsgEl.textContent = `${nextColor === BLACK ? '黒' : '白'}はパスです`;
            setTimeout(() => updateUI(), 1000);
        }

        updateUI();

        if (gameMode === 'solo' && currentTurn === WHITE) {
            runCpu();
        }
    }

    function runCpu() {
        isCpuThinking = true;
        updateUI();

        setTimeout(() => {
            const moves = getValidMoves(WHITE);
            if (moves.length === 0) {
                isCpuThinking = false;
                afterMove();
                return;
            }

            // Medium AI: Score based on weight matrix
            let bestMove = moves[0];
            let bestScore = -Infinity;

            moves.forEach(m => {
                const score = BOARD_WEIGHTS[m.r][m.c];
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = m;
                }
            });

            placePiece(bestMove.r, bestMove.c, WHITE);
            isCpuThinking = false;
            afterMove();
        }, CPU_THINK_TIME);
    }

    function endGame() {
        const { black, white } = countPieces();
        updateUI();

        let title = "";
        let message = "";

        if (black > white) {
            title = "黒の勝利";
            message = `${black} vs ${white} で黒の勝ちです。`;
            if (gameMode === 'solo') stats.wins++;
        } else if (white > black) {
            title = "白の勝利";
            message = `${black} vs ${white} で白の勝ちです。`;
            if (gameMode === 'solo') stats.losses++;
        } else {
            title = "引き分け";
            message = `${black} vs ${white} で引き分けです。`;
            if (gameMode === 'solo') stats.draws++;
        }

        saveStats();
        displayStats();

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 1000);
    }

    // --- UI Helpers ---
    function updateUI() {
        renderBoard();
        const { black, white } = countPieces();
        blackCountEl.textContent = black;
        whiteCountEl.textContent = white;

        if (isCpuThinking) {
            statusMsgEl.textContent = "CPUが思考中です...";
        } else {
            statusMsgEl.textContent = `${currentTurn === BLACK ? '黒' : '白'}の手番です`;
        }

        turnMarkerEl.className = `marker ${currentTurn === BLACK ? 'black' : 'white'}`;
    }

    function countPieces() {
        let black = 0;
        let white = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === BLACK) black++;
                if (board[r][c] === WHITE) white++;
            }
        }
        return { black, white };
    }

    function setMode(mode) {
        gameMode = mode;
        stats.lastMode = mode;
        saveStats();

        btnSolo.classList.toggle('active', mode === 'solo');
        btnDuo.classList.toggle('active', mode === 'duo');
        
        resetGame();
    }

    function resetGame() {
        isCpuThinking = false;
        setupBoard();
        updateUI();
    }

    // --- Storage ---
    function loadStats() {
        const saved = localStorage.getItem('othelo_stats');
        if (saved) {
            stats = JSON.parse(saved);
        }
        displayStats();
    }

    function saveStats() {
        localStorage.setItem('othelo_stats', JSON.stringify(stats));
    }

    function displayStats() {
        statWinsEl.textContent = stats.wins;
        statLossesEl.textContent = stats.losses;
        statDrawsEl.textContent = stats.draws;
    }

    init();
});
