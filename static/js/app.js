class JoinGameForm extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      gameId: 'g1',
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
      username: this.state.username
    })
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>

        <div style={{ padding: '1rem' }}>
          <label>Game ID</label>
          <input
            type="text"
            autoCapitalize="off"
            onChange={this.handleGameIdChange}
            value={this.state.gameId}
            />

          <br />
          <label>Username</label>
          <input
            autoFocus
            type="text"
            autoCapitalize="off"
            onChange={this.handleUsernameChange}
            value={this.state.username}
            />

          <button
            type="submit"
            style={{ margin: '1.4rem 0 0' }}
            >
            Enter game
          </button>
        </div>
      </form>
    )
  }
}

const StartGameForm = ({
  players = [],
  onStartGame
}) =>
  <div style={{ padding: '1em' }}>
    <h1 style={{ textAlign: 'center' }}>
      Current players
    </h1>

    <ul style={{
      margin: '0 0 1em',
      border: '1px solid currentColor',
      padding: '1em',
      borderRadius: '4px',
      fontSize: '0.9em'
    }}>
      {players.map((p, i) =>
        <li key={p.username} style={{ marginTop: i === 0 ? 0 : '0.25em' }}>
          {p.username}
        </li>
      )}
    </ul>

    <button
      onClick={onStartGame}
      disabled={players.length < 2}
      >
      Start game
    </button>
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
    <div style={{ padding: '1em' }}>
      <h1 style={{ textAlign: 'center' }}>
        Waiting for calibration
        </h1>

      {this.props.players.map(p =>
        <button
          onClick={() => this.handleCalibrate(p.username)}
          disabled={(
            this.state.calibrationsByUsername[p.username] ||
            this.props.username === p.username
          )}
          style={{ marginBottom: '1rem' }}
          >
          Point at "{p.username}" and press me!
          </button>
      )}
    </div>
  )
}
}

const Missle = ({ distance, id, from, to, onClick}) =>
  <img style={{
    transition: '0.2s all',
    position: 'absolute',
    transform: 'rotate(180deg)',
    top: distance + '%',
    left: '50%',
    width: '3em',
    height: '3em',
  }} src="/svg/missile.svg" onClick={() => onClick(id)} />

class HighScore extends React.Component {
  getSortedList() {
    return this.props.players.sort((first, second) => second.score - first.score);
  }

  render() {
    return (<ol>
      {this.getSortedList().map(p => <li>{p.username}: {p.score}</li>)}
    </ol>)
  }
}

class GameRunning extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      currentOrientationAroundZAxis: 0,
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

  onMissileFired = speed => {
    this.props.onMissleFired(this.state.currentOrientationAroundZAxis, speed);
  }

  renderMissile(m) {
    if (m.to != this.props.username) return null;
    var calibration = _.find(this.props.player.calibration, function (c) { return c.username == m.from });
    if (!calibration) {
      console.log('found no calibrated angle', this.props.player, m)
      return null;
    }

    var angleDiff = this.angleDistance(this.state.currentOrientationAroundZAxis, calibration.angle)
    if (angleDiff > 30) {
      
      console.log('angle diff too big', angleDiff)
      return null;
    }

    return <Missle key={m.id} {...m} onClick={this.props.onMissileClicked} />;
  }

  handlePan = evt => {
    if(evt.additionalEvent !== "panup"){
      return;
    }
    if(evt.velocityY > 0){
      return;
    }

    var speed = -1 * evt.velocityY * 4;
    this.onMissileFired(speed);
    evt.distance
  }

  angleDistance(a, b) {
    var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
    return phi > 180 ? 360 - phi : phi;
  }

  render() {
    return (
      <HammerComponent onPan={this.handlePan}>
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
          <h1 style={{ padding: '1rem', textAlign: 'center', color: '#fff' }}>
            Running
          <span> - {parseInt(this.state.currentOrientationAroundZAxis) || 0}°</span>
          </h1>
          <div style={{ flex: 1, background: '#eee', position: 'relative' }}>
            <HighScore players={this.props.players} style={{ float: 'right' }} />
            {this.props.missiles.map(m => this.renderMissile(m))}
          </div>
          <div style={{ width: '100%', textAlign: 'center', padding: '1em' }}>
            <button onClick={this.onMissileFired}>
              Fire!
          </button>
          </div>
        </div>
      </HammerComponent>
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
    this.socket = io('85.188.12.35:5000')

    this.socket.on('game state updated', data => {
      console.log('game state updated', data)
      this.setState(data)
    })
  }

  currentPlayer() {
    var username = this.state.username;
    return _.find(this.state.players, function (p) { return p.username == username })
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

  handleMissleFired = (angle, speed) => {
    this.socket.emit('fire missile', { angle, speed })
  }

  handleMissileClicked = id => {
    this.socket.emit('remove missile', { id })
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
        return <GameRunning
          username={this.state.username}
          players={this.state.players || []}
          player={this.currentPlayer()}
          onMissleFired={this.handleMissleFired}
          onMissileClicked={this.handleMissileClicked}
          missiles={this.state.missiles || []} />
      default:
        return <JoinGameForm onSubmit={this.handleJoinGame} />
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
