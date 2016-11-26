
$("#start-game").on('click', function(e) {
  socket.emit('start game')
})

$("#set-calibration").on('click', function(e) {
  socket.emit('set calibration', orientation);
});

$("#fire-missile").on('click', function(e) {
  socket.emit('fire missile', {direction: orientation.z});
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

class JoinGameForm extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      gameId: '',
      username: ''
    }
  }

  handleGameIdChange = (e) => {
    this.setState({ gameId: e.target.value })
  }

  handleUsernameChange = (e) => {
    this.setState({ username: e.target.value })
  }

  handleSubmit = (e) => {
    e.preventDefault()

    this.props.onSubmit({
      gameId: this.state.gameId,
      username: this.state.username,
    })
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <h1>Join game</h1>

        <label>Game ID</label>
        <input
          type="text"
          onChange={this.handleGameIdChange}
          value={this.state.gameId}
        />

        <label>Username</label>
        <input
          type="text"
          onChange={this.handleUsernameChange}
          value={this.state.username}
        />

        <button type="submit">Enter game</button>
      </form>
    )
  }
}

const Button = function(props) {
  const label = props.label

  return (
    <button onClick={props.onPress}>
      {label}
    </button>
  )
}

class App extends React.Component {

  componentDidMount() {
    this.socket = io()

    this.socket.on('game state updated', function(data) {
      console.log('game state updated', data);
    })
  }

  handleJoinGame = player => {
    socket.emit('join game', {
      gameId: player.gameId,
      username: player.username
    })
  }

  render() {
    return (
      <div>
        <JoinGameForm onSubmit={handleJoinGame} />
      </div>
    )
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
