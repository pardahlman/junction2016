var http = require('http');
var express = require('express');
var _ = require('lodash');
var bunyan = require('bunyan');

var log = bunyan.createLogger({name: 'app', level: process.env.LOG_LEVEL || 'info'});

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server, {origins: '*:*'});

app.use(express.static('static'));

var port = process.env.PORT || 5000;
server.listen(port, function(err) {
  if (err) return log.error(err.stack);
  log.info('http server listening', {port});
});


games = {};
var nextMissileId = 1;

var LOOP_INTERVAL = 100;
var MISSILE_ERROR_MARGINAL_ANGLE = 5;
var MISSILE_COOLDOWN = 4000; // milliseconds.
var MISSILE_SPEED_MIN = 5; // % / second.
var MISSILE_SPEED_MAX = 80; // % / second.
var SCORE_TO_WIN = 10;

function getNow() {
  return new Date().getTime();
}


function getOrCreateGame(gameId) {
  if (!games[gameId]) {
    games[gameId] = {
      id: gameId,
      state: 'waiting_for_players',
      players: [],
      missiles: [],
      loopInterval: null,
      prevTime: null,
    }
  }
  return games[gameId];
}

function destroyGame(gameId) {
  log.info('destroying game', {gameId});
  game = games[gameId];
  if (game.loopInterval) {
    clearInterval(game.loopInterval);
  }
  delete games[gameId];
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
    missileCooldown: 0,
  };
}

function createMissile(game, from, to, speed) {
  if (!speed) { speed = 20; } // temp for backwards compatibility.
  if (speed > MISSILE_SPEED_MAX) { speed = MISSILE_SPEED_MAX; }
  if (speed < MISSILE_SPEED_MIN) { speed = MISSILE_SPEED_MIN; }

  return {
    id: nextMissileId++,
    from: from,
    to: to,
    distance: 0,
    speed: speed,
  }
}

function findPlayer(game, username) {
  return _.find(game.players, function(p) { return p.username == username });
}

function addPlayer(game, player) {
  game.players.push(player);
  publishGameState(game);
}

function removePlayer(game, username) {
  log.info('removing player', {gameId: game.id, username});
  game.players = _.reject(game.players, function(p) {
    return p.username == username;
  })
  publishGameState(game);

  if (game.players.length == 0) {
    destroyGame(game.id);
  }
}

function startGame(game) {
  log.info('will start game', {gameId: game.id});
  game.state = 'waiting_for_calibration';
  publishGameState(game);
}

function setPlayerCalibration(game, username, calibration) {
  log.info('setting calibration for player', {gameId: game.id, username, calibration});
  var player = findPlayer(game, username);
  player.calibration = calibration;
  var allCalibrated = _.every(game.players, function(p) { return !!p.calibration })
  if (allCalibrated) {
    game.state = 'running';
    sendToAllPlayers(game, 'game started');
    startGameLoop(game);
  } else {
    log.info('will not start game yet, not all players have calibrated', {gameId: game.id});
  }
}

function startGameLoop(game) {
  if (game.loopInterval) return log.error('there is already a loop interval', {gameId: game.id});

  game.prevTime = getNow();
  game.loopInterval = setInterval(function() {
    var now = getNow();
    var timeDelta = now - game.prevTime;

    // Move missiles.
    var missilesToRemove = []
    _.each(game.missiles, function(m) {
      m.distance += m.speed * (timeDelta / 1000.0)
      if (m.distance >= 100) {
        log.info('missile has hit', m);
        missilesToRemove.push(m);
        var fromPlayer = findPlayer(game, m.from);
        var toPlayer = findPlayer(game, m.to);

        fromPlayer.score += 1;
        log.info('increasing player score', {username: fromPlayer.username, score: fromPlayer.score});

        fromPlayer.socket.emit('missile status', {status: 'target_hit'});
        toPlayer.socket.emit('missile status', {status: 'was_hit'});

        if (fromPlayer.score >= SCORE_TO_WIN){
          finishRound(game);
        }
      }
    });

    game.missiles = _.reject(game.missiles, function(m) {
      return _.find(missilesToRemove, function(m2) { return m2 == m; });
    })

    // Update cooldowns;
    _.each(game.players, function(p) {
      if (p.missileCooldown > 0) {
        p.missileCooldown = Math.max(p.missileCooldown - timeDelta, 0);
      }
    });

    publishGameState(game);

    game.prevTime = now;
  }, LOOP_INTERVAL);
}

function finishRound(game){
  var playerScores = _.filter(game.players, function(p) { return {username: p.username, score: p.score}});
  log.info('game round has finished', {gameId: game.id, playerData: playerScores})

  game.state = 'round_finished';
  if (game.loopInterval) {
    clearInterval(game.loopInterval);
  }
}

function publishGameState(game) {
  var data = {
    id: game.id,
    state: game.state,
    players: _.map(game.players, function(p) {
      return {
        username: p.username,
        score: p.score,
        calibration: p.calibration,
        missileCooldown: p.missileCooldown,
      };
    }),
    missiles: game.missiles,
  };

  sendToAllPlayers(game, 'game state updated', data);
}

