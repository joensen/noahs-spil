const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const message = document.getElementById('message');
const startBtn = document.getElementById('startBtn');

const GROUND_Y = 320;
const PLAYER_COLOR = '#4fc3f7';
const BOT_COLOR = '#e94560';
const KNIFE_COLOR = '#ccc';
const SLIDE_SPEED = 5;
const SLIDE_DISTANCE = 150;
const WALK_SPEED = 1.5;

let player, bot, gameRunning, keys, gameOver;

function initGame() {
    player = {
        x: 200,
        y: GROUND_Y,
        w: 30,
        h: 60,
        sliding: false,
        slideDir: 0,
        slideStart: 0,
        facing: 1, // 1 = right, -1 = left
        stabbing: false,
        stabTimer: 0,
        dead: false
    };
    bot = {
        x: 600,
        y: GROUND_Y,
        w: 30,
        h: 60,
        sliding: false,
        slideDir: 0,
        slideStart: 0,
        facing: -1,
        stabbing: false,
        stabTimer: 0,
        dead: false,
        // Bot AI
        thinkTimer: 0,
        action: 'approach' // approach, retreat, attack
    };
    gameRunning = true;
    gameOver = false;
    keys = {};
    message.textContent = '';
    startBtn.style.display = 'none';
}

// Draw a stick figure with a knife
function drawFighter(f, color, label) {
    const dir = f.facing;
    const bodyX = f.x;
    const bodyY = f.y;

    ctx.save();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    if (f.sliding) {
        // SLIDING POSE - crouched low, leaning back
        // Head (lower)
        ctx.beginPath();
        ctx.arc(bodyX - dir * 10, bodyY - 30, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Torso (leaning backward)
        ctx.beginPath();
        ctx.moveTo(bodyX - dir * 5, bodyY - 20);
        ctx.lineTo(bodyX + dir * 5, bodyY - 5);
        ctx.stroke();

        // Legs (spread out, sliding)
        ctx.beginPath();
        ctx.moveTo(bodyX + dir * 5, bodyY - 5);
        ctx.lineTo(bodyX + dir * 20, bodyY);
        ctx.moveTo(bodyX + dir * 5, bodyY - 5);
        ctx.lineTo(bodyX - dir * 5, bodyY);
        ctx.stroke();

        // Arm + knife (extended behind = slide direction)
        ctx.beginPath();
        ctx.moveTo(bodyX - dir * 5, bodyY - 18);
        ctx.lineTo(bodyX - dir * 25, bodyY - 15);
        ctx.stroke();

        ctx.strokeStyle = KNIFE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyX - dir * 25, bodyY - 15);
        ctx.lineTo(bodyX - dir * 45, bodyY - 13);
        ctx.stroke();

        // Spark trail
        ctx.fillStyle = '#ff8';
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = 0.5 - i * 0.15;
            ctx.beginPath();
            ctx.arc(bodyX + dir * (15 + i * 12), bodyY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (f.stabbing) {
        // STABBING POSE - arm thrust backward
        // Head
        ctx.beginPath();
        ctx.arc(bodyX, bodyY - 50, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Torso
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 40);
        ctx.lineTo(bodyX, bodyY - 10);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 10);
        ctx.lineTo(bodyX - 12, bodyY);
        ctx.moveTo(bodyX, bodyY - 10);
        ctx.lineTo(bodyX + 12, bodyY);
        ctx.stroke();

        // Arm extended backward with knife
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 35);
        ctx.lineTo(bodyX - dir * 25, bodyY - 30);
        ctx.stroke();

        ctx.strokeStyle = KNIFE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyX - dir * 25, bodyY - 30);
        ctx.lineTo(bodyX - dir * 45, bodyY - 28);
        ctx.stroke();

        // Knife tip glow
        ctx.fillStyle = '#f55';
        ctx.beginPath();
        ctx.arc(bodyX - dir * 45, bodyY - 28, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // STANDING POSE
        // Head
        ctx.beginPath();
        ctx.arc(bodyX, bodyY - 50, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Torso
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 40);
        ctx.lineTo(bodyX, bodyY - 10);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 10);
        ctx.lineTo(bodyX - 12, bodyY);
        ctx.moveTo(bodyX, bodyY - 10);
        ctx.lineTo(bodyX + 12, bodyY);
        ctx.stroke();

        // Arm + knife at side
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY - 35);
        ctx.lineTo(bodyX + dir * 15, bodyY - 25);
        ctx.stroke();

        ctx.strokeStyle = KNIFE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyX + dir * 15, bodyY - 25);
        ctx.lineTo(bodyX + dir * 30, bodyY - 22);
        ctx.stroke();
    }

    // Label
    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, bodyX, bodyY - 65);

    // Dead X eyes
    if (f.dead) {
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyX - 6, bodyY - 54);
        ctx.lineTo(bodyX - 2, bodyY - 48);
        ctx.moveTo(bodyX - 2, bodyY - 54);
        ctx.lineTo(bodyX - 6, bodyY - 48);
        ctx.moveTo(bodyX + 2, bodyY - 54);
        ctx.lineTo(bodyX + 6, bodyY - 48);
        ctx.moveTo(bodyX + 6, bodyY - 54);
        ctx.lineTo(bodyX + 2, bodyY - 48);
        ctx.stroke();
    }

    ctx.restore();
}

