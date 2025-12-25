// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game state
let gameRunning = false;
let score = 0;
let timeLeft = 100;
let lives = 5;
let gameTimer;

// Player (firefighter)
const player = {
    x: 50,
    y: 500,
    width: 40,
    height: 50,
    speed: 5,
    velocityY: 0,
    onGround: false,
    onLadder: false,
    carrying: false,
    frozen: false,
    frozenTimer: 0,
    freezeImmune: false,
    immunityTimer: 0
};

// Keys pressed
const keys = {};

// People to rescue
let people = [];
const peopleToRescue = 5;

// Fires
let fires = [];

// Stone monsters
let monsters = [];

// Gas clouds
let gasClouds = [];

// Platforms (floors in buildings)
const platforms = [
    // Ground level
    { x: 0, y: 550, width: 800, height: 50 },
    // Building 1 floors
    { x: 150, y: 450, width: 150, height: 20 },
    { x: 150, y: 350, width: 150, height: 20 },
    { x: 150, y: 250, width: 150, height: 20 },
    { x: 150, y: 150, width: 150, height: 20 },
    // Building 2 floors
    { x: 350, y: 450, width: 150, height: 20 },
    { x: 350, y: 350, width: 150, height: 20 },
    { x: 350, y: 250, width: 150, height: 20 },
    { x: 350, y: 150, width: 150, height: 20 },
    { x: 350, y: 50, width: 150, height: 20 },
    // Building 3 floors
    { x: 550, y: 450, width: 150, height: 20 },
    { x: 550, y: 350, width: 150, height: 20 },
    { x: 550, y: 250, width: 150, height: 20 },
    { x: 550, y: 150, width: 150, height: 20 }
];

// Ladders - positioned to connect platforms
const ladders = [
    // Building 1 ladders
    { x: 160, y: 450, width: 30, height: 100 },  // Ground to floor 1
    { x: 260, y: 350, width: 30, height: 100 },  // Floor 1 to 2
    { x: 160, y: 250, width: 30, height: 100 },  // Floor 2 to 3
    { x: 260, y: 150, width: 30, height: 100 },  // Floor 3 to 4
    // Building 2 ladders
    { x: 360, y: 450, width: 30, height: 100 },  // Ground to floor 1
    { x: 460, y: 350, width: 30, height: 100 },  // Floor 1 to 2
    { x: 360, y: 250, width: 30, height: 100 },  // Floor 2 to 3
    { x: 460, y: 150, width: 30, height: 100 },  // Floor 3 to 4
    { x: 360, y: 50, width: 30, height: 100 },   // Floor 4 to 5
    // Building 3 ladders
    { x: 560, y: 450, width: 30, height: 100 },  // Ground to floor 1
    { x: 660, y: 350, width: 30, height: 100 },  // Floor 1 to 2
    { x: 560, y: 250, width: 30, height: 100 },  // Floor 2 to 3
    { x: 660, y: 150, width: 30, height: 100 }   // Floor 3 to 4
];

// Buildings
const buildings = [
    { x: 150, y: 100, width: 150, height: 250, color: '#8B4513' },
    { x: 350, y: 50, width: 150, height: 300, color: '#A0522D' },
    { x: 550, y: 100, width: 150, height: 250, color: '#8B4513' }
];

// Ground level
const groundY = 550;

// Physics
const gravity = 0.6;
const jumpPower = -12;

