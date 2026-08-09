let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let mode = 'user';  // Default mode is User vs User

function setMode(selectedMode) {
    mode = selectedMode;
    resetGame();
}

function makeMove(index) {
    if (board[index] === '') {
        board[index] = currentPlayer;
        document.getElementById(index).innerText = currentPlayer;
        checkWinner();
        
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

        if (mode === 'ai' && currentPlayer === 'O') {
            makeAIMove();
        }
    }
}

function makeAIMove() {
    fetch('http://localhost:5000/ai-move', {  // Change this URL to include the correct port
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ board })
    })
    .then(response => response.json())
    .then(data => {
        console.log('AI Move:', data);  // Debugging log
        board = data.board;
        for (let i = 0; i < 9; i++) {
            document.getElementById(i).innerText = board[i];
        }
        checkWinner();
        currentPlayer = 'X';  // Switch back to user after AI move
    })
    .catch(error => {
        console.error('Error:', error);
    });
}



function checkWinner() {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6]
    ];

    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            document.getElementById('status').innerText = `${board[a]} wins!`;
            return;
        }
    }

    if (!board.includes('')) {
        document.getElementById('status').innerText = 'Draw!';
    }
}

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    for (let i = 0; i < 9; i++) {
        document.getElementById(i).innerText = '';
    }
    document.getElementById('status').innerText = '';
}