function drawGround() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 5);
    ctx.lineTo(canvas.width, GROUND_Y + 5);
    ctx.stroke();

    // Arena markers
    ctx.fillStyle = '#222';
    ctx.fillRect(50, GROUND_Y + 5, 2, 10);
    ctx.fillRect(canvas.width - 50, GROUND_Y + 5, 2, 10);
}

function drawHUD() {
    ctx.fillStyle = '#555';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHIFT = Glid baglæns', 10, 25);
    ctx.fillText('MELLEMRUM = Stik (kun under glid!)', 10, 45);
    ctx.textAlign = 'right';
    ctx.fillText('← → = Bevæg', canvas.width - 10, 25);
}

function updatePlayer() {
    if (player.dead) return;

    // Sliding
    if (player.sliding) {
        player.x += player.slideDir * SLIDE_SPEED;
        // Stop at walls
        if (player.x <= 30 || player.x >= canvas.width - 30) {
            player.sliding = false;
        }
        if (Math.abs(player.x - player.slideStart) >= SLIDE_DISTANCE) {
            player.sliding = false;
        }
        player.x = Math.max(30, Math.min(canvas.width - 30, player.x));
        return;
    }

    // Stab animation
    if (player.stabbing) {
        player.stabTimer--;
        if (player.stabTimer <= 0) {
            player.stabbing = false;
        }
        return;
    }

    // Movement - arrow keys move AND turn the player
    if (keys['ArrowLeft']) {
        player.x -= 3;
        player.facing = -1;
    }
    if (keys['ArrowRight']) {
        player.x += 3;
        player.facing = 1;
    }

    player.x = Math.max(30, Math.min(canvas.width - 30, player.x));
}

