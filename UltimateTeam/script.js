// ============================================================
// ULTIMATE TEAM - Football Pack Opening & Match Game
// ============================================================

// --- PLAYER DATABASE ---
const COUNTRIES = [
    { name: "Argentina", code: "ar" },
    { name: "Brazil", code: "br" },
    { name: "France", code: "fr" },
    { name: "England", code: "gb-eng" },
    { name: "Spain", code: "es" },
    { name: "Germany", code: "de" },
    { name: "Portugal", code: "pt" },
    { name: "Netherlands", code: "nl" },
    { name: "Belgium", code: "be" },
    { name: "Croatia", code: "hr" },
    { name: "Uruguay", code: "uy" },
    { name: "Colombia", code: "co" },
    { name: "Italy", code: "it" },
    { name: "Norway", code: "no" },
    { name: "Denmark", code: "dk" },
    { name: "Sweden", code: "se" },
    { name: "Scotland", code: "gb-sct" },
    { name: "T\u00fcrkiye", code: "tr" },
    { name: "Morocco", code: "ma" },
    { name: "Senegal", code: "sn" },
    { name: "Nigeria", code: "ng" },
    { name: "Japan", code: "jp" },
    { name: "South Korea", code: "kr" },
    { name: "Mexico", code: "mx" },
    { name: "USA", code: "us" },
    { name: "Canada", code: "ca" },
    { name: "Austria", code: "at" },
    { name: "Switzerland", code: "ch" },
    { name: "Poland", code: "pl" },
    { name: "Czechia", code: "cz" },
    { name: "Egypt", code: "eg" },
    { name: "Ghana", code: "gh" },
    { name: "Cameroon", code: "cm" },
    { name: "Serbia", code: "rs" },
    { name: "Australia", code: "au" }
];

