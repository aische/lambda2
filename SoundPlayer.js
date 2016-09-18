function SoundPlayer () {
    this.audiocontext = new AudioContext ();
    this.destination = this.audiocontext.createGain ();
    this.destination.connect (this.audiocontext.destination);
    this.destination.gain.value = 0.5;
}

SoundPlayer.midicps = function (note) {
    var y = Math.pow (2, note / 12) * 8.1757989156437;
    return y;
};

SoundPlayer.prototype.playSynth = function (obj) {
    switch (obj.synth) {
        case 'beep':
            this.beep (obj.frequency, obj.dur);
            return;
    }

};

SoundPlayer.prototype.beep = function (freq, dur) {
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


SoundPlayer.prototype.beep2 = function (freq, osctype, dur) {
    dur = dur || 0.1;
    dur += (Math.random () * 0.1);
    var osc = this.audiocontext.createOscillator  ();
    var osc2 = this.audiocontext.createOscillator  ();
    var gain = this.audiocontext.createGain ();
    var filt = this.audiocontext.createBiquadFilter ();
    filt.type = "lowpass";
    filt.frequency.value = 100;
    gain.gain.value = 0.1;
    osc.type = osctype || "sine";
    osc.frequency.value = freq;
    osc.connect (filt);
    osc2.type = osctype || "sine";
    osc2.frequency.value = freq * 2;
    osc2.connect (filt);
    filt.connect (gain);
    gain.connect (this.destination);
    var now = this.audiocontext.currentTime;
    osc.start (now);
    osc.stop (now + dur);
    osc2.start (now);
    osc2.stop (now + dur);
    gain.gain.setValueAtTime (0, now);
    gain.gain.linearRampToValueAtTime (0.24, now + 0.01);
    gain.gain.linearRampToValueAtTime (0.1, now + 0.02);
    gain.gain.linearRampToValueAtTime (0, now + dur);
    filt.frequency.setValueAtTime (freq, now);
    filt.frequency.exponentialRampToValueAtTime (3*freq, now+0.05);
    filt.frequency.linearRampToValueAtTime (1.5*freq, now + dur);
};

SoundPlayer.prototype.silence = function () {
};

