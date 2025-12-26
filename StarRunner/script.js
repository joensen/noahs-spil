// Game State Constants
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    WON: 'won',
    LOST: 'lost'
};

// Game Configuration
const CONFIG = {
    CELL_SIZE: 4,
    WALL_HEIGHT: 2,
    WALL_THICKNESS: 0.5,
    MOVE_SPEED: 10,
    JUMP_VELOCITY: 3.5,  // Reduced to prevent jumping over walls
    GRAVITY: 9.8,
    PLAYER_RADIUS: 0.5,  // Increased from 0.3 to prevent getting stuck
    PLAYER_HEIGHT: 1.6,
    POINTS_PER_STAR: 1000,
    TIME_BONUS_MULTIPLIER: 0.1,  // Per millisecond (100 per second = 0.1 per ms)
    INITIAL_TIME: 60,
    LAVA_PENALTY: 300,
    LAVA_HOLE_COUNT: 5
};

// Difficulty settings
const DIFFICULTY = {
    easy: { mazeSize: 8, name: 'Easy' },
    medium: { mazeSize: 12, name: 'Medium' },
    hard: { mazeSize: 16, name: 'Hard' }
};

let currentDifficulty = 'medium';
let currentMazeSize = DIFFICULTY.medium.mazeSize;

// Global Game State
let currentState = GameState.MENU;
let timeRemaining = CONFIG.INITIAL_TIME;
let starsCollected = 0;
let starScore = 0;
let timeBonus = 0;
let totalScore = 0;

// Three.js Objects
let scene, camera, renderer;
let maze, wallMeshes = [];
let stars = [];
let exitPortal;
let lavaHoles = [];
let lavaHolePositions = [];
let shownStarIndex = 0; // Which star to show on minimap
let ouchActive = false;
let ouchTimer = 0;
let isInLavaHole = false; // Track if player is currently in a lava hole

// Pointer Lock Control Variables
let isPointerLocked = false;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

