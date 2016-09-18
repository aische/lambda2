
var main;
var step;
function init () {
    var canvas = document.getElementById("can1");
    var textarea = document.getElementById("ta1");
    var mouseButtonPressed;
    main = new LamMain (canvas, textarea);
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
    canvas.onmouseup = function (e) {
        mouseButtonPressed = false;
    };

    main.loadFile('ex/0.txt');

    for (var key in LamMain.stepinfo) {
        var item = LamMain.stepinfo[key];




    };

}
