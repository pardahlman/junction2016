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
    }), () => {
      if (Object.keys(this.state.calibrationsByUsername).length >= this.props.players.length - 1)
        this.props.onSendCalibration(this.state.calibrationsByUsername)
    })
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

const Missle = ({ distance, from, to }) =>
  <div style={{
    background: 'red',
    transition: '0.2s all',
    position: 'absolute',
    top: distance + '%',
    left: '50%',
    width: '1em',
    height: '1em',
    borderRadius: '100%'
  }} />

class HighScore extends React.Component {
  getSortedList(){
    return this.props.players.sort((first, second) => second.score-first.score);
  }

  render(){
    return (<ol>
      {this.getSortedList().map(p => <li>{p.username}: {p.score}</li>)}
    </ol>)
  }
}

class GameRunning extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
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

  onMissileFired = () => {
    this.props.onMissleFired(this.state.currentOrientationAroundZAxis);
  }

  render() {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
        <h1 style={{ padding: '1rem', textAlign: 'center' }}>Running</h1>
        <div style={{ flex: 1, background: '#eee', position: 'relative' }}>
        <HighScore players={this.props.players} style={{float:'right'}} />
        
          {this.props.missiles.map(m =>
            <Missle key={m.id} {...m} />
          )}
        </div>
        <div style={{ width: '100%', textAlign: 'center', padding: '1em' }}>
          <button onClick={this.onMissileFired}>
            Fire!
          </button>
        </div>
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

    this.socket.emit('set calibration', calibrationsArray);
  }

  handleMissleFired = angle => {
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
        return <GameRunning onMissleFired={this.handleMissleFired} players={this.state.players || []} missiles={this.state.missiles || []} />
      default:
        return <JoinGameForm onSubmit={this.handleJoinGame} />
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
