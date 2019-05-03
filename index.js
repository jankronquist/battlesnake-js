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

  // NOTE: Do something here to generate your move
  console.log('POST');
  const { height, width } = request.body.board;
  
  const board = Array(height).fill(EMPTY).map(() => Array(width).fill(EMPTY));
  request.body.board.snakes.forEach((snake) => snake.body.forEach(({x,y}) => board[y][x] = SNAKE));
  request.body.board.food.forEach(({x,y}) => board[y][x] = FOOD);
  const head = request.body.you.body[0];

  const moves = shuffle(MOVES);


  const calculateScore = (board, pos, move, depth) => {
    const newY = pos.y + directions[move].y;
    const newX = pos.x + directions[move].x;
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      if (board[newY][newX] === FOOD) {
        return 10;
      } else if (board[newY][newX] === EMPTY) {
        if (depth < 6) {
          board[newY][newX] = SNAKE;
          const childScores = ['up','down','left','right'].map(move => calculateScore(board, { x: newX, y: newY }, move, depth + 1));
          board[newY][newX] = EMPTY;
          return Math.max(...childScores);
        }
        return 1;
      }
    }
    return -1;
  };
  const moveScores = moves.map(move => {
    return {
      move,
      score: calculateScore(board, head, move, 0),
    };
  });
  moveScores.sort((m1, m2) => m2.score - m1.score);
  console.log(moveScores);
  return response.json({
    move: moveScores[0].move,
  });
  // if (safeMoves.length > 0) {
  //   return response.json({
  //     move: safeMoves[0]
  //   });
  // } else {
  //   return response.json({
  //     move: moves[0]
  //   });
  // }
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
