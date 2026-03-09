const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Game state
let difficulty = 'normal';
let isCustomMode = false;
let playerScore = 0;
let botScore = 0;
let round = 1;
let gameRunning = false;
let goalScoredPause = false;
let countdownActive = false;
let countdownNumber = 3;
let countdownTimer = 0;

// Super kick
let superKickCooldown = 300; // 5 seconds at 60fps
const SUPER_KICK_FORCE = 15;
let superKickTimer = 0; // 0 = ready, >0 = cooling down

// Win condition
let winScore = 3;

// Difficulty settings
const DIFFICULTY = {
    easy:   { botSpeed: 1.0, botReaction: 0.25, botMistake: 0.20, playerSpeed: 4.0, botCount: 1 },
    normal: { botSpeed: 1.6, botReaction: 0.45, botMistake: 0.10, playerSpeed: 2.5, botCount: 2 },
    hard:   { botSpeed: 2.4, botReaction: 0.75, botMistake: 0.03, playerSpeed: 3.0, botCount: 3 }
};

// Bot colors
const BOT_COLORS = ['#e74c3c', '#e67e22', '#9b59b6', '#1abc9c', '#e84393', '#fdcb6e', '#00cec9', '#d63031', '#6c5ce7', '#00b894', '#fd79a8', '#ffeaa7', '#74b9ff', '#a29bfe', '#fab1a0'];

// Bot roles
const BOT_ROLES = ['attacker', 'midfielder', 'defender'];

// Field
const GOAL_WIDTH = 20;
const GOAL_HEIGHT = 160;
const GOAL_Y = (H - GOAL_HEIGHT) / 2;
const FIELD_COLOR = '#2d5a1e';
const LINE_COLOR = 'rgba(255,255,255,0.3)';

// Entities
const BEETLE_RADIUS = 16;
const BALL_RADIUS = 12;

let player = { x: 150, y: H / 2, vx: 0, vy: 0, speed: 2.0 };
let bots = [];
let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };

const FRICTION = 0.85;
const BALL_FRICTION = 0.98;
const PUSH_FORCE = 6.0;

// Input
const keys = {};
document.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === ' ') e.preventDefault(); });
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// --- Drawing ---

