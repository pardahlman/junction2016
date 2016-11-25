var http = require('http');
var express = require('express');
var _ = require('lodash');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

app.use(express.static('static'));

var port = process.env.PORT || 5000;
server.listen(port, function(err) {
  if (err) return console.log(err.stack);
  console.log('listening on port', port);
});


games = {};


function getOrCreateGame(gameId) {
  if (!games[gameId]) {
    games[gameId] = {
      id: gameId,
      players: [],
      missiles: [],
      loopInterval: null,
    }
  }
  return games[gameId];
}

function createPlayer(username, socket) {
  return {
    username: username,
    socket: socket,
    calibration: null,
    score: 0,
  };
}

function createMissile(game, username, direction) {

}

function addPlayer(game, player) {
  game.players.push(player);
  publishPlayersUpdated(game);
}

function removePlayer(game, username) {
  // TODO...
  console.log('removing player', username, 'from game', game.id)
  game.players = _.reject(game.players, function(p) {
    return p.username == username;
  })
  publishPlayersUpdated(game);
}

function publishPlayersUpdated(game) {
  var playerData = _.map(game.players, function(p) { return {username: p.username} });
  console.log('player data', playerData)
  sendToAllPlayers(game, 'players updated', {players: playerData})
}

function publishStartCalibration(game) {
  console.log('will start calibration', game.id)
  sendToAllPlayers(game, 'start calibration', {})
}

function setPlayerCalibration(game, username, calibration) {
  var player = _.find(game.players, function(p) { return p.username == username });
  player.calibration = calibration;
  var allCalibrated = _.every(game.players, function(p) { return !!p.calibration })
  if (allCalibrated) {
    sendToAllPlayers(game, 'game started');
    startGameLoop(game);
  } else {
    console.log('will not start game yet, not all players have calibrated')
  }
}

function startGameLoop(game) {
  if (game.loopInterval) throw new Error('There is a loop interval');
  game.loopInterval = setInterval(function() {
    console.log('game loop interval');

    // TODO: Move missiles.
    // TODO: Detect when missiles hit.
    // TODO: Detect when missiles miss and should be removed.

    publishGameState(game);
  }, 500);
}

function publishGameState(game) {
  var data = {
    players: _.map(game.players, function(p) {
      return {
        username: p.username,
        score: p.score,
      };
    }),
    missiles: game.missiles,
  };

  sendToAllPlayers(game, 'game state updated', data);
}

function fireMissile(game, username, data) {

}

function sendToAllPlayers(game, event, data) {
  console.log('sending ['+game.id+']: ' + event, data)
  game.players.forEach(function(p) {
    p.socket.emit(event, data);
  });
}

io.on('connection', function(socket) {
  console.log('user connected');

  var username, game;

  socket.on('join game', function(data) {
    console.log('join game', data);
    username = data.username;

    game = getOrCreateGame(data.gameId);
    addPlayer(game, createPlayer(username, socket));
  });

  socket.on('start game', function(data) {
    publishStartCalibration(game);
  })

  socket.on('set calibration', function(data) {
    setPlayerCalibration(game, username, data)
  });

  socket.on('fire missile', function(data) {
    fireMissile(game, username, data)
  });

  socket.on('disconnect', function() {
    console.log('user disconnected');
    if (!game) return;
    removePlayer(game, username)
  });
});