// Initialize game
function init() {
    score = 0;
    timeLeft = 100;
    lives = 5;
    player.x = 50;
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.onGround = true;
    player.onLadder = false;
    player.carrying = false;
    player.frozen = false;
    player.frozenTimer = 0;
    player.freezeImmune = false;
    player.immunityTimer = 0;
    people = [];
    fires = [];
    monsters = [];
    gasClouds = [];

    // Create people on platforms - away from fires
    const platformPositions = [
        { x: 240, y: 450 },  // Building 1, floor 1 (right side)
        { x: 165, y: 350 },  // Building 1, floor 2 (left side)
        { x: 270, y: 250 },  // Building 1, floor 3 (right side)
        { x: 440, y: 450 },  // Building 2, floor 1 (right side)
        { x: 365, y: 250 }   // Building 2, floor 3 (left side)
    ];

    for (let i = 0; i < peopleToRescue; i++) {
        const pos = platformPositions[i % platformPositions.length];
        people.push({
            x: pos.x,
            y: pos.y - 30,
            width: 20,
            height: 30,
            rescued: false,
            inDanger: true
        });
    }

    // Create fires on platforms - positioned to avoid people and ladders
    const firePositions = [
        { x: 210, y: 440 },  // Building 1, floor 1 (middle-left, away from ladder at 160)
        { x: 220, y: 340 },  // Building 1, floor 2 (middle, away from ladder at 260)
        { x: 210, y: 240 },  // Building 1, floor 3 (middle-left, away from ladder at 160)
        { x: 410, y: 440 },  // Building 2, floor 1 (middle, away from ladder at 360)
        { x: 410, y: 340 },  // Building 2, floor 2 (middle, away from ladders)
        { x: 410, y: 240 },  // Building 2, floor 3 (middle, away from ladder at 360)
        { x: 610, y: 440 },  // Building 3, floor 1 (middle, away from ladder at 560)
        { x: 610, y: 340 }   // Building 3, floor 2 (middle, away from ladder at 660)
    ];

    firePositions.forEach(pos => {
        fires.push({
            x: pos.x,
            y: pos.y,
            size: 15,
            opacity: 1,
            flameOffset: Math.random() * Math.PI * 2
        });
    });

    // Create stone monsters
    const monsterPositions = [
        { x: 160, y: 450, platform: platforms[1] },  // Building 1, floor 1
        { x: 380, y: 450, platform: platforms[5] },  // Building 2, floor 1
        { x: 580, y: 350, platform: platforms[11] }  // Building 3, floor 2
    ];

    monsterPositions.forEach(pos => {
        monsters.push({
            x: pos.x,
            y: pos.y - 40,
            width: 40,
            height: 40,
            platform: pos.platform,
            direction: 1,
            speed: 1,
            shootTimer: 0,
            shootCooldown: 180
        });
    });

    updateDisplay();
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
});

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function startGame() {
    if (gameRunning) return;

    document.getElementById('startBtn').style.display = 'none';
    gameRunning = true;
    init();

    // Start countdown timer
    gameTimer = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);

    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;

    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update frozen timer
    if (player.frozen) {
        player.frozenTimer--;
        if (player.frozenTimer <= 0) {
            player.frozen = false;
            player.freezeImmune = true;
            player.immunityTimer = 180; // 3 seconds immunity at 60fps
        }
    }

    // Update immunity timer
    if (player.freezeImmune) {
        player.immunityTimer--;
        if (player.immunityTimer <= 0) {
            player.freezeImmune = false;
        }
    }

    // Check if on ladder
    player.onLadder = false;
    ladders.forEach(ladder => {
        if (player.x + player.width > ladder.x &&
            player.x < ladder.x + ladder.width &&
            player.y + player.height > ladder.y &&
            player.y < ladder.y + ladder.height) {
            player.onLadder = true;
        }
    });

    // Player movement (only if not frozen)
    if (!player.frozen) {
        if (keys['ArrowLeft']) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight']) {
            player.x += player.speed;
        }

        // Check if there's a ladder below when pressing down on a platform
        let ladderBelow = false;
        if (keys['ArrowDown'] && player.onGround && !player.onLadder) {
            ladders.forEach(ladder => {
                // Check if player is above a ladder and aligned with it horizontally
                if (player.x + player.width > ladder.x &&
                    player.x < ladder.x + ladder.width &&
                    player.y + player.height >= ladder.y - 10 &&
                    player.y + player.height <= ladder.y + 30) {
                    ladderBelow = true;
                    // Move player onto the ladder
                    player.y = ladder.y;
                    player.onGround = false;
                }
            });
        }

        // Ladder climbing
        if (player.onLadder) {
            player.velocityY = 0;
            if (keys['ArrowUp']) {
                player.y -= player.speed;
            }
            if (keys['ArrowDown']) {
                player.y += player.speed;
            }
        } else {
            // Apply gravity when not on ladder (unless moving onto ladder)
            if (!ladderBelow) {
                player.velocityY += gravity;
            }
        }

        // Jump (only when on ground or ladder)
        if (keys['ArrowUp'] && !player.onLadder && player.onGround) {
            player.velocityY = jumpPower;
        }
    }

    // Apply vertical velocity
    if (!player.onLadder) {
        player.y += player.velocityY;
    }

    // Keep player in horizontal bounds - can't go through buildings OR fall off sides
    // Left side boundary - stop at x=0
    if (player.x < 0) {
        player.x = 0;
        player.velocityY = 0; // Stop falling when hitting wall
    }
    // Right side boundary - stop at canvas edge
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
        player.velocityY = 0; // Stop falling when hitting wall
    }

    // Building wall collision (horizontal)
    buildings.forEach(building => {
        // Player hitting left side of building
        if (player.x + player.width > building.x &&
            player.x < building.x &&
            player.y + player.height > building.y &&
            player.y < building.y + building.height) {
            player.x = building.x - player.width;
        }
        // Player hitting right side of building
        if (player.x < building.x + building.width &&
            player.x + player.width > building.x + building.width &&
            player.y + player.height > building.y &&
            player.y < building.y + building.height) {
            player.x = building.x + building.width;
        }
    });

    // Add invisible walls on left and right sides to stand on
    // Left wall platform
    if (player.x <= 5 && player.y + player.height >= groundY - 100 && player.velocityY >= 0) {
        player.onGround = true;
        player.velocityY = 0;
    }
    // Right wall platform
    if (player.x + player.width >= canvas.width - 5 && player.y + player.height >= groundY - 100 && player.velocityY >= 0) {
        player.onGround = true;
        player.velocityY = 0;
    }

    // Platform collision
    player.onGround = false;
    platforms.forEach(platform => {
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + 20 &&
            player.velocityY >= 0) {

            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    });

    // Check collision with people
    people.forEach(person => {
        if (!person.rescued && person.inDanger && !player.carrying) {
            if (isColliding(player, person)) {
                player.carrying = true;
                person.inDanger = false;
            }
        }
    });

    // Check if player reached ground with person
    if (player.carrying && player.y >= groundY - player.height - 10) {
        player.carrying = false;
        score++;
        updateDisplay();

        const personIndex = people.findIndex(p => !p.inDanger && !p.rescued);
        if (personIndex !== -1) {
            people[personIndex].rescued = true;
            // Place rescued person on ground
            people[personIndex].x = 20 + (score - 1) * 30;
            people[personIndex].y = groundY - 30;
        }

        if (score >= peopleToRescue) {
            endGame(true);
        }
    }

    // Check collision with fires
    fires.forEach(fire => {
        if (isCollidingWithFire(player, fire)) {
            takeDamage();
        }
    });

    // Animate fires
    fires.forEach(fire => {
        fire.opacity = 0.7 + Math.sin(Date.now() / 150 + fire.flameOffset) * 0.3;
        fire.size = 15 + Math.sin(Date.now() / 100 + fire.flameOffset) * 5;
    });

    // Update monsters
    monsters.forEach(monster => {
        // Move monster on platform
        monster.x += monster.direction * monster.speed;

        // Turn around at platform edges
        if (monster.x < monster.platform.x ||
            monster.x + monster.width > monster.platform.x + monster.platform.width) {
            monster.direction *= -1;
        }

        // Shoot gas
        monster.shootTimer++;
        if (monster.shootTimer >= monster.shootCooldown) {
            monster.shootTimer = 0;

            // Create gas cloud
            gasClouds.push({
                x: monster.x + monster.width / 2,
                y: monster.y + monster.height / 2,
                size: 10,
                maxSize: 60,
                growing: true,
                life: 180
            });
        }
    });

    // Update gas clouds
    gasClouds = gasClouds.filter(gas => {
        gas.life--;

        if (gas.growing) {
            gas.size += 2;
            if (gas.size >= gas.maxSize) {
                gas.growing = false;
            }
        } else {
            gas.size -= 0.5;
        }

        // Check collision with player
        if (!player.frozen && !player.freezeImmune) {
            const dist = Math.sqrt(
                Math.pow(player.x + player.width / 2 - gas.x, 2) +
                Math.pow(player.y + player.height / 2 - gas.y, 2)
            );

            if (dist < gas.size) {
                player.frozen = true;
                player.frozenTimer = 300; // 5 seconds at 60fps
            }
        }

        return gas.life > 0 && gas.size > 0;
    });
}

