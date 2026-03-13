import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

const CONNECT_TIMEOUT_MS = 8_000;
const REQUEST_TIMEOUT_MS = 15_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 15_000;
const CONNECT_PROTOCOL = 3;
const CONNECT_CLIENT_ID_BACKEND = "gateway-client";
const CONNECT_CLIENT_MODE_BACKEND = "backend";
const CONNECT_CLIENT_PLATFORM_BACKEND = "node";
const CONNECT_CAPABILITIES = ["tool-events"];

const DEFAULT_METHOD_ALLOWLIST = new Set([
  "status",
  "chat.send",
  "chat.abort",
  "chat.history",
  "agents.create",
  "agents.update",
  "agents.delete",
  "agents.list",
  "agents.files.get",
  "agents.files.set",
  "sessions.list",
  "sessions.preview",
  "sessions.patch",
  "sessions.reset",
  "cron.list",
  "cron.run",
  "cron.remove",
  "cron.add",
  "config.get",
  "config.set",
  "models.list",
  "exec.approval.resolve",
  "exec.approvals.get",
  "exec.approvals.set",
  "agent.wait",
]);

export class ControlPlaneGatewayError extends Error {
  constructor(params) {
    super(params.message);
    this.name = "ControlPlaneGatewayError";
    this.code = params.code;
    this.details = params.details;
  }
}

const isObject = (value) =>
  Boolean(value && typeof value === "object");

