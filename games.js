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