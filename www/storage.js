// FitChrono - Storage Manager for Presets

class StorageManager {
    constructor() {
        this.storageKey = 'fitchrono_presets';
    }

    getPresets() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch(e) {
            console.warn('Error loading presets:', e);
            return [];
        }
    }

    savePreset(preset) {
        const presets = this.getPresets();
        // Add timestamp and unique ID
        preset.id = Date.now().toString();
        preset.createdAt = new Date().toISOString();
        presets.push(preset);
        localStorage.setItem(this.storageKey, JSON.stringify(presets));
        return preset;
    }

    deletePreset(id) {
        const presets = this.getPresets().filter(p => p.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(presets));
    }

    getSettings() {
        return {
            darkMode: localStorage.getItem('fitchrono_dark') !== 'false',
            sound: localStorage.getItem('fitchrono_sound') !== 'false',
            vibration: localStorage.getItem('fitchrono_vibration') !== 'false'
        };
    }

    saveSetting(key, value) {
        localStorage.setItem(`fitchrono_${key}`, value ? 'true' : 'false');
    }

    saveSettings(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            this.saveSetting(key, value);
        });
    }
}

const storage = new StorageManager();