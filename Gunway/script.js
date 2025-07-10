$(document).ready(function() {
        // --- DOM Elements ---
        const gameContainer = $('#game-container');
        const player = $('#player');
        const bot = $('#bot');
        const startButton = $('#start-button');
        const buttonsContainer = $('.buttons-container');
        const gameOverMessage = $('#game-over-message');

        // --- Game Settings & State ---
        const gameWidth = gameContainer.width();
        const playerWidth = player.width();
        
        let playerHp, botHp, playerMissiles, gameOver;
        let botMoveInterval, botShootInterval, gameLoopInterval;
        let keys = {};
        let isBotShooting = true;
        let canPlayerShoot = true; // New variable for player cooldown
        const playerShootCooldown = 200; // 200ms cooldown

        // --- Core Game Functions ---

        function initializeGameState() {
            playerHp = 20;
            botHp = 20;
            playerMissiles = 50;
            gameOver = false;
            canPlayerShoot = true; // Reset cooldown on game start
            
            player.css('left', (gameWidth / 2) - (playerWidth / 2) + 'px');
            bot.css('left', (gameWidth / 2) - (playerWidth / 2) + 'px');
            
            updateHpDisplays();
            updateMissileDisplays();
        }

        function toggleBotShooting() {
            isBotShooting = !isBotShooting;
            // Shoot for 2 seconds, pause for 1 second
            const nextToggle = isBotShooting ? 3000 : 250;
            setTimeout(toggleBotShooting, nextToggle);
        }

        function startGame() {
            initializeGameState();

            buttonsContainer.show();
            $('#move-left-button, #move-right-button').hide();
            startButton.css('top', '50%').hide(); // Reset button position and hide
            gameOverMessage.hide();

            $('#fire-button').prop('disabled', false).css('cursor', 'pointer');

            clearInterval(botMoveInterval);
            clearInterval(botShootInterval);
            clearInterval(gameLoopInterval);

            botMoveInterval = setInterval(moveBot, 2000);
            botShootInterval = setInterval(shootBot, 100);
            gameLoopInterval = setInterval(gameLoop, 16); // ~60 FPS
            
            // Start the shooting cycle
            isBotShooting = true;
            setTimeout(toggleBotShooting, 2000);
        }

        function endGame(playerWon) {
            if (gameOver) return;
            gameOver = true;

            clearInterval(botMoveInterval);
            clearInterval(botShootInterval);
            clearInterval(gameLoopInterval);

            const message = playerWon ? "You Win!" : "Game Over";
            gameOverMessage.text(message).fadeIn();
            
            buttonsContainer.hide();
            startButton.text('Restart').css('top', '65%').show(); // Move button down
        }

        // --- Player & Bot Actions ---
        
        function moveBot() {
            if (gameOver) return;
            const playerX = player.position().left;
            bot.animate({ left: playerX + 'px' }, 1000);
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
                if (startButton.is(':visible')) {
                    startButton.trigger('click');
                }
            }
            if (e.code === 'Space') {
                e.preventDefault();
                $('#fire-button').trigger('click');
            }
        });

        $(document).on('keyup', function(e) {
            keys[e.code] = false;
        });

        startButton.on('click', startGame);
    });