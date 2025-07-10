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
        const positions = {
            left: 50,
            center: (gameWidth / 2) - (playerWidth / 2),
            right: gameWidth - playerWidth - 50
        };

        let playerHp, botHp, playerMissiles, botMissiles, playerPosition, gameOver;
        let botMoveInterval, botShootInterval, gameLoopInterval;

        // --- Core Game Functions ---

        function initializeGameState() {
            playerHp = 10;
            botHp = 10;
            playerMissiles = 30;
            botMissiles = 30;
            playerPosition = 'center';
            gameOver = false;
            
            player.css('left', positions.center + 'px');
            bot.css('left', positions.center + 'px');
            
            updateHpDisplays();
            updateMissileDisplays();
        }

        function startGame() {
            initializeGameState();

            buttonsContainer.show();
            startButton.css('top', '50%').hide(); // Reset button position and hide
            gameOverMessage.hide();

            $('#move-left-button, #move-right-button, #fire-button').prop('disabled', false).css('cursor', 'pointer');

            clearInterval(botMoveInterval);
            clearInterval(botShootInterval);
            clearInterval(gameLoopInterval);

            botMoveInterval = setInterval(moveBot, 2000);
            botShootInterval = setInterval(shootBot, 1500);
            gameLoopInterval = setInterval(gameLoop, 50);
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

        function movePlayer(direction) {
            if (gameOver) return;
            if (direction === 'left') {
                playerPosition = 'left';
                player.animate({ left: positions.left + 'px' }, 200);
            } else if (direction === 'right') {
                playerPosition = 'right';
                player.animate({ left: positions.right + 'px' }, 200);
            } else if (direction === 'center') {
                playerPosition = 'center';
                player.animate({ left: positions.center + 'px' }, 200);
            }
        }
        
        function moveBot() {
            if (gameOver) return;
            const rand = Math.random();
            if (rand < 0.33) {
                bot.animate({ left: positions.left + 'px' }, 500);
            } else if (rand < 0.66) {
                bot.animate({ left: positions.center + 'px' }, 500);
            } else {
                bot.animate({ left: positions.right + 'px' }, 500);
            }
        }

        function shootBot() {
            if (gameOver || botMissiles <= 0) return;
            botMissiles--;
            updateMissileDisplays();
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

            $('.missile:not(.bot-missile)').each(function() {
                const missile = $(this);
                if (checkCollision(missile, bot)) {
                    missile.remove();
                    botHp--;
                    updateHpDisplays();
                    if (botHp <= 0) endGame(true);
                }
            });

            $('.bot-missile').each(function() {
                const missile = $(this);
                if (checkCollision(missile, player)) {
                    missile.remove();
                    playerHp--;
                    updateHpDisplays();
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
            $('#bot-missiles').text('Ammo: ' + botMissiles);
        }

        // --- Event Handlers ---

        $('#move-left-button').on('click', function() {
            if (playerPosition === 'right') movePlayer('center');
            else if (playerPosition === 'center') movePlayer('left');
        });

        $('#move-right-button').on('click', function() {
            if (playerPosition === 'left') movePlayer('center');
            else if (playerPosition === 'center') movePlayer('right');
        });

        $('#fire-button').on('click', function() {
            if (gameOver || playerMissiles <= 0) return;
            playerMissiles--;
            updateMissileDisplays();
            createMissile(player.position().left + playerWidth / 2, player.position().top, true);
        });

        $(document).on('keydown', function(e) {
            if (gameOver) return;
            switch (e.code) {
                case 'ArrowLeft':
                    if (playerPosition === 'right') movePlayer('center');
                    else if (playerPosition === 'center') movePlayer('left');
                    break;
                case 'ArrowRight':
                    if (playerPosition === 'left') movePlayer('center');
                    else if (playerPosition === 'center') movePlayer('right');
                    break;
                case 'Space':
                    e.preventDefault();
                    $('#fire-button').trigger('click');
                    break;
            }
        });

        startButton.on('click', startGame);
    });