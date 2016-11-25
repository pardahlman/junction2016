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
      'id': gameId,
      'players': [],
      'missiles': []
    }
  }
  return games[gameId];
}

function createPlayer(username, socket) {
  return {
    username: username,
    socket: socket,
    calibrations: {},
  };
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
  game.players.forEach(function(p) {
    p.socket.emit('players updated', {players: playerData});
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

  socket.on('disconnect', function() {
    console.log('user disconnected');
    if (!game) return;
    removePlayer(game, username)
  });
});
