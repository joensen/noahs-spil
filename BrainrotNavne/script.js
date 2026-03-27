// Navne og positioner fra brainrots.jpg (5 kolonner x 5 rækker)
const brainrotData = [
    { name: "Bombardiro Crocodilo",    col: 0, row: 0 },
    { name: "Lirili Larila",           col: 1, row: 0 },
    { name: "Brr Brr Patapim",         col: 2, row: 0 },
    { name: "Udin Din Din Dun",        col: 3, row: 0 },
    { name: "Trulimero Trulicina",     col: 4, row: 0 },
    { name: "Ballerina Cappucina",     col: 0, row: 1 },
    { name: "Tung Tung Tung Sahur",    col: 1, row: 1 },
    { name: "Tralalero Tralala",       col: 2, row: 1 },
    { name: "Chimpanzini Bananini",    col: 3, row: 1 },
    { name: "Boneca Ambalabu",         col: 4, row: 1 },
    { name: "Trippi Troppi",           col: 0, row: 2 },
    { name: "Il Cacto Hipopotamo",     col: 1, row: 2 },
    { name: "Burbaloni Luliloli",      col: 2, row: 2 },
    { name: "Ta Ta Ta Ta Sahur",       col: 3, row: 2 },
    { name: "Glorbo Frutodrillo",      col: 4, row: 2 },
    { name: "Giraffa Celeste",         col: 0, row: 3 },
    { name: "Spijuniro Golubiro",      col: 1, row: 3 },
    { name: "Blueberrini Octopussini", col: 2, row: 3 },
    { name: "La Vaca Saturno",         col: 3, row: 3 },
    { name: "Bri Bri Bicus Dicus",     col: 4, row: 3 },
    { name: "Frigo Camello",           col: 0, row: 4 },
    { name: "Cappuccino Assassino",    col: 1, row: 4 },
    { name: "Tric Trac Barabum",       col: 2, row: 4 },
    { name: "Bombombini Guzzini",      col: 3, row: 4 },
    { name: "Orangutini Bananini",     col: 4, row: 4 }
];

// Billedet er 480x591, 5x5 grid
const ORIG_CELL_W = 480 / 5;
const ORIG_CELL_H = 591 / 5;
const SCALE = 120 / ORIG_CELL_W;
const CELL_W = 120;
const CELL_H = Math.round(ORIG_CELL_H * SCALE);
const IMG_W = Math.round(480 * SCALE);
const IMG_H = Math.round(591 * SCALE);

let money = 0;
let totalClicks = 0;
let brainrots = [];
let nextPrice = 100;
const priceMultiplier = 1.8;
let paused = false;
let muted = true;

const moneyDisplay = document.getElementById('money');
const perClickDisplay = document.getElementById('per-click');
const clicksDisplay = document.getElementById('clicks');
const buyBtn = document.getElementById('buy-btn');
const priceDisplay = document.getElementById('price');
const brainrotArea = document.getElementById('brainrot-area');

function updateUI() {
    moneyDisplay.textContent = Math.floor(money) + ' kr';
    perClickDisplay.textContent = (brainrots.length || 1) + ' kr per klik';
    clicksDisplay.textContent = totalClicks + ' klik';
    buyBtn.disabled = money < nextPrice;
    priceDisplay.textContent = 'Pris: ' + Math.floor(nextPrice) + ' kr';
}

function spawnFloatCoin(x, y, amount) {
    const coin = document.createElement('div');
    coin.className = 'float-coin';
    coin.textContent = '+' + amount + ' kr';
    coin.style.left = x + 'px';
    coin.style.top = y + 'px';
    brainrotArea.appendChild(coin);
    setTimeout(() => coin.remove(), 1000);
}

// Sig navnet højt med en dyb drengestemme
function sayName(brainrot) {
    if (muted) return;
    const utterance = new SpeechSynthesisUtterance(brainrot.name);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 0.3;
    // Vælg en mandlig stemme
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('it') && /male|giuseppe|luca|cosimo/i.test(v.name))
        || voices.find(v => v.lang.startsWith('it'))
        || voices.find(v => /male|david|mark|daniel/i.test(v.name));
    if (voice) utterance.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

// Preload stemmer
speechSynthesis.getVoices();

function bounceElement(el) {
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
}

function getRandomPosition() {
    const area = brainrotArea.getBoundingClientRect();
    const x = Math.random() * (area.width - CELL_W - 20) + 10;
    const y = Math.random() * (area.height - CELL_H - 20) + 10;
    return { x, y };
}

function handleClick(brainrot, e) {
    const earning = Math.max(brainrots.length, 1);
    money += earning;
    totalClicks++;

    const rect = brainrotArea.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    spawnFloatCoin(x, y, earning);

    // Sig navnet på den brainrot man klikkede på
    sayName(brainrot);

    // Bounce alle brainrots
    brainrots.forEach(b => bounceElement(b.el));

    updateUI();
}

function animateBrainrot(brainrot) {
    let dx = (Math.random() - 0.5) * 5;
    let dy = (Math.random() - 0.5) * 5;

    function move() {
        if (paused) {
            requestAnimationFrame(move);
            return;
        }
        const area = brainrotArea.getBoundingClientRect();
        let x = parseFloat(brainrot.el.style.left);
        let y = parseFloat(brainrot.el.style.top);

        x += dx;
        y += dy;

        if (x <= 0 || x >= area.width - CELL_W - 10) dx *= -1;
        if (y <= 0 || y >= area.height - CELL_H - 10) dy *= -1;

        x = Math.max(0, Math.min(x, area.width - CELL_W - 10));
        y = Math.max(0, Math.min(y, area.height - CELL_H - 10));

        brainrot.el.style.left = x + 'px';
        brainrot.el.style.top = y + 'px';

        requestAnimationFrame(move);
    }

    requestAnimationFrame(move);
}

function createBrainrot() {
    const pos = getRandomPosition();
    const index = brainrots.length % brainrotData.length;
    const data = brainrotData[index];

    const el = document.createElement('div');
    el.className = 'brainrot';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';

    const img = document.createElement('img');
    img.src = 'brainrots.jpg';
    img.draggable = false;
    img.style.position = 'absolute';
    img.style.width = IMG_W + 'px';
    img.style.height = IMG_H + 'px';
    img.style.left = -(data.col * CELL_W) + 'px';
    img.style.top = -(data.row * CELL_H) + 'px';
    el.appendChild(img);

    const brainrot = { el, name: data.name };

    el.addEventListener('click', (e) => handleClick(brainrot, e));
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleClick(brainrot, e);
    });

    brainrotArea.appendChild(el);
    brainrots.push(brainrot);

    // Brainrot bevæger sig rundt
    animateBrainrot(brainrot);

    return brainrot;
}

buyBtn.addEventListener('click', () => {
    if (money >= nextPrice) {
        money -= nextPrice;
        createBrainrot();
        nextPrice = Math.floor(nextPrice * priceMultiplier);
        updateUI();
    }
});

// Mute knap
const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? 'Lyd: FRA' : 'Lyd: TIL';
    if (muted) speechSynthesis.cancel();
});

// Pause knap
const pauseBtn = document.getElementById('pause-btn');
pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Start' : 'Pause';
});

// Start med én brainrot
createBrainrot();
updateUI();