// Player Movement
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    canJump: false
};

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let lastTime = 0;

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const crosshair = document.getElementById('crosshair');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// ===== MAZE GENERATION =====
class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = [];
        this.entrance = null;
        this.exit = null;
    }

    generate() {
        // Initialize cells with all walls
        for (let y = 0; y < this.height; y++) {
            this.cells[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x] = {
                    x: x,
                    y: y,
                    visited: false,
                    walls: { north: true, south: true, east: true, west: true }
                };
            }
        }

        // Recursive backtracking algorithm
        const stack = [];
        const startCell = this.cells[0][0];
        startCell.visited = true;
        stack.push(startCell);

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.removeWall(current, next);
                next.visited = true;
                stack.push(next);
            } else {
                stack.pop();
            }
        }

        // Set entrance and exit on opposite corners
        this.entrance = { x: 0, y: 0 };
        this.exit = { x: this.width - 1, y: this.height - 1 };
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const { x, y } = cell;

        if (y > 0 && !this.cells[y - 1][x].visited) neighbors.push(this.cells[y - 1][x]); // North
        if (y < this.height - 1 && !this.cells[y + 1][x].visited) neighbors.push(this.cells[y + 1][x]); // South
        if (x < this.width - 1 && !this.cells[y][x + 1].visited) neighbors.push(this.cells[y][x + 1]); // East
        if (x > 0 && !this.cells[y][x - 1].visited) neighbors.push(this.cells[y][x - 1]); // West

        return neighbors;
    }

    removeWall(current, next) {
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        if (dx === 1) { // Next is to the east
            current.walls.east = false;
            next.walls.west = false;
        } else if (dx === -1) { // Next is to the west
            current.walls.west = false;
            next.walls.east = false;
        } else if (dy === 1) { // Next is to the south
            current.walls.south = false;
            next.walls.north = false;
        } else if (dy === -1) { // Next is to the north
            current.walls.north = false;
            next.walls.south = false;
        }
    }

    toThreeJS(scene) {
        const wallMeshes = [];

        // Soft pastel colors for walls
        const colors = [
            0x87CEEB, // Sky blue
            0xFFB6C1, // Light pink
            0x98D8C8, // Mint green
            0xE6A8D7, // Lavender
            0xF4D03F, // Soft yellow
            0xFFDAB9  // Peach
        ];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                const baseX = x * CONFIG.CELL_SIZE;
                const baseZ = y * CONFIG.CELL_SIZE;

                // Create walls for each side with different colors
                if (cell.walls.north) {
                    const color = colors[(x + y) % colors.length];
                    const wallMaterial = new THREE.MeshLambertMaterial({ color: color });
                    const wall = this.createWall(
                        baseX + CONFIG.CELL_SIZE / 2,
                        baseZ,
                        CONFIG.CELL_SIZE,
                        CONFIG.WALL_THICKNESS,
                        wallMaterial
                    );
                    scene.add(wall);
                    wallMeshes.push(wall);
                }
                if (cell.walls.south) {
                    const color = colors[(x + y + 1) % colors.length];
                    const wallMaterial = new THREE.MeshLambertMaterial({ color: color });
                    const wall = this.createWall(
                        baseX + CONFIG.CELL_SIZE / 2,
                        baseZ + CONFIG.CELL_SIZE,
                        CONFIG.CELL_SIZE,
                        CONFIG.WALL_THICKNESS,
                        wallMaterial
                    );
                    scene.add(wall);
                    wallMeshes.push(wall);
                }
                if (cell.walls.east) {
                    const color = colors[(x + y + 2) % colors.length];
                    const wallMaterial = new THREE.MeshLambertMaterial({ color: color });
                    const wall = this.createWall(
                        baseX + CONFIG.CELL_SIZE,
                        baseZ + CONFIG.CELL_SIZE / 2,
                        CONFIG.WALL_THICKNESS,
                        CONFIG.CELL_SIZE,
                        wallMaterial
                    );
                    scene.add(wall);
                    wallMeshes.push(wall);
                }
                if (cell.walls.west) {
                    const color = colors[(x + y + 3) % colors.length];
                    const wallMaterial = new THREE.MeshLambertMaterial({ color: color });
                    const wall = this.createWall(
                        baseX,
                        baseZ + CONFIG.CELL_SIZE / 2,
                        CONFIG.WALL_THICKNESS,
                        CONFIG.CELL_SIZE,
                        wallMaterial
                    );
                    scene.add(wall);
                    wallMeshes.push(wall);
                }
            }
        }

        return wallMeshes;
    }

    createWall(x, z, width, depth, material) {
        const geometry = new THREE.BoxGeometry(width, CONFIG.WALL_HEIGHT, depth);
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, CONFIG.WALL_HEIGHT / 2, z);
        return wall;
    }

    getRandomEmptyCell(exclude = []) {
        let cell;
        do {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            cell = { x, y };
        } while (exclude.some(e => e.x === cell.x && e.y === cell.y));
        return cell;
    }

    cellToWorldPosition(cell) {
        return {
            x: cell.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
            z: cell.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2
        };
    }
}

// ===== INITIALIZATION =====
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 1, 30);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, CONFIG.PLAYER_HEIGHT, 2);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Create checkered floor with black and white tiles (will be created in startGame)

    // Setup pointer lock
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    document.addEventListener('mousemove', onMouseMove);

    // Event listeners
    startButton.addEventListener('click', () => {
        document.body.requestPointerLock();
    });

    restartButton.addEventListener('click', () => {
        resetGame();
        currentState = GameState.MENU;
        gameOverScreen.style.display = 'none';
        menuScreen.style.display = 'flex';
    });

    // Difficulty button listeners
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.getAttribute('data-difficulty');
            currentMazeSize = DIFFICULTY[currentDifficulty].mazeSize;
        });
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate(0);
}

// ===== GAME FUNCTIONS =====
let floorTiles = [];
let ceilingMesh = null;