function takeDamage() {
    lives--;
    updateDisplay();

    // If player was carrying someone, put them back
    if (player.carrying) {
        const carriedPerson = people.find(p => !p.inDanger && !p.rescued);
        if (carriedPerson) {
            carriedPerson.inDanger = true;
        }
        player.carrying = false;
    }

    player.x = 50;
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.frozen = false;
    player.frozenTimer = 0;
    player.freezeImmune = false;
    player.immunityTimer = 0;

    if (lives <= 0) {
        endGame(false);
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // Draw buildings (background)
    buildings.forEach(building => {
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);

        // Draw windows
        ctx.fillStyle = '#ffff88';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                ctx.fillRect(
                    building.x + 20 + i * 40,
                    building.y + 20 + j * 60,
                    25,
                    35
                );
            }
        }
    });

    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

        // Platform edge highlight
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(platform.x, platform.y, platform.width, 3);
    });

    // Draw ladders
    ctx.fillStyle = '#654321';
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 5;
    ladders.forEach(ladder => {
        ctx.fillRect(ladder.x, ladder.y, ladder.width, ladder.height);

        // Draw rungs
        for (let i = 0; i < ladder.height; i += 30) {
            ctx.beginPath();
            ctx.moveTo(ladder.x, ladder.y + i);
            ctx.lineTo(ladder.x + ladder.width, ladder.y + i);
            ctx.stroke();
        }
    });

    // Draw fires - MUCH more visible
    fires.forEach(fire => {
        // Outer glow
        const glowGradient = ctx.createRadialGradient(
            fire.x, fire.y, 0,
            fire.x, fire.y, fire.size + 15
        );
        glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
        glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = glowGradient;
        ctx.fillRect(
            fire.x - fire.size - 15,
            fire.y - fire.size - 15,
            (fire.size + 15) * 2,
            (fire.size + 15) * 2
        );

        // Main fire
        const fireGradient = ctx.createRadialGradient(
            fire.x, fire.y - 5, 0,
            fire.x, fire.y, fire.size
        );
        fireGradient.addColorStop(0, '#ffff00');
        fireGradient.addColorStop(0.3, '#ff8800');
        fireGradient.addColorStop(0.6, '#ff3300');
        fireGradient.addColorStop(1, '#cc0000');

        ctx.fillStyle = fireGradient;
        ctx.fillRect(
            fire.x - fire.size,
            fire.y - fire.size,
            fire.size * 2,
            fire.size * 2
        );

        // Flame flicker effect
        const flameHeight = fire.size * 1.5;
        ctx.fillStyle = `rgba(255, 150, 0, ${fire.opacity})`;
        ctx.fillRect(
            fire.x - fire.size * 0.5,
            fire.y - flameHeight,
            fire.size,
            flameHeight
        );
    });

    // Draw stone monsters
    monsters.forEach(monster => {
        // Monster body (stone gray)
        ctx.fillStyle = '#666666';
        ctx.fillRect(monster.x, monster.y, monster.width, monster.height);

        // Stone texture
        ctx.fillStyle = '#555555';
        ctx.fillRect(monster.x + 5, monster.y + 5, 10, 10);
        ctx.fillRect(monster.x + 25, monster.y + 5, 10, 10);
        ctx.fillRect(monster.x + 15, monster.y + 20, 10, 10);

        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(monster.x + 10, monster.y + 10, 8, 8);
        ctx.fillRect(monster.x + 22, monster.y + 10, 8, 8);

        // Mouth
        ctx.fillStyle = '#333333';
        ctx.fillRect(monster.x + 10, monster.y + 25, 20, 5);
    });

    // Draw gas clouds
    gasClouds.forEach(gas => {
        const gasGradient = ctx.createRadialGradient(
            gas.x, gas.y, 0,
            gas.x, gas.y, gas.size
        );
        gasGradient.addColorStop(0, 'rgba(100, 255, 100, 0.6)');
        gasGradient.addColorStop(0.5, 'rgba(50, 200, 50, 0.4)');
        gasGradient.addColorStop(1, 'rgba(0, 150, 0, 0)');

        ctx.fillStyle = gasGradient;
        ctx.fillRect(
            gas.x - gas.size,
            gas.y - gas.size,
            gas.size * 2,
            gas.size * 2
        );
    });

    // Draw people
    people.forEach(person => {
        if (!person.rescued && person.inDanger) {
            // Draw person in distress
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(person.x, person.y, person.width, person.height);

            // Draw arms up
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(person.x - 5, person.y + 5, 5, 10);
            ctx.fillRect(person.x + person.width, person.y + 5, 5, 10);

            // Draw "HELP!" text
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('HELP!', person.x - 10, person.y - 5);
        } else if (person.rescued) {
            // Draw bed
            // Bed frame (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(person.x - 5, person.y + 20, 30, 12);

            // Mattress (white/cream)
            ctx.fillStyle = '#f5f5dc';
            ctx.fillRect(person.x - 3, person.y + 15, 26, 8);

            // Pillow (lighter)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(person.x - 2, person.y + 15, 10, 6);

            // Blanket (green)
            ctx.fillStyle = '#90ee90';
            ctx.fillRect(person.x + 6, person.y + 17, 16, 6);

            // Draw rescued person in bed (sleeping)
            // Head on pillow
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(person.x, person.y + 16, 8, 6);

            // Eyes closed (zzz)
            ctx.fillStyle = '#000000';
            ctx.fillRect(person.x + 1, person.y + 17, 2, 1);
            ctx.fillRect(person.x + 5, person.y + 17, 2, 1);

            // "ZZZ" sleep indicator
            ctx.fillStyle = '#6666ff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('zzz', person.x + 15, person.y + 12);
        }
    });

    // Draw player
    if (player.carrying) {
        // Draw person being carried
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(player.x + 10, player.y - 20, 15, 20);
    }

    // Draw firefighter
    if (player.frozen) {
        // Frozen effect - blue tint
        ctx.fillStyle = '#6699ff';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        ctx.globalAlpha = 1.0;
    } else if (player.freezeImmune) {
        // Immunity effect - green shield glow
        const glowAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
        ctx.fillStyle = '#00ff00';
        ctx.globalAlpha = glowAlpha;
        ctx.fillRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = '#ff6600';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw helmet
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(player.x, player.y, player.width, 15);

    // Draw face
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(player.x + 10, player.y + 15, 20, 15);

    // Draw body detail
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(player.x + 5, player.y + 20, 30, 10);

    // Frozen indicator
    if (player.frozen) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('FROZEN!', player.x - 10, player.y - 10);

        // Timer
        const secondsLeft = Math.ceil(player.frozenTimer / 60);
        ctx.fillText(secondsLeft + 's', player.x + 5, player.y - 25);
    } else if (player.freezeImmune) {
        // Immunity indicator
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('SHIELD', player.x - 5, player.y - 10);
    }
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function isCollidingWithFire(rect, fire) {
    const dist = Math.sqrt(
        Math.pow(rect.x + rect.width / 2 - fire.x, 2) +
        Math.pow(rect.y + rect.height / 2 - fire.y, 2)
    );
    return dist < fire.size + 20;
}

function updateDisplay() {
    document.getElementById('saved').textContent = score;
    document.getElementById('time').textContent = timeLeft;

    let heartsDisplay = '';
    for (let i = 0; i < lives; i++) {
        heartsDisplay += '❤️';
    }
    document.getElementById('lives').textContent = heartsDisplay || '💀';
}

function endGame(won) {
    gameRunning = false;
    clearInterval(gameTimer);

    const overlay = document.getElementById('gameOver');
    const title = document.getElementById('endTitle');
    const message = document.getElementById('endMessage');

    if (won) {
        title.textContent = '🎉 Du Vandt! 🎉';
        message.textContent = `Du reddede alle ${peopleToRescue} personer! Fantastisk indsats, brandmand!`;
    } else if (lives <= 0) {
        title.textContent = '💀 Game Over 💀';
        message.textContent = `Du blev ramt af ilden for mange gange! Du reddede ${score} ud af ${peopleToRescue} personer.`;
    } else {
        title.textContent = '⏰ Tiden er Udløbet! ⏰';
        message.textContent = `Du nåede at redde ${score} ud af ${peopleToRescue} personer.`;
    }

    overlay.style.display = 'flex';
}

// Initialize display
updateDisplay();
