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
          autoCapitalize="off"
          onChange={this.handleGameIdChange}
          value={this.state.gameId}
          />

        <br/>
        <label>Username</label>
        <input
          type="text"
          autoCapitalize="off"
          autoFocus="on"
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

  renderMissile(m) {
    if (m.to != this.props.username) return null;
    var calibration = _.find(this.props.player.calibration, function(c) { return c.username == m.from });
    if (!calibration) {
      console.log('found no calibrated angle', this.props.player, m)
      return null;
    }

    var angleDiff = this.angleDistance(this.state.currentOrientationAroundZAxis, calibration.angle)
    if (angleDiff > 30) {
      console.log('angle diff too big', angleDiff)
      return null;
    }

    return <Missle key={m.id} {...m} onClick={this.props.onMissileClicked}/>;
  }

  angleDistance(a, b) {
    var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
    return phi > 180 ? 360 - phi : phi;
  }

  render() {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
        <h1 style={{ padding: '1rem', textAlign: 'center', color: '#fff' }}>
          Running
          <span> - {parseInt(this.state.currentOrientationAroundZAxis) || 0}°</span>
        </h1>
        <div style={{ flex: 1, background: '#eee', position: 'relative' }}>
        <HighScore players={this.props.players} style={{float:'right'}} />
          {this.props.missiles.map(m => this.renderMissile(m))}
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
    this.socket = io()

    this.socket.on('game state updated', data => {
      console.log('game state updated', data)
      this.setState(data)
    })
  }

  currentPlayer() {
    var username = this.state.username;
    return _.find(this.state.players, function(p) { return p.username == username})
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

  handleMissileClicked = id => {
    this.socket.emit('remove missile', {id})
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