function startGame() {
    currentState = GameState.PLAYING;
    menuScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    crosshair.classList.add('active');
    minimapCanvas.classList.add('active');

    // Generate maze with current difficulty size
    maze = new MazeGenerator(currentMazeSize, currentMazeSize);
    maze.generate();
    wallMeshes = maze.toThreeJS(scene);

    // Place player at entrance
    const entrancePos = maze.cellToWorldPosition(maze.entrance);
    camera.position.set(entrancePos.x, CONFIG.PLAYER_HEIGHT, entrancePos.z);

    // Place stars first (before lava holes to exclude their positions)
    placeStars();

    // Place exit portal
    placeExitPortal();

    // Place lava holes (this also sets lavaHolePositions)
    placeLavaHoles();

    // Create floor tiles - skip tiles where lava holes are
    const tileSize = CONFIG.CELL_SIZE / 2;
    const tilesX = currentMazeSize * 2;
    const tilesZ = currentMazeSize * 2;
    const holeRadius = 1.0; // Match the lava hole radius

    for (let x = 0; x < tilesX; x++) {
        for (let z = 0; z < tilesZ; z++) {
            const tileX = x * tileSize + tileSize / 2;
            const tileZ = z * tileSize + tileSize / 2;

            // Check if this tile overlaps with any lava hole
            let isOverLavaHole = false;
            for (const hole of lavaHolePositions) {
                const dx = tileX - hole.x;
                const dz = tileZ - hole.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance < holeRadius + tileSize / 2) {
                    isOverLavaHole = true;
                    break;
                }
            }

            if (!isOverLavaHole) {
                const isWhite = (x + z) % 2 === 0;
                const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
                const tileMaterial = new THREE.MeshLambertMaterial({
                    color: isWhite ? 0xffffff : 0x000000
                });
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(tileX, 0, tileZ);
                scene.add(tile);
                floorTiles.push(tile);
            }
        }
    }

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(currentMazeSize * CONFIG.CELL_SIZE, currentMazeSize * CONFIG.CELL_SIZE);
    const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
    ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(currentMazeSize * CONFIG.CELL_SIZE / 2, CONFIG.WALL_HEIGHT, currentMazeSize * CONFIG.CELL_SIZE / 2);
    scene.add(ceilingMesh);

    // Reset game state
    timeRemaining = CONFIG.INITIAL_TIME;
    starsCollected = 0;
    starScore = 0;
    shownStarIndex = Math.floor(Math.random() * 5); // Random star to show on minimap
    updateHUD();
}

function createPentagramGeometry(outerRadius, innerRadius) {
    const shape = new THREE.Shape();
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();

    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function placeStars() {
    // Clear existing stars
    stars.forEach(star => scene.remove(star));
    stars = [];

    // Create pentagram geometry
    const starGeometry = createPentagramGeometry(0.5, 0.2);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.4
    });

    const exclude = [maze.entrance, maze.exit];

    for (let i = 0; i < 5; i++) {
        const cell = maze.getRandomEmptyCell(exclude);
        exclude.push(cell);

        const pos = maze.cellToWorldPosition(cell);
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.rotation.x = Math.PI / 2; // Make it face up/horizontal
        star.position.set(pos.x, 1.0, pos.z);
        scene.add(star);
        stars.push(star);
    }
}

function placeExitPortal() {
    if (exitPortal) {
        scene.remove(exitPortal);
    }

    // Create a treasure chest group
    exitPortal = new THREE.Group();

    // Chest body (brown box)
    const chestBodyGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const chestBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Saddle brown
        roughness: 0.7
    });
    const chestBody = new THREE.Mesh(chestBodyGeometry, chestBodyMaterial);
    chestBody.position.y = 0.4;
    exitPortal.add(chestBody);

    // Chest lid (slightly curved top)
    const chestLidGeometry = new THREE.BoxGeometry(1.3, 0.3, 0.9);
    const chestLidMaterial = new THREE.MeshStandardMaterial({
        color: 0x654321, // Dark brown
        roughness: 0.6
    });
    const chestLid = new THREE.Mesh(chestLidGeometry, chestLidMaterial);
    chestLid.position.y = 0.95;
    exitPortal.add(chestLid);

    // Gold trim on chest
    const trimGeometry = new THREE.BoxGeometry(1.35, 0.1, 0.95);
    const trimMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold
        emissive: 0xFFD700,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.3
    });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.y = 0.8;
    exitPortal.add(trim);

    // Gold lock
    const lockGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.15);
    const lockMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.2
    });
    const lock = new THREE.Mesh(lockGeometry, lockMaterial);
    lock.position.set(0, 0.6, 0.45);
    exitPortal.add(lock);

    // Add a glowing effect around the chest
    const glowGeometry = new THREE.RingGeometry(0.8, 1.2, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    exitPortal.add(glow);

    const exitPos = maze.cellToWorldPosition(maze.exit);
    exitPortal.position.set(exitPos.x, 0, exitPos.z);
    scene.add(exitPortal);
}

