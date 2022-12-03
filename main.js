console.log("Game loaded");
const snakeHeadStyle = "#ff0000";
const snakeBodyStyle = "#d00000";
const foodStyle = "#00e000";
const gameOverTextStyle = "#b0a0b0";

const game_canvas = document.getElementById("game_canvas")
const game_canvas_ctx = game_canvas.getContext("2d");

class GameBoard {
    constructor() {
        this.width = 40;
        this.height = 40;
    }

    isInBound(coord) {
        return coord.x < 0 || coord.x >= this.width
            || coord.y < 0 || coord.y >= this.height;
    }
}

let game_board = new GameBoard();

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    isEqualTo(coord) {
        return this.x == coord.x && this.y == coord.y;
    }
}

function drawBoardRect(coord, style) {
    const { width, height } = game_canvas.getBoundingClientRect();
    const rect_width_real = width / game_board.width;
    const rect_width = Math.ceil(rect_width_real);
    const rect_height_real = height / game_board.height;
    const rect_height = Math.ceil(rect_height_real);

    game_canvas_ctx.beginPath();
    game_canvas_ctx.fillStyle = style;
    game_canvas_ctx.fillRect(
        rect_width_real * coord.x,
        rect_height_real * coord.y,
        rect_width,
        rect_height,
    );
    game_canvas_ctx.stroke();
};

function clearBoard() {
    game_canvas_ctx.clearRect(0, 0, game_canvas.width, game_canvas.height);
};

const SnakeDirection = Object.freeze({
    UP: Symbol('UP'),
    DOWN: Symbol('DOWN'),
    RIGHT: Symbol('RIGHT'),
    LEFT: Symbol('LEFT'),
});

function isOpositDirection(dir_l, dir_r) {
    if (dir_l == SnakeDirection.UP && dir_r == SnakeDirection.DOWN)
        return true;
    if (dir_l == SnakeDirection.DOWN && dir_r == SnakeDirection.UP)
        return true;
    if (dir_l == SnakeDirection.LEFT && dir_r == SnakeDirection.RIGHT)
        return true;
    if (dir_l == SnakeDirection.RIGHT && dir_r == SnakeDirection.LEFT)
        return true;
    return false;
}

document.addEventListener('keydown', (evt) => {
    newCommand = null;
    switch (evt.key) {
        case 'ArrowUp':
            newCommand = SnakeDirection.UP;
            break;
        case 'ArrowDown':
            newCommand = SnakeDirection.DOWN;
            break;
        case 'ArrowRight':
            newCommand = SnakeDirection.RIGHT;
            break;
        case 'ArrowLeft':
            newCommand = SnakeDirection.LEFT;
            break;
    }

    if (!isOpositDirection(newCommand, snake.direction)) {
        snake.direction = newCommand;
    }
}, false);

class Snake {
    constructor() {
        this.head = new Coord(20, 20);
        this.body = [
            new Coord(20, 21),
            new Coord(20, 22),
            new Coord(20, 23),
            new Coord(20, 24),
        ];
        this.direction = SnakeDirection.UP;
    }

    getNextHeadPosition() {
        let head_pos = structuredClone(this.head);
        Object.setPrototypeOf(head_pos, Coord.prototype);
        switch (this.direction) {
            case SnakeDirection.UP:
                head_pos.y -= 1;
                break;
            case SnakeDirection.DOWN:
                head_pos.y += 1;
                break;
            case SnakeDirection.LEFT:
                head_pos.x -= 1;
                break;
            case SnakeDirection.RIGHT:
                head_pos.x += 1;
                break;
        }
        return head_pos;
    }

    calcNewPosition() {
        const prev_head_pos = structuredClone(snake.head);

        this.head = this.getNextHeadPosition();

        for (let i = this.body.length - 1; i > 0; --i) {
            const prev_body = this.body[i - 1];
            this.body[i] = prev_body;
        }

        snake.body[0] = prev_head_pos;
    }

    grow() {
        this.body.push(null);
    }
}

let snake = new Snake();

function generateFoods() {
    return [
        new Coord(5, 5),
        new Coord(5, 7),
        new Coord(9, 12),
        new Coord(35, 35),
        new Coord(27, 17),
    ]
}

let food_list = generateFoods();

function drawSnake() {
    drawBoardRect(snake.head, snakeHeadStyle);
    for (const vertebra of snake.body) {
        drawBoardRect(vertebra, snakeBodyStyle);
    }
}

function drawEat() {
    for (const food of food_list) {
        drawBoardRect(food, foodStyle);
    }
}

function calcLogic() {
    const next_head_snake_pos = snake.getNextHeadPosition();

    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    for (const food of food_list) {
        if (food.isEqualTo(next_head_snake_pos)) {
            food.x = randomIntFromInterval(0, game_board.width - 1);
            food.y = randomIntFromInterval(0, game_board.height - 1);
            snake.grow();
        }
    }

    snake.calcNewPosition();

    let snake_is_valid = true;
    if (game_board.isInBound(snake.head)) {
        console.log('Out of board!');
        snake_is_valid = false;
    }
    for (const vertebra of snake.body) {
        if (snake.head.isEqualTo(vertebra)) {
            console.log('Self crush!');
            snake_is_valid = false;
        }
    }

    if (!snake_is_valid) {
        stopGame();
    }
}

let game_calc_counter = 0;
function GameCalc() {
    calcLogic();
    if (!gameStarted)
        return;

    clearBoard();
    drawSnake();
    drawEat();

    game_calc_counter += 1;
}

class SnakeGame {
    constructor() {
        this.game_started = true;
        this.game_board = new GameBoard();
        this.snake = new Snake();
        this.foods = generateFoods();
    }
}

function stopGame() {
    clearInterval(timerId);
    gameStarted = false;

    game_canvas_ctx.font = '40px monospace';
    game_canvas_ctx.textAlign = 'center';
    game_canvas_ctx.fillStyle = gameOverTextStyle;

    const { width, height } = game_canvas.getBoundingClientRect();
    game_canvas_ctx.fillText('Final score: ' + snake.body.length * 100, width / 2, height / 2);
}

let gameStarted = true;
GameCalc();
let timerId = setInterval(GameCalc, 200);