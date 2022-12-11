const text_style = '#ffcc00';
const snake_styles = [
    { head: '#ff0000', body: '#d00000' },
    { head: '#2020ff', body: '#2020d0' },
];

const food_style = '#00e000';

class GameBoard {
    constructor() {
        this.width = 64;
        this.height = 64;
    }

    isNotInBound(coord) {
        return coord.x < 0 || coord.x >= this.width
            || coord.y < 0 || coord.y >= this.height;
    }
}

class GameDrawer {
    constructor(game_canvas) {
        this.game_canvas = game_canvas;
        this.game_canvas_ctx = game_canvas.getContext('2d');
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
        this.event_listener = (evt) => {
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
            console.log('new SNAKE command:', newCommand, 'key:', evt.key);

            if (!newCommand)
                return;

            if (!isOpositDirection(newCommand, this.snake.direction)) {
                this.command = newCommand;
            }
        };

        document.addEventListener('keydown', this.event_listener, false);
    }

    destroy() {
        window.removeEventListener('keydown', this.event_listener, false);
    }

    popCommand() {
        const result = this.command;
        this.command = null;
        return result;
    }
}

class SnakesControllers {
    constructor(snakes) {
        const createSnakesKeyboardControllers = () => {
            const controls_maps = [
                { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
                { up: 'w', down: 's', left: 'a', right: 'd' },
            ];

            let res = {};
            for (const [i, [snake_name, snake]] of Object.entries(snakes).entries()) {
                console.log('create controller');
                res[snake_name] = new SnakeKeyboardController(
                    snake,
                    controls_maps[i],
                );
            }
            return res;
        }

        this.snake_name_to_controller = createSnakesKeyboardControllers();
    }

    destory() {
        for (controller of this.snake_name_to_controller) {
            controller.destroy();
        }
    }

    popSnakesCommands() {
        let res = {};
        for (const [snake_name, controller] of Object.entries(this.snake_name_to_controller)) {
            res[snake_name] = controller.popCommand();
        }
        return res;
    }
}

class SnakeScene {
    constructor(players_count) {
        this.snakes_names = [];
        for (let i = 0; i < players_count; ++i) {
            this.snakes_names.push(`snake_${i + 1}`);
        }

        this.snake_round = new SnakeRound(this.snakes_names);
        this.game_canvas = document.getElementById('game_canvas');
        this.game_drawer = new GameDrawer(this.game_canvas);
        this.snakes_controllers = new SnakesControllers(this.snake_round.snakes);
    }

    destroy() {
        this.snakes_controllers.destory();
    }

    getTickLength() {
        return 200;
    }

    calcLogic() {
        const is_end = this.snake_round.losing_snakes_names.length;
        if (is_end) {
            return;
        }
        this.snake_round.calcLogic(this.snakes_controllers.popSnakesCommands());
    }

    draw() {
        this.game_drawer.clearBoard();
        this.game_drawer.drawSnakeRound(this.snake_round);

        const is_end = this.snake_round.losing_snakes_names.length;
        if (is_end) {
            const canvas_ctx = this.game_canvas.getContext('2d');
            canvas_ctx.font = 'bold 35px Sans-Serif';
            canvas_ctx.fillStyle = text_style;
            canvas_ctx.textAlign = 'center';
            const { width, height } = this.game_canvas.getBoundingClientRect();
            const message = this.snake_round.losing_snakes_names.length > 1
                ? `${this.snake_round.losing_snakes_names} are dead :(`
                : `${this.snake_round.losing_snakes_names} is dead :(`;
            canvas_ctx.fillText(message, width / 2, height / 2);
        }
    }

    getNextScene() {
    }
}

class StartMenu {
    constructor() {
        this.game_canvas = document.getElementById('game_canvas');
        this.menu_items = {
            'start one player game': () => { console.log('snake 1'); this.next_scene = new SnakeScene(1); },
            'start two players game': () => { console.log('snake 2'); this.next_scene = new SnakeScene(2); },
        }
        this.menu_active_item = 0;
        this.next_scene = null;

        this.event_listener = (evt) => {
            console.log('process MENU', evt);
            const menu_size = Object.keys(this.menu_items).length;
            switch (evt.key) {
                case 'ArrowUp':
                    this.menu_active_item -= 1;
                    if (this.menu_active_item < 0) {
                        this.menu_active_item = menu_size - 1;
                    }
                    break;
                case 'ArrowDown':
                    this.menu_active_item += 1;
                    if (this.menu_active_item >= menu_size) {
                        this.menu_active_item = 0;
                    }
                    break;
                case 'Enter':
                    Object.values(this.menu_items)[this.menu_active_item]();
                    break;
            }
        };

        document.addEventListener('keydown', this.event_listener, false);
    }

    destroy() {
        console.log('destroy StartMenu');
        document.removeEventListener('keydown', this.event_listener, false);
    }

    getTickLength() {
        return 50;
    }

    calcLogic() {
    }

    draw() {
        const canvas_ctx = this.game_canvas.getContext('2d');
        const font_size_px = 35;
        canvas_ctx.font = `bold ${font_size_px}px Sans-Serif`;
        canvas_ctx.fillStyle = text_style;
        canvas_ctx.textAlign = 'center';
        const { width, height } = this.game_canvas.getBoundingClientRect();
        canvas_ctx.clearRect(0, 0, width, height);
        for (const [item_id, item_name] of Object.keys(this.menu_items).entries()) {
            const message = (item_id == this.menu_active_item) ? `> ${item_name} <` : item_name;
            const item_height_correction = -(font_size_px * (Object.keys(this.menu_items).length - 1)) / 2;
            canvas_ctx.fillText(message, width / 2, height / 2 + (item_id * font_size_px) + item_height_correction);
        }
        canvas_ctx.stroke();
    }

    getNextScene() {
        if (this.next_scene) {
            return this.next_scene;
        }
    }
}

class SeceneRunner {
    constructor(scene) {
        this.scene = scene;
    }

    run() {
        let last_tick = performance.now();
        let scene = this.scene;
        let tick_length = scene.getTickLength();

        function process(num_tick) {
            window.requestAnimationFrame(process);
            const isLogicUpdateRequired = () => num_tick > last_tick + tick_length;
            const rendering_required = isLogicUpdateRequired();

            while (isLogicUpdateRequired()) {
                scene.calcLogic();
                last_tick += tick_length;
            }

            if (!rendering_required) {
                return;
            }

            scene.draw();

            const nextScene = scene.getNextScene();
            if (nextScene) {
                scene.destroy();
                scene = null;
                scene = nextScene;
                tick_length = scene.getTickLength();
                last_tick = performance.now();
            }
        }

        process(performance.now());
    }
}

(() => {
    const game_loop = new SeceneRunner(new StartMenu());
    game_loop.run();
})();