// Simple hash from player name to get consistent random-looking values
function nameHash(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

// Generate a unique player avatar as an SVG data URI
function generateAvatar(player) {
    const h = nameHash(player.name);
    const skinTones = ["#FDDBB4", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3A1E"];
    const hairColors = ["#1a1a1a", "#3b2314", "#6b3a2a", "#c9a96e", "#e8c07a", "#2c1b0e", "#8B4513", "#D2691E"];
    const jerseyColors = {
        "Arsenal": "#EF0107", "Manchester City": "#6CABDD", "Liverpool": "#C8102E",
        "Chelsea": "#034694", "Manchester United": "#DA291C", "Aston Villa": "#670E36",
        "Tottenham": "#132257", "Newcastle": "#241F20", "Brighton": "#0057B8",
        "Brentford": "#e30613", "Barcelona": "#A50044", "Real Madrid": "#FEBE10",
        "Atl\u00e9tico Madrid": "#CB3524", "Athletic Bilbao": "#EE2523", "Real Sociedad": "#143C8C",
        "Inter Milan": "#009BDB", "AC Milan": "#FB090B", "Juventus": "#000000",
        "Napoli": "#12A0D7", "Roma": "#8E1F2F", "Bayern Munich": "#DC052D",
        "Borussia Dortmund": "#FDE100", "Bayer Leverkusen": "#E32221", "RB Leipzig": "#DD0741",
        "Stuttgart": "#E32219", "Paris Saint-Germain": "#004170", "Marseille": "#2FAEE0",
        "Monaco": "#E7192F", "Lyon": "#1A5CAD", "Lille": "#E3001B"
    };

    const skin = skinTones[h % skinTones.length];
    const hair = hairColors[(h >> 3) % hairColors.length];
    const jersey = jerseyColors[player.club] || "#4488cc";
    const hairStyle = (h >> 6) % 5; // 0-4 different styles
    const hasFacialHair = (h >> 9) % 3 === 0;
    const eyebrowThick = (h >> 11) % 2 === 0;

    let hairPath = "";
    switch (hairStyle) {
        case 0: // Short
            hairPath = `<ellipse cx="50" cy="28" rx="26" ry="16" fill="${hair}"/>`;
            break;
        case 1: // Tall/flat top
            hairPath = `<rect x="25" y="14" width="50" height="22" rx="6" fill="${hair}"/>`;
            break;
        case 2: // Side swept
            hairPath = `<ellipse cx="50" cy="28" rx="28" ry="14" fill="${hair}"/>
                        <ellipse cx="30" cy="26" rx="12" ry="18" fill="${hair}"/>`;
            break;
        case 3: // Curly/afro
            hairPath = `<circle cx="50" cy="26" r="26" fill="${hair}"/>`;
            break;
        case 4: // Buzz cut
            hairPath = `<ellipse cx="50" cy="30" rx="24" ry="12" fill="${hair}" opacity="0.6"/>`;
            break;
    }

    const facialHair = hasFacialHair
        ? `<ellipse cx="50" cy="62" rx="10" ry="5" fill="${hair}" opacity="0.5"/>`
        : "";

    const ebW = eyebrowThick ? 3 : 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Jersey/shoulders -->
        <path d="M15 95 Q15 72 50 70 Q85 72 85 95 Z" fill="${jersey}"/>
        <path d="M35 75 Q50 73 65 75 L62 95 L38 95 Z" fill="${jersey}" filter="brightness(0.85)"/>
        <line x1="50" y1="73" x2="50" y2="95" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
        <!-- Neck -->
        <rect x="42" y="60" width="16" height="14" rx="4" fill="${skin}"/>
        <!-- Head -->
        <ellipse cx="50" cy="42" rx="24" ry="28" fill="${skin}"/>
        <!-- Hair -->
        ${hairPath}
        <!-- Eyes -->
        <ellipse cx="40" cy="42" rx="3.5" ry="4" fill="white"/>
        <ellipse cx="60" cy="42" rx="3.5" ry="4" fill="white"/>
        <circle cx="40.5" cy="42.5" r="2" fill="#1a1a1a"/>
        <circle cx="60.5" cy="42.5" r="2" fill="#1a1a1a"/>
        <circle cx="41" cy="41.5" r="0.8" fill="white"/>
        <circle cx="61" cy="41.5" r="0.8" fill="white"/>
        <!-- Eyebrows -->
        <line x1="35" y1="36" x2="44" y2="37" stroke="${hair}" stroke-width="${ebW}" stroke-linecap="round"/>
        <line x1="56" y1="37" x2="65" y2="36" stroke="${hair}" stroke-width="${ebW}" stroke-linecap="round"/>
        <!-- Nose -->
        <path d="M48 44 Q50 52 52 44" stroke="${skin}" stroke-width="2" fill="none" filter="brightness(0.85)"/>
        <!-- Mouth -->
        <path d="M43 56 Q50 60 57 56" stroke="#a0522d" stroke-width="1.5" fill="none"/>
        <!-- Ears -->
        <ellipse cx="26" cy="44" rx="4" ry="6" fill="${skin}"/>
        <ellipse cx="74" cy="44" rx="4" ry="6" fill="${skin}"/>
        <!-- Facial hair -->
        ${facialHair}
    </svg>`;

    return "data:image/svg+xml," + encodeURIComponent(svg);
}

function getFlagUrl(countryCode) {
    return `https://flagcdn.com/w40/${countryCode}.png`;
}

const CLUBS = [
    // Premier League
    "Arsenal", "Manchester City", "Liverpool", "Chelsea", "Manchester United",
    "Aston Villa", "Tottenham", "Newcastle", "Brighton", "Brentford",
    // La Liga
    "Barcelona", "Real Madrid", "Atl\u00e9tico Madrid", "Athletic Bilbao", "Real Sociedad",
    // Serie A
    "Inter Milan", "AC Milan", "Juventus", "Napoli", "Roma",
    // Bundesliga
    "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", "Stuttgart",
    // Ligue 1
    "Paris Saint-Germain", "Marseille", "Monaco", "Lyon", "Lille"
];

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "CF"];

// Real player names grouped by position with preferred country/club
const REAL_PLAYERS = [
    // Goalkeepers
    { name: "Thibaut Courtois", pos: "GK", club: "Real Madrid", country: "be" },
    { name: "Alisson Becker", pos: "GK", club: "Liverpool", country: "br" },
    { name: "Ederson Moraes", pos: "GK", club: "Manchester City", country: "br" },
    { name: "Marc-André ter Stegen", pos: "GK", club: "Barcelona", country: "de" },
    { name: "Mike Maignan", pos: "GK", club: "AC Milan", country: "fr" },
    { name: "Gianluigi Donnarumma", pos: "GK", club: "Paris Saint-Germain", country: "it" },
    { name: "Jan Oblak", pos: "GK", club: "Atlético Madrid", country: "at" },
    { name: "André Onana", pos: "GK", club: "Manchester United", country: "cm" },
    { name: "Emiliano Martínez", pos: "GK", club: "Aston Villa", country: "ar" },
    { name: "Kasper Schmeichel", pos: "GK", club: "Chelsea", country: "dk" },
    // Centre-backs
    { name: "Virgil van Dijk", pos: "CB", club: "Liverpool", country: "nl" },
    { name: "William Saliba", pos: "CB", club: "Arsenal", country: "fr" },
    { name: "Rúben Dias", pos: "CB", club: "Manchester City", country: "pt" },
    { name: "Gabriel Magalhães", pos: "CB", club: "Arsenal", country: "br" },
    { name: "Alessandro Bastoni", pos: "CB", club: "Inter Milan", country: "it" },
    { name: "Antonio Rüdiger", pos: "CB", club: "Real Madrid", country: "de" },
    { name: "Josko Gvardiol", pos: "CB", club: "Manchester City", country: "hr" },
    { name: "Jules Koundé", pos: "CB", club: "Barcelona", country: "fr" },
    { name: "Kim Min-jae", pos: "CB", club: "Bayern Munich", country: "kr" },
    { name: "Lisandro Martínez", pos: "CB", club: "Manchester United", country: "ar" },
    { name: "Ronald Araújo", pos: "CB", club: "Barcelona", country: "uy" },
    { name: "Niklas Süle", pos: "CB", club: "Borussia Dortmund", country: "de" },
    // Full-backs
    { name: "Trent Alexander-Arnold", pos: "RB", club: "Real Madrid", country: "gb-eng" },
    { name: "Achraf Hakimi", pos: "RB", club: "Paris Saint-Germain", country: "ma" },
    { name: "Kyle Walker", pos: "RB", club: "Manchester City", country: "gb-eng" },
    { name: "Nuno Mendes", pos: "LB", club: "Paris Saint-Germain", country: "pt" },
    { name: "Theo Hernández", pos: "LB", club: "AC Milan", country: "fr" },
    { name: "Andrew Robertson", pos: "LB", club: "Liverpool", country: "gb-sct" },
    { name: "Alphonso Davies", pos: "LB", club: "Real Madrid", country: "ca" },
    { name: "João Cancelo", pos: "RB", club: "Barcelona", country: "pt" },
    // Defensive midfielders
    { name: "Rodri", pos: "CDM", club: "Manchester City", country: "es" },
    { name: "Casemiro", pos: "CDM", club: "Manchester United", country: "br" },
    { name: "Aurélien Tchouaméni", pos: "CDM", club: "Real Madrid", country: "fr" },
    { name: "Declan Rice", pos: "CDM", club: "Arsenal", country: "gb-eng" },
    { name: "Joshua Kimmich", pos: "CDM", club: "Bayern Munich", country: "de" },
    { name: "Frenkie de Jong", pos: "CDM", club: "Barcelona", country: "nl" },
    // Central midfielders
    { name: "Jude Bellingham", pos: "CM", club: "Real Madrid", country: "gb-eng" },
    { name: "Kevin De Bruyne", pos: "CM", club: "Manchester City", country: "be" },
    { name: "Bruno Fernandes", pos: "CM", club: "Manchester United", country: "pt" },
    { name: "Pedri", pos: "CM", club: "Barcelona", country: "es" },
    { name: "Martin Ødegaard", pos: "CM", club: "Arsenal", country: "no" },
    { name: "Jamal Musiala", pos: "CM", club: "Bayern Munich", country: "de" },
    { name: "Florian Wirtz", pos: "CM", club: "Bayer Leverkusen", country: "de" },
    { name: "Dominik Szoboszlai", pos: "CM", club: "Liverpool", country: "at" },
    { name: "Nicolò Barella", pos: "CM", club: "Inter Milan", country: "it" },
    { name: "Bernardo Silva", pos: "CM", club: "Manchester City", country: "pt" },
    // Attacking midfielders
    { name: "Cole Palmer", pos: "CAM", club: "Chelsea", country: "gb-eng" },
    { name: "Desiré Doué", pos: "CAM", club: "Paris Saint-Germain", country: "fr" },
    { name: "Phil Foden", pos: "CAM", club: "Manchester City", country: "gb-eng" },
    { name: "James Maddison", pos: "CAM", club: "Tottenham", country: "gb-eng" },
    // Wingers
    { name: "Kylian Mbappé", pos: "RW", club: "Real Madrid", country: "fr" },
    { name: "Mohamed Salah", pos: "RW", club: "Liverpool", country: "eg" },
    { name: "Vinícius Júnior", pos: "LW", club: "Real Madrid", country: "br" },
    { name: "Bukayo Saka", pos: "RW", club: "Arsenal", country: "gb-eng" },
    { name: "Ousmane Dembélé", pos: "RW", club: "Paris Saint-Germain", country: "fr" },
    { name: "Lamine Yamal", pos: "RW", club: "Barcelona", country: "es" },
    { name: "Khvicha Kvaratskhelia", pos: "LW", club: "Paris Saint-Germain", country: "at" },
    { name: "Raphinha", pos: "LW", club: "Barcelona", country: "br" },
    { name: "Leroy Sané", pos: "LW", club: "Bayern Munich", country: "de" },
    { name: "Jeremy Doku", pos: "LW", club: "Manchester City", country: "be" },
    { name: "Marcus Rashford", pos: "LW", club: "Manchester United", country: "gb-eng" },
    { name: "Son Heung-min", pos: "LW", club: "Tottenham", country: "kr" },
    { name: "Federico Chiesa", pos: "RW", club: "Liverpool", country: "it" },
    // Strikers
    { name: "Erling Haaland", pos: "ST", club: "Manchester City", country: "no" },
    { name: "Harry Kane", pos: "ST", club: "Bayern Munich", country: "gb-eng" },
    { name: "Robert Lewandowski", pos: "ST", club: "Barcelona", country: "pl" },
    { name: "Victor Osimhen", pos: "ST", club: "Napoli", country: "ng" },
    { name: "Darwin Núñez", pos: "ST", club: "Liverpool", country: "uy" },
    { name: "Julián Álvarez", pos: "CF", club: "Atlético Madrid", country: "ar" },
    { name: "Lautaro Martínez", pos: "CF", club: "Inter Milan", country: "ar" },
    { name: "Ollie Watkins", pos: "ST", club: "Aston Villa", country: "gb-eng" },
    { name: "Alexander Isak", pos: "ST", club: "Newcastle", country: "se" },
    { name: "Randal Kolo Muani", pos: "ST", club: "Paris Saint-Germain", country: "fr" },
    { name: "Joao Pedro", pos: "CF", club: "Chelsea", country: "br" },
    { name: "Kai Havertz", pos: "CF", club: "Arsenal", country: "de" },
    { name: "Ivan Toney", pos: "ST", club: "Brentford", country: "gb-eng" },
    { name: "Serhou Guirassy", pos: "ST", club: "Borussia Dortmund", country: "sn" },
    { name: "Jonathan David", pos: "ST", club: "Lille", country: "ca" },
    { name: "Marcus Thuram", pos: "ST", club: "Inter Milan", country: "fr" }
];

// Map country codes back to names for card display
const COUNTRY_MAP = {};
COUNTRIES.forEach(c => { COUNTRY_MAP[c.code] = c; });

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayer(forcePos) {
    // Pick a real player template
    let pool = REAL_PLAYERS;
    if (forcePos) {
        pool = REAL_PLAYERS.filter(p => p.pos === forcePos);
        if (pool.length === 0) pool = REAL_PLAYERS;
    }
    const template = randomFrom(pool);

    const country = COUNTRY_MAP[template.country] || randomFrom(COUNTRIES);
    const rating = weightedRating();
    const tier = rating >= 88 ? "special" : rating >= 80 ? "gold" : rating >= 70 ? "silver" : "bronze";

    const pace = clampStat(rating + randomInt(-12, 12));
    const shooting = clampStat(rating + randomInt(-12, 12));
    const passing = clampStat(rating + randomInt(-12, 12));
    const defending = clampStat(rating + randomInt(-12, 12));

    const player = {
        name: template.name,
        country, club: template.club, pos: template.pos, rating, tier,
        stats: { pace, shooting, passing, defending }
    };
    player.avatar = generateAvatar(player);
    return player;
}

function weightedRating() {
    const r = Math.random();
    if (r < 0.35) return randomInt(60, 69);      // bronze 35%
    if (r < 0.70) return randomInt(70, 79);       // silver 35%
    if (r < 0.92) return randomInt(80, 87);       // gold 22%
    return randomInt(88, 96);                      // special 8%
}

function clampStat(v) {
    return Math.max(40, Math.min(99, v));
}

// --- STATE ---
const state = {
    packsAvailable: 3,
    packsOpenedThisRound: 0,
    cardsPerPack: 5,
    allPlayers: [],       // all collected players (persists across matches)
    selectedPlayers: [],  // current team of 11
    hasTeam: false,       // true once first team is built
    tactic: null,
    cpuPlayers: [],
    cpuTactic: null,
    scoreHome: 0,
    scoreAway: 0,
    matchMinute: 0,
    matchEvents: [],
    wins: 0,
    losses: 0,
    draws: 0
};

// --- DOM REFS ---
const $ = id => document.getElementById(id);

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
}

