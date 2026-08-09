from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  

# Minimax algorithm to find the best move
def minimax(board, depth, is_maximizing):
    winner = check_winner(board)
    if winner == 'X':
        return -1  # User wins
    elif winner == 'O':
        return 1  # AI wins
    elif '' not in board:  # Draw
        return 0

    if is_maximizing:
        best_score = -float('inf')
        for i in range(9):
            if board[i] == '':
                board[i] = 'O'  # AI's move
                score = minimax(board, depth + 1, False)
                board[i] = ''
                best_score = max(score, best_score)
        return best_score
    else:
        best_score = float('inf')
        for i in range(9):
            if board[i] == '':
                board[i] = 'X'  # User's move
                score = minimax(board, depth + 1, True)
                board[i] = ''
                best_score = min(score, best_score)
        return best_score

def best_move(board):
    best_score = -float('inf')
    move = None
    for i in range(9):
        if board[i] == '':
            board[i] = 'O'  # AI's move
            score = minimax(board, 0, False)
            board[i] = ''
            if score > best_score:
                best_score = score
                move = i
    return move

def check_winner(board):
    winning_combinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ]
    for combo in winning_combinations:
        a, b, c = combo
        if board[a] == board[b] == board[c] and board[a] != '':
            return board[a]
    return None

@app.route('/ai-move', methods=['POST'])
def ai_move_endpoint():
    data = request.json
    board = data['board']
    move = best_move(board)
    if move is not None:
        board[move] = 'O'  # AI makes the optimal move
    return jsonify({'board': board})

if __name__ == '__main__':
    app.run(debug=True)
