import { EventEmitter } from 'events';

/**
 * Generic Event Bus for asynchronous messaging between components.
 */
export class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
    }

    /**
     * Standard System Events
     */
    static EVENTS = {
        AGENT_MESSAGE: 'agent:message',   // Agent sends a message
        AGENT_ACTION: 'agent:action',     // Agent performs an action (tool call)
        AGENT_STATUS: 'agent:status',     // Agent status update
        SYSTEM_ERROR: 'system:error',     // System level error
        USER_INPUT: 'user:input'          // Direct user input
    };

    /**
     * Publish an event
     */
    publish(event, payload) {
        this.emit(event, payload);
    }

    /**
     * Subscribe to an event
     */
    subscribe(event, handler) {
        this.on(event, handler);
    }
}
