# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Noah's Arcade is a static HTML/CSS/JavaScript game collection website. It serves as a game portal where users can browse and play multiple browser-based games.

## Architecture

### Main Portal Structure
- [index.html](index.html) - Main landing page with game grid
- [games.js](games.js) - Central game registry that defines all available games
- [style.css](style.css) - Global styling for the landing page

### Game Registry Pattern
All games are defined in a central `games` array in [games.js](games.js). Each game entry contains:
- `title` - Display name
- `description` - Brief description shown on game card
- `folder` - Directory name containing the game
- `screenshot` - Path to screenshot image (displayed in game grid)

The landing page dynamically generates game cards from this registry using vanilla JavaScript DOM manipulation.

### Individual Game Structure
Each game is self-contained in its own folder with a consistent pattern:
- `index.html` - Game entry point
- `script.js` - Game logic
- `style.css` - Game-specific styles
- `screenshot.png` - Preview image for the landing page
- Additional assets (images, audio files)

Current games:
- **Gunway** - Space shooter with difficulty levels, uses jQuery
- **KillingMobs** - Tower defense with canvas rendering
- **BrickBlast** - Pong-style paddle game

## Development

### Running the Project
This is a static site. Open [index.html](index.html) in a browser, or use any static file server:
```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server
```

### Adding a New Game
1. Create a new folder for the game (use lowercase or PascalCase to match existing naming)
2. Add `index.html`, `script.js`, `style.css`, and `screenshot.png` to the folder
3. Register the game in [games.js](games.js) by adding an entry to the `games` array
4. The game will automatically appear on the landing page

### Technology Stack
- Pure HTML5/CSS3/JavaScript (ES6+)
- jQuery 3.6.0 (used in some games - loaded via CDN)
- Canvas API (used in KillingMobs)
- No build process or bundler required

## Key Implementation Details

### Landing Page Rendering
The [games.js](games.js) file uses `DOMContentLoaded` event listener to dynamically generate game cards. It replaces the content of `#game-grid` with cards created from the games array.

### Asset Paths
Screenshot and folder paths in [games.js](games.js) are relative to the root directory. Games are accessed by navigating to `{folder}/` which loads `{folder}/index.html`.
