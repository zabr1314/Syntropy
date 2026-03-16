import { EventBus } from '../core/EventBus.js';
import { tracer } from '../infra/Tracer.js';

/**
 * SocketGateway - Owns all Socket.io concerns.
 *
 * Responsibilities:
 *   - Connection lifecycle (join/leave frontend room)
 *   - Inbound: normalize raw socket events → call kernel.handleCommand()
 *   - Outbound: subscribe to internal EventBus → broadcast to frontend
 *
 * Kernel has zero knowledge of Socket.io after this separation.
 */
export class SocketGateway {
    constructor(io, kernel) {
        this.io = io;
        this.kernel = kernel;
        this._setup();
    }

    // ── Inbound ──────────────────────────────────────────────────────────────

    _setup() {
        this.io.on('connection', (socket) => {
            console.log(`[Gateway] Socket connected: ${socket.id}`);

            socket.on('register', (data) => {
                if (data?.type === 'frontend') {
                    socket.join('frontend');
                    const size = this._roomSize();
                    console.log(`[Gateway] ${socket.id} joined frontend (room size: ${size})`);
                    // Push current agent states to the newly connected client
                    this._broadcastStateTo(socket);
                }
            });

            socket.on('command', (data) => {
                const traceId = tracer.newTraceId();
                console.log(`[Gateway] command trace=${traceId}`, JSON.stringify(data));
                // Normalize and forward to Kernel
                this.kernel.handleCommand(data, traceId);
            });

            socket.on('disconnect', () => {
                console.log(`[Gateway] Socket disconnected: ${socket.id}`);
            });
        });

        // ── Outbound: subscribe to internal events ────────────────────────────
        const bus = this.kernel.events;

        bus.subscribe(EventBus.EVENTS.AGENT_STATUS, (data) => {
            console.log(`[Gateway] → agent_update ${data.id} (${data.status}) to ${this._roomSize()} clients`);
            this._emit('agent_update', data);
        });

        bus.subscribe('agent:stream', (data) => {
            this._emit('agent_stream', data);
        });

        bus.subscribe('approval:request', (data) => {
            console.log(`[Gateway] → approval_request for ${data.agentId}`);
            this._emit('approval_request', data);
        });

        bus.subscribe(EventBus.EVENTS.AGENT_PLAN, (data) => {
            console.log(`[Gateway] → plan_preview from ${data.from}`);
            this._emit('plan_preview', data);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _emit(event, data) {
        this.io.to('frontend').emit(event, data);
    }

    _roomSize() {
        return this.io.sockets.adapter.rooms.get('frontend')?.size || 0;
    }

    _broadcastStateTo(socket) {
        this.kernel.agents.forEach(agent => {
            socket.emit('agent_update', {
                id: agent.id,
                status: agent.status || 'idle',
                message: agent.lastMessage || ''
            });
        });
    }
}
