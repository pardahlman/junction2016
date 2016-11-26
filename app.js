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
var nextMissileId = 1;

var MISSILE_ERROR_MARGINAL_ANGLE = 5;
var MISSILE_SPEED = 10; // 10% / second

function getNow() {
  return new Date().getTime();
}


function getOrCreateGame(gameId) {
  if (!games[gameId]) {
    games[gameId] = {
      id: gameId,
      players: [],
      missiles: [],
      loopInterval: null,
      prevTime: null,
    }
  }
  return games[gameId];
}

function getGame(gameId) {
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

function createMissile(game, from, to) {
  return {
    id: nextMissileId++,
    from: from,
    to: to,
    distance: 0,
  }
}

function findPlayer(game, username) {
  return _.find(game.players, function(p) { return p.username == username });
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
  var player = findPlayer(game, username);
  console.log(`setting calibration for ${username}:`, calibration)
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
  if (game.loopInterval) return console.log('there is a loop interval');

  game.prevTime = getNow();
  game.loopInterval = setInterval(function() {
    var now = getNow();
    var diffTime = now - game.prevTime;
    console.log('game loop interval');

    // Move missiles.
    var missilesToRemove = []
    _.each(game.missiles, function(m) {
      m.distance += MISSILE_SPEED * (diffTime / 1000.0)
      if (m.distance >= 100) {
        console.log(`missile has hit ${m.to} from=${m.from}`)
        missilesToRemove.push(m);
        var player = findPlayer(game, m.from);
        player.score += 1;
      }
    });

    game.missiles = _.reject(game.missiles, function(m) {
      return _.find(missilesToRemove, function(m2) { return m2 == m; });
    })

    publishGameState(game);

    game.prevTime = now;
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
  console.log('firing missile', username, data);

  var player = findPlayer(game, username);
  console.log(player.calibration)
  var target = _.find(player.calibration, function(c) {
    var d = angleDistance(c.angle, data.angle);
    console.log('checking distance:', c.angle, d)
    return d <= MISSILE_ERROR_MARGINAL_ANGLE;
  });

  if (!target) {
    console.log('no target for missile', username, data);
    return
  }
  console.log(`found missile target ${target.username}`)
  if (target.username == username) {
    console.log('dropping missile, cannot target yourself')
    return
  }

  var missile = createMissile(game, username, target.username);
  game.missiles.push(missile);
}

function removeMissile(game, username, data) {
  console.log('removing missile', username, data);

  var missile = _.find(game.missiles, function(m) { return m.id == data.id });
  if (!missile) return console.log('found no missile with id', data.id)
  if (!missile.to == username) return console.log(`missile not meant for ${username}, meant for ${missile.to}`)

  game.missiles = _.reject(game.missiles, function(m) { return m.id == data.id })
}

function sendToAllPlayers(game, event, data) {
  console.log('sending ['+game.id+']: ' + event, data)
  game.players.forEach(function(p) {
    p.socket.emit(event, data);
  });
}

function angleDistance(a, b) {
  var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
  return phi > 180 ? 360 - phi : phi;
}

io.on('connection', function(socket) {
  console.log('user connected');

  var username, gameId;

  socket.on('join game', function(data) {
    console.log('join game', data);
    username = data.username;
    gameId = data.gameId;

    var game = getOrCreateGame(gameId);
    addPlayer(game, createPlayer(username, socket));
  });

  socket.on('start game', function(data) {
    var game = getGame(gameId);
    if (!game) return console.log('cannot find game', gameId);

    publishStartCalibration(game);
  })

  socket.on('set calibration', function(data) {
    var game = getGame(gameId);
    if (!game) return console.log('cannot find game', gameId);

    setPlayerCalibration(game, username, data)
  });

  socket.on('fire missile', function(data) {
    var game = getGame(gameId);
    if (!game) return console.log('cannot find game', gameId);

    fireMissile(game, username, data)
  });

  socket.on('remove missile', function(data) {
    var game = getGame(gameId);
    if (!game) return console.log('cannot find game', gameId);

    removeMissile(game, username, data)
  })

  socket.on('disconnect', function() {
    console.log('user disconnected');
    var game = getGame(gameId);
    if (!game) return console.log('cannot find game', gameId);

    removePlayer(game, username)
  });
});