function placeLavaHoles() {
    // Clear existing lava holes
    lavaHoles.forEach(hole => scene.remove(hole));
    lavaHoles = [];
    lavaHolePositions = [];

    // Get cells to exclude (entrance, exit, and star positions)
    const exclude = [maze.entrance, maze.exit];
    stars.forEach(star => {
        const cellX = Math.floor(star.position.x / CONFIG.CELL_SIZE);
        const cellZ = Math.floor(star.position.z / CONFIG.CELL_SIZE);
        exclude.push({ x: cellX, y: cellZ });
    });

    // Create lava material
    const lavaMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4500, // Orange-red
        emissive: 0xff2200,
        emissiveIntensity: 0.8
    });

    // Dark material for pit walls
    const pitWallMaterial = new THREE.MeshLambertMaterial({
        color: 0x333333
    });

    const holeDepth = 1.5; // How deep the hole is
    const holeSize = 2.0; // 2 tiles wide

    for (let i = 0; i < CONFIG.LAVA_HOLE_COUNT; i++) {
        const cell = maze.getRandomEmptyCell(exclude);
        exclude.push(cell);

        const pos = maze.cellToWorldPosition(cell);

        // Create a group for the lava pit
        const pitGroup = new THREE.Group();

        // Create the lava at the bottom of the pit
        const lavaGeometry = new THREE.PlaneGeometry(holeSize, holeSize);
        const lava = new THREE.Mesh(lavaGeometry, lavaMaterial);
        lava.rotation.x = -Math.PI / 2;
        lava.position.y = -holeDepth + 0.05;
        pitGroup.add(lava);

        // Create pit walls (4 sides)
        const wallGeometry = new THREE.PlaneGeometry(holeSize, holeDepth);

        // North wall
        const northWall = new THREE.Mesh(wallGeometry, pitWallMaterial);
        northWall.position.set(0, -holeDepth / 2, -holeSize / 2);
        pitGroup.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(wallGeometry, pitWallMaterial);
        southWall.rotation.y = Math.PI;
        southWall.position.set(0, -holeDepth / 2, holeSize / 2);
        pitGroup.add(southWall);

        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, pitWallMaterial);
        eastWall.rotation.y = -Math.PI / 2;
        eastWall.position.set(holeSize / 2, -holeDepth / 2, 0);
        pitGroup.add(eastWall);

        // West wall
        const westWall = new THREE.Mesh(wallGeometry, pitWallMaterial);
        westWall.rotation.y = Math.PI / 2;
        westWall.position.set(-holeSize / 2, -holeDepth / 2, 0);
        pitGroup.add(westWall);

        pitGroup.position.set(pos.x, 0, pos.z);
        scene.add(pitGroup);
        lavaHoles.push(pitGroup);
        lavaHolePositions.push({ x: pos.x, z: pos.z, radius: holeSize / 2, depth: holeDepth });
    }
}

function checkLavaHoles() {
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    const playerY = camera.position.y;

    for (let i = 0; i < lavaHolePositions.length; i++) {
        const hole = lavaHolePositions[i];
        const dx = playerX - hole.x;
        const dz = playerZ - hole.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Check if player is over a hole
        if (distance < hole.radius) {
            // Player is in the hole area - allow falling
            isInLavaHole = true;

            // Check if player hit the lava at the bottom
            const lavaHeight = -hole.depth + CONFIG.PLAYER_HEIGHT;
            if (playerY <= lavaHeight + 0.1) {
                // Player hit lava! Show OUCH and deduct points
                if (!ouchActive) {
                    starScore = Math.max(0, starScore - CONFIG.LAVA_PENALTY);
                    showOuchOverlay();
                }

                // Keep player at lava level (they need to jump out)
                camera.position.y = lavaHeight;
                velocity.y = 0;
                movement.canJump = true; // Allow jumping out of the hole
            }
            return true;
        }
    }

    isInLavaHole = false;
    return false;
}