const resolveOriginForUpstream = (upstreamUrl) => {
  let urlStr = upstreamUrl.trim();
  
  // Smart protocol conversion
  if (urlStr.startsWith('http://')) {
    urlStr = urlStr.replace(/^http:\/\//, 'ws://');
  } else if (urlStr.startsWith('https://')) {
    urlStr = urlStr.replace(/^https:\/\//, 'wss://');
  } else if (!urlStr.includes('://')) {
    // Default to ws:// if no protocol specified
    urlStr = `ws://${urlStr}`;
  }

  const url = new URL(urlStr);
  const proto = url.protocol === "wss:" ? "https:" : "http:";
  const hostname =
    url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "0.0.0.0"
      ? "localhost"
      : url.hostname;
  const host = url.port ? `${hostname}:${url.port}` : hostname;
  return `${proto}//${host}`;
};

const resolveConnectFailureMessage = (error, upstreamUrl) => {
  if (!(error instanceof Error)) {
    return "Control-plane gateway connection failed.";
  }
  const details = error.message.trim();
  if (!details) {
    return "Control-plane gateway connection failed.";
  }
  if (details.includes("Unexpected server response: 502")) {
    return `Control-plane gateway connection failed: upstream ${upstreamUrl} returned HTTP 502 during websocket upgrade.`;
  }
  return `Control-plane gateway connection failed: ${details}`;
};

export class OpenClawGatewayAdapter {
  constructor(options) {
    this.ws = null;
    this.status = "stopped";
    this.statusReason = null;
    this.connectRequestId = null;
    this.connectTimer = null;
    this.startPromise = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.stopping = false;
    this.nextRequestNumber = 1;
    this.connectionEpoch = null;
    this.pending = new Map();
    
    // Config from options
    this.loadSettings = options?.loadSettings || (() => { throw new Error("loadSettings required"); });
    this.createWebSocket = options?.createWebSocket || ((url, opts) => new WebSocket(url, opts));
    this.methodAllowlist = options?.methodAllowlist || DEFAULT_METHOD_ALLOWLIST;
    this.onDomainEvent = options?.onDomainEvent;
  }

  getStatus() {
    return this.status;
  }

  getStatusReason() {
    return this.statusReason;
  }

  async start() {
    if (this.status === "connected") return;
    if (this.startPromise) return this.startPromise;
    this.stopping = false;
    this.startPromise = this.connect().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  async stop() {
    this.stopping = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.rejectPending("Control-plane adapter stopped.");
    const ws = this.ws;
    this.ws = null;
    this.connectRequestId = null;
    this.connectionEpoch = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      await new Promise((resolve) => {
        ws.once("close", () => resolve());
        ws.close(1000, "controlplane stopping");
      });
    } else {
      ws?.terminate();
    }
    this.updateStatus("stopped", null);
  }

  async request(method, params) {
    const normalizedMethod = method.trim();
    if (!normalizedMethod) {
      throw new Error("Gateway method is required.");
    }
    if (!this.methodAllowlist.has(normalizedMethod)) {
      throw new Error(`Gateway method is not allowlisted: ${normalizedMethod}`);
    }
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || this.status !== "connected") {
      throw new ControlPlaneGatewayError({
        code: "GATEWAY_UNAVAILABLE",
        message: "Gateway is unavailable.",
      });
    }

    const id = String(this.nextRequestNumber++);
    const frame = { type: "req", id, method: normalizedMethod, params };

    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`Gateway request timed out for method: ${normalizedMethod}`));
        }, REQUEST_TIMEOUT_MS);
        this.pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify(frame), (err) => {
          if (!err) return;
          clearTimeout(timer);
          this.pending.delete(id);
          reject(new Error(`Failed to send gateway request for method: ${normalizedMethod}`));
        });
      });
      return response;
    } catch (error) {
      // Simplification: removed legacy profile switching logic as this is a backend service
      throw error;
    }
  }

  async connect() {
    let settings;
    try {
        settings = this.loadSettings();
    } catch (e) {
        this.updateStatus("error", e.message);
        return;
    }

    // Smart URL handling
    let urlStr = settings.url.trim();
    if (urlStr.startsWith('http://')) {
        urlStr = urlStr.replace(/^http:\/\//, 'ws://');
    } else if (urlStr.startsWith('https://')) {
        urlStr = urlStr.replace(/^https:\/\//, 'wss://');
    } else if (!urlStr.includes('://')) {
        urlStr = `ws://${urlStr}`;
    }

    this.connectionEpoch = randomUUID();

    // Inject Authorization Header
    const headers = {
        'Authorization': `Bearer ${settings.token}`,
        'X-OpenClaw-Token': settings.token
    };

    const ws = this.createWebSocket(urlStr, {
        origin: resolveOriginForUpstream(urlStr),
        headers
    });
    this.ws = ws;
    this.connectRequestId = null;
    this.updateStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting", null);

    await new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn) => {
        if (settled) return;
        settled = true;
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        fn();
      };

      this.connectTimer = setTimeout(() => {
        settle(() => {
          ws.close(1011, "connect timeout");
          reject(new Error("Control-plane connect timed out waiting for connect response."));
        });
      }, CONNECT_TIMEOUT_MS);

      ws.on("message", (raw) => {
        const parsed = this.parseFrame(String(raw ?? ""));
        if (!parsed) return;
        if (parsed.type === "event") {
          if (parsed.event === "connect.challenge") {
            this.sendConnectRequest(settings.token);
            return;
          }
          this.emitEvent({
            type: "gateway.event",
            event: parsed.event,
            seq: typeof parsed.seq === "number" ? parsed.seq : null,
            connectionEpoch: this.connectionEpoch,
            payload: parsed.payload,
            asOf: new Date().toISOString(),
          });
          return;
        }
        if (!this.handleResponseFrame(parsed)) return;
        if (parsed.id === this.connectRequestId) {
          if (parsed.ok) {
            this.reconnectAttempt = 0;
            this.updateStatus("connected", null);
            settle(() => resolve());
            return;
          }
          const code = parsed.error?.code ?? "CONNECT_FAILED";
          const message = parsed.error?.message ?? "Connect failed.";
          settle(() => {
            ws.close(1011, "connect failed");
            reject(new Error(`Control-plane connect rejected: ${code} ${message}`));
          });
        }
      });

      ws.on("close", () => {
        if (this.stopping) return;
        if (!settled) {
          settle(() => reject(new Error("Control-plane gateway connection closed during connect.")));
          return;
        }
        this.rejectPending("Control-plane gateway connection closed.");
        this.connectionEpoch = null;
        this.updateStatus("reconnecting", "gateway_closed");
        this.scheduleReconnect();
      });

      ws.on("error", (error) => {
        if (this.stopping) return;
        if (!settled) {
          settle(() => reject(new Error(resolveConnectFailureMessage(error, settings.url))));
        }
      });
    }).catch((err) => {
      this.connectionEpoch = null;
      this.updateStatus("error", err instanceof Error ? err.message : "connect_error");
      this.scheduleReconnect();
      throw err;
    });
  }

  scheduleReconnect() {
    if (this.stopping) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(1.7, this.reconnectAttempt),
      MAX_RECONNECT_DELAY_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch(() => {});
    }, delay);
  }

  sendConnectRequest(token) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || this.connectRequestId) return;
    
    const id = String(this.nextRequestNumber++);
    this.connectRequestId = id;
    try {
      ws.send(
        JSON.stringify({
          type: "req",
          id,
          method: "connect",
          params: {
            minProtocol: CONNECT_PROTOCOL,
            maxProtocol: CONNECT_PROTOCOL,
            client: {
              id: CONNECT_CLIENT_ID_BACKEND,
              version: "dev",
              platform: CONNECT_CLIENT_PLATFORM_BACKEND,
              mode: CONNECT_CLIENT_MODE_BACKEND,
            },
            role: "operator",
            scopes: [
              "operator.admin",
              "operator.read",
              "operator.write",
              "operator.approvals",
              "operator.pairing",
            ],
            caps: CONNECT_CAPABILITIES,
            auth: { token }, // Use simple token auth
          },
        })
      );
    } catch (err) {
      this.connectRequestId = null;
      const reason = err instanceof Error ? err.message : "connect_send_failed";
      this.updateStatus("error", reason);
      try {
        ws.close(1011, "connect send failed");
      } catch (closeErr) {
        console.error("Failed to close gateway socket after connect-send failure.", closeErr);
      }
    }
  }

  parseFrame(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isObject(parsed) || typeof parsed.type !== "string") return null;
    if (parsed.type === "event" && typeof parsed.event === "string") {
      return parsed;
    }
    if (parsed.type === "res" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  }

  handleResponseFrame(frame) {
    const pending = this.pending.get(frame.id);
    if (!pending) return true;
    clearTimeout(pending.timer);
    this.pending.delete(frame.id);
    if (frame.ok) {
      pending.resolve(frame.payload);
      return true;
    }
    pending.reject(
      new ControlPlaneGatewayError({
        code: frame.error?.code ?? "GATEWAY_REQUEST_FAILED",
        message: frame.error?.message ?? "Gateway request failed.",
        details: frame.error?.details,
      })
    );
    return true;
  }

  rejectPending(message) {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  updateStatus(status, reason) {
    this.status = status;
    this.statusReason = reason;
    this.emitEvent({
      type: "runtime.status",
      status,
      reason,
      asOf: new Date().toISOString(),
    });
  }

  emitEvent(event) {
    this.onDomainEvent?.(event);
  }
}
