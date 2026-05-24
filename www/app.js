// FitChrono v2 - Main App Controller

(function() {
    'use strict';

    // State
    let currentWorkoutType = null;
    let currentConfig = {};
    let soundEnabled = true;
    let vibrationEnabled = true;
    let muteEnabled = false;

    // DOM refs
    const screens = {
        home: document.getElementById('home'),
        timer: document.getElementById('timer-screen')
    };
    
    const overlays = {
        settings: document.getElementById('settings-overlay'),
        finished: document.getElementById('finished-overlay')
    };
    
    const screenFlash = document.getElementById('screen-flash');

    // Initialize
    function init() {
        loadSettings();
        setupEventListeners();
        renderPresets();
        selectWorkoutType('emom');
        
        // Pre-init audio context on first touch
        document.addEventListener('touchstart', () => soundManager.init(), { once: true });
        document.addEventListener('click', () => soundManager.init(), { once: true });
    }

    function loadSettings() {
        const settings = storage.getSettings();
        soundEnabled = settings.sound;
        vibrationEnabled = settings.vibration;
        
        document.getElementById('sound-toggle').checked = soundEnabled;
        document.getElementById('vibration-toggle').checked = vibrationEnabled;
    }

    function setupEventListeners() {
        // Workout type selection
        document.querySelectorAll('.workout-card').forEach(card => {
            card.addEventListener('click', () => selectWorkoutType(card.dataset.type));
            card.addEventListener('touchstart', () => {}, { once: true }); // fast response
        });

        // Start button
        document.getElementById('start-btn').addEventListener('click', startWorkout);

        // Timer controls
        document.getElementById('pause-btn').addEventListener('click', togglePause);
        document.getElementById('stop-btn').addEventListener('click', stopWorkout);
        document.getElementById('round-btn').addEventListener('click', addRound);
        document.getElementById('back-btn').addEventListener('click', goHome);

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => toggleOverlay('settings', true));
        document.getElementById('close-settings').addEventListener('click', () => toggleOverlay('settings', false));
        
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
            storage.saveSetting('sound', soundEnabled);
            soundManager.setEnabled(soundEnabled);
        });
        
        document.getElementById('vibration-toggle').addEventListener('change', (e) => {
            vibrationEnabled = e.target.checked;
            storage.saveSetting('vibration', vibrationEnabled);
        });
        
        document.getElementById('mute-btn').addEventListener('click', toggleMute);

        // Finished overlay
        document.getElementById('done-btn').addEventListener('click', goHome);
    }

    function selectWorkoutType(type) {
        currentWorkoutType = type;
        
        // Update card selection
        document.querySelectorAll('.workout-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });
        
        // Show config section
        document.getElementById('config-section').classList.add('visible');
        
        // Build config fields
        document.getElementById('config-title').textContent = WORKOUT_TYPES[type].description;
        document.getElementById('config-fields').innerHTML = buildConfigHTML(type);
    }

    function collectConfig() {
        const config = {};
        document.querySelectorAll('#config-fields input').forEach(input => {
            config[input.id] = parseInt(input.value) || 0;
        });
        return config;
    }

    function startWorkout() {
        currentConfig = collectConfig();
        
        // Initialize timer
        timer.init(currentWorkoutType, currentConfig);
        
        // Setup callbacks
        timer.onTick = updateTimerDisplay;
        timer.onPhaseChange = handlePhaseChange;
        timer.onMinuteMark = handleMinuteMark;
        timer.onFinished = handleWorkoutFinished;
        
        // Switch to timer screen
        switchScreen('timer');
        
        // Update header
        document.getElementById('workout-type-label').textContent = WORKOUT_TYPES[currentWorkoutType].name;
        
        // Show/hide round button
        document.getElementById('round-btn').classList.toggle('visible', currentWorkoutType === 'amrap');
        
        // Start timer
        soundManager.init();
        timer.start();
    }

    function updateTimerDisplay(timeDisplay, statusData) {
        const timeMain = document.getElementById('time-main');
        const timeRounds = document.getElementById('time-rounds');
        const timePhase = document.getElementById('time-phase');
        const timerDisplay = document.getElementById('timer-display');
        
        timeMain.textContent = timeDisplay;
        
        // Remove previous state classes
        timerDisplay.removeAttribute('data-phase');
        timerDisplay.removeAttribute('data-state');
        timeMain.classList.remove('countdown-anim', 'blink');
        timePhase.classList.remove('work', 'rest', 'paused', 'countdown');
        
        if (statusData.state === 'countdown') {
            // Countdown state
            timeMain.classList.add('countdown-anim');
            timePhase.textContent = statusData.currentTime;
            timePhase.classList.add('countdown');
            timeRounds.textContent = '';
            
            soundManager.beepCountdown();
            if (vibrationEnabled) soundManager.vibrate(50);
            
        } else if (statusData.state === 'paused') {
            // Paused state
            timeMain.classList.add('blink');
            timePhase.textContent = 'PAUSADO';
            timePhase.classList.add('paused');
            timerDisplay.setAttribute('data-state', 'paused');
            timeRounds.textContent = `Ronda ${statusData.rounds || 1}`;
            
        } else if (statusData.state === 'running') {
            // Running state
            if (statusData.isCountingUp) {
                // AMRAP / FOR TIME
                timeRounds.textContent = `Ronda ${statusData.roundCount}`;
                timePhase.textContent = 'EN CURSO';
                timePhase.classList.add('work');
                timerDisplay.setAttribute('data-phase', 'work');
            } else {
                // EMOM, Tabata, Interval
                const totalRounds = statusData.config.rounds || statusData.totalRounds || 0;
                timeRounds.textContent = `Ronda ${statusData.rounds}/${totalRounds}`;
                
                if (statusData.phase === 'rest') {
                    timePhase.textContent = 'DESCANSO';
                    timePhase.classList.add('rest');
                    timerDisplay.setAttribute('data-phase', 'rest');
                } else {
                    timePhase.textContent = 'TRABAJO';
                    timePhase.classList.add('work');
                    timerDisplay.setAttribute('data-phase', 'work');
                }
            }
        }
    }

    function flashScreen(phase) {
        screenFlash.className = phase;
        screenFlash.classList.add('active');
        setTimeout(() => screenFlash.classList.remove('active'), 200);
    }

    function handlePhaseChange(phase, round) {
        if (phase === 'work') {
            soundManager.beepWorkStart();
            if (vibrationEnabled) soundManager.vibrateWork();
            flashScreen('work');
        } else {
            soundManager.beepRestStart();
            if (vibrationEnabled) soundManager.vibrateRest();
            flashScreen('rest');
        }
    }

    function handleMinuteMark(round) {
        soundManager.beepShort();
        if (vibrationEnabled) soundManager.vibrate(200);
        flashScreen('work');
    }

    function handleWorkoutFinished(result) {
        soundManager.beepLong();
        if (vibrationEnabled) soundManager.vibrateEnd();
        flashScreen('work');
        
        // Show finished overlay
        document.getElementById('final-time').textContent = timer.formatTime(result.time);
        
        if (currentWorkoutType === 'amrap') {
            document.getElementById('final-rounds').textContent = `${result.roundCount} rondas completadas`;
        } else {
            document.getElementById('final-rounds').textContent = `${result.rounds || result.roundCount} rondas`;
        }
        
        toggleOverlay('finished', true);
    }

    function togglePause() {
        const btn = document.getElementById('pause-btn');
        if (timer.state === 'running') {
            timer.pause();
            btn.textContent = '▶ REANUDAR';
        } else if (timer.state === 'paused') {
            timer.resume();
            btn.textContent = '⏸ PAUSA';
        }
    }

    function stopWorkout() {
        timer.stop();
        goHome();
    }

    function addRound() {
        timer.addRound();
    }

    function goHome() {
        timer.stop();
        switchScreen('home');
        toggleOverlay('finished', false);
        toggleOverlay('settings', false);
    }

    function switchScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function toggleOverlay(overlayName, show) {
        if (overlays[overlayName]) {
            overlays[overlayName].classList.toggle('active', show);
        }
    }

    function toggleMute() {
        muteEnabled = !muteEnabled;
        soundManager.setEnabled(!muteEnabled);
        document.getElementById('mute-btn').textContent = muteEnabled ? '🔇' : '🔊';
    }

    function renderPresets() {
        const presets = storage.getPresets();
        const list = document.getElementById('presets-list');
        
        if (presets.length === 0) {
            list.innerHTML = '';
            return;
        }
        
        list.innerHTML = presets.map(preset => `
            <div class="preset-item" data-id="${preset.id}">
                <div>
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-info">${WORKOUT_TYPES[preset.type]?.name || preset.type}</div>
                </div>
                <button class="delete-btn" data-delete="${preset.id}">✕</button>
            </div>
        `).join('');
        
        list.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    storage.deletePreset(e.target.dataset.delete);
                    renderPresets();
                    return;
                }
                const preset = presets.find(p => p.id === item.dataset.id);
                if (preset) {
                    selectWorkoutType(preset.type);
                    Object.entries(preset.config).forEach(([key, value]) => {
                        const input = document.getElementById(key);
                        if (input) input.value = value;
                    });
                }
            });
        });
    }

    // Expose for debugging
    window.FitChrono = { timer, storage, soundManager };

    document.addEventListener('DOMContentLoaded', init);
})();