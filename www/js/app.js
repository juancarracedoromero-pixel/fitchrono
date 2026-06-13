// FitChrono - Main App Controller v2

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
    let lastPhase = null;

    // Ring circumference (2 * PI * r where r=130)
    const RING_CIRCUMFERENCE = 2 * Math.PI * 130; // ≈ 816.8

    function init() {
        loadSettings();
        applyTheme();
        setupEventListeners();
        renderPresets();
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
            card.addEventListener('click', () => selectWorkoutType(card.dataset.type));
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

        // Stepper buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('stepper-btn')) {
                const field = e.target.dataset.field;
                const delta = parseInt(e.target.dataset.delta);
                const input = document.getElementById(field);
                if (input) {
                    const step = parseInt(input.dataset.step) || 1;
                    const newVal = Math.max(parseInt(input.min) || 0, 
                        Math.min(parseInt(input.max) || Infinity, parseInt(input.value || 0) + delta));
                    input.value = newVal;
                }
            }
        });
    }

    function selectWorkoutType(type) {
        currentWorkoutType = type;
        
        document.querySelectorAll('.workout-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });
        
        const configSection = document.getElementById('config-section');
        configSection.classList.remove('config-hidden');
        configSection.classList.add('config-visible');
        
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
        lastPhase = null;
        
        timer.init(currentWorkoutType, currentConfig);
        
        timer.onTick = updateTimerDisplay;
        timer.onPhaseChange = handlePhaseChange;
        timer.onMinuteMark = handleMinuteMark;
        timer.onFinished = handleWorkoutFinished;
        
        switchScreen('timer');
        
        document.getElementById('workout-type-label').textContent = 
            WORKOUT_TYPES[currentWorkoutType].name;
        
        const roundBtn = document.getElementById('round-btn');
        roundBtn.classList.toggle('visible', currentWorkoutType === 'amrap');
        
        // Reset ring
        updateRing(1, 'work');
        
        soundManager.init();
        timer.start();
    }

    function updateTimerDisplay(timeDisplay, statusData) {
        const timeMain = document.getElementById('time-main');
        const timeRounds = document.getElementById('time-rounds');
        const timePhase = document.getElementById('time-phase');
        const timerDisplay = document.getElementById('timer-display');
        
        timeMain.textContent = timeDisplay;
        
        if (statusData.state === 'countdown') {
            timeMain.classList.add('countdown-number');
            timePhase.textContent = 'PREPÁRATE';
            timePhase.removeAttribute('data-phase');
            timeRounds.textContent = '';
            updateRing(1, 'countdown');
            
            soundManager.beepCountdown();
            if (vibrationEnabled) soundManager.vibrate(50);
        } else {
            timeMain.classList.remove('countdown-number');
            
            const totalRounds = statusData.totalRounds || statusData.config.rounds || 0;
            
            if (statusData.isCountingUp) {
                timeRounds.textContent = `Ronda ${statusData.roundCount}`;
                timePhase.textContent = 'EN CURSO';
                timePhase.setAttribute('data-phase', 'work');
                // For AMRAP/FORTIME, show progress based on time cap
                const capSeconds = (statusData.config.cap || 1) * 60;
                const progress = Math.max(0, 1 - (statusData.time / capSeconds));
                updateRing(progress, 'work');
            } else {
                timeRounds.textContent = `Ronda ${statusData.rounds}/${totalRounds}`;
                timePhase.textContent = statusData.phase === 'rest' ? 'DESCANSO' : 'TRABAJO';
                timePhase.setAttribute('data-phase', statusData.phase);
                
                // Calculate ring progress
                let progress = 1;
                if (currentWorkoutType === 'emom') {
                    const totalInterval = statusData.config.minutes * 60;
                    progress = statusData.time / totalInterval;
                } else if (currentWorkoutType === 'tabata' || currentWorkoutType === 'interval') {
                    const phaseTotal = statusData.phase === 'work' ? statusData.config.work : statusData.config.rest;
                    progress = statusData.time / phaseTotal;
                } else if (currentWorkoutType === 'countdown') {
                    const totalSecs = statusData.config.seconds;
                    progress = statusData.time / totalSecs;
                }
                updateRing(Math.max(0, progress), statusData.phase);
            }
        }
        
        timerDisplay.setAttribute('data-state', statusData.state);
    }

    function updateRing(progress, phase) {
        const ring = document.getElementById('timer-ring');
        if (!ring) return;
        
        const offset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
        ring.style.strokeDashoffset = offset;
        
        ring.classList.remove('work', 'rest', 'countdown');
        if (phase === 'work') ring.classList.add('work');
        else if (phase === 'rest') ring.classList.add('rest');
        else ring.classList.add('countdown');
    }

    function handlePhaseChange(phase, round) {
        // Flash animation
        const timerDisplay = document.getElementById('timer-display');
        timerDisplay.classList.remove('flash-work', 'flash-rest');
        // Force reflow
        void timerDisplay.offsetWidth;
        timerDisplay.classList.add(phase === 'work' ? 'flash-work' : 'flash-rest');
        
        if (phase === 'work') {
            soundManager.beepWorkStart();
            if (vibrationEnabled) soundManager.vibrateWork();
        } else {
            soundManager.beepRestStart();
            if (vibrationEnabled) soundManager.vibrateRest();
        }
        lastPhase = phase;
    }

    function handleMinuteMark(round) {
        soundManager.beepShort();
        if (vibrationEnabled) soundManager.vibrate(200);
    }

    function handleWorkoutFinished(result) {
        soundManager.beepLong();
        if (vibrationEnabled) soundManager.vibrateEnd();
        
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
        launchConfetti();
    }

    function launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        const colors = ['#ff6d00', '#ff3d00', '#00e676', '#ffd740', '#00b0ff', '#e040fb'];
        const particles = [];
        const particleCount = 80;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                gravity: 0.3,
                opacity: 1
            });
        }
        
        let frame = 0;
        const maxFrames = 120;
        
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;
                p.opacity -= 0.012;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });
            
            frame++;
            if (frame < maxFrames && particles.some(p => p.opacity > 0)) {
                requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        draw();
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
        lastPhase = null;
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
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 13px;">Sin presets guardados</p>';
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
        
        list.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    const id = e.target.dataset.delete;
                    storage.deletePreset(id);
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

    window.FitChrono = { timer, storage, soundManager };

    document.addEventListener('DOMContentLoaded', init);
})();
