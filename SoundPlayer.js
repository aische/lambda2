
function SoundPlayer () {
    this.audiocontext = new (window.AudioContext || window.webkitAudioContext)();
    this.destination = this.audiocontext.createGain ();
    this.destination.connect (this.audiocontext.destination);
    this.destination.gain.value = 0.0;
    
    this.sounds = {};
}

SoundPlayer.midicps = function (note) {
    var y = Math.pow (2, note / 12) * 8.1757989156437;
    return y;
};

SoundPlayer.prototype.fetchAudioAsBuffer = function (url, callback) {
	var context = this.audiocontext;
    var xhr = new XMLHttpRequest();
    xhr.open ('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (){
        context.decodeAudioData (xhr.response, function(buffer) {
            callback (buffer);
        });
    };
    xhr.send();
}

SoundPlayer.prototype.removeSound = function (key) {
	delete this.sounds[key];
}

SoundPlayer.prototype.setSoundBeep = function (key, note, dur) {
	this.sounds[key] = { type: "beep", frequency: SoundPlayer.midicps(note), dur: dur };
}

SoundPlayer.prototype.setSoundSample = function (key, url) {
		var self = this;
		this.fetchAudioAsBuffer(url, function (buffer){
		self.sounds[key] = { type: "sample", buffer:buffer };
	});
}

SoundPlayer.prototype.playSound = function (key) {
	if (this.sounds[key]) {
		var obj = this.sounds[key];
		switch (obj.type) {
			case 'beep':
				this.playBeep (obj.frequency, obj.dur);
				return;
			case 'sample':
				this.playBuffer (obj.buffer);
				return;
		}
	}
}

SoundPlayer.prototype.playBuffer = function (buffer) {
    var source = this.audiocontext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.destination);
    source.start(0);
}

SoundPlayer.prototype.playBeep = function (freq, dur) {
    dur = dur || 0.1;
    dur += (Math.random () * 0.1);
    var am = freq / 10000;
    var osc = this.audiocontext.createOscillator  ();
    var osc2 = this.audiocontext.createOscillator  ();
    var gain = this.audiocontext.createGain ();
    var filt = this.audiocontext.createBiquadFilter ();
    filt.type = "lowpass";
    filt.frequency.value = 100;
    gain.gain.value = 0.1;
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect (filt);
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    osc2.connect (filt);
    filt.connect (gain);
    gain.connect (this.destination);
    var now = this.audiocontext.currentTime;
    osc.start (now);
    osc.stop (now + dur);
    osc2.start (now + (0.005 * Math.random ()));
    osc2.stop (now + dur);
    gain.gain.setValueAtTime (0, now);
    gain.gain.linearRampToValueAtTime (0.24-am, now + 0.01);
    gain.gain.linearRampToValueAtTime (0.1, now + 0.02);
    gain.gain.linearRampToValueAtTime (0, now + dur);
    filt.frequency.setValueAtTime (2*freq, now);
    filt.frequency.exponentialRampToValueAtTime (3*freq+100, now+0.02);
    filt.frequency.linearRampToValueAtTime (1.5*freq, now + dur);
};

SoundPlayer.prototype.shuffleSamples = function () {
    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    var arr = [];
    var keys = [];
    for (var k in this.sounds) {
        keys.push(k);
        arr.push(this.sounds[k]);
    }
    arr = shuffle(arr);
    this.sounds = {};
    for (var i=0; i<arr.length; i++) {
        var key = keys[i];
        this.sounds[key] = arr[i];
    }
}
