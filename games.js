const games = [
    {
        title: "Gunway",
        description: "A fast-paced space shooter where you defend against an onslaught of enemy missiles.",
        folder: "Gunway",
        screenshot: "Gunway/screenshot.png"
    },
    {
        title: "Killing Mobs",
        description: "A top-down tower defense shooter where you defend a central house against waves of monsters.",
        folder: "KillingMobs",
        screenshot: "KillingMobs/screenshot.png"
    },
    {
        title: "BrickBlast",
        description: "A Pong-style game where you control a paddle to hit a ball against a bot.",
        folder: "brickblast",
        screenshot: "brickblast/screenshot.png"
    },
    {
        title: "Kryds og Bolle",
        description: "Play tic-tac-toe against a smart AI opponent. Can you beat the computer?",
        folder: "KrydsOgBolle",
        screenshot: "KrydsOgBolle/screenshot.png"
    },
    {
        title: "Firewall",
        description: "Red mennesker fra brændende bygninger! Styr brandmanden med piletasterne og red alle i tide.",
        folder: "Firewall",
        screenshot: "Firewall/screenshot.png"
    },
    {
        title: "Star Runner",
        description: "Navigate a 3D maze in first-person view. Collect stars and escape! Bonus points for speed!",
        folder: "StarRunner",
        screenshot: "StarRunner/screenshot.png"
    },
    {
        title: "Police Chase",
        description: "Kør politibil i 3D og jag forbrydere gennem byen! Fang dem alle!",
        folder: "PoliceChase",
        screenshot: "PoliceChase/screenshot.png"
    },
    {
        title: "Star Map",
        description: "Connect the stars to discover all 90 constellations in this 3D sky puzzle!",
        folder: "StarMap",
        screenshot: "StarMap/screenshot.png"
    },
    {
        title: "P2P Snake Battle",
        description: "Multiplayer snake game - no server needed! Connect with a friend and battle to survive!",
        folder: "Snake",
        screenshot: "Snake/screenshot.png"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const gameGrid = document.getElementById('game-grid');

    games.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.classList.add('game-card');
        gameCard.onclick = () => {
            window.location.href = game.folder;
        };

        gameCard.innerHTML = `
            <img src="${game.screenshot}" alt="${game.title} Screenshot">
            <div class="game-info">
                <h2>${game.title}</h2>
                <p>${game.description}</p>
            </div>
        `;

        gameGrid.appendChild(gameCard);
    });
});