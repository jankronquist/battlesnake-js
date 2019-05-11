const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game

  // Response data
  const data = {
    color: '#DFFF00',
  }

  return response.json(data)
})

const EMPTY = ' ';
const FOOD = 'F';
const SNAKE = 'S';
const AVOID = 'A';

const MOVES = ['up','down','left','right'];

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
};

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
const shuffle = (array) => {

	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

const randomFrom = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  try {
  const { height, width } = request.body.board;
  const board = Array(height).fill(EMPTY).map(() => Array(width).fill(EMPTY));

  const validPositionsAround = (pos) => {
    return ['up','down','left','right'].map(move => {
      const newY = pos.y + directions[move].y;
      const newX = pos.x + directions[move].x;
      if (newX >= 0 && newX < width && newY >= 0 && newY < height && board[newY][newX] !== SNAKE) {
        return { x: newX, y: newY };
      }
      return null;
    }).filter(id => id);
  }

  request.body.board.snakes.forEach((snake) => snake.body.forEach(({x,y}) => board[y][x] = SNAKE));
  request.body.board.food.forEach(({x,y}) => board[y][x] = FOOD);
  const head = request.body.you.body[0];

  const myLength = request.body.you.body.length;
  const myId = request.body.you.id;
  const largerEnemies = request.body.board.snakes
    .filter(snake => snake.body.length >= myLength)
    .filter(snake => myId !== snake.id);
  [].concat(...largerEnemies.map(snake => validPositionsAround(snake.body[0]))).forEach(({x,y}) => board[y][x] = AVOID);

  const moves = shuffle(MOVES);

  const calculateNeighbours = (board, pos) => {
    return ['up','down','left','right'].map(move => {
      const newY = pos.y + directions[move].y;
      const newX = pos.x + directions[move].x;
      if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
        if (board[newY][newX] !== SNAKE) {
          return 0;
        }
        return 2;
      }
      return 3;
    }).reduce((acc, cur) => acc + cur);
  };

  const calculateFreeArea = (board, pos, range) => {
    const minX = Math.max(0, pos.x - range);
    const maxX = Math.min(width, pos.x + range);
    const minY = Math.max(0, pos.y - range);
    const maxY = Math.min(height, pos.y + range);
    let free = 0;
    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        if (board[y][x] !== SNAKE) free++;
      }
    }
    return free;
  };

  const foodIsValuable = request.body.board.snakes.length > 1 ||
                         largerEnemies.length > 0 || 
                         request.body.you.health < 50;

  let iterations = 0;
  const calculateScore = (board, pos, move, depth) => {
    iterations++;
    const newY = pos.y + directions[move].y;
    const newX = pos.x + directions[move].x;
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      const current = board[newY][newX];
      let bonus = 0;
      if (current === SNAKE) {
        return -100 + (depth*2);
      } else if (current === AVOID) {
        bonus = -20;
      } else if (foodIsValuable && current === FOOD) {
        bonus = 150 - depth;
      }
      if (newX === 0 || newX === width - 1) {
        bonus--;
      }
      if (newY === 0 || newY === height - 1) {
        bonus--;
      }
      const newPos = { x: newX, y: newY };
      if (depth < 10) {
        board[newY][newX] = SNAKE;
        const childScores = MOVES.map(move => calculateScore(board, newPos, move, depth + 1));
        board[newY][newX] = current;
        return Math.max(...childScores) + bonus;
      }
      // if (depth < 14) {
      //   board[newY][newX] = SNAKE;
      //   const childScores = shuffle(MOVES).slice(2).map(move => calculateScore(board, newPos, move, depth + 1));
      //   board[newY][newX] = current;
      //   return Math.max(...childScores) + bonus;
      // }
      // if (depth < 20) {
      //   board[newY][newX] = SNAKE;
      //   const childScore = calculateScore(board, newPos, randomFrom(MOVES), depth + 1);
      //   board[newY][newX] = current;
      //   return childScore + bonus;
      // }
      // return -calculateNeighbours(board, newPos) + bonus;
      return calculateFreeArea(board, newPos, 2) + bonus; // 5x5 = max 25
    }
    return -100 + (depth*2);
  };
  const moveScores = moves.map(move => {
    return {
      move,
      score: calculateScore(board, head, move, 0),
    };
  });
  moveScores.sort((m1, m2) => m2.score - m1.score);
  console.log(moveScores);
  console.log('length=', request.body.you.body.length);
  console.log('iterations=', iterations);
  return response.json({
    move: moveScores[0].move,
  });
}
catch (err) {
  console.error(err);
}

})

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
