# 8 Puzzle Problem using Depth First Search (DFS)
from copy import deepcopy

goal_state = [[1, 2, 3],
              [4, 5, 6],
              [7, 8, 0]]

# Print the board


def print_board(state):
    for row in state:
        print(' '.join(str(x) if x != 0 else '_' for x in row))
    print()

# Find the position of 0 (blank)


def find_blank(state):
    for i in range(3):
        for j in range(3):
            if state[i][j] == 0:
                return i, j

# Generate all valid children by moving the blank tile


def get_children(state):
    children = []
    x, y = find_blank(state)
    moves = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # Up, Down, Left, Right

    for dx, dy in moves:
        new_x, new_y = x + dx, y + dy
        if 0 <= new_x < 3 and 0 <= new_y < 3:
            new_state = deepcopy(state)
            # Swap blank with neighbor
            new_state[x][y], new_state[new_x][new_y] = new_state[new_x][new_y], new_state[x][y]
            children.append(new_state)
    return children

# Depth First Search


def dfs(start):
    stack = [(start, [])]
    visited = set()

    while stack:
        current, path = stack.pop()
        current_tuple = tuple(tuple(row) for row in current)

        if current == goal_state:
            return path + [current]

        if current_tuple in visited:
            continue

        visited.add(current_tuple)

        for child in get_children(current):
            stack.append((child, path + [current]))

    return None


# Main program
if __name__ == "__main__":
    print("=== 8 Puzzle Solver using DFS ===")
    input_str = input(
        "Enter 9 digits (0-8) with 0 as blank (e.g., 125340678): ")

    # Convert input into 3x3 list
    start_state = [[int(input_str[3 * i + j])
                    for j in range(3)] for i in range(3)]

    print("\nInitial State:")
    print_board(start_state)

    solution = dfs(start_state)

    if solution:
        print("Solution found in", len(solution) - 1, "steps:\n")
        for i, step in enumerate(solution):
            print("Step", i)
            print_board(step)
    else:
        print("No solution found.")


