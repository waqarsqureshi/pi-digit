#!/usr/bin/env python3
"""
12. Sense HAT Tic-Tac-Toe Game with 5-Way Joystick
File: examples/python/12_tictactoe.py

Play interactive Tic-Tac-Toe on the Sense HAT 8x8 RGB LED matrix:
  - 3x3 grid displayed with separator grid lines
  - Player 1 (X) = Cyan Blue
  - Computer AI (O) = Amber Gold
  - Joystick Up / Down / Left / Right : Move cursor around the 3x3 grid
  - Joystick Middle Press            : Place mark (X) in selected cell
  - Automatic AI opponent, win condition detection & animated victory celebration!
"""

from sense_hat import SenseHat
import time
import random

try:
    from pi_twin import LCD
    lcd = LCD()
    has_lcd = True
except Exception:
    has_lcd = False

sense = SenseHat()
sense.clear()

print("=" * 65)
print("  Pi-Digit: Sense HAT 8x8 Matrix Tic-Tac-Toe Game")
print("=" * 65)
print("Controls:")
print("  - Use Joystick UP / DOWN / LEFT / RIGHT to move cursor")
print("  - Press MIDDLE button to place your move (X)")
print("  - Computer AI plays O in response")
print("=" * 65)

if has_lcd:
    try:
        lcd.clear()
        lcd.set_cursor(0, 0)
        lcd.write("Tic-Tac-Toe!")
        lcd.set_cursor(1, 0)
        lcd.write("You (X) vs AI(O)")
    except Exception:
        pass

# Color palette
GRID_COLOR = [35, 45, 60]       # Subtle grid divider
P1_COLOR   = [0, 220, 255]      # Player 1 (X) - Cyan
P2_COLOR   = [255, 140, 0]      # AI / Player 2 (O) - Amber
CURSOR_ON  = [255, 255, 255]    # Blinking cursor white
CURSOR_OFF = [0, 0, 0]
EMPTY      = [0, 0, 0]

# Board coordinates for the 3x3 cells (each cell is a 2x2 pixel cluster)
CELL_COORDS = [
    # Row 0
    [(0, 0), (1, 0), (0, 1), (1, 1)],  # cell (0, 0)
    [(3, 0), (4, 0), (3, 1), (4, 1)],  # cell (0, 1)
    [(6, 0), (7, 0), (6, 1), (7, 1)],  # cell (0, 2)
    # Row 1
    [(0, 3), (1, 3), (0, 4), (1, 4)],  # cell (1, 0)
    [(3, 3), (4, 3), (3, 4), (4, 4)],  # cell (1, 1)
    [(6, 3), (7, 3), (6, 4), (7, 4)],  # cell (1, 2)
    # Row 2
    [(0, 6), (1, 6), (0, 7), (1, 7)],  # cell (2, 0)
    [(3, 6), (4, 6), (3, 7), (4, 7)],  # cell (2, 1)
    [(6, 6), (7, 6), (6, 7), (7, 7)],  # cell (2, 2)
]

board = [0] * 9  # 0 = empty, 1 = P1 (X), 2 = AI (O)
cur_r = 1
cur_c = 1

def check_winner(b):
    lines = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8), # rows
        (0, 3, 6), (1, 4, 7), (2, 5, 8), # cols
        (0, 4, 8), (2, 4, 6)             # diagonals
    ]
    for p in (1, 2):
        for line in lines:
            if b[line[0]] == p and b[line[1]] == p and b[line[2]] == p:
                return p, line
    if all(x != 0 for x in b):
        return 3, None # Tie
    return 0, None # Ongoing

def draw_board(cursor_blink=True):
    pixels = [EMPTY for _ in range(64)]

    # Draw grid divider lines (col 2 and 5, row 2 and 5)
    for i in range(8):
        pixels[i * 8 + 2] = GRID_COLOR
        pixels[i * 8 + 5] = GRID_COLOR
        pixels[2 * 8 + i] = GRID_COLOR
        pixels[5 * 8 + i] = GRID_COLOR

    # Draw player cells
    for idx in range(9):
        val = board[idx]
        color = EMPTY
        if val == 1:
            color = P1_COLOR
        elif val == 2:
            color = P2_COLOR

        if color != EMPTY:
            for (cx, cy) in CELL_COORDS[idx]:
                pixels[cy * 8 + cx] = color

    # Draw cursor on selected cell
    cur_idx = cur_r * 3 + cur_c
    if cursor_blink and board[cur_idx] == 0:
        for (cx, cy) in CELL_COORDS[cur_idx]:
            pixels[cy * 8 + cx] = CURSOR_ON
    elif cursor_blink and board[cur_idx] != 0:
        # Slight highlight over existing mark
        top_left = CELL_COORDS[cur_idx][0]
        pixels[top_left[1] * 8 + top_left[0]] = CURSOR_ON

    sense.set_pixels(pixels)

