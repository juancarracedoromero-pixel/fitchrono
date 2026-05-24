// FitChrono - Audio System using Web Audio API

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {
            console.warn('Web Audio API not supported');
        }
    }

    // Resume audio context (needed after user interaction)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Short beep - for minute transitions, interval switches
    beepShort() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = 880;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    // Long beep - for workout end
    beepLong() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = 440;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 1.0);
    }

    // Countdown beep - for 3-2-1
    beepCountdown() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = 1320;
        osc.type = 'square';
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    // Go beep - for start
    beepGo() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = 1760;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.4);
    }

    // Phase change beep - different for work vs rest
    beepWorkStart() {
        this.beepShort();
    }

    beepRestStart() {
        if (!this.enabled) return;
        this.init();
        this.resume();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = 660;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    vibrate(pattern) {
        if (!navigator.vibrate || !this.enabled) return;
        
        if (Array.isArray(pattern)) {
            navigator.vibrate(pattern);
        } else {
            navigator.vibrate(pattern);
        }
    }

    vibrateWork() {
        this.vibrate(200);
    }

    vibrateRest() {
        this.vibrate([100, 50, 100]);
    }

    vibrateEnd() {
        this.vibrate([500, 100, 500, 100, 500]);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setMute(muted) {
        this.enabled = !muted;
    }
}

const soundManager = new SoundManager();