// FitChrono - Workout Configurations

const WORKOUT_TYPES = {
    emom: {
        name: 'EMOM',
        description: 'Every Minute On the Minute',
        fields: [
            { id: 'minutes', label: 'Duración (minutos)', type: 'number', default: 10, min: 1, max: 60, step: 1 },
            { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 1, max: 100, step: 1 }
        ],
        phases: ['work']
    },
    tabata: {
        name: 'TABATA',
        description: '20s trabajo / 10s descanso × 8',
        fields: [
            { id: 'rounds', label: 'Rondas', type: 'number', default: 8, min: 1, max: 20, step: 1 },
            { id: 'work', label: 'Trabajo (segundos)', type: 'number', default: 20, min: 5, max: 120, step: 5 },
            { id: 'rest', label: 'Descanso (segundos)', type: 'number', default: 10, min: 5, max: 120, step: 5 }
        ],
        phases: ['work', 'rest']
    },
    amrap: {
        name: 'AMRAP',
        description: 'As Many Rounds As Possible',
        fields: [
            { id: 'minutes', label: 'Tiempo (minutos)', type: 'number', default: 12, min: 1, max: 60, step: 1 },
            { id: 'cap', label: 'Time Cap (min)', type: 'number', default: 12, min: 1, max: 120, step: 1 }
        ],
        phases: ['work']
    },
    fortime: {
        name: 'FOR TIME',
        description: 'Completar lo más rápido posible',
        fields: [
            { id: 'cap', label: 'Time Cap (minutos)', type: 'number', default: 12, min: 1, max: 60, step: 1 }
        ],
        phases: ['work']
    },
    countdown: {
        name: 'COUNTDOWN',
        description: 'Cuenta atrás fija',
        fields: [
            { id: 'seconds', label: 'Segundos', type: 'number', default: 10, min: 3, max: 600, step: 5 }
        ],
        phases: ['work']
    },
    interval: {
        name: 'INTERVAL',
        description: 'Intervalos personalizados',
        fields: [
            { id: 'rounds', label: 'Número de intervalos', type: 'number', default: 8, min: 1, max: 50, step: 1 },
            { id: 'work', label: 'Trabajo (segundos)', type: 'number', default: 40, min: 5, max: 300, step: 5 },
            { id: 'rest', label: 'Descanso (segundos)', type: 'number', default: 20, min: 5, max: 300, step: 5 }
        ],
        phases: ['work', 'rest']
    }
};

function getWorkoutConfig(type) {
    return WORKOUT_TYPES[type] || null;
}

function buildConfigHTML(type) {
    const config = getWorkoutConfig(type);
    if (!config) return '';
    
    let html = '';
    config.fields.forEach(field => {
        html += `
            <div class="config-field">
                <label for="${field.id}">${field.label}</label>
                <div class="input-with-steppers">
                    <button class="stepper-btn" data-field="${field.id}" data-delta="-${field.step}">−</button>
                    <input type="number" id="${field.id}" 
                        min="${field.min}" max="${field.max}" 
                        value="${field.default}" data-step="${field.step}">
                    <button class="stepper-btn" data-field="${field.id}" data-delta="${field.step}">+</button>
                </div>
            </div>
        `;
    });
    return html;
}

function getPhaseLabel(phase) {
    switch(phase) {
        case 'work': return 'TRABAJO';
        case 'rest': return 'DESCANSO';
        case 'prepare': return 'PREPÁRATE';
        default: return phase.toUpperCase();
    }
}

function calculateWorkoutDuration(type, config) {
    switch(type) {
        case 'emom':
            return config.minutes * config.rounds;
        case 'tabata':
            return config.rounds * (config.work + config.rest);
        case 'amrap':
        case 'fortime':
            return config.cap * 60;
        case 'countdown':
            return config.seconds;
        case 'interval':
            return config.rounds * (config.work + config.rest);
        default:
            return 0;
    }
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
