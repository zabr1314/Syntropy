
import fs from 'fs';
import path from 'path';

export class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath || path.join(process.cwd(), 'server', 'config', 'officials.json');
        this.config = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                this.config = JSON.parse(data);
            }
        } catch (error) {
            console.error('[ConfigManager] Failed to load config:', error);
        }
    }

    save() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
            console.log('[ConfigManager] Configuration saved.');
        } catch (error) {
            console.error('[ConfigManager] Failed to save config:', error);
        }
    }

    getAll() {
        return this.config;
    }

    get(id) {
        return this.config[id];
    }

    /**
     * Update agent configuration and persist to disk
     */
    update(id, updates) {
        if (!this.config[id]) {
            throw new Error(`Agent config for ${id} not found`);
        }

        // Deep merge or specific field update?
        // For simplicity, we merge top-level keys.
        this.config[id] = { ...this.config[id], ...updates };
        
        // Handle nested model config if provided as string
        if (typeof updates.model === 'string') {
            this.config[id].model = { primary: updates.model };
        } else if (updates.model) {
             this.config[id].model = updates.model;
        }

        this.save();
        return this.config[id];
    }
}
