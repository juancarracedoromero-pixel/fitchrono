// FitChrono - Core Timer Engine

class WorkoutTimer {
    constructor() {
        this.intervalId = null;
        this.state = 'idle'; // idle, countdown, running, paused, finished
        this.workoutType = null;
        this.config = {};
        this.currentTime = 0; // seconds elapsed or remaining
        this.currentRound = 1;
        this.currentPhase = 'work';
        this.roundCount = 0;
        this.phaseTime = 0; // time in current phase
        this.lastBeepMinute = -1;
        this.isCountingUp = false;
        
        // Callbacks
        this.onTick = null;
        this.onPhaseChange = null;
        this.onMinuteMark = null;
        this.onFinished = null;
    }

    init(type, config) {
        this.workoutType = type;
        this.config = config;
        this.reset();
    }

    reset() {
        this.stop();
        this.state = 'idle';
        this.currentTime = 0;
        this.currentRound = 1;
        this.currentPhase = 'work';
        this.roundCount = 0;
        this.phaseTime = 0;
        this.lastBeepMinute = -1;
        this.isCountingUp = false;
    }

    start() {
        if (this.state === 'idle') {
            this.state = 'countdown';
            this.currentTime = 3; // 3 second countdown
            this.runCountdown();
        } else if (this.state === 'paused') {
            this.resume();
        }
    }

    runCountdown() {
        this.intervalId = setInterval(() => {
            this.currentTime--;
            
            if (this.onTick) {
                this.onTick(this.getTimeDisplay(), this.getStatusData());
            }
            
            if (this.currentTime <= 0) {
                clearInterval(this.intervalId);
                this.startWorkout();
            }
        }, 1000);
    }

    startWorkout() {
        this.state = 'running';
        this.phaseTime = 0;
        
        // Set initial time based on workout type
        switch(this.workoutType) {
            case 'emom':
                this.currentTime = this.config.minutes * 60;
                this.isCountingUp = false;
                break;
            case 'tabata':
            case 'interval':
                this.currentTime = this.config.work;
                this.currentPhase = 'work';
                this.isCountingUp = false;
                break;
            case 'amrap':
            case 'fortime':
                this.currentTime = 0;
                this.isCountingUp = true;
                break;
            case 'countdown':
                this.currentTime = this.config.seconds;
                this.isCountingUp = false;
                break;
        }
        
        this.runTimer();
    }

    runTimer() {
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        if (this.isCountingUp) {
            this.currentTime++;
        } else {
            this.currentTime--;
        }
        
        this.phaseTime++;
        
        // Check for EMOM minute mark
        if (this.workoutType === 'emom' && !this.isCountingUp) {
            const currentMinute = Math.floor(this.phaseTime / 60);
            if (currentMinute > this.lastBeepMinute && this.phaseTime % 60 === 0) {
                this.lastBeepMinute = currentMinute;
                if (this.onMinuteMark) this.onMinuteMark(this.currentRound);
            }
        }
        
        // Check for phase transitions (Tabata, Interval)
        if ((this.workoutType === 'tabata' || this.workoutType === 'interval') && !this.isCountingUp) {
            if (this.currentTime <= 0) {
                this.advancePhase();
            }
        }
        
        // Check for workout end (countdown modes)
        if (!this.isCountingUp && this.currentTime <= 0) {
            this.finish();
            return;
        }
        
        // Check for AMRAP/FORTIME cap
        if ((this.workoutType === 'amrap' || this.workoutType === 'fortime') && !this.isCountingUp) {
            // These use counting up, so we check differently
        }
        
        if (this.onTick) {
            this.onTick(this.getTimeDisplay(), this.getStatusData());
        }
    }

    advancePhase() {
        if (this.currentPhase === 'work') {
            // Work phase ended
            this.currentRound++;
            this.roundCount++;
            this.currentPhase = 'rest';
            this.currentTime = this.config.rest;
            this.phaseTime = 0;
            
            if (this.onPhaseChange) this.onPhaseChange('rest', this.currentRound);
            
            // Check if workout complete
            if (this.currentRound > this.config.rounds) {
                this.finish();
                return;
            }
        } else {
            // Rest phase ended, start work
            this.currentPhase = 'work';
            this.currentTime = this.config.work;
            this.phaseTime = 0;
            
            if (this.onPhaseChange) this.onPhaseChange('work', this.currentRound);
        }
    }

    pause() {
        if (this.state === 'running') {
            this.state = 'paused';
            clearInterval(this.intervalId);
        }
    }

    resume() {
        if (this.state === 'paused') {
            this.state = 'running';
            this.runTimer();
        }
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.state = 'idle';
    }

    finish() {
        clearInterval(this.intervalId);
        this.state = 'finished';
        if (this.onFinished) {
            this.onFinished({
                type: this.workoutType,
                time: this.currentTime,
                totalTime: this.getTotalTime(),
                rounds: this.roundCount,
                config: this.config
            });
        }
    }

    addRound() {
        if (this.workoutType === 'amrap') {
            this.roundCount++;
            if (this.onTick) {
                this.onTick(this.getTimeDisplay(), this.getStatusData());
            }
        }
    }

    getTimeDisplay() {
        if (this.state === 'countdown') {
            return this.currentTime.toString();
        }
        
        if (this.isCountingUp) {
            return this.formatTime(this.currentTime);
        } else {
            return this.formatTime(this.currentTime);
        }
    }

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getStatusData() {
        return {
            state: this.state,
            type: this.workoutType,
            time: this.currentTime,
            rounds: this.currentRound,
            totalRounds: this.config.rounds || 0,
            phase: this.currentPhase,
            phaseTime: this.phaseTime,
            roundCount: this.roundCount,
            isCountingUp: this.isCountingUp,
            config: this.config
        };
    }

    getTotalTime() {
        switch(this.workoutType) {
            case 'emom':
                return this.config.minutes * this.config.rounds;
            case 'tabata':
                return this.config.rounds * (this.config.work + this.config.rest);
            case 'amrap':
            case 'fortime':
                return this.config.cap * 60;
            case 'countdown':
                return this.config.seconds;
            case 'interval':
                return this.config.rounds * (this.config.work + this.config.rest);
            default:
                return 0;
        }
    }

    isFinished() {
        return this.state === 'finished';
    }
}

const timer = new WorkoutTimer();