# Tic-Tac-Toe Game in Python

def print_board(board):
    print("\nCurrent Board:")
    for row in board:
        print(" | ".join(row))
        print("-" * 9)


def check_win(board, player):
    # Check rows, columns and diagonals
    for i in range(3):
        if all([cell == player for cell in board[i]]):  # Row
            return True
        if all([board[j][i] == player for j in range(3)]):  # Column
            return True

    # Diagonals
    if all([board[i][i] == player for i in range(3)]):
        return True
    if all([board[i][2 - i] == player for i in range(3)]):
        return True

    return False


def check_draw(board):
    return all(cell in ['X', 'O'] for row in board for cell in row)


def tic_tac_toe():
    board = [['1', '2', '3'],
             ['4', '5', '6'],
             ['7', '8', '9']]

    current_player = 'X'

    print_board(board)

    while True:
        move = input(f"Player {current_player}, enter your move (1-9): ")

        valid = False
        for i in range(3):
            for j in range(3):
                if board[i][j] == move:
                    board[i][j] = current_player
                    valid = True
                    break
            if valid:
                break

        if not valid:
            print("Invalid move. Try again.")
            continue

        print_board(board)

        if check_win(board, current_player):
            print(f"Player {current_player} wins!")
            break

        if check_draw(board):
            print("It's a draw!")
            break

        # Switch turn
        current_player = 'O' if current_player == 'X' else 'X'


# Main Execution
if __name__ == "__main__":
    print("=== Tic-Tac-Toe Game ===")
    tic_tac_toe()
