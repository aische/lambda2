function LamMain (canvas, textarea) {
    var self = this;
    this.canvas = canvas;
    this.context = canvas.getContext ("2d");
    this.textarea = textarea;
    this.evaluator = false;
    this.parser = new LamParser ();

    this.running = false;
    this.timer = false;
    this.interval = 225;
    this.xoffset = 0;
    this.yoffset = 0;
    this.zoom = 1;
    this.mode = "cbn";
    this.error = false;

    //this.currentstep = false;
    this.currentsteps = false;
    try {
        this.soundplayer = new SoundPlayer ();
        this.loadSoundBank("sounds/soundbank1.json")
    }
    catch (e) {
        console.log ("Error while opening AudioContext, so the program will not produce sound.");
    }
}

LamMain.prototype.resize = function (string) {
    this.canvas.width = window.innerWidth - 32;
    this.canvas.height = window.innerHeight - 32;
    this.draw ();
};

LamMain.prototype.setVolume = function (volume) {
    if (this.soundplayer) {
        this.soundplayer.destination.gain.value = volume;
    };
};

LamMain.prototype.incVolume = function () {
    if (this.soundplayer) {
        var volume = Math.min (1.0, this.soundplayer.destination.gain.value + 0.1);
        this.soundplayer.destination.gain.value = volume;
        document.getElementById("volumeslider").value = volume;
    };
};

LamMain.prototype.decVolume = function () {
    if (this.soundplayer) {
        var volume = Math.max (0.0, this.soundplayer.destination.gain.value - 0.1);
        this.soundplayer.destination.gain.value = volume;
        document.getElementById("volumeslider").value = volume;
    };
};

LamMain.prototype.loadFileSel = function (sel) {
    this.loadFile("ex/" + sel.selectedIndex + ".txt");

};

LamMain.prototype.loadFile = function (url) {
    var self = this;
    var x = new XMLHttpRequest ();
    x.open("GET", url, true);
    x.onreadystatechange = function () {
        if (x.readyState == 4 && x.status == 200) {
            self.textarea.value = x.responseText;
            self.setLambdaStringFromTextarea (this.mode);
        }
    };
    x.send(null);
};

LamMain.prototype.setLambdaStringFromTextarea = function (mode) {
    this.mode = mode || this.mode;
    this.setLambdaString (this.textarea.value);
};

LamMain.prototype.setLambdaString = function (string) {
    this.stop ();
    this.textarea.value = string;
    var lazy = this.mode == "lazy";
    var strict = this.mode == "cbv";
    LamNode.idCount = 0;

    var term = this.parser.parse (string, lazy || false, strict || false);
    if (term) {
        this.evaluator = new Evaluator (term);
        //this.currentstep = this.evaluator.step ();
        this.currentsteps = this.evaluator.step ();
    }
    else {
        var str = "";
        for (var i=this.parser.index; i<this.parser.tokens.length; i++) {
            str += this.parser.tokens[i] + " ";
        }
        this.error = this.parser.error || ("cannot parse: " + str);
        this.evaluator = false;
        //this.currentstep = false;
        this.currentsteps = false;
    }
    this.draw (0);
};