// --- INTRO ---
$("btn-start").onclick = () => {
    goToPackScreen();
};

function goToPackScreen() {
    showScreen("pack-screen");
    state.packsOpenedThisRound = 0;
    updatePackUI();
    $("pack-cards").innerHTML = "";
    $("pack-box").classList.remove("opened");
    $("btn-next-pack").classList.add("hidden");
    $("btn-build-team").classList.add("hidden");
    $("btn-go-to-tactic").classList.add("hidden");

    // If no packs left, show the box as unavailable
    if (state.packsAvailable <= 0) {
        $("pack-box").classList.add("opened");
        // But still show team buttons if we have a team
        if (state.hasTeam) {
            $("btn-go-to-tactic").classList.remove("hidden");
        }
        if (state.allPlayers.length >= 11) {
            $("btn-build-team").classList.remove("hidden");
        }
    }
}

function updatePackUI() {
    $("packs-opened").textContent = state.packsOpenedThisRound;
    $("packs-total").textContent = state.packsAvailable;
    $("players-collected").textContent = state.allPlayers.length;
}

// --- PACK OPENING ---
$("pack-box").onclick = openPack;

function openPack() {
    if (state.packsAvailable <= 0) return;

    state.packsAvailable--;
    state.packsOpenedThisRound++;
    updatePackUI();
    $("pack-box").classList.add("opened");
    $("pack-cards").innerHTML = "";

    const newCards = [];
    for (let i = 0; i < state.cardsPerPack; i++) {
        const p = generatePlayer();
        newCards.push(p);
        state.allPlayers.push(p);
    }
    updatePackUI();

    newCards.forEach((p, i) => {
        setTimeout(() => {
            $("pack-cards").appendChild(createCardElement(p));
        }, i * 200);
    });

    setTimeout(() => {
        if (state.packsAvailable > 0) {
            $("btn-next-pack").classList.remove("hidden");
        }
        // Show "build team" if enough players and no team yet
        if (state.allPlayers.length >= 11 && !state.hasTeam) {
            $("btn-build-team").classList.remove("hidden");
        }
        // Show "go to tactic" if already has a team
        if (state.hasTeam) {
            $("btn-build-team").classList.remove("hidden");
            $("btn-go-to-tactic").classList.remove("hidden");
        }
    }, state.cardsPerPack * 200 + 300);
}

