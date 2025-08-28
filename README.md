# What are the rules? - Game

A JavaScript client-side game where you figure out the rules through experimentation.

## How to Play

### Game Mechanics
- **Safe Zones**: Green areas where you're protected from enemies
- **Line Drawing**: Click and drag to draw lines when in a safe zone
- **Territory Capture**: Complete a line to create a new safe zone
- **Enemies**: Red circles that chase you and can kill you if they touch you or your line

### Controls
- **Movement**: WASD keys or Arrow keys
- **Line Drawing**: Automatic when exiting safe zones
- **Pause**: ESC key or Pause button
- **Restart**: Restart button

### Game Rules
1. Start in the initial safe zone (green area)
2. When you exit a safe zone, you automatically start drawing a line
3. Move around to create a path - the line follows your exact movement
4. Return to any safe zone to complete the line and create a new safe zone
5. The area enclosed by your line becomes a new safe zone
6. Avoid enemies (red circles) - they will kill you if they touch you or your line
7. Don't hit your own line while drawing - it will kill you
8. Enemies only chase you when you're close to them (within 150 pixels)
9. Complete the level by filling 85% of the board with safe zones
10. Timer shows your completion time (faster is better)

### Scoring
- Points are awarded based on the area you capture
- Larger captured areas give more points
- Complete levels quickly for better scores
- Timer tracks your completion time

### Level System
- 20 levels total
- Only the first level is unlocked initially
- Complete levels to unlock new ones
- Progress is saved automatically

## Features
- Modern, responsive UI
- Smooth animations and transitions
- Progressive difficulty
- Local save system
- Pause and resume functionality
- Game over and restart options

## Technical Details
- Pure JavaScript (no external dependencies)
- HTML5 Canvas for rendering
- CSS3 for styling and animations
- LocalStorage for save data

## File Structure
- `index.html` - Main HTML structure
- `styles.css` - Game styling and layout
- `game.js` - Complete game logic and mechanics
- `README.md` - This file

## Running the Game
Simply open `index.html` in a modern web browser. No server required!
