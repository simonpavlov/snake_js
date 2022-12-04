const text_style = "#7605a6";
const snake_styles = [
    { head: '#ff0000', body: '#d00000' },
    { head: '#2020ff', body: '#2020d0' },
];

const food_style = "#00e000";

class GameBoard {
    constructor() {
        this.width = 40;
        this.height = 40;
    }

    isNotInBound(coord) {
        return coord.x < 0 || coord.x >= this.width
            || coord.y < 0 || coord.y >= this.height;
    }
}

class GameDrawer {
    constructor(game_canvas) {
        this.game_canvas = game_canvas;
        this.game_canvas_ctx = game_canvas.getContext("2d");
    }

    drawBoardRect(coord, style, game_board) {
        const { width, height } = this.game_canvas.getBoundingClientRect();
        const rect_width_real = width / game_board.width;
        const rect_width = Math.ceil(rect_width_real);
        const rect_height_real = height / game_board.height;
        const rect_height = Math.ceil(rect_height_real);

        this.game_canvas_ctx.beginPath();
        this.game_canvas_ctx.fillStyle = style;
        this.game_canvas_ctx.fillRect(
            rect_width_real * coord.x,
            rect_height_real * coord.y,
            rect_width,
            rect_height,
        );
        this.game_canvas_ctx.stroke();
    };

    clearBoard() {
        this.game_canvas_ctx.clearRect(0, 0, this.game_canvas.width, this.game_canvas.height);
    };

    drawSnake(snake, game_board, style) {
        this.drawBoardRect(snake.head, style.head, game_board);
        for (const vertebra of snake.body) {
            this.drawBoardRect(vertebra, style.body, game_board);
        }
    }

    drawEat(food_list, game_board) {
        for (const food of food_list) {
            this.drawBoardRect(food, food_style, game_board);
        }
    }

    drawSnakeRound(snake_round) {
        for (const [i, [_, snake]] of Object.entries(snake_round.snakes).entries()) {
            this.drawSnake(snake, snake_round.board, snake_styles[i]);
        }
        this.drawEat(snake_round.foods, snake_round.board);
    }
}

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    isEqualTo(coord) {
        return this.x == coord.x && this.y == coord.y;
    }
}

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

class Snake {
    constructor(start_coord) {
        this.head = start_coord;
        this.body = [
            new Coord(start_coord.x, start_coord.y + 1),
            new Coord(start_coord.x, start_coord.y + 2),
            new Coord(start_coord.x, start_coord.y + 3),
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
        const prev_head_pos = structuredClone(this.head);

        this.head = this.getNextHeadPosition();

        for (let i = this.body.length - 1; i > 0; --i) {
            const prev_body = this.body[i - 1];
            this.body[i] = prev_body;
        }

        this.body[0] = prev_head_pos;
    }

    grow() {
        this.body.push(null);
    }
}

function generateFoods() {
    return [
        new Coord(5, 5),
        new Coord(5, 7),
        new Coord(9, 12),
        new Coord(35, 35),
        new Coord(27, 17),
    ]
}

class SnakeRound {
    constructor(snake_names) {
        this.board = new GameBoard();
        this.foods = generateFoods();

        this.snakes = {}
        const snake_count = snake_names.length;
        for (const [i, snake_name] of snake_names.entries())
            this.snakes[snake_name] = new Snake(new Coord(
                Math.round(this.board.width / (snake_count + 1)) * (i + 1),
                20,
            ));

        this.losing_snakes_names = [];
    }

    loseSnake(snake_name) {
        this.losing_snakes_names.push(snake_name);
    }

    calcLogic(commands) {
        function randomIntFromInterval(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min)
        }

        // process commands
        for (const [snake_name, snake] of Object.entries(this.snakes)) {
            const snake_command = commands[snake_name];
            if (snake_command)
                snake.direction = snake_command;
        }

        // build busy coords set
        let busy_coords_set = new Set();
        for (const [_, snake] of Object.entries(this.snakes)) {
            busy_coords_set.add(JSON.stringify(snake.head));
            for (const vertebra of snake.body.slice(0, -1))
                busy_coords_set.add(JSON.stringify(vertebra));
        }

