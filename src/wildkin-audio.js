export class WildkinAudio {
  constructor(volume = 0.65) {
    this.volume = volume;
    this.context = null;
    this.master = null;
    this.ambience = null;
    this.ambienceStarted = false;
  }

  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.ambienceStarted) this.startAmbience();
    return true;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.03);
  }

  tone({ frequency = 440, duration = 0.12, gain = 0.08, type = 'sine', slide = 1, delay = 0 } = {}) {
    if (!this.context || !this.master || this.volume <= 0) return;
    const at = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * slide), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.025, duration * .3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(at);
    oscillator.stop(at + duration + .03);
  }

  noise({ duration = 0.08, gain = 0.04, filter = 800, delay = 0 } = {}) {
    if (!this.context || !this.master || this.volume <= 0) return;
    const at = this.context.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
    const source = this.context.createBufferSource();
    const lowpass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = buffer;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = filter;
    envelope.gain.setValueAtTime(gain, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(lowpass);
    lowpass.connect(envelope);
    envelope.connect(this.master);
    source.start(at);
  }

  startAmbience() {
    if (!this.context || this.ambienceStarted) return;
    this.ambienceStarted = true;
    const gain = this.context.createGain();
    gain.gain.value = .018;
    gain.connect(this.master);
    const low = this.context.createOscillator();
    const high = this.context.createOscillator();
    low.type = 'sine'; low.frequency.value = 93;
    high.type = 'sine'; high.frequency.value = 139.5;
    low.connect(gain); high.connect(gain);
    low.start(); high.start();
    this.ambience = { gain, low, high };
  }

  gather(type) {
    const frequencies = { wood: 170, stone: 115, fiber: 510, food: 690, ore: 240 };
    this.tone({ frequency: frequencies[type] ?? 330, duration: .08, gain: .055, type: type === 'stone' || type === 'ore' ? 'square' : 'triangle', slide: .82 });
    this.noise({ duration: .045, gain: .025, filter: type === 'stone' ? 500 : 1300 });
  }

  craft(tier = 1) {
    [0, 1, 2].forEach((index) => this.tone({ frequency: 260 * (1 + index * .26) * tier ** .12, duration: .12, gain: .05, type: 'triangle', slide: 1.08, delay: index * .075 }));
  }

  shoot(tier = 1) {
    this.noise({ duration: .06 + tier * .025, gain: .05 + tier * .012, filter: 900 + tier * 350 });
    this.tone({ frequency: tier === 1 ? 210 : tier === 2 ? 140 : 310, duration: .09, gain: .045, type: tier === 3 ? 'sawtooth' : 'square', slide: .56 });
  }

  hit() { this.tone({ frequency: 92, duration: .08, gain: .065, type: 'square', slide: .72 }); }
  hurt() { this.tone({ frequency: 150, duration: .18, gain: .07, type: 'sawtooth', slide: .48 }); }
  eat() { this.tone({ frequency: 420, duration: .09, gain: .04, type: 'triangle', slide: 1.2 }); this.tone({ frequency: 530, duration: .08, gain: .035, type: 'triangle', delay: .08 }); }

  tether(knot = 0) {
    this.tone({ frequency: 320 + knot * 110, duration: .18, gain: .05, type: 'sine', slide: 1.22 });
    this.noise({ duration: .07, gain: .018, filter: 1800 + knot * 400 });
  }

  bond() {
    [392, 494, 587, 784].forEach((frequency, index) => this.tone({ frequency, duration: .38, gain: .045, type: 'sine', slide: 1.02, delay: index * .09 }));
  }

  creature(speciesId, mood = 'idle') {
    const gain = mood === 'attack' ? .058 : .038;
    if (speciesId === 'burramble') {
      this.noise({ duration: .11, gain: gain * .55, filter: 1900 });
      this.tone({ frequency: 370, duration: .12, gain, type: 'triangle', slide: mood === 'attack' ? .72 : 1.18 });
    } else if (speciesId === 'flintusk') {
      this.noise({ duration: .08, gain: gain * .65, filter: 480 });
      this.tone({ frequency: 108, duration: .16, gain, type: 'square', slide: .78 });
    } else if (speciesId === 'coaloon') {
      this.noise({ duration: .13, gain: gain * .45, filter: 750 });
      this.tone({ frequency: 196, duration: .2, gain, type: 'sawtooth', slide: mood === 'attack' ? .63 : .88 });
    } else if (speciesId === 'wickerwing') {
      this.noise({ duration: .09, gain: gain * .35, filter: 2600 });
      this.tone({ frequency: 760, duration: .14, gain, type: 'sine', slide: mood === 'attack' ? .52 : .84 });
    } else if (speciesId === 'rippletail') {
      this.tone({ frequency: 480, duration: .18, gain, type: 'sine', slide: mood === 'attack' ? 1.42 : 1.16 });
      this.tone({ frequency: 610, duration: .12, gain: gain * .6, type: 'sine', slide: .88, delay: .06 });
    }
  }

  worker() { this.tone({ frequency: 280, duration: .07, gain: .03, type: 'triangle', slide: .9 }); }
  deposit() { this.tone({ frequency: 230, duration: .09, gain: .04, type: 'square', slide: .82 }); this.tone({ frequency: 460, duration: .12, gain: .035, type: 'triangle', delay: .07 }); }

  hatch() {
    [330, 415, 523, 659, 784].forEach((frequency, index) => this.tone({ frequency, duration: .45, gain: .04, type: 'sine', slide: 1.04, delay: index * .075 }));
  }

  guardian() { this.tone({ frequency: 72, duration: .55, gain: .12, type: 'sawtooth', slide: .78 }); }
  victory() {
    [196, 247, 294, 392, 494, 588].forEach((frequency, index) => this.tone({ frequency, duration: .7, gain: .048, type: 'sine', slide: 1.01, delay: index * .12 }));
  }
}
