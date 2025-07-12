$(document).ready(function() {
        // --- DOM Elements ---
        const gameContainer = $('#game-container');
        const player = $('#player');
        const bot = $('#bot');
        const buttonsContainer = $('.buttons-container');
        const gameOverMessage = $('#game-over-message');
        const difficultySelection = $('#difficulty-selection');
        const easyButton = $('#easy-button');
        const mediumButton = $('#medium-button');
        const hardButton = $('#hard-button');

        // --- Game Settings & State ---
        const gameWidth = gameContainer.width();
        const playerWidth = player.width();
        
        let playerHp, botHp, playerMissiles, gameOver;
        let botMoveInterval, botShootInterval, gameLoopInterval;
        let keys = {};
        let isBotShooting = true;
        let canPlayerShoot = true; // New variable for player cooldown
        const playerShootCooldown = 200; // 200ms cooldown
        let currentDifficulty = 'medium'; // Default difficulty

        // --- Core Game Functions ---

        function initializeGameState() {
            playerHp = 20;
            botHp = 20;
            playerMissiles = 30;
            gameOver = false;
            canPlayerShoot = true; // Reset cooldown on game start
            
            player.css('left', (gameWidth / 2) - (playerWidth / 2) + 'px');
            bot.css('left', (gameWidth / 2) - (playerWidth / 2) + 'px');
            
            updateHpDisplays();
            updateMissileDisplays();
        }

        function toggleBotShooting() {
            isBotShooting = !isBotShooting;
            // Shoot for 3 seconds, pause for 250ms
            let shootDuration = 3000;
            let pauseDuration = 500;

            if (currentDifficulty === 'easy') {
                shootDuration = 2000; // Bot shoots for shorter duration
                pauseDuration = 1000; // Bot pauses for longer duration
            } else if (currentDifficulty === 'hard') {
                shootDuration = 4000; // Bot shoots for longer duration
                pauseDuration = 0;    // No pause for hard
            }

            const nextToggle = isBotShooting ? shootDuration : pauseDuration;
            setTimeout(toggleBotShooting, nextToggle);
        }

        function startGame() {
            initializeGameState();
            gameOverMessage.removeClass('win');
            player.show();
            bot.show();

            buttonsContainer.show();
            $('#move-left-button, #move-right-button').hide();
            gameOverMessage.hide();
            difficultySelection.hide();

            $('#fire-button').prop('disabled', false).css('cursor', 'pointer');

            clearInterval(botMoveInterval);
            clearInterval(botShootInterval);
            clearInterval(gameLoopInterval);

            let botMoveSpeed = 2000;
            if (currentDifficulty === 'hard') {
                botMoveSpeed = 500; // Faster bot movement for hard
            }

            let botShootSpeed = 100;
            if (currentDifficulty === 'easy') {
                botShootSpeed = 400; // Slower bot shooting for easy
            }

            botMoveInterval = setInterval(moveBot, botMoveSpeed);
            botShootInterval = setInterval(shootBot, botShootSpeed);
            gameLoopInterval = setInterval(gameLoop, 16); // ~60 FPS
            
            // Start the shooting cycle
            isBotShooting = true;
            let initialBotPause = 2000;
            if (currentDifficulty === 'easy') {
                initialBotPause = 4000; // Longer pause for easy
            } else if (currentDifficulty === 'hard') {
                initialBotPause = 0; // No initial pause for hard
            }
            setTimeout(toggleBotShooting, initialBotPause);
        }

        function endGame(playerWon) {
            if (gameOver) return;
            gameOver = true;

            clearInterval(botMoveInterval);
            clearInterval(botShootInterval);
            clearInterval(gameLoopInterval);

            player.stop(true, true);
            bot.stop(true, true);

            const message = playerWon ? "You Win!" : "Game Over";
            gameOverMessage.text(message);

            if (playerWon) {
                gameOverMessage.addClass('win');
                createFireworks();
                const pos = bot.position();
                bot.hide();
                createExplosion(pos.left, pos.top);
            } else {
                const pos = player.position();
                player.hide();
                createExplosion(pos.left, pos.top);
            }
            playSound('explosion-sound');

            gameOverMessage.fadeIn();
            
            buttonsContainer.hide();
            difficultySelection.show();
        }

        function createExplosion(x, y) {
            const explosion = $('<div class="explosion"></div>');
            explosion.css({ left: (x + 10) + 'px', top: (y + 10) + 'px' });
            gameContainer.append(explosion);

            for (let i = 0; i < 30; i++) {
                const particle = $('<div class="particle"></div>');
                const angle = Math.random() * 360;
                const distance = Math.random() * 100 + 50;
                const particleX = Math.cos(angle) * distance;
                const particleY = Math.sin(angle) * distance;

                particle.css({
                    'left': '50px',
                    'top': '50px',
                    '--x': particleX + 'px',
                    '--y': particleY + 'px'
                });

                explosion.append(particle);
            }

            setTimeout(() => {
                explosion.remove();
            }, 3000);
        }

        function createFireworks() {
            const fireworksContainer = gameContainer;
            for (let i = 0; i < 30; i++) {
                const firework = $('<div class="firework"></div>');
                const x = Math.random() * gameContainer.width();
                const y = Math.random() * gameContainer.height();
                firework.css({
                    left: x + 'px',
                    top: y + 'px'
                });
                fireworksContainer.append(firework);
                setTimeout(() => {
                    firework.remove();
                }, 1000);
            }
        }

        // --- Player & Bot Actions ---
        
        function moveBot() {
            if (gameOver) return;
            const playerX = player.position().left;
            let botMoveAnimationSpeed = 1000;
            if (currentDifficulty === 'hard') {
                botMoveAnimationSpeed = 500; // Faster bot animation for hard
            }
            bot.animate({ left: playerX + 'px' }, botMoveAnimationSpeed);
        }

        function shootBot() {
            if (gameOver || !isBotShooting) return;
            
            createMissile(bot.position().left + bot.width() / 2 - 5, bot.position().top + bot.height(), false);
        }

        function createMissile(x, y, isPlayerMissile) {
            const missile = $('<div class="missile"></div>');
            if (!isPlayerMissile) {
                missile.addClass('bot-missile');
            }
            missile.css({ left: x + 'px', top: y + 'px' });
            gameContainer.append(missile);

            const targetY = isPlayerMissile ? -30 : gameContainer.height() + 30;
            missile.animate({ top: targetY + 'px' }, 2000, 'linear', function() {
                missile.remove();
            });
        }

        // --- Game Loop & Collision ---

        function gameLoop() {
            if (gameOver) return;

            // Player Movement
            let playerSpeed = 15;
            let currentPos = parseInt(player.css('left'));

            if (keys['ArrowLeft'] && currentPos > 0) {
                player.css('left', Math.max(0, currentPos - playerSpeed) + 'px');
            }
            if (keys['ArrowRight'] && currentPos < gameWidth - playerWidth) {
                player.css('left', Math.min(gameWidth - playerWidth, currentPos + playerSpeed) + 'px');
            }

            $('.missile:not(.bot-missile)').each(function() {
                const missile = $(this);
                if (checkCollision(missile, bot)) {
                    missile.remove();
                    botHp--;
                    updateHpDisplays();
                    bot.addClass('bot-hit');
                    playSound('hit-bot-sound');
                    setTimeout(() => bot.removeClass('bot-hit'), 200);
                    if (botHp <= 0) endGame(true);
                }
            });

            $('.bot-missile').each(function() {
                const missile = $(this);
                if (checkCollision(missile, player)) {
                    missile.remove();
                    playerHp--;
                    updateHpDisplays();
                    player.addClass('hit');
                    playSound('hit-player-sound');
                    setTimeout(() => player.removeClass('hit'), 200);
                    if (playerHp <= 0) endGame(false);
                }
            });

            if (playerMissiles <= 0 && $('.missile:not(.bot-missile)').length === 0 && botHp > 0) {
                endGame(false);
            }
        }

        function checkCollision(el1, el2) {
            if (!el1 || !el2 || el1.length === 0 || el2.length === 0) return false;
            const pos1 = el1.offset();
            const pos2 = el2.offset();
            const rect1 = { x: pos1.left, y: pos1.top, width: el1.width(), height: el1.height() };
            const rect2 = { x: pos2.left, y: pos2.top, width: el2.width(), height: el2.height() };
            return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
        }

        function playSound(soundId) {
            const sound = document.getElementById(soundId);
            if (sound) {
                sound.currentTime = 0;
                sound.play();
            }
        }

        // --- UI Updates ---

        function updateHpDisplays() {
            $('#player-hp').text('HP: ' + playerHp);
            $('#bot-hp').text('HP: ' + botHp);
        }

        function updateMissileDisplays() {
            $('#player-missiles').text('Ammo: ' + playerMissiles);
        }

        // --- Event Handlers ---

        $('#fire-button').on('click', function() {
            if (gameOver || playerMissiles <= 0 || !canPlayerShoot) return;
            canPlayerShoot = false;
            setTimeout(() => {
                canPlayerShoot = true;
            }, playerShootCooldown);
            playerMissiles--;
            updateMissileDisplays();
            createMissile(player.position().left + player.width() / 2 - 10, player.position().top, true);
        });

        $(document).on('keydown', function(e) {
            keys[e.code] = true;
            if (e.code === 'Enter') {
                e.preventDefault();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                $('#fire-button').trigger('click');
            }
        });

        $(document).on('keyup', function(e) {
            keys[e.code] = false;
        });

        easyButton.on('click', function() {
            currentDifficulty = 'easy';
            startGame();
        });

        mediumButton.on('click', function() {
            currentDifficulty = 'medium';
            startGame();
        });

        hardButton.on('click', function() {
            currentDifficulty = 'hard';
            startGame();
        });
    });