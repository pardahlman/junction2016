(function() {
  var socket = io();

  var orientation = {
    z: null
  };

  window.addEventListener('deviceorientation', function(e) {
    orientation.z = e.alpha;
  });

  var gameIdInput = $("#game-id");
  var usernameInput = $("#username");

  $("#join-game").on("submit", function(e) {
    e.preventDefault();

    var gameId = gameIdInput.val()
    var username = usernameInput.val();
    if (!gameId || !username) {
      alert('BOO');
      return
    }

    socket.emit('join game', {'gameId': gameId, 'username': username})
  })

  $("#start-game").on('click', function(e) {
    socket.emit('start game')
  })

  $("#set-calibration").on('click', function(e) {
    socket.emit('set calibration', [{username: 'adam', angle: 90}, {username: 'mackan', angle: 40}]);
  });

  $("#fire-missile").on('click', function(e) {
    socket.emit('fire missile', {angle: orientation.z});
  });

  $("#remove-missile").on('click', function(e) {
    socket.emit('remove missile', {id: $("#missile-id").val()});
  });

  socket.on('players updated', function(data) {
    console.log('players updated', data);
  });

  socket.on('start calibration', function(data) {
    console.log('start calibration', data);
  });

  socket.on('game started', function(data) {
    console.log('game started', data);
  });

  socket.on('game state updated', function(data) {
    console.log('game state updated', data);
  })
})();
