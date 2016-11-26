var _ = require('lodash');

function computeWorld(players){
  // Position first player at origo
  positionPlayer(players[0], {x: 0, y:0});

  // Position second player with a distance of 1 from first player
  var playerTwoDistanceVector = {x: 0, y:1};
  var playerOneToPlayerTwoCalibration = _.find(players[0].calibrations, function(c){
    return c.username === players[1].username;
  });
  var playerTwoCoordinates = rotateVector(playerTwoVector, playerOneToPlayerTwoCalibration.angle);
  positionPlayer(players[1], playerTwoCoordinates);

  // Position player three
  var playerOneToPlayerThreeCalibration = _.find(players[0].calibrations, function(c){
    return c.username === players[2].username;
  })
  var playerThreeVector = {x: 0, y: computeSideLength(players)};
  var playerThreeCoordinates = rotateVector(playerThreeVector, playerOneToPlayerThreeCalibration.angle);
  positionPlayer(players[2], playerThreeCoordinates);

  _.map(players, function(p){
    console.log(`Username: ${p.username}\nCoordinates: {x: ${p.coordinates.x}, y: ${p.coordinates.y}}\n`);
  })
}

function positionPlayer(player, coordinates){
  player.coordinates = coordinates;
}

function degreesToRadians(degrees){
  return degrees * Math.PI/180.0;
}

function rotateVector(vector, degrees){
  // https://www.siggraph.org/education/materials/HyperGraph/modeling/mod_tran/2drota.htm
  var radians = degreesToRadians(degrees);
  var rotatedVector = {};
  rotatedVector.x = vector.x * Math.cos(radians) - vector.y * Math.sin(radians);
  rotatedVector.y = vector.y * Math.cos(radians) + vector.x * Math.sin(radians);
  return rotatedVector;
}


function computeSideLength(players){
  // http://www.mathsisfun.com/algebra/trig-sine-law.html
  var b = 1;
  var B = angleDistance(players[2].calibrations[0].angle, players[2].calibrations[1].angle);
  var C = angleDistance(players[1].calibrations[0].angle, players[1].calibrations[1].angle);
  return Math.sin(degreesToRadians(C))/Math.sin(degreesToRadians(B));
}

function angleDistance(a, b) {
  var phi = Math.abs(b - a) % 360; // This is either the distance or 360 - distance
  return phi > 180 ? 360 - phi : phi;
}

//// Test computations
//
// computeWorld([
//   {
//     username: 'player1',
//     calibrations: [
//       {username: 'player2', angle: 330},
//       {username: 'player3', angle: 30},
//     ],
//     coordinates: {}
//   },
//   {
//     username: 'player2',
//     calibrations: [
//       {username: 'player1', angle: 210},
//       {username: 'player3', angle: 270},
//     ],
//     coordinates: {}
//   },
//   {
//     username: 'player3',
//     calibrations: [
//       {username: 'player1', angle: 150},
//       {username: 'player2', angle: 90},
//     ],
//     coordinates: {}
//   }]);
//
// computeWorld([
//   {
//     username: 'player1',
//     calibrations: [
//       {username: 'player2', angle: 90},
//       {username: 'player3', angle: 0},
//     ],
//     coordinates: {}
//   },
//   {
//     username: 'player2',
//     calibrations: [
//       {username: 'player1', angle: 270},
//       {username: 'player3', angle: 300},
//     ],
//     coordinates: {}
//   },
//   {
//     username: 'player3',
//     calibrations: [
//       {username: 'player1', angle: 180},
//       {username: 'player2', angle: 120},
//     ],
//     coordinates: {}
//   }]);
