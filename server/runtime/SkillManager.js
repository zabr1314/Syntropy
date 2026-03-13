import fs from 'fs';
import path from 'path';

/**
 * Manages dynamic loading and execution of Skills (Tools).
 */
export class SkillManager {
    constructor() {
        this.skills = new Map();
    }

    /**
     * Load all skills from the skills directory
     * @param {string} skillsDir - Absolute path to skills directory
     */
    async loadSkills(skillsDir) {
        if (!fs.existsSync(skillsDir)) {
            console.warn(`[SkillManager] Skills directory not found: ${skillsDir}`);
            return;
        }

        const files = fs.readdirSync(skillsDir);
        for (const file of files) {
            if (file.endsWith('.js') || file.endsWith('.mjs')) {
                try {
                    const skillModule = await import(path.join(skillsDir, file));
                    // Assume default export is the skill definition or array of definitions
                    const skillDef = skillModule.default;
                    
                    if (Array.isArray(skillDef)) {
                        skillDef.forEach(s => this.registerSkill(s));
                    } else {
                        this.registerSkill(skillDef);
                    }
                } catch (error) {
                    console.error(`[SkillManager] Failed to load skill ${file}:`, error);
                }
            }
        }
        console.log(`[SkillManager] Loaded ${this.skills.size} skills.`);
    }

    registerSkill(skill) {
        if (!skill.name || !skill.handler) {
            console.warn('[SkillManager] Invalid skill definition:', skill);
            return;
        }
        
        // Convert to OpenAI Tool Format
        const toolDefinition = {
            type: 'function',
            function: {
                name: skill.name,
                description: skill.description || '',
                parameters: skill.parameters || { type: 'object', properties: {} }
            }
        };

        this.skills.set(skill.name, {
            definition: toolDefinition,
            handler: skill.handler,
            riskLevel: skill.riskLevel || 'low' // Default risk level
        });
    }

    getSkill(name) {
        return this.skills.get(name);
    }

    hasSkill(name) {
        return this.skills.has(name);
    }

    async execute(name, args, context) {
        const skill = this.skills.get(name);
        if (!skill) throw new Error(`Skill ${name} not found`);
        return await skill.handler(args, context);
    }

    getAllDefinitions() {
        return Array.from(this.skills.values()).map(s => s.definition);
    }
}