function showOuchOverlay() {
    ouchActive = true;
    ouchTimer = 1.0; // 1 second
    document.getElementById('ouch-overlay').classList.add('active');
}

function updateOuchOverlay(delta) {
    if (ouchActive) {
        ouchTimer -= delta;
        if (ouchTimer <= 0) {
            ouchActive = false;
            document.getElementById('ouch-overlay').classList.remove('active');
        }
    }
}

function resetGame() {
    // Clear maze
    wallMeshes.forEach(wall => scene.remove(wall));
    wallMeshes = [];

    // Clear stars
    stars.forEach(star => scene.remove(star));
    stars = [];

    // Clear exit
    if (exitPortal) {
        scene.remove(exitPortal);
    }

    // Clear lava holes
    lavaHoles.forEach(hole => scene.remove(hole));
    lavaHoles = [];
    lavaHolePositions = [];

    // Clear floor tiles
    floorTiles.forEach(tile => scene.remove(tile));
    floorTiles = [];

    // Clear ceiling
    if (ceilingMesh) {
        scene.remove(ceilingMesh);
        ceilingMesh = null;
    }

    // Reset velocity
    velocity.set(0, 0, 0);
    movement.canJump = false;
}

function endGame(won) {
    currentState = won ? GameState.WON : GameState.LOST;
    crosshair.classList.remove('active');
    minimapCanvas.classList.remove('active');
    document.exitPointerLock();

    // Calculate final score (time bonus in milliseconds)
    const timeInMs = timeRemaining * 1000;
    timeBonus = Math.floor(timeInMs * CONFIG.TIME_BONUS_MULTIPLIER);
    totalScore = starScore + timeBonus;

    // Update game over screen
    document.getElementById('result-message').textContent = won ? 'Victory!' : "Time's Up!";
    document.getElementById('final-stars').textContent = starsCollected;
    document.getElementById('star-points').textContent = starScore;
    document.getElementById('time-left').textContent = (timeRemaining * 1000).toFixed(0) + 'ms';
    document.getElementById('time-points').textContent = timeBonus;
    document.getElementById('final-score').textContent = totalScore;

    gameOverScreen.style.display = 'flex';
}

// ===== MOVEMENT & COLLISION =====
function updatePlayerMovement(delta) {
    // Apply gravity
    velocity.y -= CONFIG.GRAVITY * delta;

    // Get movement direction
    direction.z = Number(movement.forward) - Number(movement.backward);
    direction.x = Number(movement.right) - Number(movement.left);
    direction.normalize();

    // Calculate intended movement
    const moveVector = new THREE.Vector3();

    if (movement.forward || movement.backward) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        moveVector.add(forward.multiplyScalar(direction.z * CONFIG.MOVE_SPEED * delta));
    }

    if (movement.left || movement.right) {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        moveVector.add(right.multiplyScalar(direction.x * CONFIG.MOVE_SPEED * delta));
    }

    // Sliding collision - try X and Z separately to prevent getting stuck in corners
    const newPosX = new THREE.Vector3(
        camera.position.x + moveVector.x,
        camera.position.y,
        camera.position.z
    );

    const newPosZ = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z + moveVector.z
    );

    const newPosBoth = new THREE.Vector3(
        camera.position.x + moveVector.x,
        camera.position.y,
        camera.position.z + moveVector.z
    );

    // Try moving in both directions first
    if (!checkCollision(newPosBoth)) {
        camera.position.x += moveVector.x;
        camera.position.z += moveVector.z;
    } else {
        // If blocked, try sliding along each axis separately
        if (!checkCollision(newPosX)) {
            camera.position.x += moveVector.x;
        }
        if (!checkCollision(newPosZ)) {
            camera.position.z += moveVector.z;
        }
    }

    // Apply vertical velocity
    camera.position.y += velocity.y * delta;

    // Ground collision - but allow falling into holes
    if (!isInLavaHole) {
        if (camera.position.y <= CONFIG.PLAYER_HEIGHT) {
            camera.position.y = CONFIG.PLAYER_HEIGHT;
            velocity.y = 0;
            movement.canJump = true;
        } else {
            movement.canJump = false;
        }
    }
}