LamMain.prototype.draw = function () {
    this.canvas.width = this.canvas.width;
    if (this.evaluator) {
        var zoom = this.zoom;
        this.context.fillStyle = "#880000";
        this.context.fillText (this.mode + " evaluation strategy", 2, 10);
        this.context.fillStyle = "#000000";
        this.context.fillText ((this.evaluator.counter - 1) + " reductions", 2, 24);
        //this.currentstep && this.context.fillText (LamMain.stepinfo[this.currentstep.name].text, 2, 38);
        this.currentsteps && this.context.fillText (LamMain.stepinfo[this.currentsteps[0].name].text, 2, 38);

        //this.context.fillText ("tempo: " + this.interval + "ms interval time", 2, 52);
        this.context.font = "" + (12 * zoom) + "px Courier";
        this.context.lineWidth = 1;

        var term = this.evaluator.root ();
        term.resetThunkFlags (0)
        for (var i=0; i<this.evaluator.workers.length; i++) {
            term = this.evaluator.workers[i].root ();
            term.resetThunkFlags (0)
        }

        term = this.evaluator.root ();
        term.updateMetrics (this.context);
        for (var i=0; i<this.evaluator.workers.length; i++) {
            term = this.evaluator.workers[i].root ();
            term.updateMetrics (this.context);
        }

        term = this.evaluator.root ();
        var re = term.updatePositions (0, 10, zoom);
        var w = re[0];
        for (var i=0; i<this.evaluator.workers.length; i++) {
            term = this.evaluator.workers[i].root ();
            re = term.updatePositions (w, 10, zoom);
            w += re[0];
        }

        term = this.evaluator.root ();
        term.movePositions (-(w/2), 0);
        for (var i=0; i<this.evaluator.workers.length; i++) {
            term = this.evaluator.workers[i].root ();
            term.movePositions (-(w/2), 0);
        }

        this.context.save ();
        this.context.translate ((this.canvas.width / 2) + this.xoffset, this.yoffset);
        term = this.evaluator.root ();
        term.draw (this.context, this.zoom);
        this.evaluator.term.drawLabel (this.context, "#ff0000", this.zoom);

        for (var i=0; i<this.evaluator.workers.length; i++) {
            term = this.evaluator.workers[i].root ();
            term.draw (this.context, this.zoom);
            this.evaluator.workers[i].term.drawLabel (this.context, "#ff0000", this.zoom);
        }

        this.context.restore ();
    }
    else {
        this.context.save ();
        this.context.fillStyle = "#ff0000";
        this.context.fillText (this.error, 2, 10);
        this.context.restore ();
    }
};

LamMain.prototype.forget = function () {
    if (this.mode == 'lazy') {
        return;
    }
    this.stop ();
    if (this.evaluator) {
        this.evaluator.forget ();
        this.currentsteps = this.evaluator.step ();
    }
};

LamMain.prototype.find = function (x, y) {
    if (this.mode == 'lazy') {
        return;
    }
    this.forget ();
    if (this.evaluator) {
        this.evaluator.findNode (x, y) || this.forget ();
        this.currentsteps = this.evaluator.step ();
    }
};

LamMain.prototype.step = function () {
    //if (this.running) { return };
    this.stop ();
    if (this.evaluator) {
        //var estep = this.evaluator.step ();
        //this.previoussound = LamMain.stepinfo[estep.name].sound;
        if (this.currentsteps) {
            for (var i=0; i<this.currentsteps.length; i++) {
                if (this.soundplayer) {
                    //this.soundplayer.playSynth (LamMain.stepinfo[this.currentsteps[i].name].sound);
                    this.soundplayer.playSound (this.currentsteps[i].name);
                }
                this.currentsteps[i].action ();
            }
        }
        this.currentsteps = this.evaluator.step ();
        this.draw (0);

        // console.log (LamMain.stepinfo[estep.name].text);
    }
};

LamMain.prototype.step0 = function () {
    //if (this.running) { return };
    this.stop ();
    if (this.evaluator) {
        //var estep = this.evaluator.step ();
        //this.previoussound = LamMain.stepinfo[estep.name].sound;
        if (this.currentstep) {
            if (this.soundplayer) {
                //this.soundplayer.playSynth (LamMain.stepinfo[this.currentstep.name].sound);
                this.soundplayer.playSound (this.currentstep.name);
            }
            this.currentstep.action ();
        }
        this.currentstep = this.evaluator.step ();
        this.draw (0);

        // console.log (LamMain.stepinfo[estep.name].text);
    }
};

LamMain.prototype.run = function () {
    if (this.running) { return };
    this.running = true;
    this.runLoop ();
};

LamMain.prototype.runLoop = function () {
    if (this.running && this.evaluator) {
        if (this.currentsteps) {
            if (this.soundplayer) {
                for (var i=0; i<this.currentsteps.length; i++) {
                    //this.soundplayer.playSynth (LamMain.stepinfo[this.currentsteps[i].name].sound);
                    this.soundplayer.playSound (this.currentsteps[i].name);
                }
            }
        }
        if (this.currentstep == false) {
            this.stop ();
            return;
        };

        //console.log (LamMain.stepinfo[estep.name].text);

        var self = this;
        this.timer = setTimeout (function () {
            var ok = self.currentsteps[0].action ();
            for (var i=1; i<self.currentsteps.length; i++) {
                self.currentsteps[i].action ();
            }
            if (ok) {
                self.currentsteps = self.evaluator.step ();
                self.draw ();
                self.runLoop ()
            }
        }, this.interval);
    };
};

