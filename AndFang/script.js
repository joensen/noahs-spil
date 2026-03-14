const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let roundMoney = 0;
let totalMoney = parseInt(localStorage.getItem('andFangMoney') || '0');
let timeLeft = 60;
let timerInterval = null;
let animFrame = null;

// Super power cooldown
let superPowerReady = true;
let superPowerCooldown = 0;
const SUPER_COOLDOWN = 10; // seconds

// x10 boost for default duck
let boostActive = false;
let boostTimeLeft = 0;

// Skins - side 1 (normale skins)
const skins = [
    { id: 'default', name: 'Gul And', emoji: '🦆', price: 0, color: '#FFD700', bonus: 1, power: 'x10boost', powerDesc: 'Mellemrum: x10 mønter i 3s (10s cooldown)' },
    { id: 'ninja', name: 'Ninja And', emoji: '🥷', price: 500, color: '#333', bonus: 2, power: 'moneyBlast', powerDesc: 'Mellemrum: +13 mønter (10s cooldown)' },
    { id: 'robot', name: 'Robot And', emoji: '🤖', price: 1500, color: '#888', bonus: 3, power: 'moneyBlast', powerDesc: 'Mellemrum: +16 mønter (10s cooldown)' },
    { id: 'ghost', name: 'Spøgelses And', emoji: '👻', price: 3000, color: '#ddd', bonus: 4, power: 'moneyBlast', powerDesc: 'Mellemrum: +22 mønter (10s cooldown)' },
    { id: 'pirate', name: 'Pirat And', emoji: '🏴‍☠️', price: 5000, color: '#8B4513', bonus: 5, power: 'moneyBlast', powerDesc: 'Mellemrum: +30 mønter (10s cooldown)' },
    { id: 'alien', name: 'Alien And', emoji: '👽', price: 10000, color: '#7bed9f', bonus: 7, power: 'moneyBlast', powerDesc: 'Mellemrum: +45 mønter (10s cooldown)' },
    { id: 'devil', name: 'Djævle And', emoji: '😈', price: 20000, color: '#e94560', bonus: 10, power: 'moneyBlast', powerDesc: 'Mellemrum: +70 mønter (10s cooldown)' },
    { id: 'rainbow', name: 'Regnbue And', emoji: '🌈', price: 40000, color: '#ff6b6b', bonus: 15, power: 'moneyBlast', powerDesc: 'Mellemrum: +100 mønter (10s cooldown)' },
    { id: 'crown', name: 'Konge And', emoji: '👑', price: 75000, color: '#FFD700', bonus: 25, power: 'moneyBlast', powerDesc: 'Mellemrum: +200 mønter (10s cooldown)' }
];

// Skins - side 2 (OP skins med superkræfter)
const opSkins = [
    { id: 'op_fire', name: 'Ild And', emoji: '🔥', price: 25000, color: '#ff4500', bonus: 12, power: null, powerDesc: 'Ingen superkraft' },
    { id: 'op_ice', name: 'Is And', emoji: '🧊', price: 40000, color: '#00bfff', bonus: 18, power: null, powerDesc: 'Ingen superkraft' },
    { id: 'op_thunder', name: 'Lyn And', emoji: '⚡', price: 60000, color: '#ffd700', bonus: 25, power: 'moneyBlast', powerDesc: 'Mellemrum: +1000 mønter (10s cooldown)' },
    { id: 'op_galaxy', name: 'Galakse And', emoji: '🌌', price: 85000, color: '#9b59b6', bonus: 35, power: 'moneyBlast', powerDesc: 'Mellemrum: +2000 mønter (10s cooldown)' },
    { id: 'op_god', name: 'Gud And', emoji: '💎', price: 100000, color: '#e1bee7', bonus: 50, power: 'moneyBlast', powerDesc: 'Mellemrum: +3000 mønter (10s cooldown)' }
];

// Power amounts per skin
const powerAmounts = {
    'ninja': 13,
    'robot': 16,
    'ghost': 22,
    'pirate': 30,
    'alien': 45,
    'devil': 70,
    'rainbow': 100,
    'crown': 200,
    'op_thunder': 1000,
    'op_galaxy': 2000,
    'op_god': 3000
};

