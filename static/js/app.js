var RED = '#ff296b'

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) == variable) {
          return decodeURIComponent(pair[1]);
      }
  }
  return null;
}

var MISILE_ANGLE_DIFF_VISIBLE = 30.0;

class JoinGameForm extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      gameId: getQueryVariable('game_id') || 'g1',
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
        <div style={{width: '100%', textAlign: 'center'}}>
          <img
            style={{maxHeight: '40vh'}}
            src="/img/GIT-space-dictator-logo_image.png" />
        </div>

        <div style={{ padding: '1rem' }}>
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

          {this.props.clientError ? (
            <div style={{ margin: '1.4rem 0 0', color: RED }}>
              ERROR: {this.props.clientError.status} - {this.props.clientError.reason}
            </div>
          ): null}
        </div>
      </form>
    )
  }
}

const StartGameForm = ({
  gameId,
  players = [],
  onStartGame,
}) =>
  <div style={{ padding: '1em' }}>
    <h1 style={{ textAlign: 'center' }}>
      Current players: <span>{gameId}</span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h1>Waiting for calibration: <span>{this.props.gameId}</span></h1>
          <div>{parseInt(this.state.currentOrientationAroundZAxis) || 0}°</div>
        </div>

        {this.props.players.map(p =>
          <button
            key={p.username}
            onClick={() => this.handleCalibrate(p.username)}
            disabled={(
              this.state.calibrationsByUsername[p.username] ||
              this.props.username === p.username
            )}
            style={{
              marginBottom: '1rem',
              fontSize: '0.8em',
              padding: '1em 1.2em',
              textAlign: 'left'
            }}
          >
            Point at "{p.username}" and press me!
          </button>
        )}
      </div>
    )
  }
}

const Missle = ({ id, distance, rotation, angleDiff, ...props }) =>
  <img
    src="/svg/missile.svg"
    style={{
      transition: '0.2s all',
      position: 'absolute',
      transform: 'rotate('+ rotation +'deg)',
      opacity: (1 - angleDiff / MISILE_ANGLE_DIFF_VISIBLE) + '',
      top: distance + '%',
      left: (10 + ((5 * id) % 80)) + '%',
      width: '3em',
      height: '3em',
    }}
    {...props}
  />

const HighScore = ({ players = [] }) =>
  <ol style={{ margin: 0 }}>
    {players
      .sort((first, second) => second.score - first.score)
      .map(({ username, score }) =>
        <li key={username}>
          {username}: {score}
        </li>
      )
    }
  </ol>

const eventMessageByName = {
  'target_hit': 'You hit something!',
  'no_target': 'Miss!',
  'was_hit': 'You were hit!',
  'missile_removed': 'Your missle was blocked!'
}

class Target extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      calibrations: [],
      angle: 0
    }
  }

  componentDidMount() {
    window.addEventListener('deviceorientation', this.handleOrientationChange);
  }

  componentWillUnmount() {
    window.removeEventListener('deviceorientation', this.handleOrientationChange);
  }

  handleOrientationChange = e => {
    this.setState({angle: e.alpha});
  }

  render(){
    var target = this.state.calibrations.filter(c => angleDistance(c.angle, this.state.angle) <= 5)[0];
    if(!target)
      target = {username: 'Unknown'}
    return <h1>{target.username}</h1>;
  }
}