$("btn-next-pack").onclick = () => {
    $("pack-cards").innerHTML = "";
    $("pack-box").classList.remove("opened");
    $("btn-next-pack").classList.add("hidden");
    $("btn-build-team").classList.add("hidden");
    $("btn-go-to-tactic").classList.add("hidden");
};

$("btn-build-team").onclick = () => {
    showScreen("team-screen");
    buildPlayerPool();
};

$("btn-go-to-tactic").onclick = () => {
    showScreen("tactic-screen");
    showTeamPreview();
};

function createCardElement(p) {
    const card = document.createElement("div");
    card.className = `player-card ${p.tier}`;
    card.innerHTML = `
        <div class="card-top">
            <div class="card-top-left">
                <div class="card-rating">${p.rating}</div>
                <div class="card-position">${p.pos}</div>
                <img class="card-flag" src="${getFlagUrl(p.country.code)}" alt="${p.country.name}" title="${p.country.name}">
            </div>
            <img class="card-avatar" src="${p.avatar}" alt="${p.name}">
        </div>
        <div class="card-name" title="${p.name}">${p.name}</div>
        <div class="card-club">${p.club}</div>
        <div class="card-stats">
            <span>PAC ${p.stats.pace}</span>
            <span>SHO ${p.stats.shooting}</span>
            <span>PAS ${p.stats.passing}</span>
            <span>DEF ${p.stats.defending}</span>
        </div>
    `;
    return card;
}

