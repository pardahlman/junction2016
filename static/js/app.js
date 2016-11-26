
// $("#start-game").on('click', function(e) {
//   socket.emit('start game')
// })
//
// $("#set-calibration").on('click', function(e) {
//   socket.emit('set calibration', orientation);
// });
//
// $("#fire-missile").on('click', function(e) {
//   socket.emit('fire missile', {direction: orientation.z});
// });

// socket.on('players updated', function(data) {
//   console.log('players updated', data);
// });
//
// socket.on('start calibration', function(data) {
//   console.log('start calibration', data);
// });
//
// socket.on('game started', function(data) {
//   console.log('game started', data);
// });

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

let StartGameForm = (props) =>
  <div>
    <h1>Waiting</h1>
    Current players
       <ul>
      {props.players.map(p => <li key={p.username}>{p.username}</li>)}
    </ul>

    <button onClick={props.onStartGame} disabled={props.players.length === 1}>Start game!</button>
  </div>

class PerformCalibration extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      calibrationsByUsername: {}
    }
  }

  onCalibrated(username) {
    this.setState(state => ({
      calibrationsByUsername: {
        ...state.calibrationsByUsername,
        [username]: 0
      }
    }))
  }

  render() {
    console.log(this.props)
    return (
      <div>
        <h1>Waiting for calibration</h1>
        {this.props.players.map(p => {
          if(p.username === this.props.username){
            return <h1>you</h1>
          }
          return <PlayerCalibration player={p} onCalibrated={() => this.onCalibrated(p.username)} />})}
      </div>
    )
  }
}

class PlayerCalibration extends React.Component {
  render() {
    return (<div>
      <button onClick={this.props.onCalibrated} >
        {this.props.player.username}
      </button>
    </div>)
  }
}


class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      players: [],
      username: ""
    }
  }

  componentDidMount() {
    this.socket = io('85.188.15.153:5000')

    this.socket.on('game state updated', data => {
      console.log('game state updated', data)
      this.setState(data)
    })
  }

  handleJoinGame = player => {
    this.setState({username : player.username})
    console.log('join!', player)
    this.socket.emit('join game', {
      gameId: player.gameId,
      username: player.username
    })
  }

  startGame = () => {
    console.log('start game!');
    this.socket.emit('start game');

  }

  render() {
    switch (this.state.state) {
      case "waiting_for_players":
        return <StartGameForm players={this.state.players} onStartGame={this.startGame} />
      case "waiting_for_calibration":
        return <PerformCalibration players={this.state.players} username={this.state.username} />
      default:
        return <JoinGameForm onSubmit={this.handleJoinGame} />
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