function fireMissile(game, username, data) {
  logData = {gameId: game.id, username, data};
  log.info('firing missile', logData);

  var player = findPlayer(game, username);
  if (player.missileCooldown > 0) {
    return log.info('will not fire missile, waiting for cooldown', logData, {missileCooldown: player.missileCooldown});
  }

  player.missileCooldown = MISSILE_COOLDOWN;

  var target = _.find(player.calibration, function(c) {
    var d = angleDistance(c.angle, data.angle);
    return d <= MISSILE_ERROR_MARGINAL_ANGLE;
  });

  if (!target) {
    log.warn('no target for missile', logData)
    player.socket.emit('missile status', {status: 'no_target'});
    return
  }

  log.info('found missile target', {target}, logData)
  if (target.username == username) {
    log.warn('dropping missile, cannot target yourself', logData)
    player.socket.emit('missile status', {status: 'cannot_target_self'});
    return
  }

  var missile = createMissile(game, username, target.username, data.speed);
  game.missiles.push(missile);
}

function removeMissile(game, username, data) {
  log.info('removing missile', {gameId: game.id, username, data})

  var missile = _.find(game.missiles, function(m) { return m.id == data.id });
  if (!missile) return log.info('found no missile with id', {gameId: game.id, username, data})
  if (!missile.to == username) return log.warn('missile not meant for user', {gameId: game.id, username, data, missile: missile})

  var fromPlayer = findPlayer(game, missile.from);

  if (fromPlayer) {
    fromPlayer.socket.emit('missile status', {status: 'missile_removed'});
  } else {
    log.warn('could not find missile from player', {username: missile.from})
  }

  game.missiles = _.reject(game.missiles, function(m) { return m.id == data.id })
}

function sendToAllPlayers(game, event, data) {
  log.debug('publishing to all players', {gameId: game.id, event, data: JSON.stringify(data)})
  game.players.forEach(function(p) {
    p.socket.emit(event, data);
  });
}

function angleDistance(a, b) {
  var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
  return phi > 180 ? 360 - phi : phi;
}

io.on('connection', function(socket) {
  var socketData = {clientIp: socket.request.connection.remoteAddress};
  log.info('user connected', socketData);

  var username, gameId;
  var joined = false;

  socket.on('join game', function(data) {
    log.debug('join game', data);

    if (joined) {
      return log.warn('user cannot join, already joined', {username, gameId, data});
    }

    username = data.username;
    gameId = data.gameId;

    var game = getOrCreateGame(gameId);
    if (findPlayer(game, username)) {
      socket.emit('error', {status: 'cannot_join', reason: 'username_taken', gameId: gameId});
      return log.warn('player already joined', {gameId, username});
    }
    if (game.state != 'waiting_for_players') {
      socket.emit('error', {status: 'cannot_join', reason: 'wrong_game_state', gameId: gameId});
      return log.warn('player cannot join game, wrong state', {gameId, username, state: game.state});
    }

    joined = true;
    addPlayer(game, createPlayer(username, socket));
  });

  socket.on('start game', function(data) {
    log.debug('start game', data);

    if (!joined) {
      socket.emit('error', {status: 'cannot_start', reason: 'not_joined'});
      return;
    };

    var game = getGame(gameId);

    if (!game) {
      socket.emit('error', {status: 'cannot_start', reason: 'game_not_found', gameId: gameId});
      return log.info('cannot find game', {gameId});
    }
    if (game.state != 'waiting_for_players') {
      socket.emit('error', {status: 'cannot_start', reason: 'wrong_game_state', gameId: gameId});
      return log.warn('cannot start game, wrong state', {gameId, username, state: game.state})
    }

    startGame(game);
  })

  socket.on('set calibration', function(data) {
    log.debug('set calibration', data);
    if (!joined) return;

    var game = getGame(gameId);
    if (!game) {
      socket.emit('error', {status: 'cannot_set_calibration', reason: 'game_not_found', gameId: gameId});
      return log.info('cannot find game', {gameId});
    }
    if (game.state != 'waiting_for_calibration') {
      socket.emit('error', {status: 'cannot_set_calibration', reason: 'wrong_game_state', gameId: gameId});
      return log.warn('cannot set calibration, wrong state', {gameId, username, state: game.state})
    }

    setPlayerCalibration(game, username, data)
  });

  socket.on('fire missile', function(data) {
    log.debug('fire missile', data);

    if (!joined) return;

    var game = getGame(gameId);
    if (!game) {
      socket.emit('error', {status: 'cannot_fire_missile', reason: 'game_not_found', gameId: gameId});
      return log.warn('cannot find game', {gameId});
    }
    if (game.state != 'running') {
      socket.emit('error', {status: 'cannot_fire_missile', reason: 'wrong_game_state', gameId: gameId});
      return log.warn('game is not running', {gameId, state: game.state});
    }

    fireMissile(game, username, data)
  });

  socket.on('remove missile', function(data) {
    log.debug('remove missile', data);
    if (!joined) return;

    var game = getGame(gameId);
    if (!game) {
      socket.emit('error', {status: 'cannot_remove_missile', reason: 'game_not_found', gameId: gameId});
      return log.warn('cannot find game', {gameId});
    }
    if (game.state != 'running') {
      socket.emit('error', {status: 'cannot_remove_missile', reason: 'wrong_game_state', gameId: gameId});
      return log.warn('game is not running', {gameId, state: game.state});
    }

    removeMissile(game, username, data)
  })

  socket.on('disconnect', function() {
    log.warn('user disconnected', {socketData});

    if (!joined) return;
    var game = getGame(gameId);
    if (!game) return log.info('cannot find game', {gameId});

    removePlayer(game, username)
  });

  socket.on('leave game', function() {
    log.warn('leave game', {joined, gameId, username, socketData});
    if (!joined) return log.warn('cannot leave, have not joined');
    var game = getGame(gameId);
    if (!game) return log.info('cannot find game', {gameId});

    removePlayer(game, username)
    username = null;
    gameId = null;
    joined = false;
  });
});