function updateBot() {
    if (bot.dead) return;

    if (bot.sliding) {
        bot.x += bot.slideDir * SLIDE_SPEED;
        if (bot.x <= 30 || bot.x >= canvas.width - 30) {
            bot.sliding = false;
        }
        const maxDist = bot.shortSlide ? 50 : SLIDE_DISTANCE;
        if (Math.abs(bot.x - bot.slideStart) >= maxDist) {
            bot.sliding = false;
            bot.shortSlide = false;
        }
        bot.x = Math.max(30, Math.min(canvas.width - 30, bot.x));
        return;
    }

    if (bot.stabbing) {
        bot.stabTimer--;
        if (bot.stabTimer <= 0) {
            bot.stabbing = false;
        }
        return;
    }

    // Face the player
    bot.facing = player.x > bot.x ? 1 : -1;

    // Check if bot is behind the player (past them)
    // "Behind" means bot has gone past the player's back
    const botIsBehindPlayer = (player.facing === 1 && bot.x < player.x) ||
                               (player.facing === -1 && bot.x > player.x);

    bot.thinkTimer--;
    if (bot.thinkTimer <= 0) {
        bot.thinkTimer = 20 + Math.random() * 30;
        const dist = Math.abs(bot.x - player.x);

        if (botIsBehindPlayer && dist < 150) {
            // Bot is behind the player - slide backward to escape
            bot.sliding = true;
            bot.slideDir = -bot.facing;
            bot.slideStart = bot.x;
        } else if (dist < 120) {
            // Close enough - attack! Short slide back then stab
            bot.action = 'attack';
            bot.sliding = true;
            bot.slideDir = -bot.facing;
            bot.slideStart = bot.x;
            bot.shortSlide = true; // Only slide a short distance for attack
        } else {
            bot.action = 'approach';
        }
    }

    // Approach player
    if (bot.action === 'approach' && !bot.sliding && !bot.stabbing) {
        const dir = player.x > bot.x ? 1 : -1;
        bot.x += dir * WALK_SPEED;
    }

    // Bot stabs when slide finishes during attack
    if (bot.action === 'attack' && !bot.sliding && !bot.stabbing) {
        bot.stabbing = true;
        bot.stabTimer = 20;
        // Check if player is behind bot (backstab direction)
        const stabDir = -bot.facing;
        const playerInRange = (stabDir > 0 && player.x > bot.x) || (stabDir < 0 && player.x < bot.x);
        const currentDist = Math.abs(bot.x - player.x);
        if (playerInRange && currentDist < 70) {
            player.dead = true;
            endGame('Bot vinder! Du blev stukket!', BOT_COLOR);
        }
        bot.action = 'approach';
    }

    bot.x = Math.max(30, Math.min(canvas.width - 30, bot.x));
}

function playerStab() {
    // Can ONLY stab while sliding!
    if (player.dead || !player.sliding || player.stabbing || !gameRunning) return;

    player.stabbing = true;
    player.stabTimer = 20;
    player.sliding = false; // Stop sliding when you stab

    // Check if bot is behind (in the direction we were sliding = backward)
    const behindDir = -player.facing;
    const botBehind = (behindDir > 0 && bot.x > player.x) || (behindDir < 0 && bot.x < player.x);
    const dist = Math.abs(player.x - bot.x);

    if (botBehind && dist < 70) {
        bot.dead = true;
        endGame('DU VINDER! Backstab!', PLAYER_COLOR);
    }
}

function playerSlide() {
    if (player.dead || player.sliding || player.stabbing || !gameRunning) return;
    player.sliding = true;
    player.slideDir = -player.facing; // Slide backward
    player.slideStart = player.x;
}

function endGame(msg, color) {
    gameOver = true;
    gameRunning = false;
    message.textContent = msg;
    message.style.color = color;
    startBtn.textContent = 'Spil igen';
    startBtn.style.display = 'inline-block';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround();
    drawHUD();
    drawFighter(player, PLAYER_COLOR, 'DIG');
    drawFighter(bot, BOT_COLOR, 'BOT');

    // Draw slide trail
    if (player.sliding) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = PLAYER_COLOR;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(player.x + player.facing * i * 15, player.y - 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    if (bot.sliding) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = BOT_COLOR;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(bot.x + bot.facing * i * 15, bot.y - 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

function gameLoop() {
    if (gameRunning) {
        updatePlayer();
        updateBot();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Input
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === 'Shift') {
        e.preventDefault();
        playerSlide();
    }
    if (e.key === ' ') {
        e.preventDefault();
        playerStab();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

startBtn.addEventListener('click', () => {
    initGame();
});

// Initial draw
player = { x: 200, y: GROUND_Y, w: 30, h: 60, sliding: false, slideDir: 0, slideStart: 0, facing: 1, stabbing: false, stabTimer: 0, dead: false };
bot = { x: 600, y: GROUND_Y, w: 30, h: 60, sliding: false, slideDir: 0, slideStart: 0, facing: -1, stabbing: false, stabTimer: 0, dead: false, thinkTimer: 0, action: 'approach' };
gameRunning = false;
gameOver = false;
keys = {};
draw();
gameLoop();