function drawField() {
    // Grass
    ctx.fillStyle = FIELD_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    // Player goal (left)
    ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.fillRect(0, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(0, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);

    // Bot goal (right)
    ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.fillRect(W - GOAL_WIDTH, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    ctx.strokeRect(W - GOAL_WIDTH, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);

    // Goal walls (solid sides) - left goal
    ctx.fillStyle = '#555';
    ctx.fillRect(0, GOAL_Y - 5, GOAL_WIDTH, 5); // top wall
    ctx.fillRect(0, GOAL_Y + GOAL_HEIGHT, GOAL_WIDTH, 5); // bottom wall
    ctx.fillRect(0, GOAL_Y - 5, 3, GOAL_HEIGHT + 10); // back wall

    // Goal walls - right goal
    ctx.fillRect(W - GOAL_WIDTH, GOAL_Y - 5, GOAL_WIDTH, 5); // top wall
    ctx.fillRect(W - GOAL_WIDTH, GOAL_Y + GOAL_HEIGHT, GOAL_WIDTH, 5); // bottom wall
    ctx.fillRect(W - 3, GOAL_Y - 5, 3, GOAL_HEIGHT + 10); // back wall
}

function drawBeetle(x, y, color, isFlipped) {
    ctx.save();
    ctx.translate(x, y);
    if (isFlipped) ctx.scale(-1, 1);

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, BEETLE_RADIUS, BEETLE_RADIUS * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shell line
    ctx.beginPath();
    ctx.moveTo(0, -BEETLE_RADIUS * 0.8);
    ctx.lineTo(0, BEETLE_RADIUS * 0.8);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head
    ctx.fillStyle = darkenColor(color, 30);
    ctx.beginPath();
    ctx.ellipse(BEETLE_RADIUS * 0.85, 0, BEETLE_RADIUS * 0.4, BEETLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(BEETLE_RADIUS * 0.95, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(BEETLE_RADIUS * 1.0, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs (3 per side)
    ctx.strokeStyle = darkenColor(color, 40);
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
        const legX = i * BEETLE_RADIUS * 0.45;
        ctx.beginPath();
        ctx.moveTo(legX, -BEETLE_RADIUS * 0.7);
        ctx.lineTo(legX - 6, -BEETLE_RADIUS * 1.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(legX, BEETLE_RADIUS * 0.7);
        ctx.lineTo(legX - 6, BEETLE_RADIUS * 1.1);
        ctx.stroke();
    }

    // Antennae
    ctx.strokeStyle = darkenColor(color, 40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(BEETLE_RADIUS * 1.1, -6);
    ctx.quadraticCurveTo(BEETLE_RADIUS * 1.4, -16, BEETLE_RADIUS * 1.2, -20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(BEETLE_RADIUS * 1.1, 2);
    ctx.quadraticCurveTo(BEETLE_RADIUS * 1.4, 12, BEETLE_RADIUS * 1.2, 16);
    ctx.stroke();

    ctx.restore();
}

function darkenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return `rgb(${r},${g},${b})`;
}

function drawBall(x, y) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, BALL_RADIUS, BALL_RADIUS * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main ball (poop brown)
    const gradient = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, BALL_RADIUS);
    gradient.addColorStop(0, '#8B6914');
    gradient.addColorStop(0.6, '#6B4E0A');
    gradient.addColorStop(1, '#4A3507');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Shiny spot
    ctx.fillStyle = 'rgba(255,255,200,0.3)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 4, BALL_RADIUS * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 2, y + 1, BALL_RADIUS * 0.5, 0.5, 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 3, y + 3, BALL_RADIUS * 0.3, 3, 5);
    ctx.stroke();
}

function drawSuperKickBar() {
    const barW = 120;
    const barH = 10;
    const barX = 10;
    const barY = H - 25;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);

    // Fill
    const progress = superKickTimer === 0 ? 1 : 1 - (superKickTimer / superKickCooldown);
    if (progress >= 1) {
        ctx.fillStyle = '#f1c40f';
    } else {
        ctx.fillStyle = '#7f8c8d';
    }
    ctx.fillRect(barX, barY, barW * progress, barH);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Label
    ctx.fillStyle = progress >= 1 ? '#f1c40f' : '#999';
    ctx.font = 'bold 11px Segoe UI';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(progress >= 1 ? 'SUPER SPARK [SPACE]' : 'Lader op...', barX, barY - 3);
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 120px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countdownNumber > 0 ? countdownNumber : 'GO!', W / 2, H / 2);
}

// --- Physics ---

function createBots(count) {
    bots = [];
    for (let i = 0; i < count; i++) {
        // Easy mode: single bot has no role restriction (free roam)
        const role = count === 1 ? 'free' : BOT_ROLES[i];
        bots.push({
            x: 0, y: 0,
            vx: 0, vy: 0,
            speed: DIFFICULTY[difficulty].botSpeed,
            color: BOT_COLORS[i],
            role: role
        });
    }
}

function resetPositions() {
    player.x = 150;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;

    const count = bots.length;
    // Spread bots across the field with different positions
    if (count === 1) {
        bots[0].x = W * 0.65;
        bots[0].y = H / 2;
    } else if (count === 2) {
        // Attacker starts on own half, midfielder in center
        bots[0].x = W * 0.65;
        bots[0].y = H * 0.35;
        bots[1].x = W * 0.55;
        bots[1].y = H * 0.65;
    } else if (count === 3) {
        // Attacker starts on own half, midfielder center, defender near own goal
        bots[0].x = W * 0.65;
        bots[0].y = H * 0.5;
        bots[1].x = W * 0.55;
        bots[1].y = H * 0.25;
        bots[2].x = W * 0.82;
        bots[2].y = H * 0.7;
    }

    for (const bot of bots) {
        bot.vx = 0;
        bot.vy = 0;
    }

    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 0;
    ball.vy = 0;

    superKickTimer = 0;
}

function handleInput() {
    let ax = 0, ay = 0;
    if (keys['arrowleft'] || keys['a']) ax -= 1;
    if (keys['arrowright'] || keys['d']) ax += 1;
    if (keys['arrowup'] || keys['w']) ay -= 1;
    if (keys['arrowdown'] || keys['s']) ay += 1;

    // Normalize diagonal
    if (ax !== 0 && ay !== 0) {
        ax *= 0.707;
        ay *= 0.707;
    }

    const spd = DIFFICULTY[difficulty].playerSpeed;
    player.vx += ax * spd * 0.3;
    player.vy += ay * spd * 0.3;

    // Super kick
    if (keys[' '] && superKickTimer === 0) {
        trySuperKick();
    }
}

function trySuperKick() {
    // Check if ball is close enough and in front of player
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ball must be close and in front (to the right of player)
    if (dist < BEETLE_RADIUS + BALL_RADIUS + 20 && dx > 0) {
        // Super kick! Launch ball to the right
        ball.vx = SUPER_KICK_FORCE;
        ball.vy = dy * 0.3; // slight angle based on position
        superKickTimer = superKickCooldown;

        // Visual flash effect on ball
        ball.superFlash = 10;
    }
}

function findClosestTeammate(bot) {
    let closest = null;
    let closestDist = Infinity;
    for (const other of bots) {
        if (other === bot) continue;
        const dx = other.x - bot.x;
        const dy = other.y - bot.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) {
            closestDist = d;
            closest = other;
        }
    }
    return closest;
}

function updateBots() {
    const diff = DIFFICULTY[difficulty];

    for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        bot.speed = diff.botSpeed;

        const toBallX = ball.x - bot.x;
        const toBallY = ball.y - bot.y;
        const distToBall = Math.sqrt(toBallX * toBallX + toBallY * toBallY);

        let targetX, targetY;

        // If ball is behind bot (to the right), run past it to get in front
        const ballBehind = ball.x > bot.x;

        // Role-based AI
        if (bot.role === 'free') {
            // Free roam - goes anywhere, chases ball
            if (ballBehind) {
                targetX = ball.x + 40;
                targetY = ball.y + (bot.y > ball.y ? -30 : 30);
            } else {
                targetX = ball.x;
                targetY = ball.y;
            }
        } else if (bot.role === 'attacker') {
            if (ballBehind) {
                targetX = ball.x + 40;
                targetY = ball.y + (bot.y > ball.y ? -30 : 30);
            } else {
                targetX = ball.x;
                targetY = ball.y;
            }
            // Attacker pushes to player's half and stays there
            if (targetX > W * 0.45) targetX = W * 0.45;
        } else if (bot.role === 'midfielder') {
            // Midfielder stays in midfield but actively intercepts and supports
            if (ballBehind && distToBall < 150) {
                // Ball is behind - run past it
                targetX = ball.x + 35;
                targetY = ball.y + (bot.y > ball.y ? -25 : 25);
            } else if (distToBall < 150) {
                // Ball is nearby - go for it
                targetX = ball.x;
                targetY = ball.y;
            } else if (ball.x < W * 0.5) {
                // Ball is on player's side - push forward to support attack
                targetX = W * 0.5;
                targetY = ball.y;
            } else {
                // Ball is on bot's side - hold midfield, track ball Y
                targetX = W * 0.6;
                targetY = ball.y;
            }
            // Midfielder cannot go too close to either goal
            if (targetX < W * 0.25) targetX = W * 0.25;
            if (targetX > W * 0.75) targetX = W * 0.75;
        } else {
            // Defender stays near own goal
            if (ballBehind && distToBall < 100) {
                // Ball is behind - run past it
                targetX = ball.x + 35;
                targetY = ball.y + (bot.y > ball.y ? -25 : 25);
            } else if (distToBall < 100 && ball.x > W * 0.7) {
                targetX = ball.x;
                targetY = ball.y;
            } else {
                targetX = W * 0.82;
                targetY = H / 2 + (ball.y - H / 2) * 0.5;
            }
        }

        // Bot passing: if bot is close to ball and a teammate is in better position, kick towards teammate
        if (distToBall < BEETLE_RADIUS + BALL_RADIUS + 5 && bots.length > 1) {
            const teammate = findClosestTeammate(bot);
            if (teammate && teammate.x < bot.x - 50) {
                // Teammate is closer to player goal - pass to them
                const passX = teammate.x - ball.x;
                const passY = teammate.y - ball.y;
                const passDist = Math.sqrt(passX * passX + passY * passY);
                if (passDist > 0 && Math.random() < 0.02) {
                    ball.vx = (passX / passDist) * PUSH_FORCE * 1.2;
                    ball.vy = (passY / passDist) * PUSH_FORCE * 1.2;
                }
            }
        }

        // Separation: push away from teammates with same role to avoid clumping
        const SEPARATION_DIST = 80;
        for (const other of bots) {
            if (other === bot) continue;
            const sepDx = bot.x - other.x;
            const sepDy = bot.y - other.y;
            const sepDist = Math.sqrt(sepDx * sepDx + sepDy * sepDy);
            if (sepDist < SEPARATION_DIST && sepDist > 0) {
                const pushStrength = (SEPARATION_DIST - sepDist) / SEPARATION_DIST;
                targetY += (sepDy / sepDist) * 60 * pushStrength;
                if (bot.role === other.role) {
                    targetX += (sepDx / sepDist) * 30 * pushStrength;
                }
            }
        }

        // Add mistakes
        if (Math.random() < diff.botMistake) {
            targetX += (Math.random() - 0.5) * 100;
            targetY += (Math.random() - 0.5) * 100;
        }

        const toTargetX = targetX - bot.x;
        const toTargetY = targetY - bot.y;
        const tDist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

        if (tDist > 5) {
            bot.vx += (toTargetX / tDist) * bot.speed * 0.3 * diff.botReaction;
            bot.vy += (toTargetY / tDist) * bot.speed * 0.3 * diff.botReaction;
        }
    }
}