LamMain.prototype.stop = function () {
    if (this.running) {
        this.running = false;
        clearTimeout (this.timer);
    }
};

LamMain.prototype.shiftDisplay = function (xdelta, ydelta) {
    this.xoffset += xdelta;
    this.yoffset += ydelta;
    this.draw ();
};

LamMain.prototype.setDisplay = function (x, y) {
    this.xoffset = x;
    this.yoffset = y;
    this.draw ();
};

LamMain.prototype.incZoom = function () {
    this.setZoom (this.zoom * 1.25);
};

LamMain.prototype.decZoom = function () {
    this.setZoom (this.zoom * 0.8);
};

LamMain.prototype.setZoom = function (z) {
    this.zoom = z;
    this.draw ();
};

LamMain.prototype.logExampleCode = function () {
    var str = this.textarea.value;
    var lns = str.split("\n");
    var r = "";
    for (var i=0; i<lns.length; i++) {
        r += ("    \"" + lns[i].replace(/\\/g,"\\\\") + " \\n\" + \n")
    }
    console.log (r);
};

/*
	{ 
	"op2":{
		"type":"beep", 
		"frequency":200,
		"dur":1
	},
	"op1":{
		"type":"sample", 
		"url":""
	},
}
*/

LamMain.prototype.setSoundBank = function (soundbank) {
	this.sounds = {};
	for (var key in soundbank) {
		var def = soundbank[key];
	    if (def.type == "beep") {
	        this.soundplayer.setSoundBeep(key, def.note, def.dur);
	    } else if (def.type == "sample") {
	        this.soundplayer.setSoundSample(key, def.url);
	    }
	}
};

LamMain.prototype.loadSoundBank = function (url) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open ('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function (){
    	self.setSoundBank(xhr.response)
    };
    xhr.send();
};

LamMain.steps = [ 'op0', 'op1', 'op1_0', 'op2', 'op2_0',
    'app0', 'app1', 'if0', 'if1', 'rec', 'bind0', 'bind1',
    'iscons0', 'iscons1', 'car0', 'car1', 'cdr0', 'cdr1',
    'cons0', 'cons1', 'cons2', 'cons3',
    'thunk0', 'thunk1', 'abs', 'num', 'unit',
    'freevar', 'par', 'block'];

