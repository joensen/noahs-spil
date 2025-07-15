$(document).ready(function() {
    const gameContainer = $('#game-container');
    const ball = $('#ball');
    const playerPaddle = $('#player-paddle');
    const botPaddle = $('#bot-paddle');
    const wall1 = $('#wall1');
    const wall2 = $('#wall2');
    const levelDisplay = $('#level');
    const startButton = $('#start-button');
    const gameOverScreen = $('#game-over');
    const restartButton = $('#restart-button');
    const levelUpDisplay = $('#level-up');

    const initialBallSpeed = 3;
    const initialBotSpeed = 2;
    const playerPaddleSpeed = 15;

    let ballSpeedX, ballSpeedY, gameInterval, currentLevel, botSpeed;

    function initializeGame() {
        gameOverScreen.hide();
        startButton.hide();

        currentLevel = 1;
        levelDisplay.text(currentLevel);
        botSpeed = initialBotSpeed;
        ballSpeedX = initialBallSpeed;
        ballSpeedY = -initialBallSpeed; // Start moving up

        playerPaddle.css('left', '350px');
        resetBall();

        gameInterval = setInterval(gameLoop, 16);
    }

    function gameLoop() {
        moveBall();
        moveBot();
        checkCollisions();
    }

    function moveBall() {
        let currentLeft = parseInt(ball.css('left'));
        let currentTop = parseInt(ball.css('top'));
        ball.css('left', currentLeft + ballSpeedX);
        ball.css('top', currentTop + ballSpeedY);
    }

    function moveBot() {
        let ballCenter = parseInt(ball.css('left')) + (ball.width() / 2);
        let botCenter = parseInt(botPaddle.css('left')) + (botPaddle.width() / 2);
        let randomFactor = (Math.random() - 0.5) * 60;

        if (ballCenter + randomFactor < botCenter) {
            botPaddle.css('left', parseInt(botPaddle.css('left')) - botSpeed);
        } else if (ballCenter + randomFactor > botCenter) {
            botPaddle.css('left', parseInt(botPaddle.css('left')) + botSpeed);
        }
    }

    function checkCollisions() {
        let ballPos = ball.position();
        let containerWidth = gameContainer.width();
        let containerHeight = gameContainer.height();

        if (ballPos.left <= 0 || ballPos.left >= containerWidth - ball.width()) {
            ballSpeedX *= -1;
        }

        if (isColliding(ball, playerPaddle) || isColliding(ball, botPaddle)) {
            ballSpeedY *= -1;
        }

        if (isColliding(ball, wall1) || isColliding(ball, wall2)) {
            ballSpeedY *= -1;
        }

        if (ballPos.top <= 0) {
            levelUp();
            resetBall();
        }

        if (ballPos.top >= containerHeight - ball.height()) {
            gameOver();
        }
    }

    function isColliding(div1, div2) {
        let d1_offset = div1.offset();
        let d1_height = div1.outerHeight(true);
        let d1_width = div1.outerWidth(true);
        let d1_distance_from_top = d1_offset.top + d1_height;
        let d1_distance_from_left = d1_offset.left + d1_width;

        let d2_offset = div2.offset();
        let d2_height = div2.outerHeight(true);
        let d2_width = div2.outerWidth(true);
        let d2_distance_from_top = d2_offset.top + d2_height;
        let d2_distance_from_left = d2_offset.left + d2_width;

        return !(d1_distance_from_top < d2_offset.top || d1_offset.top > d2_distance_from_top || d1_distance_from_left < d2_offset.left || d1_offset.left > d2_distance_from_left);
    }

    function resetBall() {
        ball.css({ 'top': '290px', 'left': '390px' });
        ballSpeedY *= -1;
    }

    function levelUp() {
        currentLevel++;
        levelDisplay.text(currentLevel);
        botSpeed += 0.5;
        ballSpeedX = Math.sign(ballSpeedX) * (Math.abs(ballSpeedX) + 0.2);
        ballSpeedY = Math.sign(ballSpeedY) * (Math.abs(ballSpeedY) + 0.2);
        
        levelUpDisplay.text(`Level ${currentLevel}`).show();
        setTimeout(() => levelUpDisplay.hide(), 1000);
    }

    function gameOver() {
        clearInterval(gameInterval);
        gameOverScreen.show();
    }

    // Mouse Controls
    gameContainer.on('mousemove', function(e) {
        let mouseX = e.pageX - gameContainer.offset().left;
        let newLeft = mouseX - (playerPaddle.width() / 2);
        if (newLeft >= 0 && newLeft <= gameContainer.width() - playerPaddle.width()) {
            playerPaddle.css('left', newLeft);
        }
    });

    // Keyboard Controls
    $(document).on('keydown', function(e) {
        let currentLeft = parseInt(playerPaddle.css('left'));
        if (e.key === 'ArrowLeft') {
            let newLeft = currentLeft - playerPaddleSpeed;
            if (newLeft >= 0) {
                playerPaddle.css('left', newLeft);
            }
        } else if (e.key === 'ArrowRight') {
            let newLeft = currentLeft + playerPaddleSpeed;
            if (newLeft <= gameContainer.width() - playerPaddle.width()) {
                playerPaddle.css('left', newLeft);
            }
        }
    });

    startButton.on('click', initializeGame);
    restartButton.on('click', initializeGame);
});