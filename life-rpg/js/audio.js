/* ===== audio.js — Web Audio API 8-bit sound synth ===== */
const AudioFX = (() => {
  let ctx = null;
  let soundEnabled = true;

  function init() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function setEnabled(enabled) {
    soundEnabled = !!enabled;
  }

  function isEnabled() {
    return soundEnabled;
  }

  function playTone(freq, type = 'square', duration = 0.1, gainVal = 0.12, startDelay = 0) {
    if (!soundEnabled) return;
    init();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + startDelay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Ignore audio context autoplay quirks
    }
  }

  return {
    init,
    setEnabled,
    isEnabled,

    // Button click / UI tick
    click() {
      playTone(600, 'triangle', 0.04, 0.05);
    },

    // XP gained
    xpGain() {
      playTone(523.25, 'triangle', 0.06, 0.1, 0);       // C5
      playTone(659.25, 'triangle', 0.08, 0.1, 0.05);    // E5
      playTone(783.99, 'sine', 0.12, 0.12, 0.1);        // G5
    },

    // Level up fanfare!
    levelUp() {
      const notes = [
        { f: 440.00, d: 0.12 },  // A4
        { f: 554.37, d: 0.12 },  // C#5
        { f: 659.25, d: 0.14 },  // E5
        { f: 880.00, d: 0.35 },  // A5
      ];
      let delay = 0;
      notes.forEach(n => {
        playTone(n.f, 'square', n.d, 0.12, delay);
        playTone(n.f / 2, 'sawtooth', n.d, 0.06, delay);
        delay += n.d * 0.85;
      });
    },

    // Boss damage hit
    bossHit() {
      if (!soundEnabled) return;
      init();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    },

    // Quest or challenge complete
    questComplete() {
      playTone(587.33, 'triangle', 0.08, 0.1, 0);     // D5
      playTone(739.99, 'triangle', 0.08, 0.1, 0.08);  // F#5
      playTone(880.00, 'sine', 0.2, 0.12, 0.16);      // A5
    },

    // Character interaction poke
    poke() {
      playTone(330, 'sine', 0.07, 0.12, 0);
      playTone(493.88, 'sine', 0.09, 0.12, 0.06);
    },

    // Inactivity penalty
    penalty() {
      playTone(280, 'sawtooth', 0.18, 0.12, 0);
      playTone(200, 'sawtooth', 0.28, 0.15, 0.14);
    }
  };
})();