function clampEntity(entity, radius) {
    entity.x = Math.max(radius, Math.min(W - radius, entity.x));
    entity.y = Math.max(radius, Math.min(H - radius, entity.y));
}

function circleCollision(a, aR, b, bR) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = aR + bR;
    return { colliding: dist < minDist, dx, dy, dist, minDist };
}

function resolvePlayerBallCollision() {
    // Ball is behind player (to the left) - pass through completely
    if (ball.x < player.x) return;

    const c = circleCollision(player, BEETLE_RADIUS, ball, BALL_RADIUS);
    if (!c.colliding) return;

    // Separate
    const overlap = c.minDist - c.dist;
    const nx = c.dx / c.dist;
    const ny = c.dy / c.dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    // Push ball - only forward (to the right)
    const pushSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    const force = Math.max(PUSH_FORCE, pushSpeed * 1.2);
    // Force the x component to always be positive (forward)
    ball.vx = Math.abs(nx) * force;
    ball.vy = ny * force;
}

function resolveBotBallCollision(beetle) {
    // Ball is behind bot (to the right) - pass through completely
    if (ball.x > beetle.x) return;

    const c = circleCollision(beetle, BEETLE_RADIUS, ball, BALL_RADIUS);
    if (!c.colliding) return;

    const overlap = c.minDist - c.dist;
    const nx = c.dx / c.dist;
    const ny = c.dy / c.dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const pushSpeed = Math.sqrt(beetle.vx * beetle.vx + beetle.vy * beetle.vy);
    const force = Math.max(PUSH_FORCE, pushSpeed * 1.2);
    // Force x component to always be negative (towards player goal)
    ball.vx = -Math.abs(nx) * force;
    ball.vy = ny * force;
}