// --- TEAM SELECTION ---
function buildPlayerPool() {
    // Keep previous selections that still exist in allPlayers
    state.selectedPlayers = state.selectedPlayers.filter(p => state.allPlayers.includes(p));

    const pool = $("player-pool");
    pool.innerHTML = "";
    $("sel-count").textContent = state.selectedPlayers.length;
    $("btn-confirm-team").classList.toggle("hidden", state.selectedPlayers.length !== 11);

    // Sort by rating descending
    const sorted = [...state.allPlayers].sort((a, b) => b.rating - a.rating);

    sorted.forEach((p, idx) => {
        const card = createCardElement(p);
        card.style.cursor = "pointer";
        if (state.selectedPlayers.includes(p)) {
            card.classList.add("selected");
        }
        card.onclick = () => togglePlayer(card, p);
        pool.appendChild(card);
    });
}

function togglePlayer(cardEl, player) {
    const idx = state.selectedPlayers.indexOf(player);
    if (idx >= 0) {
        state.selectedPlayers.splice(idx, 1);
        cardEl.classList.remove("selected");
    } else {
        if (state.selectedPlayers.length >= 11) return;
        state.selectedPlayers.push(player);
        cardEl.classList.add("selected");
    }
    $("sel-count").textContent = state.selectedPlayers.length;
    if (state.selectedPlayers.length === 11) {
        $("btn-confirm-team").classList.remove("hidden");
    } else {
        $("btn-confirm-team").classList.add("hidden");
    }
}

$("btn-confirm-team").onclick = () => {
    state.hasTeam = true;
    showScreen("tactic-screen");
    showTeamPreview();
};

function showTeamPreview() {
    const container = $("your-team-preview");
    container.innerHTML = "";
    state.selectedPlayers.forEach(p => {
        const div = document.createElement("div");
        div.className = "mini-card";
        div.innerHTML = `<img class="mc-avatar" src="${p.avatar}" alt="${p.name}"><div class="mc-rating">${p.rating} ${p.pos}</div><div>${p.name}</div><img class="mc-flag" src="${getFlagUrl(p.country.code)}" alt="${p.country.name}">`;
        container.appendChild(div);
    });
}

// --- TACTIC SELECTION ---
document.querySelectorAll(".btn-tactic").forEach(btn => {
    btn.onclick = () => {
        state.tactic = btn.dataset.tactic;
        generateCPUTeam();
        startMatch();
    };
});

// --- POSITION MAPPING ---
// Base positions on pitch (normalized 0-1 coordinates)
// Home team plays on the left side
const POS_COORDS_HOME = {
    GK:  { x: 0.06, y: 0.50 },
    CB:  { x: 0.18, y: 0.50 },
    LB:  { x: 0.16, y: 0.15 },
    RB:  { x: 0.16, y: 0.85 },
    CDM: { x: 0.30, y: 0.50 },
    CM:  { x: 0.35, y: 0.50 },
    CAM: { x: 0.42, y: 0.50 },
    LW:  { x: 0.43, y: 0.12 },
    RW:  { x: 0.43, y: 0.88 },
    ST:  { x: 0.46, y: 0.50 },
    CF:  { x: 0.44, y: 0.50 }
};

// Categorize positions for balance scoring
const POS_CATEGORY = {
    GK: "def", CB: "def", LB: "def", RB: "def",
    CDM: "mid", CM: "mid", CAM: "mid",
    LW: "atk", RW: "atk", ST: "atk", CF: "atk"
};

function getBalanceMultiplier(players) {
    let def = 0, mid = 0, atk = 0;
    players.forEach(p => {
        const cat = POS_CATEGORY[p.pos];
        if (cat === "def") def++;
        else if (cat === "mid") mid++;
        else atk++;
    });
    // Ideal: at least 1 GK/def, some mid, some atk
    // Penalty for missing categories
    let mult = 1.0;
    if (def === 0) mult -= 0.30; // no defence at all = disaster
    if (mid === 0) mult -= 0.20; // no midfield = bad passing
    if (atk === 0) mult -= 0.25; // no attack = can't score
    // Bonus for good spread (3-5 def, 2-4 mid, 2-4 atk)
    if (def >= 3 && def <= 5 && mid >= 2 && mid <= 4 && atk >= 2 && atk <= 4) {
        mult += 0.10;
    }
    return Math.max(0.3, mult);
}

