(function() {
  document.getElementById('hello').innerText = 'Hello world';

  var gameIdInput = $("#game-id");
  var usernameInput = $("#username");
  $("#start-game").on("submit", function(e) {
    e.preventDefault();

    var gameId = gameIdInput.val()
    var username = usernameInput.val();
    if (!gameId || !username) {
      alert('BOO');
      return
    }

    socket.emit('join game', {'gameId': gameId, 'username': username})
  })

  var socket = io();

  socket.on('players updated', function(data) {
    console.log('players updated', data);
  });
})();
