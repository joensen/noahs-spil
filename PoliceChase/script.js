// Police Chase - 2D Racing Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameRunning = false;
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let catches = 0;

// Player police car
const player = {
    x: 0,
    y: 0,
    width: 60,
    height: 100,
    speed: 8
};

// The thief to catch
let thief = null;

// Traffic cars to avoid
let trafficCars = [];

// Road lanes
const laneCount = 4;

// Controls
const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keys.up = true;
        e.preventDefault();
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keys.down = true;
        e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
        e.preventDefault();
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Road animation
let roadOffset = 0;

// Initialize game
function initGame() {
    score = 0;
    catches = 0;
    timeLeft = 30;
    trafficCars = [];

    // Center player
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 150;

    // Spawn thief
    spawnThief();

    // Spawn some traffic
    for (let i = 0; i < 2; i++) {
        spawnTraffic();
    }

    // Start timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameRunning) {
            timeLeft--;
            document.getElementById('distance-value').textContent = timeLeft;

            if (timeLeft <= 0) {
                gameOver();
            }
        }
    }, 1000);
}

function spawnThief() {
    const roadLeft = canvas.width / 2 - 200;
    const roadRight = canvas.width / 2 + 200 - 50;

    thief = {
        x: roadLeft + Math.random() * (roadRight - roadLeft),
        y: 100 + Math.random() * 200,
        width: 55,
        height: 95,
        speedX: (2 + catches * 0.3) * (Math.random() > 0.5 ? 1 : -1),
        speedY: (1.5 + catches * 0.2) * (Math.random() > 0.5 ? 1 : -1),
        color: '#ff0000'
    };
}

function spawnTraffic() {
    const roadLeft = canvas.width / 2 - 200;
    const laneWidth = 100;
    const lane = Math.floor(Math.random() * laneCount);

    trafficCars.push({
        x: roadLeft + lane * laneWidth + 20,
        y: -150 - Math.random() * 500,
        width: 50,
        height: 90,
        speed: 3 + Math.random() * 3,
        color: ['#00aa00', '#0066cc', '#ffcc00', '#ff6600', '#9933cc'][Math.floor(Math.random() * 5)]
    });
}

function gameOver() {
    gameRunning = false;
    if (timerInterval) clearInterval(timerInterval);

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-distance').textContent = catches;
    document.getElementById('game-over').style.display = 'block';
}

// Draw road
function drawRoad() {
    const roadWidth = 400;
    const roadLeft = canvas.width / 2 - roadWidth / 2;

    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road
    ctx.fillStyle = '#333';
    ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

    // Road edges
    ctx.fillStyle = '#fff';
    ctx.fillRect(roadLeft, 0, 5, canvas.height);
    ctx.fillRect(roadLeft + roadWidth - 5, 0, 5, canvas.height);

    // Lane markings (animated)
    ctx.fillStyle = '#ffff00';
    const laneWidth = 100;
    for (let lane = 1; lane < laneCount; lane++) {
        for (let y = roadOffset - 60; y < canvas.height; y += 80) {
            ctx.fillRect(roadLeft + lane * laneWidth - 2, y, 4, 40);
        }
    }
}

// Draw a car
function drawCar(x, y, width, height, color, isPolice, isThief, isTraffic) {
    // Car body
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    // Car top (cabin)
    ctx.fillStyle = isPolice ? '#1a1a8a' : color;
    ctx.fillRect(x + 5, y + 20, width - 10, height - 50);

    // Windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 8, y + 25, width - 16, 20);
    ctx.fillRect(x + 8, y + height - 35, width - 16, 15);

    // Wheels
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, y + 10, 8, 20);
    ctx.fillRect(x + width - 3, y + 10, 8, 20);
    ctx.fillRect(x - 5, y + height - 30, 8, 20);
    ctx.fillRect(x + width - 3, y + height - 30, 8, 20);

    if (isPolice) {
        // Police stripe
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 5, y + height/2 - 5, width - 10, 10);

        // Police lights
        const lightTime = Date.now() % 400;

        ctx.fillStyle = lightTime < 200 ? '#ff0000' : '#440000';
        ctx.beginPath();
        ctx.arc(x + 15, y + 15, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = lightTime < 200 ? '#000066' : '#0000ff';
        ctx.beginPath();
        ctx.arc(x + width - 15, y + 15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Light bar
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 10, y + 10, width - 20, 5);
    }

    if (isThief) {
        // "TYVEN" text above car
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TYVEN!', x + width/2, y - 10);

        // Flashing outline
        const flashTime = Date.now() % 500;
        if (flashTime < 250) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
        }

        // Tail lights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 5, y + height - 8, 10, 5);
        ctx.fillRect(x + width - 15, y + height - 8, 10, 5);
    }

    if (isTraffic) {
        // Headlights
        ctx.fillStyle = '#ffffaa';
        ctx.fillRect(x + 5, y + 5, 10, 5);
        ctx.fillRect(x + width - 15, y + 5, 10, 5);

        // Tail lights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 5, y + height - 8, 10, 5);
        ctx.fillRect(x + width - 15, y + height - 8, 10, 5);
    }
}