function generateCPUTeam() {
    state.cpuPlayers = [];
    // CPU always picks a balanced team composition using forcePos
    const cpuPositions = ["GK", "CB", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
    for (let i = 0; i < 11; i++) {
        state.cpuPlayers.push(generatePlayer(cpuPositions[i]));
    }
    state.cpuTactic = randomFrom(["offensive", "defensive", "balanced"]);
}

// --- PRELOAD IMAGES FOR CANVAS ---
function preloadPlayerImages(players) {
    const promises = players.map(p => {
        return new Promise(resolve => {
            // Avatar
            const avatarImg = new Image();
            avatarImg.onload = () => {
                p._avatarImg = avatarImg;
                // Flag
                const flagImg = new Image();
                flagImg.crossOrigin = "anonymous";
                flagImg.onload = () => { p._flagImg = flagImg; resolve(); };
                flagImg.onerror = () => { p._flagImg = null; resolve(); };
                flagImg.src = getFlagUrl(p.country.code);
            };
            avatarImg.onerror = () => { p._avatarImg = null; resolve(); };
            avatarImg.src = p.avatar;
        });
    });
    return Promise.all(promises);
}

// --- MATCH SIMULATION ---
function startMatch() {
    showScreen("match-screen");
    state.scoreHome = 0;
    state.scoreAway = 0;
    state.matchMinute = 0;
    state.matchEvents = [];
    $("score-home").textContent = "0";
    $("score-away").textContent = "0";
    $("match-timer").textContent = "0:00";
    $("match-commentary").textContent = "Kampen er ved at begynde...";

    const canvas = $("pitch");
    canvas.width = 900;
    canvas.height = 560;
    drawPitch();

    // Preload all player images then start
    const allMatchPlayers = [...state.selectedPlayers, ...state.cpuPlayers];
    preloadPlayerImages(allMatchPlayers).then(() => {
        simulateMatch();
    });
}

function getTeamPower(players, tactic) {
    const avgShoot = players.reduce((s, p) => s + p.stats.shooting, 0) / players.length;
    const avgDef = players.reduce((s, p) => s + p.stats.defending, 0) / players.length;
    const avgPace = players.reduce((s, p) => s + p.stats.pace, 0) / players.length;
    const avgPass = players.reduce((s, p) => s + p.stats.passing, 0) / players.length;

    const balance = getBalanceMultiplier(players);

    let attack, defence;
    if (tactic === "offensive") {
        attack = (avgShoot * 1.3 + avgPace * 0.5 + avgPass * 0.4) * balance;
        defence = (avgDef * 0.7 + avgPace * 0.2) * balance;
    } else if (tactic === "defensive") {
        attack = (avgShoot * 0.8 + avgPace * 0.3 + avgPass * 0.3) * balance;
        defence = (avgDef * 1.4 + avgPace * 0.3 + avgPass * 0.3) * balance;
    } else {
        attack = (avgShoot * 1.0 + avgPace * 0.4 + avgPass * 0.4) * balance;
        defence = (avgDef * 1.0 + avgPace * 0.3 + avgPass * 0.3) * balance;
    }

    return { attack, defence, balance };
}

// Assign pitch positions for a team's players
function assignPitchPositions(players, isHome, canvasW, canvasH) {
    // Count how many players share each position for vertical spreading
    const posCounts = {};
    const posIndex = {};
    players.forEach(p => {
        posCounts[p.pos] = (posCounts[p.pos] || 0) + 1;
        posIndex[p.pos] = 0;
    });

    return players.map(p => {
        const base = POS_COORDS_HOME[p.pos] || { x: 0.3, y: 0.5 };
        const count = posCounts[p.pos];
        const idx = posIndex[p.pos]++;

        // Spread vertically if multiple at same position
        let yOffset = 0;
        if (count > 1) {
            const spread = 0.6 / count;
            yOffset = (idx - (count - 1) / 2) * spread;
        }

        let bx = base.x;
        let by = base.y + yOffset;

        // Mirror for away team
        if (!isHome) {
            bx = 1.0 - bx;
        }

        return {
            baseX: bx * canvasW,
            baseY: by * canvasH,
            x: bx * canvasW,
            y: by * canvasH,
            player: p
        };
    });
}

function simulateMatch() {
    const homePower = getTeamPower(state.selectedPlayers, state.tactic);
    const awayPower = getTeamPower(state.cpuPlayers, state.cpuTactic);

    const events = [];
    for (let minute = 1; minute <= 90; minute += randomInt(3, 8)) {
        const r = Math.random();
        const homeChance = homePower.attack / (homePower.attack + awayPower.defence + 40);
        const awayChance = awayPower.attack / (awayPower.attack + homePower.defence + 40);

        if (r < homeChance * 0.35) {
            const scorer = randomFrom(state.selectedPlayers);
            events.push({ minute, type: "goal", team: "home", player: scorer });
        } else if (r < homeChance * 0.35 + awayChance * 0.35) {
            const scorer = randomFrom(state.cpuPlayers);
            events.push({ minute, type: "goal", team: "away", player: scorer });
        } else if (r < 0.5) {
            const team = Math.random() < 0.5 ? "home" : "away";
            const players = team === "home" ? state.selectedPlayers : state.cpuPlayers;
            events.push({ minute, type: "chance", team, player: randomFrom(players) });
        } else if (r < 0.6) {
            const team = Math.random() < 0.5 ? "home" : "away";
            const players = team === "home" ? state.selectedPlayers : state.cpuPlayers;
            events.push({ minute, type: "foul", team, player: randomFrom(players) });
        }
    }

    state.matchEvents = events;
    animateMatch(events);
}

function animateMatch(events) {
    const canvas = $("pitch");
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    let eventIdx = 0;
    let displayMinute = 0;
    const totalSteps = 90;
    const stepTime = 200; // slower: 200ms per minute

    let ballX = w / 2, ballY = h / 2;
    let ballTargetX = ballX, ballTargetY = ballY;

    // Assign positions based on player roles
    const homeDots = assignPitchPositions(state.selectedPlayers, true, w, h);
    const awayDots = assignPitchPositions(state.cpuPlayers, false, w, h);

    function step() {
        displayMinute++;
        if (displayMinute > totalSteps) {
            endMatch();
            return;
        }

        $("match-timer").textContent = `${displayMinute}:00`;

        while (eventIdx < events.length && events[eventIdx].minute <= displayMinute) {
            const evt = events[eventIdx];
            processEvent(evt, homeDots, awayDots, w, h);
            eventIdx++;
        }

        // Move ball
        if (Math.random() < 0.25) {
            ballTargetX = randomInt(40, w - 40);
            ballTargetY = randomInt(30, h - 30);
        }
        ballX += (ballTargetX - ballX) * 0.12;
        ballY += (ballTargetY - ballY) * 0.12;

        // Jiggle players around their base position
        homeDots.forEach(d => {
            d.x = d.baseX + (Math.sin(displayMinute * 0.3 + d.baseY * 0.1) * 12) + randomInt(-3, 3);
            d.y = d.baseY + (Math.cos(displayMinute * 0.25 + d.baseX * 0.1) * 8) + randomInt(-2, 2);
            d.x = Math.max(20, Math.min(w / 2 - 10, d.x));
            d.y = Math.max(20, Math.min(h - 20, d.y));
        });
        awayDots.forEach(d => {
            d.x = d.baseX + (Math.sin(displayMinute * 0.3 + d.baseY * 0.1) * 12) + randomInt(-3, 3);
            d.y = d.baseY + (Math.cos(displayMinute * 0.25 + d.baseX * 0.1) * 8) + randomInt(-2, 2);
            d.x = Math.max(w / 2 + 10, Math.min(w - 20, d.x));
            d.y = Math.max(20, Math.min(h - 20, d.y));
        });

        drawMatch(ctx, canvas, homeDots, awayDots, ballX, ballY);
        setTimeout(step, stepTime);
    }

    step();
}

function processEvent(evt, homeDots, awayDots, w, h) {
    const teamLabel = evt.team === "home" ? "DIT HOLD" : "MODSTANDER";
    let text = "";

    if (evt.type === "goal") {
        if (evt.team === "home") {
            state.scoreHome++;
            $("score-home").textContent = state.scoreHome;
            // Ball flies to away goal
        } else {
            state.scoreAway++;
            $("score-away").textContent = state.scoreAway;
        }
        text = `\u26bd ${evt.minute}' MÅL! ${evt.player.name} (${teamLabel}) scorer!`;
    } else if (evt.type === "chance") {
        const msgs = [
            `${evt.minute}' ${evt.player.name} (${teamLabel}) skyder - reddet!`,
            `${evt.minute}' Tæt på! ${evt.player.name} (${teamLabel}) rammer stolpen!`,
            `${evt.minute}' ${evt.player.name} (${teamLabel}) skyder forbi!`
        ];
        text = randomFrom(msgs);
    } else if (evt.type === "foul") {
        text = `${evt.minute}' Frispark! ${evt.player.name} (${teamLabel}) laver foul.`;
    }

    $("match-commentary").textContent = text;
}

function drawPitch(canvas, ctx) {
    if (!canvas) canvas = $("pitch");
    if (!ctx) ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;

    // Grass with stripes
    ctx.fillStyle = "#1a6b30";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 60) {
        ctx.fillStyle = i % 120 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
        ctx.fillRect(i, 0, 60, h);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;

    // Outline
    ctx.strokeRect(10, 10, w - 20, h - 20);
    // Center line
    ctx.beginPath();
    ctx.moveTo(w / 2, 10);
    ctx.lineTo(w / 2, h - 10);
    ctx.stroke();
    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 55, 0, Math.PI * 2);
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
    // Penalty areas
    ctx.strokeRect(10, h / 2 - 90, 120, 180);
    ctx.strokeRect(w - 130, h / 2 - 90, 120, 180);
    // Goal areas
    ctx.strokeRect(10, h / 2 - 45, 50, 90);
    ctx.strokeRect(w - 60, h / 2 - 45, 50, 90);
    // Goals
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, h / 2 - 35, 10, 70);
    ctx.fillRect(w - 10, h / 2 - 35, 10, 70);
    ctx.strokeRect(0, h / 2 - 35, 10, 70);
    ctx.strokeRect(w - 10, h / 2 - 35, 10, 70);
    // Corner arcs
    ctx.beginPath(); ctx.arc(10, 10, 15, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - 10, 10, 15, Math.PI / 2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, h - 10, 15, -Math.PI / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - 10, h - 10, 15, Math.PI, Math.PI * 1.5); ctx.stroke();
}

