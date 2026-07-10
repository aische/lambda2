
var main;

var strategyHints = {
    cbn: "Substitute arguments without evaluating them first.",
    cbv: "Evaluate the argument before applying the function.",
    lazy: "Lazy thunks and pairs; required for par examples."
};

function updateStrategyHint () {
    var sel = document.getElementById ("strategy");
    if (sel) {
        sel.title = strategyHints[sel.value] || "";
    }
}

var SPEED_MIN_MS = 4;
var SPEED_MAX_MS = 400;

function setSpeedFromSlider (slider) {
    var t = (parseFloat (slider.value) - slider.min) / (slider.max - slider.min);
    main.interval = Math.round (SPEED_MAX_MS - t * (SPEED_MAX_MS - SPEED_MIN_MS));
}

function loadWithStrategy () {
    var sel = document.getElementById ("strategy");
    main.setLambdaStringFromTextarea (sel ? sel.value : main.mode);
}

function init () {
    var canvas = document.getElementById("can1");
    var textarea = document.getElementById("ta1");
    var mouseButtonPressed;
    main = new LamMain (canvas, textarea);
    main.syncStrategyUI ();
    updateStrategyHint ();
    document.getElementById("latencyCheckbox").checked = false;
    document.getElementById("soundbank").value = "sounds/soundbank1.json";
    setSpeedFromSlider (document.getElementById("speed"));
    main.resize ();
    window.onresize = function () {
        main.resize ();
    };
    canvas.onmousedown = function (e) {
        var mx = e.pageX - this.offsetLeft;
        var my = e.pageY - this.offsetTop;
        mouseButtonPressed = true;
        main.find(mx - main.xoffset - (canvas.width / 2), my - main.yoffset);
        main.draw ();
        lastMouseX = mx;
        lastMouseY = my;
    };
    canvas.onmousemove = function (e) {
        var mx = e.pageX - this.offsetLeft;
        var my = e.pageY - this.offsetTop;
        if (mouseButtonPressed) {
            var dx = mx - lastMouseX;
            var dy = my - lastMouseY;
            main.shiftDisplay (dx, dy);
            lastMouseX = mx;
            lastMouseY = my;
        }
    };
    canvas.onmouseup = function () {
        mouseButtonPressed = false;
    };

    main.loadFile('ex/0.txt');
}