LamMain.stepinfo = {
    freevar:{ text: "free variable: cannot reduce further.",
              sound: { type: 'beep', frequency: SoundPlayer.midicps (93) }
              //sound: { type: 'sample', url: 'sample1' }
            },
    op0:    { text: "nullary operator: execute and replace by result",
              sound: { type: 'beep', frequency: SoundPlayer.midicps (68) }
              //sound: { type: 'sample', url: 'sample2' }
            },
    op1_0:  { text: "unary operator: evaluate first sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (62) }
              sound: { type: 'sample', url: 'sample3' }
            },
    op1:    { text: "unary operator (evaluated): execute and replace by result",
              sound: { type: 'beep', frequency: SoundPlayer.midicps (69) }
              //sound: { type: 'sample', url: 'sample4' }
            },
    op2_0:  { text: "binary operator: evaluate sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (65) }
              sound: { type: 'sample', url: 'sounds/sample5.wav' }
            },
    op2:    { text: "binary operator (evaluated): execute and replace by result",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (70) }
              sound: { type: 'sample', url: 'sounds/sample6.wav' }
            },
    app0:   { text: "application: evaluate first sub-expression",
              //sound: { type: 'silence', frequency: SoundPlayer.midicps (69) }
              sound: { type: 'sample', url: 'sounds/sample7.wav' }
            },
    app1:   { text: "application: apply function to argument",
              //sound: { type: 'silence', frequency: SoundPlayer.midicps (71) }
              sound: { type: 'sample', url: 'sounds/sample8.wav' }
            },
    if0:    { text: "if: evaluate first sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (72) }
              sound: { type: 'sample', url: 'sounds/sample9.wav' }
            },
    if1:    { text: "evaluated if: replace by first or second sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (74) }
              sound: { type: 'sample', url: 'sounds/sample10.wav' }
            },
    rec:    { text: "recursion: replace name by thunk",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (76) }
              sound: { type: 'sample', url: 'sounds/sample11.wav' }
            },
    bind:   { text: "bind (const): return",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (77) }
              sound: { type: 'sample', url: 'sounds/sample12.wav' }
            },
    bind0:  { text: "bind (unevaluated): evaluate left sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (77) }
              sound: { type: 'sample', url: 'sounds/sample13.wav' }
            },
    bind1:  { text: "bind (evaluated): ??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (79) }
              sound: { type: 'sample', url: 'sounds/sample14.wav' }
            },
    iscons0:{ text: "pair constructor test: evaluate sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (81) }
              sound: { type: 'sample', url: 'sounds/sample15.wav' }
            },
    iscons1:{ text: "pair constructor test: return 0 or 1",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (83) }
              sound: { type: 'sample', url: 'sounds/sample16.wav' }
            },
    car0:   { text: "left-side pair deconstructor: evaluate left sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (84) }
              sound: { type: 'sample', url: 'sounds/sample17.wav' }
            },
    car1:    { text: "??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (48) }
              sound: { type: 'sample', url: 'sounds/sample18.wav' }
            },
    cdr0:   { text: "right-side pair deconstructor: evaluate right sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (50) }
              sound: { type: 'sample', url: 'sounds/sample19.wav' }
            },
    cdr1:    { text: "??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (52) }
              sound: { type: 'sample', url: 'sounds/sample20.wav' }
            },
    cons0:  { text: "pair constructor: return",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (53) }
              sound: { type: 'sample', url: 'sounds/sample21.wav' }
            },
    cons1:    { text: "??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (55) }
              sound: { type: 'sample', url: 'sounds/sample22.wav' }
            },
    cons2:    { text: "??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (57) }
              sound: { type: 'sample', url: 'sounds/sample23.wav' }
            },
    cons3:  { text: "??",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (59) }
              sound: { type: 'sample', url: 'sounds/sample24.wav' }
            },
    thunk0: { text: "unevaluated thunk: evaluate sub-expression",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (47) }
              sound: { type: 'sample', url: 'sounds/sample25.wav' }
            },
    thunk1: { text: "evaluated thunk: replace by value",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (45) }
              sound: { type: 'sample', url: 'sounds/sample26.wav' }
            },
    abs:    { text: "abstraction: return",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (43) }
              sound: { type: 'sample', url: 'sounds/sample27.wav' }
            },
    num:    { text: "number: return",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (86), dur: 0.15 }
              sound: { type: 'sample', url: 'sounds/sample28.wav' }
            },
    unit:   { text: "unit constructor: return",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (41) }
              sound: { type: 'sample', url: 'sounds/sample29.wav' }
            },
    par:    { text: "par",
              //sound: { type: 'beep', frequency: SoundPlayer.midicps (80) }
              sound: { type: 'sample', url: 'sounds/sample30.wav' }
            },
    block:  { text: "block",
              sound: { type: 'silence', frequency: SoundPlayer.midicps (20) }
            }
    };


LamMain.randomizeFrequencies = function () {
    var i = 0;
    var ns = [];
    for (var key in LamMain.stepinfo) {
        ns.push (i);
        i++;
    }
    for (var key in LamMain.stepinfo) {
        var ix = Math.floor (Math.random () * ns.length);
        var r = ns[ix];
        ns.splice (ix, 1);
        LamMain.stepinfo[key].sound.frequency = SoundPlayer.midicps (44 + r);
    }
};

LamMain.randomizeFrequencies();