function resolveTwoBeetleCollision(a, b) {
    const c = circleCollision(a, BEETLE_RADIUS, b, BEETLE_RADIUS);
    if (!c.colliding) return;

    const overlap = c.minDist - c.dist;
    const nx = c.dx / c.dist;
    const ny = c.dy / c.dist;

    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const relVx = a.vx - b.vx;
    const relVy = a.vy - b.vy;
    const dot = relVx * nx + relVy * ny;

    a.vx -= dot * nx * 0.5;
    a.vy -= dot * ny * 0.5;
    b.vx += dot * nx * 0.5;
    b.vy += dot * ny * 0.5;
}

function resolveAllBeetleCollisions() {
    // Player vs all bots
    for (const bot of bots) {
        resolveTwoBeetleCollision(player, bot);
    }
    // Bots don't collide with each other (they're teammates)
}

function goalWalls() {
    // Left goal - solid walls on top and bottom sides, open from the right (front)
    // Top wall of left goal
    if (ball.x - BALL_RADIUS < GOAL_WIDTH && ball.y < GOAL_Y && ball.y + BALL_RADIUS > GOAL_Y - 5) {
        if (ball.x < GOAL_WIDTH) {
            ball.y = GOAL_Y - BALL_RADIUS;
            ball.vy = -Math.abs(ball.vy) * 0.7;
        }
    }
    // Bottom wall of left goal
    if (ball.x - BALL_RADIUS < GOAL_WIDTH && ball.y > GOAL_Y + GOAL_HEIGHT && ball.y - BALL_RADIUS < GOAL_Y + GOAL_HEIGHT + 5) {
        if (ball.x < GOAL_WIDTH) {
            ball.y = GOAL_Y + GOAL_HEIGHT + BALL_RADIUS;
            ball.vy = Math.abs(ball.vy) * 0.7;
        }
    }

    // Right goal - solid walls on top and bottom sides, open from the left (front)
    // Top wall of right goal
    if (ball.x + BALL_RADIUS > W - GOAL_WIDTH && ball.y < GOAL_Y && ball.y + BALL_RADIUS > GOAL_Y - 5) {
        if (ball.x > W - GOAL_WIDTH) {
            ball.y = GOAL_Y - BALL_RADIUS;
            ball.vy = -Math.abs(ball.vy) * 0.7;
        }
    }
    // Bottom wall of right goal
    if (ball.x + BALL_RADIUS > W - GOAL_WIDTH && ball.y > GOAL_Y + GOAL_HEIGHT && ball.y - BALL_RADIUS < GOAL_Y + GOAL_HEIGHT + 5) {
        if (ball.x > W - GOAL_WIDTH) {
            ball.y = GOAL_Y + GOAL_HEIGHT + BALL_RADIUS;
            ball.vy = Math.abs(ball.vy) * 0.7;
        }
    }
}