def ai_move():
    # 1. Can AI win in this move?
    for i in range(9):
        if board[i] == 0:
            board[i] = 2
            w, _ = check_winner(board)
            if w == 2:
                return i
            board[i] = 0

    # 2. Block player from winning
    for i in range(9):
        if board[i] == 0:
            board[i] = 1
            w, _ = check_winner(board)
            if w == 1:
                board[i] = 2
                return i
            board[i] = 0

    # 3. Take center if free
    if board[4] == 0:
        board[4] = 2
        return 4

    # 4. Take random available corner or edge
    empty_cells = [i for i in range(9) if board[i] == 0]
    if empty_cells:
        chosen = random.choice(empty_cells)
        board[chosen] = 2
        return chosen
    return None

def celebrate_win(winner, winning_line):
    color = [0, 255, 80] if winner == 1 else [255, 60, 60]
    win_text = "YOU WIN! (X)" if winner == 1 else "AI WINS! (O)"
    print(f"\n*** GAME OVER: {win_text} ***")
    
    if has_lcd:
        try:
            lcd.clear()
            lcd.write(win_text)
            lcd.set_cursor(1, 0)
            lcd.write("Sense HAT Champ!")
        except Exception:
            pass

    # Flash winning line on matrix
    for _ in range(5):
        # Draw board with highlight
        pixels = [EMPTY for _ in range(64)]
        for idx in winning_line:
            for (cx, cy) in CELL_COORDS[idx]:
                pixels[cy * 8 + cx] = color
        sense.set_pixels(pixels)
        time.sleep(0.2)
        sense.clear()
        time.sleep(0.15)
        
    sense.show_message("WIN!" if winner == 1 else "AI!", text_colour=color, scroll_speed=0.06)

def main():
    global cur_r, cur_c
    print("\nGame started! Move cursor and press Middle button.")
    blink_state = True
    last_blink_time = time.time()
    game_over = False

    while not game_over:
        # Blink cursor every 250ms
        now = time.time()
        if now - last_blink_time > 0.25:
            blink_state = not blink_state
            last_blink_time = now
            draw_board(blink_state)

        # Poll joystick events
        events = sense.stick.get_events()
        for ev in events:
            if ev.action == 'pressed':
                d = str(ev.direction).lower()
                
                if d == 'up':
                    cur_r = max(0, cur_r - 1)
                    print(f"Cursor: ({cur_r}, {cur_c})")
                    draw_board(True)
                elif d == 'down':
                    cur_r = min(2, cur_r + 1)
                    print(f"Cursor: ({cur_r}, {cur_c})")
                    draw_board(True)
                elif d == 'left':
                    cur_c = max(0, cur_c - 1)
                    print(f"Cursor: ({cur_r}, {cur_c})")
                    draw_board(True)
                elif d == 'right':
                    cur_c = min(2, cur_c + 1)
                    print(f"Cursor: ({cur_r}, {cur_c})")
                    draw_board(True)
                elif d in ('middle', 'centre', 'center', 'enter'):
                    target_idx = cur_r * 3 + cur_c
                    if board[target_idx] == 0:
                        board[target_idx] = 1 # Player X
                        print(f"-> Player 1 placed X at Row {cur_r}, Col {cur_c}")
                        draw_board(False)

                        # Check for player win
                        w, line = check_winner(board)
                        if w == 1:
                            celebrate_win(1, line)
                            game_over = True
                            break
                        elif w == 3:
                            print("\nGame Over: It's a Tie / Draw!")
                            if has_lcd:
                                lcd.clear()
                                lcd.write("Game Draw / Tie!")
                            sense.show_message("TIE!", scroll_speed=0.06)
                            game_over = True
                            break

                        # AI turn
                        time.sleep(0.3)
                        ai_choice = ai_move()
                        if ai_choice is not None:
                            ai_r, ai_c = ai_choice // 3, ai_choice % 3
                            print(f"-> Computer AI placed O at Row {ai_r}, Col {ai_c}")
                            draw_board(True)

                        # Check for AI win
                        w, line = check_winner(board)
                        if w == 2:
                            celebrate_win(2, line)
                            game_over = True
                            break
                        elif w == 3:
                            print("\nGame Over: It's a Tie / Draw!")
                            if has_lcd:
                                lcd.clear()
                                lcd.write("Game Draw / Tie!")
                            sense.show_message("TIE!", scroll_speed=0.06)
                            game_over = True
                            break
                    else:
                        print("Cell already occupied! Choose another cell.")

        time.sleep(0.04)

    print("\nTic-Tac-Toe match completed.")
    time.sleep(1)
    sense.clear()

if __name__ == "__main__":
    main()