const AVATAR_SIZE = 30;
const FLAG_W = 18;
const FLAG_H = 12;

function drawPlayerDot(ctx, d, teamColor, borderColor) {
    const p = d.player;
    const ax = d.x - AVATAR_SIZE / 2;
    const ay = d.y - AVATAR_SIZE / 2 - 8;

    // Shadow under player
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + AVATAR_SIZE / 2 - 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();

    // Draw avatar image
    if (p._avatarImg) {
        ctx.save();
        // Clip to circle
        ctx.beginPath();
        ctx.arc(d.x, d.y - 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(p._avatarImg, ax, ay, AVATAR_SIZE, AVATAR_SIZE);
        ctx.restore();
        // Circle border
        ctx.beginPath();
        ctx.arc(d.x, d.y - 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
    } else {
        // Fallback colored circle
        ctx.beginPath();
        ctx.arc(d.x, d.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = teamColor;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Flag below avatar
    if (p._flagImg) {
        const fx = d.x - FLAG_W / 2;
        const fy = d.y + AVATAR_SIZE / 2 - 6;
        ctx.drawImage(p._flagImg, fx, fy, FLAG_W, FLAG_H);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(fx, fy, FLAG_W, FLAG_H);
    }

    // Position label
    ctx.font = "bold 8px Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeText(p.pos, d.x, d.y + AVATAR_SIZE / 2 + 8 + FLAG_H);
    ctx.fillText(p.pos, d.x, d.y + AVATAR_SIZE / 2 + 8 + FLAG_H);
}

function drawMatch(ctx, canvas, homeDots, awayDots, bx, by) {
    drawPitch(canvas, ctx);

    // Draw home players (green border)
    homeDots.forEach(d => drawPlayerDot(ctx, d, "#48ff48", "#2aaa2a"));

    // Draw away players (red border)
    awayDots.forEach(d => drawPlayerDot(ctx, d, "#ff4848", "#aa2a2a"));

    // Ball with glow
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function endMatch() {
    $("match-timer").textContent = "90:00 - FLØJT!";

    setTimeout(() => {
        showScreen("result-screen");

        const won = state.scoreHome > state.scoreAway;
        const lost = state.scoreHome < state.scoreAway;

        if (won) {
            state.wins++;
            state.packsAvailable++; // Bonus pack for winning!
            $("result-title").textContent = "DU VANDT!";
            $("result-title").style.color = "#48ff48";
        } else if (lost) {
            state.losses++;
            $("result-title").textContent = "DU TABTE!";
            $("result-title").style.color = "#ff4848";
        } else {
            state.draws++;
            $("result-title").textContent = "UAFGJORT!";
            $("result-title").style.color = "#f5c518";
        }
        $("result-score").textContent = `${state.scoreHome} - ${state.scoreAway}`;

        const avgYour = (state.selectedPlayers.reduce((s, p) => s + p.rating, 0) / 11).toFixed(1);
        const avgCpu = (state.cpuPlayers.reduce((s, p) => s + p.rating, 0) / 11).toFixed(1);

        const goalScorers = state.matchEvents
            .filter(e => e.type === "goal")
            .map(e => `${e.minute}' ${e.player.name} (${e.team === "home" ? "Dig" : "Modstander"})`)
            .join("<br>");

        const tacticDa = { offensive: "Offensiv", defensive: "Defensiv", balanced: "Balanceret" };
        const yourBalance = getBalanceMultiplier(state.selectedPlayers);
        const balancePct = Math.round(yourBalance * 100);
        const balanceLabel = balancePct >= 100 ? "Perfekt!" : balancePct >= 80 ? "God" : balancePct >= 60 ? "OK" : "Dårlig";

        let def = 0, mid = 0, atk = 0;
        state.selectedPlayers.forEach(p => {
            const cat = POS_CATEGORY[p.pos];
            if (cat === "def") def++;
            else if (cat === "mid") mid++;
            else atk++;
        });

        let bonusText = "";
        if (won) {
            bonusText = `<p style="color:#48ff48;font-weight:bold;margin-top:8px">Du vandt en bonus-pakke! (${state.packsAvailable} pakke${state.packsAvailable !== 1 ? "r" : ""} klar)</p>`;
        }

        $("result-details").innerHTML = `
            <p>Din taktik: <strong>${tacticDa[state.tactic]}</strong> | Modstanders taktik: <strong>${tacticDa[state.cpuTactic]}</strong></p>
            <p>Dit holds gns.: <strong>${avgYour}</strong> | Modstanders gns.: <strong>${avgCpu}</strong></p>
            <p>Holdbalance: <strong>${balanceLabel} (${balancePct}%)</strong> — Forsvar: ${def} | Midtbane: ${mid} | Angreb: ${atk}</p>
            ${goalScorers ? `<p style="margin-top:10px"><strong>Mål:</strong><br>${goalScorers}</p>` : "<p>Ingen mål scoret.</p>"}
            ${bonusText}
            <p style="margin-top:8px;color:#8899aa">Rekord: ${state.wins}V - ${state.draws}U - ${state.losses}T</p>
        `;

        // Show/hide buttons based on packs available
        $("btn-open-pack").classList.toggle("hidden", state.packsAvailable <= 0);
        $("btn-play-again").classList.remove("hidden");
        $("btn-change-team").classList.remove("hidden");
    }, 1500);
}

// --- POST-MATCH BUTTONS ---
$("btn-play-again").onclick = () => {
    showScreen("tactic-screen");
    showTeamPreview();
};

$("btn-open-pack").onclick = () => {
    goToPackScreen();
};

$("btn-change-team").onclick = () => {
    showScreen("team-screen");
    buildPlayerPool();
};

// --- INIT ---
drawPitch();
