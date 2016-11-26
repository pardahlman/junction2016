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
      calibrationsByUsername: {},
      currentOrientationAroundZAxis: 0
    }
  }

  componentDidMount() {
    this.handleOrientationChange = e =>
      this.setState({ currentOrientationAroundZAxis: e.alpha })

    window.addEventListener('deviceorientation', this.handleOrientationChange)
  }

  componentWillUnmount() {
    window.removeEventListener('deviceorientation', this.handleOrientationChange)
  }

  handleCalibrate = username => {
    this.setState(state => ({
      calibrationsByUsername: {
        ...state.calibrationsByUsername,
      [username]: state.currentOrientationAroundZAxis
      }
    })), () => {
      if (Object.keys(this.state.calibrationsByUsername).length >= this.props.players.length - 1)
        this.props.onSendCalibration(this.state.calibrationsByUsername)
    }
  }

render() {
  return (
    <div>
      <h1>Waiting for calibration</h1>

      {this.props.players.map(p =>
        p.username === this.props.username
          ? <h1>you</h1>
          : <button onClick={() => this.handleCalibrate(p.username)} disabled={this.state.calibrationsByUsername[p.username]}>{p.username}</button>
      )}
    </div>
  )
}
}

class GameRunning extends React.Component {

  onMissileFired = () => this.props.onMissleFired(this.state.currentOrientationAroundZAxis);

  componentWillUnmount() {
    window.removeEventListener('deviceorientation', this.handleOrientationChange)
  }
  componentDidMount() {
    this.handleOrientationChange = e =>
      this.setState({ currentOrientationAroundZAxis: e.alpha })

    window.addEventListener('deviceorientation', this.handleOrientationChange)
  }

  render() {
    return (
      <div>
        <h1>Running</h1>
        <button onClick={this.onMissileFired}>
          fire!
        </button>
      </div>
    );
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
    this.setState({ username: player.username })
    console.log('join!', player)
    this.socket.emit('join game', {
      gameId: player.gameId,
      username: player.username
    })
  }

  handleStartGame = () => {
    this.socket.emit('start game');
  }

  handleSendCalibration = calibrationsByUsername => {
    console.log('start game!');

    const calibrationsArray = Object.keys(calibrationsByUsername).map(username => ({
      username,
      angle: calibrationsByUsername[username]
    }))

    console.log(calibrationsArray)

    this.socket.emit('set calibration', calibrationsArray);
  }

  handleOnMissleFired = angle => {
    this.socket.emit('fire missile', {angle})
  }

  render() {
    switch (this.state.state) {
      case "waiting_for_players":
        return <StartGameForm players={this.state.players} onStartGame={this.handleStartGame} />
      case "waiting_for_calibration":
        return (
          <PerformCalibration
            players={this.state.players}
            username={this.state.username}
            onSendCalibration={this.handleSendCalibration}
            />
        )
      case "running":
        return <GameRunning onMissleFired={this.handleOnMissleFired} />
      default:
        return <JoinGameForm onSubmit={this.handleJoinGame} />
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