LamMain.examples = [
    "# simple example \n" +
    "@ \\x.+ x 1 99"
    ,
    "# simple example \n" +
    "@@\\f.\\x.@f x \\x.+ x 1 99"
    ,
    "# simple example \n" +
    "@@\\f.\\x.@f @f x \\x.+ x 1 99"
    ,
    "# simple example \n" +
    "@ \\x. * x + x 1 - * + 1 1 - 4 2 1"
    ,
    "# computes the 11th fibonacci number \n" +
    "letrec drop = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then x \n" +
    "    else @ @ drop - n 1 cdr x \n" +
    "in \n" +
    "letrec add = \\x. \\y.  \n" +
    "  : + car x car y @ @ add cdr x cdr y \n" +
    "in \n" +
    "letrec fibs = : 0 : 1 @ @ add fibs cdr fibs \n" +
    "in  \n" +
    "let fib = \\n. car @ @ drop n fibs \n" +
    "in \n" +
    "@fib 10 \n"
    ,
    "# adds two fibonacci numbers \n" +
    "letrec drop = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then x \n" +
    "    else @ @ drop - n 1 cdr x \n" +
    "in \n" +
    "letrec add = \\x. \\y.  \n" +
    "  : + car x car y @ @ add cdr x cdr y \n" +
    "in \n" +
    "letrec fibs = : 0 : 1 @ @ add fibs cdr fibs \n" +
    "in  \n" +
    "let fib = \\n. car @ @ drop n fibs \n" +
    "in \n" +
    "+ @fib 20 @fib 40 \n"
    ,
    "# adds 16 fibonacci numbers \n" +
    "letrec drop = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then x \n" +
    "    else @ @ drop - n 1 cdr x \n" +
    "in \n" +
    "letrec add = \\x. \\y.  \n" +
    "  : + car x car y @ @ add cdr x cdr y \n" +
    "in \n" +
    "letrec fibs = : 0 : 1 @ @ add fibs cdr fibs \n" +
    "in  \n" +
    "let fib = \\n. car @ @ drop n fibs \n" +
    "in \n" +
    "+ \n" +
    "+ \n" +
    "+ + @fib 10 @fib 20 + @fib 30 @fib 40 \n" +
    "+ + @fib 50 @fib 60 + @fib 70 @fib 80 \n" +
    "+ \n" +
    "+ + @fib 80 @fib 70 + @fib 60 @fib 50 \n" +
    "+ + @fib 40 @fib 30 + @fib 20 @fib 10 \n"
    ,
    "# computes the prime numbers and prints them to the console \n" +
    "letrec printlist = \\xs.if iscons xs then bind put car xs \\x. @printlist cdr xs else return 0 in \n" +
    "letrec iter = \\n. : n @iter + n 1 in \n" +
    "let nums = @ iter 2 in  \n" +
    "letrec filter = \\p.\\list. \n" +
    "  if iscons list \n" +
    "  then \n" +
    "    let x = car list in \n" +
    "    let r = @@filter p cdr list in \n" +
    "    if @p x \n" +
    "    then : x r \n" +
    "    else r \n" +
    "  else  \n" +
    "    list \n" +
    "in \n" +
    "letrec sieve = \\list. \n" +
    "  let p = car list in \n" +
    "  let xs = cdr list in \n" +
    "  : p @ sieve @@ filter \\x. > % x p 0 list \n" +
    "in @printlist @ sieve nums \n"
    ,
    "# asks for a number N, creates a list\n" +
    "# of N random numbers between 0 and 100, \n" +
    "# then sorts the list and prints it \n" +
    "letrec append = \\x.\\y. \n" +
    "  if iscons x \n" +
    "    then : car x @@append cdr x y \n" +
    "    else y \n" +
    "in \n" +
    "letrec split = \\x.\\yss. \n" +
    "  if iscons yss \n" +
    "    then let lr = @@ split x cdr yss in \n" +
    "         if < car yss x \n" +
    "           then : (: car yss car lr) cdr lr \n" +
    "           else : car lr (: car yss cdr lr) \n" +
    "    else : 0 0\n" +
    "in \n" +
    "letrec qsort = \\xss. \n" +
    "  if iscons xss \n" +
    "    then let lr = @@ split car xss cdr xss in \n" +
    "         @@ append @ qsort car lr (: car xss @ qsort cdr lr) \n" +
    "    else 0 \n" +
    "in \n" +
    "letrec printlist = \\xs." +
    "  if iscons xs \n" +
    "    then bind put car xs \\x. \n" +
    "              @printlist cdr xs \n" +
    "    else return 0 \n" +
    "in \n" +
    "letrec randlist = \\n. \n" +
    "  if < n 1 \n" +
    "    then return 0 \n" +
    "    else bind random \\x. \n" +
    "         bind @randlist - n 1 \\r. \n" +
    "         return : round * x 100 r \n" +
    "in \n" +
    "bind get \\n.\n" +
    "bind @randlist n \\list. \n" +
    "@printlist @ qsort list \n"
    ,
    "# mutual recursive functions \n" +
    "letrec flipflop = : : 0 cdr flipflop : 1 car flipflop in \n" +
    "letrec printlist = \\xs.  if iscons xs  \n" +
    "    then bind put car xs \\x.  \n" +
    "              @printlist cdr xs  \n" +
    "    else return 0  \n" +
    "in  \n" +
    "@printlist car flipflop \n"
    ,
    "# parallel evaluation \n" +
    "letrec drop = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then x \n" +
    "    else @ @ drop - n 1 cdr x \n" +
    "in \n" +
    "letrec add = \\x. \\y.  \n" +
    "  : + car x car y @ @ add cdr x cdr y \n" +
    "in \n" +
    "letrec fibs = : 0 : 1 @ @ add fibs cdr fibs \n" +
    "in  \n" +
    "let fib = \\n. car @ @ drop n fibs \n" +
    "in \n" +
    "letrec a = \\x. @a x in \n" +
    "par @ a 1 \n" +
    "par @fib 10  \n" +
    "+ @fib 20 @fib 40 \n"
    ,
    "# standard functions \n" +
    "let id = \\x.x \n" +
    "in \n" +
    "let const = \\x.\\y.x \n" +
    "in \n" +
    "let succ = \\x. + x 1 \n" +
    "in \n" +
    "let compose = \\f.\\g.\\x. @f@g x \n" +
    "in \n" +
    "let flip = \\f.\\x.\\y.@@f y x \n" +
    "in \n" +
    "# list functions \n" +
    "let map = \\f.\\x. \n" +
    "  letrec aux = \\x. \n" +
    "    if iscons x \n" +
    "        then : @f car x @aux cdr x \n" +
    "    else 0 \n" +
    "  in @ aux x \n" +
    "in \n" +
    "let zipwith = \\f.\\x.\\y. \n" +
    "  letrec aux = \\x.\\y. \n" +
    "    if iscons x \n" +
    "      then if iscons y \n" +
    "        then : @@f car x car y @@aux cdr x cdr y \n" +
    "      else 0 \n" +
    "    else 0 \n" +
    "  in @@ aux x y \n" +
    "in \n" +
    "let foldr = \\f.\\x.\\a. \n" +
    "  letrec aux = \\a. \n" +
    "    if iscons a \n" +
    "      then @@f car a @aux cdr a \n" +
    "      else x \n" +
    "  in @aux a \n" +
    "in \n" +
    "let foldl = \\f.\\x.\\a. \n" +
    "  letrec aux = \\x.\\a. \n" +
    "    if iscons a \n" +
    "      then @@aux @@f x car a cdr a \n" +
    "      else x \n" +
    "  in @@aux x a \n" +
    "in \n" +
    "letrec filter = \\p.\\list. \n" +
    "  if iscons list \n" +
    "  then \n" +
    "    let x = car list in \n" +
    "    let r = @@filter p cdr list in \n" +
    "    if @p x \n" +
    "    then : x r \n" +
    "    else r \n" +
    "  else \n" +
    "    list \n" +
    "in \n" +
    "letrec take = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then 0 \n" +
    "    else : car x @ @ take - n 1 cdr x \n" +
    "in \n" +
    "letrec drop = \\n.\\x. \n" +
    "  if < n 1 \n" +
    "    then x \n" +
    "    else @ @ drop - n 1 cdr x \n" +
    "in \n" +
    "letrec repeat = \\x. : x @repeat x \n" +
    "in \n" +
    "let replicate = \\n.\\x. \n" +
    "  letrec aux = \\n. \n" +
    "    if < n 1 \n" +
    "      then 0 \n" +
    "      else : x @ aux - n 1 \n" +
    "  in @aux n \n" +
    "in \n" +
    "let reverse = \\x. \n" +
    "  letrec aux = \\r.\\x. \n" +
    "    if iscons x \n" +
    "      then @@aux : car x r cdr x \n" +
    "      else r \n" +
    "  in @@aux 0 x \n" +
    "in \n" +
    "letrec append = \\x.\\y. \n" +
    "  if iscons x \n" +
    "    then : car x @@append cdr x y \n" +
    "    else y \n" +
    "in \n" +
    "let iter = \\f.\\x. \n" +
    "  letrec aux = \\x. : x @aux @f x \n" +
    "  in @aux x \n" +
    "in \n" +
    "let sum = @@foldr \\x.\\y.+ x y 0 \n" +
    "in \n" +
    "let product = @@foldr \\x.\\y.* x y 0 \n" +
    "in \n" +
    "let length = @@foldr \\x.\\y.+ 1 y 0 \n" +
    "in \n" +
    "# IO functions \n" +
    "let mapm = \\f.\\x. \n" +
    "  letrec aux = \\x. \n" +
    "    if iscons x \n" +
    "      then bind @f car x \\a. \n" +
    "           bind @aux cdr x \\r. \n" +
    "           return : a r \n" +
    "      else return 0 \n" +
    "  in @aux x \n" +
    "in \n" +
    "let sequence = @mapm id \n" +
    "in \n" +
    "let mapmu = \\f.\\x. \n" +
    "  letrec aux = \\x. \n" +
    "    if iscons x \n" +
    "      then bind @f car x \\a. \n" +
    "           @aux cdr x \n" +
    "      else return 0 \n" +
    "  in @aux x \n" +
    "in \n" +
    "let randlist = \\n. @sequence @@replicate n random \n" +
    "in \n" +
    "let printlist = @ mapmu \\x.put x \n" +
    "in \n" +
    "#---------------------------------------------------- \n" +
    "let prims = \n" +
    "  letrec sieve = \\list. \n" +
    "    let p = car list in \n" +
    "    let xs = cdr list in \n" +
    "    : p @ sieve @@ filter \\x. > % x p 0 list \n" +
    "  in \n" +
    "  let nums = @@ iter succ 2 \n" +
    "  in @sieve nums \n" +
    "in \n" +
    "#---------------------------------------------------- \n" +
    "letrec fibs = : 0 : 1 @ @ @ zipwith \\x.\\y. + x y fibs cdr fibs \n" +
    "in \n" +
    "let fib = \\n. car @ @ drop n fibs \n" +
    "in \n" +
    "#---------------------------------------------------- \n" +
    "letrec qsplit = \\x.\\yss. \n" +
    "  if iscons yss \n" +
    "    then let lr = @@ qsplit x cdr yss in \n" +
    "         if < car yss x \n" +
    "           then : (: car yss car lr) cdr lr \n" +
    "           else : car lr (: car yss cdr lr) \n" +
    "    else : 0 0 \n" +
    "in \n" +
    "letrec qsort = \\xss. \n" +
    "  if iscons xss \n" +
    "    then let lr = @@ qsplit car xss cdr xss in \n" +
    "         @@ append @ qsort car lr (: car xss @ qsort cdr lr) \n" +
    "    else 0 \n" +
    "in \n" +
    "#---------------------------------------------------- \n" +
    "letrec insert = \\x.\\xs. \n" +
    "  if iscons xs \n" +
    "    then if > car xs x \n" +
    "      then : x xs \n" +
    "      else : car xs @@insert x cdr xs \n" +
    "    else : x 0 \n" +
    "in \n" +
    "let isort = \\xss. \n" +
    "  letrec aux = \\r.\\i. \n" +
    "    if iscons i \n" +
    "      then @@aux @@insert car i r cdr i \n" +
    "      else r \n" +
    "  in @@aux 0 xss \n" +
    "in \n" +
    "#---------------------------------------------------- \n" +
    "letrec parlist = \\list. \n" +
    "  if iscons list \n" +
    "    then let a = car list in \n" +
    "         let r = @parlist cdr list in \n" +
    "         par a par r \n" +
    "         : a r \n" +
    "    else 0 \n" +
    "in \n" +
    "# list of lists of random numbers \n" +
    "let m = @sequence @@replicate 3 @randlist 3 \n" +
    "in \n" +
    "let f = \\list. @sum @@@zipwith (\\x.\\y. let z = - x y in * z z) list @qsort list \n" +
    "in \n" +
    "bind m \\list. \n" +
    "bind put 99999999 \\d. \n" +
    "let r = @parlist @@map f list in \n" +
    "bind @printlist r \\d. \n" +
    "return 0 \n"
];