function checkCollision(position) {
    const raycaster = new THREE.Raycaster();

    // 8 directional rays from the new position
    const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(1, 0, 1).normalize(),
        new THREE.Vector3(1, 0, -1).normalize(),
        new THREE.Vector3(-1, 0, 1).normalize(),
        new THREE.Vector3(-1, 0, -1).normalize()
    ];

    for (let dir of directions) {
        raycaster.set(position, dir);
        const intersects = raycaster.intersectObjects(wallMeshes);
        if (intersects.length > 0 && intersects[0].distance < CONFIG.PLAYER_RADIUS) {
            return true;
        }
    }

    return false;
}

function checkStarCollection() {
    const playerPos = camera.position.clone();

    // Adjust player position to be at ground level for better collection
    playerPos.y = 1.0;

    for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        const distance = playerPos.distanceTo(star.position);

        // Larger collection radius (1.5 units)
        if (distance < 1.5) {
            // Collect star
            scene.remove(star);
            stars.splice(i, 1);
            starsCollected++;
            starScore = starsCollected * CONFIG.POINTS_PER_STAR;

            // Add 10 seconds to the timer
            timeRemaining += 10;

            // Pick a new random star to show on minimap
            if (stars.length > 0) {
                shownStarIndex = Math.floor(Math.random() * stars.length);
            }

            updateHUD();
        }
    }
}

function checkExitReached() {
    if (!exitPortal) return;

    const playerPos = camera.position.clone();
    playerPos.y = 0; // Compare at ground level
    const exitPos = exitPortal.position.clone();
    exitPos.y = 0;
    const distance = playerPos.distanceTo(exitPos);

    if (distance < 2) {
        if (starsCollected === 5) {
            endGame(true);
        }
    }
}

function updateHUD() {
    document.getElementById('time-value').textContent = Math.ceil(timeRemaining);

    // Calculate current total score: stars collected + current time bonus (in milliseconds)
    const timeInMs = timeRemaining * 1000;
    const currentTimeBonus = Math.floor(timeInMs * CONFIG.TIME_BONUS_MULTIPLIER);
    const currentTotalScore = starScore + currentTimeBonus;
    document.getElementById('score-value').textContent = currentTotalScore;

    // Show star icons - filled for collected, empty for remaining
    let starsHTML = '';
    for (let i = 0; i < 5; i++) {
        if (i < starsCollected) {
            starsHTML += '<span class="star-icon collected">&#9733;</span>'; // Filled star
        } else {
            starsHTML += '<span class="star-icon">&#9734;</span>'; // Empty star
        }
    }
    document.getElementById('stars-icons').innerHTML = starsHTML;
}

