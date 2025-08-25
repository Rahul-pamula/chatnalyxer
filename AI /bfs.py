from collections import deque

# Goal state
goal_state = [
    [1, 2, 3],
    [8, 0, 4],
    [7, 6, 5]
]
goal_tuple = tuple(tuple(row) for row in goal_state)

# Get user input for initial state
def get_initial_state():
    print("Enter 9 digits (0-8) with 0 as the blank (e.g., 283104765):")
    while True:
        user_input = input().strip()
        if len(user_input) == 9 and sorted(user_input) == list('012345678'):
            nums = [int(ch) for ch in user_input]
            return [nums[0:3], nums[3:6], nums[6:9]]
        print("Invalid input. Please enter all digits 0-8 exactly once.")

# Display the puzzle board
def display_board(board):
    for row in board:
        print(" ".join(str(x) if x != 0 else '_' for x in row))
    print()

# Find the position of the blank tile (0)
def find_blank(board):
    for i in range(3):
        for j in range(3):
            if board[i][j] == 0:
                return i, j

# Generate possible moves from current board
def get_possible_moves(board):
    i, j = find_blank(board)
    next_states = []

    # Move up
    if i > 0:
        new_board = [row[:] for row in board]
        new_board[i][j], new_board[i-1][j] = new_board[i-1][j], new_board[i][j]
        next_states.append(new_board)

    # Move down
    if i < 2:
        new_board = [row[:] for row in board]
        new_board[i][j], new_board[i+1][j] = new_board[i+1][j], new_board[i][j]
        next_states.append(new_board)

    # Move left
    if j > 0:
        new_board = [row[:] for row in board]
        new_board[i][j], new_board[i][j-1] = new_board[i][j-1], new_board[i][j]
        next_states.append(new_board)

    # Move right
    if j < 2:
        new_board = [row[:] for row in board]
        new_board[i][j], new_board[i][j+1] = new_board[i][j+1], new_board[i][j]
        next_states.append(new_board)

    return next_states

# BFS algorithm to solve 8-puzzle
def bfs(start):
    start_tuple = tuple(tuple(row) for row in start)
    queue = deque([(start, [])])
    visited = set()
    visited.add(start_tuple)

    while queue:
        current_board, path = queue.popleft()
        current_tuple = tuple(tuple(row) for row in current_board)

        if current_tuple == goal_tuple:
            return path + [current_board]  # Return full solution path

        for next_board in get_possible_moves(current_board):
            next_tuple = tuple(tuple(row) for row in next_board)
            if next_tuple not in visited:
                visited.add(next_tuple)
                queue.append((next_board, path + [current_board]))

    return None  # No solution

# Main program
if __name__ == "__main__":
    print("=== 8 Puzzle Solver using BFS ===")
    initial_board = get_initial_state()
    print("\nInitial Board:")
    display_board(initial_board)

    solution = bfs(initial_board)

    if solution:
        print(f"Puzzle solved in {len(solution) - 1} moves!\n")
        for step, board in enumerate(solution):
            print(f"Step {step}:")
            display_board(board)
    else:
        print("No solution found for this puzzle.")