function checkGoal() {
    // Ball must enter goal from the front (moving into it)
    // Left goal: ball must be inside goal area and came from the right
    if (ball.x - BALL_RADIUS <= GOAL_WIDTH &&
        ball.y >= GOAL_Y && ball.y <= GOAL_Y + GOAL_HEIGHT &&
        ball.vx < 0) {
        botScore++;
        updateScoreboard();
        return true;
    }
    // Right goal: ball must be inside goal area and came from the left
    if (ball.x + BALL_RADIUS >= W - GOAL_WIDTH &&
        ball.y >= GOAL_Y && ball.y <= GOAL_Y + GOAL_HEIGHT &&
        ball.vx > 0) {
        playerScore++;
        updateScoreboard();
        return true;
    }
    return false;
}

function wallBounceBall() {
    if (ball.x - BALL_RADIUS < 0) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * 0.7;
    }
    if (ball.x + BALL_RADIUS > W) {
        ball.x = W - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * 0.7;
    }
    if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy) * 0.7;
    }
    if (ball.y + BALL_RADIUS > H) {
        ball.y = H - BALL_RADIUS;
        ball.vy = -Math.abs(ball.vy) * 0.7;
    }
}

function updateScoreboard() {
    document.getElementById('player-score').textContent = `Dig: ${playerScore}`;
    document.getElementById('bot-score').textContent = `Robot: ${botScore}`;
    document.getElementById('round-info').textContent = `Runde ${round}`;
}

