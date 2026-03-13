import { EventBus } from './EventBus.js';
import { LLM } from './LLM.js';
import { ContextManager } from './ContextManager.js';
import { Memory } from './Memory.js';
import { ToolRegistry } from './tools/ToolRegistry.js';

export class Kernel {
    constructor(io) {
        this.io = io;
        
        // Initialize Core Components
        this.events = new EventBus();
        this.llm = new LLM();
        this.context = new ContextManager(); // In-memory cache for fast access
        this.memory = new Memory();          // Persistent storage
        this.tools = new ToolRegistry();     // Global tool registry
        
        // Role Registry (Map<id, RoleInstance>)
        this.roles = new Map();

        this.setupSocket();
    }

    /**
     * Register a role (agent)
     * @param {Object} roleInstance 
     */
    registerRole(roleInstance) {
        if (!roleInstance.id) {
            throw new Error('Role must have an ID');
        }
        roleInstance.kernel = this; // Inject kernel reference
        this.roles.set(roleInstance.id, roleInstance);
        console.log(`[Kernel] Registered Role: ${roleInstance.id}`);
        
        // Trigger wake up if defined
        if (typeof roleInstance.onWake === 'function') {
            roleInstance.onWake();
        }
    }

    /**
     * Get a role instance
     * @param {string} roleId 
     */
    getRole(roleId) {
        return this.roles.get(roleId);
    }

    /**
     * Load all roles from the configuration file
     */
    async loadRoles() {
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            const configPath = path.join(process.cwd(), 'server/config/officials.json');
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

            const { BaseRole } = await import('./roles/BaseRole.js');
            const { Minister } = await import('./roles/Minister.js');
            const { Historian } = await import('./roles/Historian.js');
            const { Revenue } = await import('./roles/Revenue.js');

            const classMap = {
                'BaseRole': BaseRole,
                'Minister': Minister,
                'Historian': Historian,
                'Revenue': Revenue
            };

            for (const [id, config] of Object.entries(configData)) {
                const RoleClass = classMap[config.role_class] || BaseRole;
                const roleInstance = new RoleClass(config);
                this.registerRole(roleInstance);
            }

            console.log(`[Kernel] Loaded ${this.roles.size} roles from config.`);
        } catch (error) {
            console.error('[Kernel] Failed to load roles:', error);
        }
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocket() {
        this.io.on('connection', (socket) => {
            console.log(`[Kernel] Socket Connected: ${socket.id}`);

            socket.on('register', (data) => {
                if (data.type === 'frontend') {
                    socket.join('frontend');
                    this.broadcastAllRolesStatus(socket);
                }
            });

            socket.on('command', async (data) => {
                const { targetId, action, payload } = data;
                console.log(`[Kernel] Command: ${action} -> ${targetId}`);
                
                // Route command to role
                const role = this.getRole(targetId);
                if (role) {
                    if (action === 'chat' || action === 'instruction') {
                        const content = payload.content || payload.message || payload;
                        // Fire and forget (async)
                        this.handleChat(role, content);
                    }
                } else {
                    console.warn(`[Kernel] Role not found: ${targetId}`);
                }
            });
        });

        // Listen to internal events to broadcast to frontend
        this.events.on(EventBus.EVENTS.AGENT_UPDATE, (data) => {
            this.io.to('frontend').emit('agent_update', data);
        });
    }

    /**
     * Handle chat request for a role
     */
    async handleChat(role, userMessage) {
        try {
            // Update status to working
            role.setStatus('working', '思考中...');
            
            // Delegate to role's chat logic
            await role.chat(userMessage);

        } catch (error) {
            console.error(`[Kernel] Chat Error (${role.id}):`, error);
            role.setStatus('error', '系统异常');
        }
    }

    broadcastAllRolesStatus(socket) {
        this.roles.forEach(role => {
            socket.emit('agent_update', {
                id: role.id,
                status: role.status,
                message: role.lastMessage || '等待指令...'
            });
        });
    }
}