// Update game
function update() {
    if (!gameRunning) return;

    // Move road
    roadOffset = (roadOffset + 5) % 80;

    // Player movement
    const roadLeft = canvas.width / 2 - 200;
    const roadRight = canvas.width / 2 + 200 - player.width;

    if (keys.left) {
        player.x -= player.speed;
    }
    if (keys.right) {
        player.x += player.speed;
    }
    if (keys.up) {
        player.y -= player.speed;
    }
    if (keys.down) {
        player.y += player.speed;
    }

    // Keep player on road
    player.x = Math.max(roadLeft, Math.min(roadRight, player.x));
    player.y = Math.max(50, Math.min(canvas.height - player.height - 20, player.y));

    // Update thief
    if (thief) {
        // Move thief
        thief.x += thief.speedX;
        thief.y += thief.speedY;

        // Bounce off road edges
        const thiefRoadLeft = canvas.width / 2 - 200;
        const thiefRoadRight = canvas.width / 2 + 200 - thief.width;

        if (thief.x <= thiefRoadLeft || thief.x >= thiefRoadRight) {
            thief.speedX *= -1;
            thief.x = Math.max(thiefRoadLeft, Math.min(thiefRoadRight, thief.x));
        }

        // Bounce off top/bottom
        if (thief.y <= 50 || thief.y >= canvas.height - thief.height - 50) {
            thief.speedY *= -1;
            thief.y = Math.max(50, Math.min(canvas.height - thief.height - 50, thief.y));
        }

        // Thief tries to escape from player
        const dx = thief.x - player.x;
        const dy = thief.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) {
            // Run away from player
            thief.x += (dx / dist) * 2;
            thief.y += (dy / dist) * 2;
        }

        // Check collision with player
        if (checkCollision(player, thief)) {
            // Caught the thief!
            catches++;
            score += 100;
            document.getElementById('score-value').textContent = score;
            document.getElementById('speed-value').textContent = catches;

            // Spawn new thief
            spawnThief();

            // Maybe spawn more traffic
            if (catches % 2 === 0 && trafficCars.length < 6) {
                spawnTraffic();
            }
        }
    }

    // Update traffic cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        car.y += 5 - car.speed; // Move relative to player

        // Check collision with player
        if (checkCollision(player, car)) {
            // Hit traffic! Lose time
            timeLeft = Math.max(0, timeLeft - 3);
            document.getElementById('distance-value').textContent = timeLeft;

            // Flash screen red
            flashDamage();

            // Remove this car and spawn new one
            trafficCars.splice(i, 1);
            spawnTraffic();
            continue;
        }

        // Remove cars that are off screen and spawn new ones
        if (car.y > canvas.height + 100) {
            trafficCars.splice(i, 1);
            spawnTraffic();
        }
    }

    // Randomly spawn more traffic
    if (Math.random() < 0.01 && trafficCars.length < 4 + catches) {
        spawnTraffic();
    }
}

// Flash damage effect
let damageFlash = 0;
function flashDamage() {
    damageFlash = 10;
}

// Check collision between two rectangles
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// Render game
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoad();

    // Draw traffic cars
    for (const car of trafficCars) {
        drawCar(car.x, car.y, car.width, car.height, car.color, false, false, true);
    }

    // Draw thief
    if (thief) {
        drawCar(thief.x, thief.y, thief.width, thief.height, thief.color, false, true, false);
    }

    // Draw player (police car)
    drawCar(player.x, player.y, player.width, player.height, '#1a1a8a', true, false, false);

    // Damage flash effect
    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash / 20})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        damageFlash--;
    }

    // Draw timer warning
    if (timeLeft <= 10) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(timeLeft + ' SEK!', canvas.width / 2, 80);
    }

    // Draw catches counter
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Fanget: ' + catches, canvas.width / 2, 40);
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    initGame();
    gameRunning = true;
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Start game loop
gameLoop();