function checkWinner() {
    if (playerScore >= winScore) {
        endGame('Du vandt! 🎉');
        return true;
    }
    if (botScore >= winScore) {
        endGame('Robotten vandt! 🤖');
        return true;
    }
    return false;
}

function endGame(text) {
    gameRunning = false;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'block';
    document.getElementById('winner-text').innerHTML = text + `<br><span style="font-size:1.5rem;color:#ccc;">Dig ${playerScore} - ${botScore} Robot</span>`;
}

// --- Countdown & Round ---

function startCountdown() {
    countdownActive = true;
    countdownNumber = 3;
    countdownTimer = 0;
}

function updateCountdown() {
    countdownTimer++;
    if (countdownTimer >= 60) {
        countdownTimer = 0;
        countdownNumber--;
        if (countdownNumber < 0) {
            countdownActive = false;
        }
    }
}

// --- Main Loop ---

function update() {
    if (!gameRunning) return;

    if (countdownActive) {
        updateCountdown();
        draw();
        requestAnimationFrame(update);
        return;
    }

    if (goalScoredPause) {
        draw();
        requestAnimationFrame(update);
        return;
    }

    // Super kick cooldown
    if (superKickTimer > 0) superKickTimer--;

    handleInput();
    updateBots();

    // Apply velocity
    player.x += player.vx;
    player.y += player.vy;
    for (const bot of bots) {
        bot.x += bot.vx;
        bot.y += bot.vy;
    }
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Friction
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    for (const bot of bots) {
        bot.vx *= FRICTION;
        bot.vy *= FRICTION;
    }
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;

    // Stop tiny movement
    if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.1) ball.vy = 0;

    // Super flash timer
    if (ball.superFlash > 0) ball.superFlash--;

    // Collisions
    resolvePlayerBallCollision();
    for (const bot of bots) {
        resolveBotBallCollision(bot);
    }
    resolveAllBeetleCollisions();

    // Walls
    clampEntity(player, BEETLE_RADIUS);
    for (const bot of bots) {
        clampEntity(bot, BEETLE_RADIUS);
        // Zone restrictions for bots
        if (bot.role === 'attacker' && bot.x > W * 0.5) {
            bot.x = W * 0.5;
            bot.vx = 0;
        }
        if (bot.role === 'midfielder') {
            if (bot.x < W * 0.25) { bot.x = W * 0.25; bot.vx = 0; }
            if (bot.x > W * 0.75) { bot.x = W * 0.75; bot.vx = 0; }
        }
    }
    wallBounceBall();
    goalWalls();

    // Goal check
    if (checkGoal()) {
        goalScoredPause = true;
        if (!checkWinner()) {
            round++;
            updateScoreboard();
            setTimeout(() => {
                if (isCustomMode) resetCustomPositions(); else resetPositions();
                goalScoredPause = false;
                startCountdown();
            }, 1500);
        }
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    drawField();

    // Draw ball with super flash effect
    drawBall(ball.x, ball.y);
    if (ball.superFlash > 0) {
        ctx.fillStyle = `rgba(241, 196, 15, ${ball.superFlash / 10 * 0.6})`;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS + ball.superFlash, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBeetle(player.x, player.y, '#2ecc71', false);
    for (const bot of bots) {
        drawBeetle(bot.x, bot.y, bot.color, true);
    }

    // Super kick bar
    drawSuperKickBar();

    if (countdownActive) {
        drawCountdown();
    }

    if (goalScoredPause && gameRunning) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffc107';
        ctx.font = 'bold 60px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MÅL!', W / 2, H / 2);
    }
}

// --- Start / Menu ---

