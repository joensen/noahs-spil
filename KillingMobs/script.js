
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const uiLevel = document.getElementById('level');
const uiHouseHealth = document.getElementById('house-health');
const uiMoney = document.getElementById('money');
const buyTowerBtn = document.getElementById('buy-tower-btn');
const gameOverScreen = document.getElementById('game-over');
const finalLevel = document.getElementById('final-level');

let house = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 50,
    health: 100,
    maxHealth: 100
};

let projectiles = [];
let mobs = [];
let towers = [];
let particles = [];
let money = 0;
let level = 1;
let gameOver = false;
let placingTower = false;
const towerCost = 100;

let mouse = {
    x: 0,
    y: 0
};

class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.color = 'yellow';
        const angle = Math.atan2(targetY - y, targetX - x);
        this.velocity = {
            x: Math.cos(angle) * 8,
            y: Math.sin(angle) * 8
        };
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Mob {
    constructor(x, y, health, speed, radius, color) {
        this.x = x;
        this.y = y;
        this.initialHealth = health;
        this.health = health;
        this.speed = speed;
        this.radius = radius;
        this.color = color;
        this.hitTimer = 0;
        this.target = null;
    }

    findTarget() {
        let closestTarget = house;
        let minDistance = Math.hypot(this.x - house.x, this.y - house.y);

        towers.forEach(tower => {
            const dist = Math.hypot(this.x - tower.x, this.y - tower.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = tower;
            }
        });
        this.target = closestTarget;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.hitTimer > 0 ? 'white' : this.color;
        ctx.fill();

        // Health bar
        const healthBarWidth = this.radius * 2;
        const healthBarHeight = 5;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, healthBarWidth * (this.health / this.initialHealth), healthBarHeight);
    }

    update() {
        if (!this.target || (this.target.health <= 0 && this.target !== house)) {
            this.findTarget();
        }
        
        if (this.hitTimer > 0) {
            this.hitTimer--;
        }

        if (this.target) {
            const targetX = this.target.x;
            const targetY = this.target.y;
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const dist = Math.hypot(this.x - targetX, this.y - targetY);
            const targetSize = this.target.size ? this.target.size / 2 : 0;

            if (dist > this.radius + targetSize) {
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        }
        this.draw();
    }
}

class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.health = 100;
        this.maxHealth = 100;
        this.range = 200;
        this.fireRate = 60; // frames per shot
        this.fireCooldown = 0;
        this.damage = 10;
    }

    draw() {
        // Tower Base
        ctx.fillStyle = 'cyan';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        // Health bar
        const healthBarWidth = this.size;
        const healthBarHeight = 5;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2 - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2 - 10, healthBarWidth * (this.health / this.maxHealth), healthBarHeight);
    }

    update() {
        this.draw();
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        if (this.fireCooldown === 0) {
            const nearestMob = this.findNearestMob();
            if (nearestMob) {
                projectiles.push(new Projectile(this.x, this.y, nearestMob.x, nearestMob.y));
                this.fireCooldown = this.fireRate;
            }
        }
    }

    findNearestMob() {
        let nearestMob = null;
        let minDistance = this.range;
        mobs.forEach(mob => {
            const dist = Math.hypot(this.x - mob.x, this.y - mob.y);
            if (dist < minDistance) {
                minDistance = dist;
                nearestMob = mob;
            }
        });
        return nearestMob;
    }
}

class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.02;
    }
}

function spawnMobs() {
    const mobCount = level * 5;
    for (let i = 0; i < mobCount; i++) {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - 30 : canvas.width + 30;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - 30 : canvas.height + 30;
        }
        const health = 50 + (level - 1) * 10;
        const speed = 0.5 + (level - 1) * 0.1;
        const radius = 15 + Math.random() * 10;
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        mobs.push(new Mob(x, y, health, speed, radius, color));
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        const radius = Math.random() * 3 + 1;
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        const velocity = {
            x: (Math.random() - 0.5) * (Math.random() * 6),
            y: (Math.random() - 0.5) * (Math.random() * 6)
        };
        particles.push(new Particle(x, y, radius, color, velocity));
    }
}

function updateUI() {
    uiLevel.textContent = level;
    uiHouseHealth.textContent = house.health;
    uiMoney.textContent = money;
}

function drawHouse() {
    const x = house.x;
    const y = house.y;
    const size = house.size;
    // Base
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    // Roof
    ctx.fillStyle = '#A52A2A'; // Darker Red
    ctx.beginPath();
    ctx.moveTo(x - size / 2 - 10, y - size / 2);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size / 2 + 10, y - size / 2);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#654321';
    ctx.fillRect(x - 10, y + 5, 20, 20);
}

function animate() {
    if (gameOver) return;
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and update house
    drawHouse();
    // House health bar
    ctx.fillStyle = 'red';
    ctx.fillRect(house.x - house.size / 2, house.y - house.size - 15, house.size, 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(house.x - house.size / 2, house.y - house.size - 15, house.size * (house.health / house.maxHealth), 10);


    towers.forEach((tower, tIndex) => {
        tower.update();
        if (tower.health <= 0) {
            createExplosion(tower.x, tower.y);
            towers.splice(tIndex, 1);
        }
    });

    projectiles.forEach((p, pIndex) => {
        p.update();
        if (p.x + p.radius < 0 || p.x - p.radius > canvas.width || p.y + p.radius < 0 || p.y - p.radius > canvas.height) {
            projectiles.splice(pIndex, 1);
        }
    });

    mobs.forEach((mob, mIndex) => {
        mob.update();

        // Mob attacks target
        if (mob.target) {
            const dist = Math.hypot(mob.x - mob.target.x, mob.y - mob.target.y);
            const targetSize = mob.target.size ? mob.target.size / 2 : 0;
            if (dist - mob.radius - targetSize < 1) {
                mob.target.health -= 0.2; // Continuous damage
                if (mob.target.health <= 0) {
                    if (mob.target === house) {
                        endGame();
                    }
                    mob.target = null; // Find new target next frame
                }
                updateUI();
            }
        }

        // Projectile hits mob
        projectiles.forEach((p, pIndex) => {
            const dist = Math.hypot(p.x - mob.x, p.y - mob.y);
            if (dist - mob.radius - p.radius < 1) {
                mob.health -= 25;
                mob.hitTimer = 5; // frames to flash
                projectiles.splice(pIndex, 1);
                if (mob.health <= 0) {
                    createExplosion(mob.x, mob.y);
                    money += 10;
                    mobs.splice(mIndex, 1);
                    updateUI();
                }
            }
        });
    });

    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    if (mobs.length === 0) {
        level++;
        spawnMobs();
        updateUI();
    }

    if (placingTower) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.fill();
    }
}

function endGame() {
    gameOver = true;
    finalLevel.textContent = level;
    gameOverScreen.style.display = 'block';
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        projectiles.push(new Projectile(house.x, house.y, mouse.x, mouse.y));
    }
    if (e.code === 'KeyT') {
        if (money >= towerCost) {
            placingTower = true;
        }
    }
});

buyTowerBtn.addEventListener('click', () => {
    if (money >= towerCost) {
        placingTower = true;
    }
});

canvas.addEventListener('click', (e) => {
    if (placingTower) {
        if (money >= towerCost) {
            money -= towerCost;
            towers.push(new Tower(e.clientX, e.clientY));
            placingTower = false;
            updateUI();
        }
    }
});

spawnMobs();
animate();
updateUI();