let ownedSkins = JSON.parse(localStorage.getItem('andFangSkins') || '["default"]');
let activeSkin = localStorage.getItem('andFangActiveSkin') || 'default';
let shopPage = 1; // 1 = normal, 2 = OP

// Duck
const duck = {
    x: 400,
    y: 250,
    width: 40,
    height: 40,
    speed: 5,
    dx: 0,
    dy: 0
};

// Coins
let coins = [];
const COIN_SIZE = 20;
const MAX_COINS = 8;

// Net (enemy)
const net = {
    x: 100,
    y: 100,
    width: 60,
    height: 60,
    speed: 2.5,
    chaseDelay: 0
};

// Keys
const keys = {};

// Power blast effect
let powerBlastEffect = 0;

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
    // Super power on space
    if (e.key === ' ' && gameRunning && superPowerReady) {
        activateSuperPower();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Get current skin (from both lists)
function getCurrentSkin() {
    return skins.find(s => s.id === activeSkin) || opSkins.find(s => s.id === activeSkin) || skins[0];
}

// Activate super power
function activateSuperPower() {
    const skin = getCurrentSkin();
    if (!skin.power) return;

    superPowerReady = false;
    superPowerCooldown = SUPER_COOLDOWN;
    powerBlastEffect = 1.0;

    if (skin.power === 'x10boost') {
        // x10 boost for 3 seconds
        boostActive = true;
        boostTimeLeft = 3;
    } else if (skin.power === 'moneyBlast') {
        const amount = powerAmounts[skin.id] || 0;
        if (amount <= 0) return;
        roundMoney += amount;
        totalMoney += amount;
        saveMoney();
    }

    updateMoneyDisplays();
}

// Update total money display
function updateMoneyDisplays() {
    document.getElementById('money-count').textContent = roundMoney;
    document.getElementById('total-money').textContent = totalMoney;
    document.getElementById('timer').textContent = timeLeft;

    // Show cooldown
    const cooldownEl = document.getElementById('cooldown-display');
    const skin = getCurrentSkin();
    if (skin.power) {
        cooldownEl.style.display = 'block';
        if (boostActive) {
            cooldownEl.textContent = `🔥 x10 BOOST! ${boostTimeLeft}s`;
            cooldownEl.style.color = '#FFD700';
        } else if (superPowerReady) {
            cooldownEl.textContent = '⚡ KLAR! [Mellemrum]';
            cooldownEl.style.color = '#7bed9f';
        } else {
            cooldownEl.textContent = `⚡ ${superPowerCooldown}s`;
            cooldownEl.style.color = '#ff6b6b';
        }
    } else {
        cooldownEl.style.display = 'none';
    }
}

// Spawn a coin
function spawnCoin() {
    if (coins.length >= MAX_COINS) return;
    coins.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: Math.random() * (canvas.height - 40) + 20,
        size: COIN_SIZE,
        bobOffset: Math.random() * Math.PI * 2
    });
}