function startGame(diff) {
    difficulty = diff;
    isCustomMode = false;
    playerScore = 0;
    botScore = 0;
    round = 1;
    goalScoredPause = false;
    winScore = 3;
    superKickCooldown = 300;

    document.getElementById('menu').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    createBots(DIFFICULTY[diff].botCount);
    updateScoreboard();
    resetPositions();
    gameRunning = true;
    startCountdown();
    requestAnimationFrame(update);
}

function backToMenu() {
    gameRunning = false;
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('custom-menu').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

// --- Custom Mode ---

const customSettings = {
    attackers: 1,
    midfielders: 1,
    defenders: 1,
    cooldown: 5,
    goals: 3
};

function showCustom() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('custom-menu').style.display = 'block';
}

function hideCustom() {
    document.getElementById('custom-menu').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

function adjustCustom(key, delta) {
    const mins = { attackers: 0, midfielders: 0, defenders: 0, cooldown: 1, goals: 1 };
    const maxs = { attackers: 5, midfielders: 5, defenders: 5, cooldown: 30, goals: 20 };
    customSettings[key] = Math.max(mins[key], Math.min(maxs[key], customSettings[key] + delta));
    document.getElementById('c-' + key).textContent = customSettings[key];
}

function startCustomGame() {
    difficulty = 'normal';
    isCustomMode = true;
    playerScore = 0;
    botScore = 0;
    round = 1;
    goalScoredPause = false;
    winScore = customSettings.goals;
    superKickCooldown = customSettings.cooldown * 60;

    document.getElementById('custom-menu').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('winner-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    // Create custom bots with roles
    bots = [];
    const diff = DIFFICULTY[difficulty];
    let botIndex = 0;
    for (let i = 0; i < customSettings.attackers; i++) {
        bots.push({ x: 0, y: 0, vx: 0, vy: 0, speed: diff.botSpeed, color: BOT_COLORS[botIndex % BOT_COLORS.length], role: 'attacker' });
        botIndex++;
    }
    for (let i = 0; i < customSettings.midfielders; i++) {
        bots.push({ x: 0, y: 0, vx: 0, vy: 0, speed: diff.botSpeed, color: BOT_COLORS[botIndex % BOT_COLORS.length], role: 'midfielder' });
        botIndex++;
    }
    for (let i = 0; i < customSettings.defenders; i++) {
        bots.push({ x: 0, y: 0, vx: 0, vy: 0, speed: diff.botSpeed, color: BOT_COLORS[botIndex % BOT_COLORS.length], role: 'defender' });
        botIndex++;
    }
    // If no bots, add one free roamer
    if (bots.length === 0) {
        bots.push({ x: 0, y: 0, vx: 0, vy: 0, speed: diff.botSpeed, color: BOT_COLORS[0], role: 'free' });
    }

    resetCustomPositions();
    updateScoreboard();
    gameRunning = true;
    startCountdown();
    requestAnimationFrame(update);
}

function resetCustomPositions() {
    player.x = 150;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;

    // Place bots by role
    const attackers = bots.filter(b => b.role === 'attacker');
    const midfielders = bots.filter(b => b.role === 'midfielder');
    const defenders = bots.filter(b => b.role === 'defender');
    const free = bots.filter(b => b.role === 'free');

    attackers.forEach((b, i) => {
        const spacing = H / (attackers.length + 1);
        b.x = W * 0.65;
        b.y = spacing * (i + 1);
    });
    midfielders.forEach((b, i) => {
        const spacing = H / (midfielders.length + 1);
        b.x = W * 0.55;
        b.y = spacing * (i + 1);
    });
    defenders.forEach((b, i) => {
        const spacing = H / (defenders.length + 1);
        b.x = W * 0.82;
        b.y = spacing * (i + 1);
    });
    free.forEach((b, i) => {
        b.x = W * 0.5;
        b.y = H / 2;
    });

    for (const bot of bots) {
        bot.vx = 0;
        bot.vy = 0;
    }

    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 0;
    ball.vy = 0;

    superKickTimer = 0;
}
