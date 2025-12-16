// --- Game Configuration ---
const ROWS = 9;
const COLS = 9;
const MINES = 10;
let gameBoard = []; // 2D array to hold the grid data
let isGameOver = false;
let flagsPlaced = 0;
let cellsRevealed = 0;
let firstClick = true; // To ensure the first click is never a mine

// --- DOM Elements ---
const gameBoardEl = document.getElementById('game-board');
const mineCountEl = document.getElementById('mine-count');
const resetButtonEl = document.getElementById('reset-button');
const messageEl = document.getElementById('message');

// --- Initialization ---

// 1. Set the CSS Grid layout based on ROWS and COLS
gameBoardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

// 2. Event Listeners
resetButtonEl.addEventListener('click', initGame);
// Context menu (right-click) is disabled on the board to allow flagging
gameBoardEl.addEventListener('contextmenu', (e) => e.preventDefault());
gameBoardEl.addEventListener('mousedown', handleCellClick);

// --- Core Functions ---

/**
 * Initializes the game board structure (empty array) and renders the cells.
 */
function initGame() {
    // Reset state variables
    gameBoard = [];
    isGameOver = false;
    flagsPlaced = 0;
    cellsRevealed = 0;
    firstClick = true;
    messageEl.textContent = '';
    
    // Clear the previous board and create the new structure
    gameBoardEl.innerHTML = '';
    
    for (let r = 0; r < ROWS; r++) {
        gameBoard[r] = [];
        for (let c = 0; c < COLS; c++) {
            // Data structure for each cell
            gameBoard[r][c] = {
                row: r,
                col: c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0 // Number 1-8, or 0 if no neighbors are mines
            };

            // Create the HTML element for the cell
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.dataset.row = r;
            cellEl.dataset.col = c;
            gameBoardEl.appendChild(cellEl);
        }
    }
    
    mineCountEl.textContent = `Mines: ${MINES}`;
}

/**
 * Randomly places mines and calculates neighbor mine counts AFTER the first click.
 * @param {number} startR - Row of the first clicked cell (to avoid placing a mine there)
 * @param {number} startC - Column of the first clicked cell
 */
function placeMinesAndCalculate(startR, startC) {
    let minesPlaced = 0;
    
    // 1. Place Mines
    while (minesPlaced < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        
        // Ensure the cell is not already a mine AND is not the starting cell
        if (!gameBoard[r][c].isMine && !(r === startR && c === startC)) {
            gameBoard[r][c].isMine = true;
            minesPlaced++;
        }
    }
    
    // 2. Calculate Neighbor Counts
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!gameBoard[r][c].isMine) {
                gameBoard[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}

/**
 * Counts the number of mines in the 8 neighboring cells.
 * @param {number} r - Row index
 * @param {number} c - Column index
 * @returns {number} The count of neighboring mines
 */
function countNeighborMines(r, c) {
    let count = 0;
    // Check all 8 surrounding cells
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            // Skip the center cell (r, c)
            if (i === 0 && j === 0) continue;
            
            const nr = r + i; // Neighbor Row
            const nc = c + j; // Neighbor Column
            
            // Check if the neighbor is within the board bounds
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (gameBoard[nr][nc].isMine) {
                    count++;
                }
            }
        }
    }
    return count;
}


/**
 * Handles the mouse click event on a cell.
 * @param {MouseEvent} e - The mouse event object
 */
function handleCellClick(e) {
    if (!e.target.classList.contains('cell') || isGameOver) return;

    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    const cellData = gameBoard[r][c];

    // Left click (revealing a cell)
    if (e.button === 0) {
        if (cellData.isFlagged) return; // Cannot reveal a flagged cell

        // Handle the first click: place mines *after* the first click
        if (firstClick) {
            placeMinesAndCalculate(r, c);
            firstClick = false;
        }

        revealCell(r, c);
    } 
    // Right click (flagging a cell)
    else if (e.button === 2) {
        toggleFlag(r, c);
    }
}


/**
 * Recursively reveals a cell and its empty neighbors.
 * @param {number} r - Row index
 * @param {number} c - Column index
 */
function revealCell(r, c) {
    // Basic boundary and state checks
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cellData = gameBoard[r][c];
    if (cellData.isRevealed || cellData.isFlagged) return;

    cellData.isRevealed = true;
    cellsRevealed++;
    
    // Get the HTML element for updating
    const cellEl = gameBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    cellEl.classList.add('revealed');
    
    if (cellData.isMine) {
        // --- GAME OVER ---
        cellEl.classList.add('mine');
        cellEl.textContent = '💣'; // Bomb symbol
        endGame(false);
        return;
    } 
    
    if (cellData.neighborMines > 0) {
        // It's a numbered cell
        cellEl.textContent = cellData.neighborMines;
        cellEl.classList.add(`n${cellData.neighborMines}`);
    } else {
        // It's an empty cell, recursively reveal neighbors
        // Reveal all 8 surrounding cells
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(r + i, c + j);
            }
        }
    }
    
    // Check for win condition after every successful reveal
    checkForWin();
}


/**
 * Toggles the flag state of a cell.
 * @param {number} r - Row index
 * @param {number} c - Column index
 */
function toggleFlag(r, c) {
    const cellData = gameBoard[r][c];
    if (cellData.isRevealed) return;

    const cellEl = gameBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    
    if (cellData.isFlagged) {
        // Remove flag
        cellData.isFlagged = false;
        flagsPlaced--;
        cellEl.classList.remove('flag');
        cellEl.textContent = '';
    } else if (flagsPlaced < MINES) {
        // Add flag (if not over the mine limit)
        cellData.isFlagged = true;
        flagsPlaced++;
        cellEl.classList.add('flag');
        // The flag symbol is set by CSS ::before pseudo-element
    }
    
    mineCountEl.textContent = `Mines: ${MINES - flagsPlaced}`;
}


/**
 * Checks if the player has won the game.
 */
function checkForWin() {
    // Win condition: (Total Cells - Mines) must equal Cells Revealed
    if (cellsRevealed === (ROWS * COLS) - MINES) {
        endGame(true);
    }
}


/**
 * Ends the game and displays the result.
 * @param {boolean} didWin - True if the player won, false otherwise
 */
function endGame(didWin) {
    isGameOver = true;
    
    if (didWin) {
        messageEl.textContent = '🎉 YOU WIN! 🎉';
        // Mark all mines with a flag icon
        document.querySelectorAll('.cell').forEach(cellEl => {
             const r = parseInt(cellEl.dataset.row);
             const c = parseInt(cellEl.dataset.col);
             if (gameBoard[r][c].isMine) {
                cellEl.classList.add('flag');
             }
        });

    } else {
        messageEl.textContent = '💥 GAME OVER! You hit a mine. 💥';
        
        // Reveal all mines on loss
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cellData = gameBoard[r][c];
                if (cellData.isMine) {
                    const cellEl = gameBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    cellEl.classList.add('revealed', 'mine');
                    cellEl.textContent = '💣';
                }
            }
        }
    }
}


// Start the game when the page loads
initGame();