function drawMinimap() {
    if (!maze) return;

    // Adjust canvas to fit the entire map
    const canvasWidth = minimapCanvas.width;
    const canvasHeight = minimapCanvas.height;
    const cellSize = Math.min(canvasWidth, canvasHeight) / Math.max(maze.width, maze.height);

    // Calculate offset to center the map
    const offsetX = (canvasWidth - maze.width * cellSize) / 2;
    const offsetY = (canvasHeight - maze.height * cellSize) / 2;

    // Clear canvas
    minimapCtx.fillStyle = '#000000';
    minimapCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw maze walls
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.lineWidth = 1;

    for (let y = 0; y < maze.height; y++) {
        for (let x = 0; x < maze.width; x++) {
            const cell = maze.cells[y][x];
            const drawX = offsetX + x * cellSize;
            const drawY = offsetY + y * cellSize;

            minimapCtx.beginPath();

            // Draw walls
            if (cell.walls.north) {
                minimapCtx.moveTo(drawX, drawY);
                minimapCtx.lineTo(drawX + cellSize, drawY);
            }
            if (cell.walls.south) {
                minimapCtx.moveTo(drawX, drawY + cellSize);
                minimapCtx.lineTo(drawX + cellSize, drawY + cellSize);
            }
            if (cell.walls.east) {
                minimapCtx.moveTo(drawX + cellSize, drawY);
                minimapCtx.lineTo(drawX + cellSize, drawY + cellSize);
            }
            if (cell.walls.west) {
                minimapCtx.moveTo(drawX, drawY);
                minimapCtx.lineTo(drawX, drawY + cellSize);
            }

            minimapCtx.stroke();
        }
    }

    // Draw exit (chest) - draw as a small rectangle
    if (exitPortal) {
        const exitCellX = offsetX + maze.exit.x * cellSize + cellSize / 2;
        const exitCellY = offsetY + maze.exit.y * cellSize + cellSize / 2;
        minimapCtx.fillStyle = '#8B4513'; // Brown for chest
        const chestSize = Math.max(cellSize / 3, 4);
        minimapCtx.fillRect(exitCellX - chestSize / 2, exitCellY - chestSize / 2, chestSize, chestSize);
        minimapCtx.strokeStyle = '#FFD700'; // Gold border
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(exitCellX - chestSize / 2, exitCellY - chestSize / 2, chestSize, chestSize);
    }

    // Draw player position
    const playerCellX = offsetX + (camera.position.x / CONFIG.CELL_SIZE) * cellSize;
    const playerCellZ = offsetY + (camera.position.z / CONFIG.CELL_SIZE) * cellSize;

    minimapCtx.fillStyle = '#ff0000';
    minimapCtx.beginPath();
    minimapCtx.arc(playerCellX, playerCellZ, Math.max(cellSize / 4, 4), 0, Math.PI * 2);
    minimapCtx.fill();

    // Draw player direction indicator
    const directionLength = Math.max(cellSize / 2, 8);
    const angle = Math.atan2(
        Math.sin(euler.y),
        Math.cos(euler.y)
    );

    minimapCtx.strokeStyle = '#ff0000';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(playerCellX, playerCellZ);
    minimapCtx.lineTo(
        playerCellX + Math.sin(angle) * directionLength,
        playerCellZ + Math.cos(angle) * directionLength
    );
    minimapCtx.stroke();
}

// ===== POINTER LOCK HANDLERS =====
function onPointerLockChange() {
    if (document.pointerLockElement === document.body) {
        isPointerLocked = true;
        if (currentState === GameState.MENU) {
            startGame();
        }
    } else {
        isPointerLocked = false;
    }
}

function onPointerLockError() {
    console.error('Pointer lock error');
}

function onMouseMove(event) {
    if (!isPointerLocked) return;

    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    euler.setFromQuaternion(camera.quaternion);

    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;

    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));

    camera.quaternion.setFromEuler(euler);
}

// ===== EVENT HANDLERS =====
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            movement.forward = true;
            break;
        case 'KeyS':
            movement.backward = true;
            break;
        case 'KeyA':
            movement.left = true;
            break;
        case 'KeyD':
            movement.right = true;
            break;
        case 'Space':
            if (movement.canJump) {
                velocity.y = CONFIG.JUMP_VELOCITY;
                movement.canJump = false;
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            movement.forward = false;
            break;
        case 'KeyS':
            movement.backward = false;
            break;
        case 'KeyA':
            movement.left = false;
            break;
        case 'KeyD':
            movement.right = false;
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== ANIMATION LOOP =====
function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (currentState === GameState.PLAYING) {
        // Update timer
        timeRemaining -= delta;
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            endGame(false);
            return;
        }

        // Animate stars
        stars.forEach(star => {
            star.rotation.y += delta * 2;
        });

        // Update player movement
        updatePlayerMovement(delta);

        // Check lava holes
        checkLavaHoles();

        // Update ouch overlay
        updateOuchOverlay(delta);

        // Check star collection
        checkStarCollection();

        // Check exit reached
        if (starsCollected === 5) {
            checkExitReached();
        }

        // Update HUD
        updateHUD();

        // Update minimap
        drawMinimap();
    }

    // Render scene
    renderer.render(scene, camera);
}

// ===== START =====
init();
