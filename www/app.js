// FitChrono - Main App Controller

(function() {
    'use strict';

    // DOM Elements
    const screens = {
        home: document.getElementById('home'),
        timer: document.getElementById('timer-screen')
    };
    
    const overlays = {
        settings: document.getElementById('settings-overlay'),
        finished: document.getElementById('finished-overlay')
    };
    
    // State
    let currentWorkoutType = null;
    let currentConfig = {};
    let soundEnabled = true;
    let vibrationEnabled = true;
    let darkMode = true;

    // Initialize
    function init() {
        loadSettings();
        applyTheme();
        setupEventListeners();
        renderPresets();
        
        // Auto-select first workout type
        selectWorkoutType('emom');
    }

    function loadSettings() {
        const settings = storage.getSettings();
        darkMode = settings.darkMode;
        soundEnabled = settings.sound;
        vibrationEnabled = settings.vibration;
        
        document.getElementById('sound-toggle').checked = soundEnabled;
        document.getElementById('vibration-toggle').checked = vibrationEnabled;
        document.getElementById('dark-toggle').checked = darkMode;
    }

    function applyTheme() {
        if (darkMode) {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', 'light');
        }
        document.getElementById('theme-btn').textContent = darkMode ? '🌙' : '☀️';
    }

    function setupEventListeners() {
        // Workout type selection
        document.querySelectorAll('.workout-card').forEach(card => {
            card.addEventListener('click', () => {
                selectWorkoutType(card.dataset.type);
            });
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
        
        document.getElementById('dark-toggle').addEventListener('change', (e) => {
            darkMode = e.target.checked;
            storage.saveSetting('dark', darkMode);
            applyTheme();
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
        const configSection = document.getElementById('config-section');
        configSection.classList.remove('config-hidden');
        configSection.classList.add('config-visible');
        
        // Build config fields
        document.getElementById('config-title').textContent = 
            `${WORKOUT_TYPES[type].name} - ${WORKOUT_TYPES[type].description}`;
        document.getElementById('config-fields').innerHTML = buildConfigHTML(type);
    }

    function collectConfig() {
        const config = {};
        const inputs = document.querySelectorAll('#config-fields input');
        inputs.forEach(input => {
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
        
        // Update header label
        document.getElementById('workout-type-label').textContent = 
            WORKOUT_TYPES[currentWorkoutType].name;
        
        // Show/hide round button based on workout type
        const roundBtn = document.getElementById('round-btn');
        roundBtn.classList.toggle('visible', currentWorkoutType === 'amrap');
        
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
        
        // Handle countdown animation
        if (statusData.state === 'countdown') {
            timeMain.classList.add('countdown-number');
            timePhase.textContent = 'PREPÁRATE';
            timePhase.removeAttribute('data-phase');
            timeRounds.textContent = '';
            
            soundManager.beepCountdown();
            if (vibrationEnabled) soundManager.vibrate(50);
        } else {
            timeMain.classList.remove('countdown-number');
            
            if (statusData.isCountingUp) {
                // AMRAP / FOR TIME
                timeRounds.textContent = `Ronda ${statusData.roundCount}`;
                timePhase.textContent = 'EN CURSO';
                timePhase.setAttribute('data-phase', 'work');
            } else {
                // EMOM, Tabata, Interval
                const totalRounds = statusData.totalRounds || statusData.config.rounds || 0;
                timeRounds.textContent = `Ronda ${statusData.rounds}/${totalRounds}`;
                timePhase.textContent = statusData.phase === 'rest' ? 'DESCANSO' : 'TRABAJO';
                timePhase.setAttribute('data-phase', statusData.phase);
            }
        }
        
        // Update timer display background
        timerDisplay.setAttribute('data-state', statusData.state);
        if (statusData.state === 'paused') {
            timerDisplay.setAttribute('data-state', 'paused');
        }
    }

    function handlePhaseChange(phase, round) {
        if (phase === 'work') {
            soundManager.beepWorkStart();
            if (vibrationEnabled) soundManager.vibrateWork();
        } else {
            soundManager.beepRestStart();
            if (vibrationEnabled) soundManager.vibrateRest();
        }
    }

    function handleMinuteMark(round) {
        soundManager.beepShort();
        if (vibrationEnabled) soundManager.vibrate(200);
    }

    function handleWorkoutFinished(result) {
        soundManager.beepLong();
        if (vibrationEnabled) soundManager.vibrateEnd();
        
        // Show finished overlay
        document.getElementById('final-time').textContent = 
            timer.formatTime(result.time);
        
        if (currentWorkoutType === 'amrap') {
            document.getElementById('final-rounds').textContent = 
                `${result.rounds} rondas completadas`;
        } else if (currentWorkoutType === 'fortime') {
            document.getElementById('final-rounds').textContent = 
                `Time cap: ${result.config.cap} min`;
        } else {
            document.getElementById('final-rounds').textContent = 
                `${result.rounds} rondas completadas`;
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
        soundEnabled = !soundEnabled;
        soundManager.setEnabled(soundEnabled);
        document.getElementById('mute-btn').textContent = soundEnabled ? '🔊' : '🔇';
    }

    function renderPresets() {
        const presets = storage.getPresets();
        const list = document.getElementById('presets-list');
        
        if (presets.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Sin presets guardados</p>';
            return;
        }
        
        list.innerHTML = presets.map(preset => `
            <div class="preset-item" data-id="${preset.id}">
                <div>
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-info">${WORKOUT_TYPES[preset.type]?.name || preset.type} - ${preset.configMinutes || ''} min</div>
                </div>
                <button class="delete-btn" data-delete="${preset.id}">✕</button>
            </div>
        `).join('');
        
        // Preset click handlers
        list.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    const id = e.target.dataset.delete;
                    storage.deletePreset(id);
                    renderPresets();
                    return;
                }
                // Load preset
                const preset = presets.find(p => p.id === item.dataset.id);
                if (preset) {
                    selectWorkoutType(preset.type);
                    // Fill in values
                    Object.entries(preset.config).forEach(([key, value]) => {
                        const input = document.getElementById(key);
                        if (input) input.value = value;
                    });
                }
            });
        });
    }

    // Expose for debugging
    window.FitChrono = {
        timer,
        storage,
        soundManager
    };

    // Start app
    document.addEventListener('DOMContentLoaded', init);
})();