import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Increase limit for many agents
    }

    /**
     * Standard Events
     */
    static EVENTS = {
        AUDIENCE_START: 'AUDIENCE_START',   // 上朝开始
        MEMORIAL_SUBMIT: 'MEMORIAL_SUBMIT', // 呈递奏折 (User Input)
        DECREE_DRAFT: 'DECREE_DRAFT',       // 拟定圣旨 (Minister Output)
        OFFICIAL_SUMMON: 'OFFICIAL_SUMMON', // 传唤官员
        OFFICIAL_REPORT: 'OFFICIAL_REPORT', // 官员复命
        AGENT_UPDATE: 'AGENT_UPDATE'        // 状态更新 (To Frontend)
    };

    /**
     * Publish an event
     * @param {string} event 
     * @param {Object} payload 
     */
    publish(event, payload) {
        console.log(`[EventBus] Publish: ${event}`, payload.id ? `(Target: ${payload.id})` : '');
        this.emit(event, payload);
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @param {Function} handler 
     */
    subscribe(event, handler) {
        this.on(event, handler);
    }
}
