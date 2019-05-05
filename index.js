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
var shuffle = function (array) {

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

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  try {
  const { height, width } = request.body.board;

  const validPositionsAround = (pos) => {
    return ['up','down','left','right'].map(move => {
      const newY = pos.y + directions[move].y;
      const newX = pos.x + directions[move].x;
      if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
        return { x: newX, y: newY };
      }
      return null;
    }).filter(id => id);
  }

  const board = Array(height).fill(EMPTY).map(() => Array(width).fill(EMPTY));
  request.body.board.snakes.forEach((snake) => snake.body.forEach(({x,y}) => board[y][x] = SNAKE));
  request.body.board.food.forEach(({x,y}) => board[y][x] = FOOD);
  const head = request.body.you.body[0];

  const myLength = request.body.you.body.length;
  const myId = request.body.you.id;
  const largerEnemies = request.body.board.snakes
    .filter(snake => snake.body.length >= myLength)
    .filter(snake => myId !== snake.id);
  [].concat(...largerEnemies.map(snake => validPositionsAround(snake.body[0]))).forEach(({x,y}) => board[y][x] = SNAKE);

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

  const calculateScore = (board, pos, move, depth) => {
    const newY = pos.y + directions[move].y;
    const newX = pos.x + directions[move].x;
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      if (board[newY][newX] === FOOD) {
        return 150 - depth;
      } else if (board[newY][newX] === EMPTY) {
        const newPos = { x: newX, y: newY };
        if (depth < 9) {
          board[newY][newX] = SNAKE;
          const childScores = ['up','down','left','right'].map(move => calculateScore(board, newPos, move, depth + 1));
          board[newY][newX] = EMPTY;
          return Math.max(...childScores);
        }
        return -calculateNeighbours(board, newPos);
      }
    }
    return -100 + depth;
  };
  const moveScores = moves.map(move => {
    return {
      move,
      score: calculateScore(board, head, move, 0),
    };
  });
  moveScores.sort((m1, m2) => m2.score - m1.score);
//  console.log(moveScores);
  console.log('length=', request.body.you.body.length);
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