        for (const [snake_name, snake] of Object.entries(this.snakes)) {
            const next_head_snake_pos = snake.getNextHeadPosition();

            if (this.board.isNotInBound(next_head_snake_pos)) {
                console.log('Out of board! Snake:', snake_name);
                this.loseSnake(snake_name);
                continue;
            }

            if (busy_coords_set.has(JSON.stringify(next_head_snake_pos))) {
                console.log('Crush! Snake:', snake_name);
                this.loseSnake(snake_name);
                return;
            }

            for (const food of this.foods) {
                if (food.isEqualTo(next_head_snake_pos)) {
                    food.x = randomIntFromInterval(0, this.board.width - 1);
                    food.y = randomIntFromInterval(0, this.board.height - 1);
                    snake.grow();
                }
            }

            snake.calcNewPosition();
        }

        //process head to head crush
        let head_coord_to_count = {};
        for (const [_, snake] of Object.entries(this.snakes)) {
            const head_str = JSON.stringify(snake.head);
            if (head_coord_to_count[head_str]) {
                head_coord_to_count[head_str] += 1;
            } else {
                head_coord_to_count[head_str] = 1;
            }
        }
        for (const [snake_name, snake] of Object.entries(this.snakes)) {
            const head_str = JSON.stringify(snake.head);
            if (head_coord_to_count[head_str] > 1) {
                this.loseSnake(snake_name);
            }
        }
    }
}

class SnakeKeyboardController {
    constructor(snake, control_map) {
        this.snake = snake;
        this.command = null;
        document.addEventListener('keydown', (evt) => {
            let newCommand = null;
            switch (evt.key.toLowerCase()) {
                case control_map.up.toLowerCase():
                    newCommand = SnakeDirection.UP;
                    break;
                case control_map.down.toLowerCase():
                    newCommand = SnakeDirection.DOWN;
                    break;
                case control_map.left.toLowerCase():
                    newCommand = SnakeDirection.LEFT;
                    break;
                case control_map.right.toLowerCase():
                    newCommand = SnakeDirection.RIGHT;
                    break;
            }
            console.log('new command:', newCommand, 'key:', evt.key);

            if (!newCommand)
                return;

            if (!isOpositDirection(newCommand, this.snake.direction)) {
                this.command = newCommand;
            }
        }, false);
    }

    popCommand() {
        const result = this.command;
        this.command = null;
        return result;
    }
}

function createSnakesKeyboardControllers(snakes) {
    const controls_maps = [
        { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
        { up: 'w', down: 's', left: 'a', right: 'd' },
    ];

    res = {};
    for (const [i, [snake_name, snake]] of Object.entries(snakes).entries()) {
        console.log('create controller');
        res[snake_name] = new SnakeKeyboardController(
            snake,
            controls_maps[i],
        );
    }
    return res;
}

function run(players_count) {
    let snakes_names = [];
    for (let i = 0; i < players_count; ++i) {
        snakes_names.push(`snake_${i + 1}`);
    }

    let snake_round = new SnakeRound(snakes_names);
    const game_canvas = document.getElementById("game_canvas");
    const game_drawer = new GameDrawer(game_canvas);

    let snakes_controllers = createSnakesKeyboardControllers(snake_round.snakes);
    function popSnakesCommands() {
        res = {};
        for (const snake_name in snakes_controllers) {
            res[snake_name] = snakes_controllers[snake_name].popCommand();
        }
        return res;
    }

    function GameCalc() {
        console.log("Game loaded");

        if (snake_round.losing_snakes_names.length) {
            clearInterval(timerId);
            return;
        }

        snake_round.calcLogic(popSnakesCommands());

        game_drawer.clearBoard();
        game_drawer.drawSnakeRound(snake_round);

        if (snake_round.losing_snakes_names.length) {
            const canvas_ctx = game_canvas.getContext("2d");
            canvas_ctx.font = "bold 35px Sans-Serif";
            canvas_ctx.fillStyle = text_style;
            canvas_ctx.textAlign = "center";
            const { width, height } = game_canvas.getBoundingClientRect();
            const message = snake_round.losing_snakes_names.length > 1
                ? `${snake_round.losing_snakes_names} are dead :(`
                : `${snake_round.losing_snakes_names} is dead :(`;
            canvas_ctx.fillText(message, width / 2, height / 2);
        }
    }

    GameCalc();
    let timerId = setInterval(GameCalc, 150);
}

run(1);