// Draw duck
function drawDuck() {
    const skin = getCurrentSkin();

    // Glow when boost is active
    if (boostActive) {
        ctx.beginPath();
        ctx.arc(duck.x, duck.y, 32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.fill();
    }

    // Draw visible background circle
    ctx.beginPath();
    ctx.arc(duck.x, duck.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = boostActive ? 'rgba(255, 255, 200, 0.95)' : 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.strokeStyle = boostActive ? '#FFD700' : skin.color;
    ctx.lineWidth = boostActive ? 4 : 3;
    ctx.stroke();

    // Draw emoji
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skin.emoji, duck.x, duck.y);

    // Power blast effect
    if (powerBlastEffect > 0) {
        ctx.beginPath();
        ctx.arc(duck.x, duck.y, 30 + (1 - powerBlastEffect) * 80, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${powerBlastEffect})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        powerBlastEffect -= 0.02;
    }
}

// Draw coins
function drawCoins(time) {
    coins.forEach(coin => {
        const bob = Math.sin(time / 300 + coin.bobOffset) * 3;
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪙', coin.x, coin.y + bob);
    });
}

// Draw net
function drawNet() {
    ctx.font = '44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥅', net.x, net.y);

    const dist = Math.hypot(duck.x - net.x, duck.y - net.y);
    if (dist < 120) {
        ctx.beginPath();
        ctx.arc(net.x, net.y, 35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 69, 96, ${0.3 * (1 - dist / 120)})`;
        ctx.fill();
    }
}

// Draw background
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.7, '#98D8C8');
    grad.addColorStop(1, '#6BCB77');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(70, 130, 180, 0.4)';
    ctx.beginPath();
    ctx.ellipse(400, 450, 350, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 130, 180, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Move duck
function moveDuck() {
    duck.dx = 0;
    duck.dy = 0;

    if (keys['arrowleft'] || keys['a']) duck.dx = -duck.speed;
    if (keys['arrowright'] || keys['d']) duck.dx = duck.speed;
    if (keys['arrowup'] || keys['w']) duck.dy = -duck.speed;
    if (keys['arrowdown'] || keys['s']) duck.dy = duck.speed;

    if (duck.dx !== 0 && duck.dy !== 0) {
        duck.dx *= 0.707;
        duck.dy *= 0.707;
    }

    duck.x += duck.dx;
    duck.y += duck.dy;

    duck.x = Math.max(20, Math.min(canvas.width - 20, duck.x));
    duck.y = Math.max(20, Math.min(canvas.height - 20, duck.y));
}

// Move net
function moveNet() {
    const dx = duck.x - net.x;
    const dy = duck.y - net.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
        const wobble = Math.sin(Date.now() / 500) * 0.5;
        net.x += (dx / dist) * net.speed + wobble;
        net.y += (dy / dist) * net.speed;
    }

    net.x = Math.max(30, Math.min(canvas.width - 30, net.x));
    net.y = Math.max(30, Math.min(canvas.height - 30, net.y));
}

// Check collisions
function checkCollisions() {
    // Duck vs coins
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const dist = Math.hypot(duck.x - coin.x, duck.y - coin.y);
        if (dist < 30) {
            coins.splice(i, 1);
            const skin = getCurrentSkin();
            let earned = skin.bonus;
            if (boostActive) earned *= 10;
            roundMoney += earned;
            totalMoney += earned;
            updateMoneyDisplays();
            saveMoney();
            spawnCoin();
        }
    }

    // Net vs duck - mister ALLE runde-mønter!
    const netDist = Math.hypot(duck.x - net.x, duck.y - net.y);
    if (netDist < 35) {
        totalMoney -= roundMoney;
        if (totalMoney < 0) totalMoney = 0;
        roundMoney = 0;
        updateMoneyDisplays();
        saveMoney();

        // Flash screen red
        ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Teleport duck away
        duck.x = net.x > canvas.width / 2 ? 100 : canvas.width - 100;
        duck.y = net.y > canvas.height / 2 ? 100 : canvas.height - 100;
    }
}

// Main game loop
function gameLoop(time) {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    moveDuck();
    moveNet();
    checkCollisions();
    drawCoins(time);
    drawNet();
    drawDuck();

    if (Math.random() < 0.02 && coins.length < MAX_COINS) {
        spawnCoin();
    }

    animFrame = requestAnimationFrame(gameLoop);
}

// Timer
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;

        // x10 boost timer
        if (boostActive) {
            boostTimeLeft--;
            if (boostTimeLeft <= 0) {
                boostActive = false;
            }
        }

        // Super power cooldown
        if (!superPowerReady) {
            superPowerCooldown--;
            if (superPowerCooldown <= 0) {
                superPowerReady = true;
            }
        }

        updateMoneyDisplays();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// Start game
function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    roundMoney = 0;
    timeLeft = 60;
    duck.x = 400;
    duck.y = 250;
    net.x = 100;
    net.y = 100;
    coins = [];
    gameRunning = true;
    superPowerReady = true;
    superPowerCooldown = 0;
    boostActive = false;
    boostTimeLeft = 0;
    net.speed = 2.5;

    for (let i = 0; i < 5; i++) spawnCoin();

    updateMoneyDisplays();
    startTimer();
    animFrame = requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);

    document.getElementById('game-container').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('round-result').textContent = roundMoney;
    document.getElementById('end-total').textContent = totalMoney;

    saveMoney();
}

// Save/load
function saveMoney() {
    localStorage.setItem('andFangMoney', totalMoney.toString());
}

function saveSkins() {
    localStorage.setItem('andFangSkins', JSON.stringify(ownedSkins));
    localStorage.setItem('andFangActiveSkin', activeSkin);
}

// Shop
function toggleShop() {
    const shop = document.getElementById('shop-screen');
    const isVisible = shop.style.display === 'flex';

    if (isVisible) {
        shop.style.display = 'none';
    } else {
        if (gameRunning) {
            gameRunning = false;
            clearInterval(timerInterval);
            cancelAnimationFrame(animFrame);
        }

        shop.style.display = 'flex';
        document.getElementById('shop-money-count').textContent = totalMoney;
        shopPage = 1;
        renderShop();
    }
}

function switchShopPage(page) {
    shopPage = page;
    renderShop();
}

// Check if all normal skins are owned
function hasAllNormalSkins() {
    return skins.every(s => ownedSkins.includes(s.id));
}

function renderShop() {
    const grid = document.getElementById('skins-grid');
    grid.innerHTML = '';

    // Update page buttons
    const allNormal = hasAllNormalSkins();
    document.getElementById('page1-btn').classList.toggle('active-page', shopPage === 1);
    document.getElementById('page2-btn').classList.toggle('active-page', shopPage === 2);

    // Show locked message on OP page if not all normal skins owned
    if (shopPage === 2 && !allNormal) {
        const lockedMsg = document.createElement('div');
        lockedMsg.className = 'locked-message';
        lockedMsg.innerHTML = '🔒 Køb alle normale skins først for at låse OP skins op!';
        grid.appendChild(lockedMsg);
        return;
    }

    const currentSkins = shopPage === 1 ? skins : opSkins;

    currentSkins.forEach(skin => {
        const card = document.createElement('div');
        card.className = 'skin-card';
        if (shopPage === 2) card.classList.add('op-card');

        const isOwned = ownedSkins.includes(skin.id);
        const isActive = activeSkin === skin.id;

        if (isOwned) card.classList.add('owned');
        if (isActive) card.classList.add('active');

        let statusText = '';
        if (isActive) {
            statusText = '✅ Valgt';
        } else if (isOwned) {
            statusText = 'Klik for at vælge';
        } else {
            statusText = `🪙 ${skin.price.toLocaleString()}`;
        }

        let powerText = '';
        if (skin.powerDesc) {
            powerText = `<div class="skin-power">${skin.powerDesc}</div>`;
        }

        card.innerHTML = `
            <div class="skin-preview">${skin.emoji}</div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-price">${statusText}</div>
            <div class="skin-status">+${skin.bonus} per mønt</div>
            ${powerText}
        `;

        card.onclick = () => {
            if (isActive) return;

            if (isOwned) {
                activeSkin = skin.id;
                saveSkins();
                renderShop();
            } else if (totalMoney >= skin.price) {
                totalMoney -= skin.price;
                ownedSkins.push(skin.id);
                activeSkin = skin.id;
                saveMoney();
                saveSkins();
                document.getElementById('shop-money-count').textContent = totalMoney;
                document.getElementById('total-money').textContent = totalMoney;
                renderShop();
            } else {
                card.style.borderColor = '#ff0000';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.borderColor = '';
                    card.style.transform = '';
                }, 500);
            }
        };

        grid.appendChild(card);
    });
}

// Reset all progress
function resetAll() {
    if (!confirm('Er du sikker? Du mister ALLE mønter og skins!')) return;
    totalMoney = 0;
    roundMoney = 0;
    ownedSkins = ['default'];
    activeSkin = 'default';
    saveMoney();
    saveSkins();
    updateMoneyDisplays();
}

// Initialize
updateMoneyDisplays();
document.getElementById('total-money').textContent = totalMoney;
