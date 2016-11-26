(function () {
    var opponents = [];
    var alpha, beta, gamma;
    var index = 0;

    window.addEventListener('deviceorientation', function (event) {
        evaluateOrientationEvent(event.alpha);
        alpha = event.alpha;
        beta = event.beta;
        gamma = event.gamma;
        // var found = false;

        // for (var i = 0; i < opponents.length, i++;) {
        //     var opponent = opponents[i];
        //     var diff = Math.abs(event.alpha - opponent.alpha);
        //     if (diff < 15) {
        //         document.getElementById('name').innerText = opponent.name;
        //         found = true;
        //     }
        //     if (!found) {
        //         document.getElementById('name').innerText = 'No target';
        //     }
        // }
    });
    document.getElementById('captureButton').addEventListener("click", function (ev) {
        addOpponent();
    });

    document.getElementById('fireButton').addEventListener("click", function (ev) {
        console.log('fire!');
        var elm = document.getElementById('debugInput');
        console.log(elm.value);
        evaluateOrientationEvent(elm.value);
    });

    document.getElementById('addButton').addEventListener("click", function (ev) {
        addOpponent();
    });

    function addOpponent(){
        index++;
        console.log('capturing...');
        opponents.push({
            alpha: alpha,
            beta: beta,
            gamma: gamma,
            name: 'Opponent ' + index
        });
        console.log(opponents);
    }

    function evaluateOrientationEvent(alpha){
        var found = false;

        for (var i = 0; i < opponents.length; i++) {
            var opponent = opponents[i];
            var diff = Math.abs(alpha - opponent.alpha);
            if (diff < 15) {
                document.getElementById('name').innerText = opponent.name;
                found = true;
            }
            if (!found) {
                document.getElementById('name').innerText = 'No target';
            }
        }
    }
})();