class GameRunning extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      currentOrientationAroundZAxis: 0,
      height: null,
      mostRecentEvent: null
    }

    const clearEvent = _.debounce(
      () => this.setState({ mostRecentEvent: null }),
      5000
    )

    props.onStartListenForMissleEvents(data => {
      console.log('missle', data)
      this.setState({ mostRecentEvent: data.status })
      clearEvent()
      // setTimeout(() => clearEvent(), 5000)
    })
  }

  componentDidMount() {
    this.handleOrientationChange = e => this.setState({ currentOrientationAroundZAxis: e.alpha })
    this.handleResize = () => this.setState({ height: window.innerHeight })

    window.addEventListener('deviceorientation', this.handleOrientationChange)
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('onorientationchange', this.handleResize)

    this.handleResize()
  }

  componentWillUnmount() {
    window.removeEventListener('deviceorientation', this.handleOrientationChange)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('onorientationchange', this.handleResize)
  }

  renderMissile = m => {
    if (m.from === this.props.username) {
      var calibration = _.find(this.props.player.calibration, function(c) { return c.username == m.to });
    } else if (m.to == this.props.username) {
      var calibration = _.find(this.props.player.calibration, function(c) { return c.username == m.from });
    }

    if (!calibration) {
      console.log('found no calibrated angle', this.props.player, m)
      return null;
    }

    var angleDiff = this.angleDistance(this.state.currentOrientationAroundZAxis, calibration.angle)
    if (angleDiff > MISILE_ANGLE_DIFF_VISIBLE) {
      console.log('angle diff too big', angleDiff)
      return null;
    }

    if (m.from === this.props.username) {
      return <Missle key={m.id} id={m.id} distance={100-m.distance} rotation={0} angleDiff={angleDiff}/>;
    } else if (m.to == this.props.username) {
      return <Missle key={m.id} {...m} rotation={180} onClick={() => this.props.onMissileClicked(m.id)} angleDiff={angleDiff} />;
    }
  }

  onMissileFired = evt => {
    if(evt.additionalEvent !== "panup"){
      return;
    }
    if(evt.velocityY > 0){
      return;
    }

    var speed = -1 * evt.velocityY * 8;
    this.props.onMissleFired(this.state.currentOrientationAroundZAxis, speed);
  }

  angleDistance(a, b) {
    var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
    return phi > 180 ? 360 - phi : phi;
  }

  render() {
    return (
      <HammerComponent onPan={this.onMissileFired}>
        <div style={{ width: '100vw', height: this.state.height || '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
          <div>
            <div style={{ display: 'flex', padding: '1rem', color: '#fff', justifyContent: 'space-between' }}>
              <div>
                <div>{parseInt(this.state.currentOrientationAroundZAxis) || 0}°</div>
                {this.state.mostRecentEvent &&
                  <div style={{ color: RED }}>
                    {eventMessageByName[this.state.mostRecentEvent]}
                  </div>
                }
              </div>
              <HighScore players={this.props.players} />
            </div>
          </div>

          <div style={{ flex: 1, background: 'black', position: 'relative' }}>
            {this.props.missiles.map(this.renderMissile)}
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
      clientError: null,
      players: [],
      username: ""
    }
  }

  componentDidMount() {
    this.socket = io(getQueryVariable('socket_url'))

    this.socket.on('client error', data => {
      console.warn('client error', data)
      this.setState({clientError: data});
    })

    this.socket.on('game state updated', data => {
      console.log('game state updated', data)
      this.setState(data)
    })

    this.socket.on('missile status', data => {
      console.info('missile status', data)
    })
  }

  currentPlayer() {
    var username = this.state.username;
    return _.find(this.state.players, function(p) { return p.username == username})
  }

  requestFullscreen() {
    try {
      var root = document.getElementById('root');
      if (root.requestFullscreen) root.requestFullscreen();
      if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      if (root.mozRequestFullScreen) root.mozRequestFullScreen();
    } catch (err) {
      console.error(err);
    }
  }

  handleJoinGame = player => {
    this.setState({ username: player.username, clientError: null })
    console.log('join!', player)
    this.socket.emit('join game', {
      gameId: player.gameId,
      username: player.username
    })
    // this.requestFullscreen();
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
    this.setState({calibrations: calibrationsArray})

    this.socket.emit('set calibration', calibrationsArray);
  }

  handleMissleFired = (angle, speed) => {
    this.socket.emit('fire missile', { angle, speed })
  }

  handleMissileClicked = id => {
    this.socket.emit('remove missile', {id})
  }

  render() {
    switch (this.state.state) {
      case "waiting_for_players":
        return (
          <StartGameForm
            gameId={this.state.id}
            players={this.state.players}
            onStartGame={this.handleStartGame}
          />
        )
      case "waiting_for_calibration":
        return (
          <PerformCalibration
            gameId={this.state.id}
            players={this.state.players}
            username={this.state.username}
            onSendCalibration={this.handleSendCalibration}
          />
        )
      case "running":
        return (
          <GameRunning
            username={this.state.username}
            calibrations={this.state.calibrations}
            players={this.state.players || []}
            player={this.currentPlayer()}
            onMissleFired={this.handleMissleFired}
            onMissileClicked={this.handleMissileClicked}
            missiles={this.state.missiles || []}
            onStartListenForMissleEvents={listener => this.socket.on('missile status', listener)}
          />
        )
      default:
        return <JoinGameForm onSubmit={this.handleJoinGame} clientError={this.state.clientError}/>
    }
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
