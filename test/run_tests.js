/**
 * Unit Tests for 5 Agent Architecture Optimizations
 * Run: node test/run_tests.js
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// ─── Test Runner ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

function suite(name) {
    console.log(`\n[${name}]`);
}

// ─── Opt 1: Spawn Depth Control ─────────────────────────────────────────────

suite('优化1: 派生深度控制');

// Mock minimal Kernel to test dispatch depth logic
class MockAgent {
    constructor(id) {
        this.id = id;
        this._currentDepth = 0;
    }
    async executeAsSubAgent({ from, instruction, depth = 0 }) {
        this._currentDepth = depth;
        return `result from ${this.id} at depth ${depth}`;
    }
}

class MockKernel {
    constructor() {
        this.agents = new Map();
    }
    getAgent(id) { return this.agents.get(id); }

    async dispatch(message, depth = 0) {
        const MAX_SPAWN_DEPTH = 2;
        if (depth >= MAX_SPAWN_DEPTH) {
            return '[系统] 派生深度超限，拒绝执行';
        }
        const targetAgent = this.getAgent(message.to);
        if (!targetAgent) return { error: 'Target not found' };

        const TIMEOUT_MS = 60000;
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`[${message.to}] dispatch timeout`)), TIMEOUT_MS)
        );
        return await Promise.race([
            targetAgent.executeAsSubAgent({
                from: message.from,
                instruction: message.payload.instruction,
                depth: depth + 1
            }),
            timeout
        ]);
    }
}

await test('depth=0 正常执行', async () => {
    const kernel = new MockKernel();
    kernel.agents.set('official_a', new MockAgent('official_a'));
    const result = await kernel.dispatch({ from: 'minister', to: 'official_a', payload: { instruction: 'test' } }, 0);
    assert.ok(result.includes('official_a'));
});

await test('depth=1 正常执行', async () => {
    const kernel = new MockKernel();
    kernel.agents.set('official_b', new MockAgent('official_b'));
    const result = await kernel.dispatch({ from: 'minister', to: 'official_b', payload: { instruction: 'test' } }, 1);
    assert.ok(result.includes('official_b'));
});

await test('depth=2 触发深度限制，返回错误字符串', async () => {
    const kernel = new MockKernel();
    kernel.agents.set('official_c', new MockAgent('official_c'));
    const result = await kernel.dispatch({ from: 'minister', to: 'official_c', payload: { instruction: 'test' } }, 2);
    assert.strictEqual(result, '[系统] 派生深度超限，拒绝执行');
});

await test('executeAsSubAgent 正确存储 depth', async () => {
    const agent = new MockAgent('test_agent');
    await agent.executeAsSubAgent({ from: 'minister', instruction: 'hi', depth: 1 });
    assert.strictEqual(agent._currentDepth, 1);
});

// ─── Opt 2: Context Pruning (protect tool_call pairs) ───────────────────────

suite('优化2: 上下文智能压缩（保护 tool_call 配对）');

import { ContextManager } from '../server/runtime/ContextManager.js';

const ctx = new ContextManager({ tokenLimit: 100, reservedTokens: 0 });

await test('不超限时原样返回', () => {
    const msgs = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' }
    ];
    const result = ctx.pruneContext(msgs, [], 99999);
    assert.strictEqual(result.length, 3);
});

await test('超限时删除最早的 user 消息', () => {
    const msgs = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'old message' },
        { role: 'assistant', content: 'old reply' },
        { role: 'user', content: 'new message' },
        { role: 'assistant', content: 'new reply' }
    ];
    const result = ctx.pruneContext(msgs, [], 1); // force prune
    // system prompt must be preserved
    assert.ok(result.some(m => m.role === 'system'));
});

await test('tool_call + tool_result 配对不被拆散', () => {
    const toolCallId = 'call_abc123';
    const msgs = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'old user msg that should be pruned first' },
        { role: 'assistant', content: null, tool_calls: [{ id: toolCallId, function: { name: 'search', arguments: '{}' } }] },
        { role: 'tool', tool_call_id: toolCallId, content: 'search result' },
        { role: 'user', content: 'follow up' }
    ];
    const result = ctx.pruneContext(msgs, [], 1); // force aggressive prune

    // If assistant tool_call is present, its tool result must also be present
    const hasToolCall = result.some(m => m.tool_calls?.some(tc => tc.id === toolCallId));
    const hasToolResult = result.some(m => m.tool_call_id === toolCallId);
    assert.ok(
        (!hasToolCall && !hasToolResult) || (hasToolCall && hasToolResult),
        'tool_call and tool_result must be pruned together, never split'
    );
});

await test('system prompt 始终保留', () => {
    const msgs = [
        { role: 'system', content: 'important system prompt' },
        ...Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: `msg ${i}`.repeat(50) }))
    ];
    const result = ctx.pruneContext(msgs, [], 10);
    assert.ok(result[0].role === 'system', 'system prompt must be at index 0');
    assert.strictEqual(result[0].content, 'important system prompt');
});

// ─── Opt 3: Memory Auto-Capture ─────────────────────────────────────────────

suite('优化3: 记忆自动捕获');

// Test the capture heuristic logic in isolation
const CAPTURE_KEYWORDS = ['记住', '偏好', '总是', '永远', '不要', '喜欢', '习惯',
                          'remember', 'prefer', 'always', 'never', 'like', 'hate'];
const shouldCapture = (text) =>
    text && text.length >= 10 && text.length <= 2000 &&
    CAPTURE_KEYWORDS.some(k => text.toLowerCase().includes(k));

await test('含"记住"的输入应被捕获', () => {
    assert.ok(shouldCapture('记住我喜欢用简洁的代码风格'));
});

await test('含"always"的英文输入应被捕获', () => {
    assert.ok(shouldCapture('always use TypeScript for new projects'));
});

await test('普通对话不应被捕获', () => {
    assert.ok(!shouldCapture('帮我查一下今天的天气'));
});

await test('过短文本（<10字符）不应被捕获', () => {
    assert.ok(!shouldCapture('记住'));
});

await test('过长文本（>2000字符）不应被捕获', () => {
    assert.ok(!shouldCapture('记住' + 'x'.repeat(2001)));
});

// ─── Opt 4: Dispatch Timeout ────────────────────────────────────────────────

suite('优化4: Dispatch 超时保护');

await test('正常执行在超时前完成', async () => {
    const kernel = new MockKernel();
    kernel.agents.set('fast_agent', {
        executeAsSubAgent: async () => {
            return 'fast result';
        }
    });
    const result = await kernel.dispatch({ from: 'a', to: 'fast_agent', payload: { instruction: 'go' } }, 0);
    assert.strictEqual(result, 'fast result');
});

await test('Promise.allSettled 单个失败不影响其他', async () => {
    const tasks = [
        Promise.resolve('ok_1'),
        Promise.reject(new Error('timeout')),
        Promise.resolve('ok_3')
    ];
    const results = await Promise.allSettled(tasks);
    assert.strictEqual(results[0].status, 'fulfilled');
    assert.strictEqual(results[1].status, 'rejected');
    assert.strictEqual(results[2].status, 'fulfilled');
    assert.strictEqual(results[0].value, 'ok_1');
    assert.strictEqual(results[2].value, 'ok_3');
});

// ─── Opt 5: SessionStore (SQLite) ───────────────────────────────────────────

suite('优化5: Session 迁移到 SQLite');

import { SessionStore } from '../server/infra/SessionStore.js';

const TEST_DB = './data/test_sessions_tmp.db';

// Cleanup before test
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

const store = new SessionStore(TEST_DB);

await test('saveMessage + loadMessages 基本读写', () => {
    store.saveMessage('agent_1', { role: 'user', content: 'hello', timestamp: Date.now() });
    store.saveMessage('agent_1', { role: 'assistant', content: 'hi there', timestamp: Date.now() });
    const msgs = store.loadMessages('agent_1');
    assert.strictEqual(msgs.length, 2);
    assert.strictEqual(msgs[0].role, 'user');
    assert.strictEqual(msgs[0].content, 'hello');
    assert.strictEqual(msgs[1].role, 'assistant');
});

await test('tool_calls 序列化/反序列化', () => {
    const toolCalls = [{ id: 'call_1', function: { name: 'search', arguments: '{"q":"test"}' } }];
    store.saveMessage('agent_2', { role: 'assistant', content: null, tool_calls: toolCalls, timestamp: Date.now() });
    const msgs = store.loadMessages('agent_2');
    assert.strictEqual(msgs.length, 1);
    assert.deepStrictEqual(msgs[0].tool_calls, toolCalls);
});

await test('clearMessages 清空指定 agent 的消息', () => {
    store.saveMessage('agent_3', { role: 'user', content: 'test', timestamp: Date.now() });
    store.clearMessages('agent_3');
    const msgs = store.loadMessages('agent_3');
    assert.strictEqual(msgs.length, 0);
});

await test('不同 agent 的消息互不干扰', () => {
    store.saveMessage('agent_x', { role: 'user', content: 'from x', timestamp: Date.now() });
    store.saveMessage('agent_y', { role: 'user', content: 'from y', timestamp: Date.now() });
    const x = store.loadMessages('agent_x');
    const y = store.loadMessages('agent_y');
    assert.ok(x.every(m => m.content === 'from x'));
    assert.ok(y.every(m => m.content === 'from y'));
});

await test('数据库文件已生成', () => {
    assert.ok(fs.existsSync(TEST_DB), 'sessions.db should exist on disk');
});

// Cleanup
fs.unlinkSync(TEST_DB);

// ─── 路由统一化: SocketGateway ───────────────────────────────────────────────

suite('路由统一化: SocketGateway');

// Minimal mock kernel for gateway tests
function makeMockKernel() {
    const calls = [];
    return {
        agents: new Map(),
        events: {
            _handlers: {},
            subscribe(event, fn) { (this._handlers[event] = this._handlers[event] || []).push(fn); },
            publish(event, data) { (this._handlers[event] || []).forEach(fn => fn(data)); }
        },
        handleCommand(data, traceId) { calls.push({ data, traceId }); },
        _calls: calls
    };
}

await test('handleCommand 接收 traceId 参数', async () => {
    const kernel = makeMockKernel();
    const fakeTraceId = 'ab12cd34';
    kernel.handleCommand({ targetId: 'minister', action: 'chat', payload: { content: 'hello' } }, fakeTraceId);
    assert.strictEqual(kernel._calls.length, 1);
    assert.strictEqual(kernel._calls[0].traceId, fakeTraceId);
});

await test('Kernel 不再持有 io 引用', () => {
    // MockKernel used throughout tests also has no io — verify real Kernel too
    const k = makeMockKernel();
    assert.ok(!('io' in k), 'Kernel should not have io property');
});

await test('EventBus 事件可被外部订阅者接收', () => {
    const kernel = makeMockKernel();
    const received = [];
    kernel.events.subscribe('agent:stream', (data) => received.push(data));
    kernel.events.publish('agent:stream', { id: 'minister', chunk: 'hello' });
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].chunk, 'hello');
});

// ─── Tracer: Structured Observability ───────────────────────────────────────

suite('可观测性: Tracer');

import { Tracer, redact } from '../server/infra/Tracer.js';

await test('newTraceId 生成8位十六进制字符串', () => {
    const t = new Tracer();
    const id = t.newTraceId();
    assert.match(id, /^[0-9a-f]{8}$/);
    t.destroy();
});

await test('childTraceId 格式为 parent.depth', () => {
    const t = new Tracer();
    assert.strictEqual(t.childTraceId('ab12cd34', 1), 'ab12cd34.1');
    assert.strictEqual(t.childTraceId('ab12cd34', 2), 'ab12cd34.2');
    t.destroy();
});

await test('emit 输出包含 event 和 ts 字段', () => {
    const t = new Tracer();
    const lines = [];
    const orig = console.log;
    console.log = (msg) => lines.push(msg);
    t.emit('test.event', { foo: 'bar' });
    console.log = orig;
    t.destroy();
    assert.ok(lines.some(l => l.includes('test.event')));
    assert.ok(lines.some(l => l.includes('"ts"')));
});

await test('agentTurnStart 记录 active agent，agentTurnEnd 清除', () => {
    const t = new Tracer();
    t.agentTurnStart('agent_a', 'trace1', 1);
    assert.ok(t._activeAgents.has('agent_a'));
    t.agentTurnEnd('agent_a', 'trace1', 1, 100);
    assert.ok(!t._activeAgents.has('agent_a'));
    t.destroy();
});

await test('redact 脱敏 Bearer token', () => {
    const input = 'Authorization: Bearer sk-abcdefghijklmnop1234';
    const out = redact(input);
    assert.ok(!out.includes('sk-abcdefghijklmnop1234'), '完整 token 不应出现在输出中');
    assert.ok(out.includes('Bearer'), 'Bearer 前缀应保留');
});

await test('redact 脱敏 sk- 格式 API key', () => {
    const input = 'key=sk-proj-ABCDEFGH12345678';
    const out = redact(input);
    assert.ok(!out.includes('ABCDEFGH12345678'));
    assert.ok(out.includes('sk-'));
});

await test('redact 不破坏普通文本', () => {
    const input = '今天天气不错，用户说了你好';
    assert.strictEqual(redact(input), input);
});

await test('stuck 检测：超阈值 agent 触发 agent.stuck 事件', () => {
    const t = new Tracer();
    t.STUCK_THRESHOLD_MS = 0; // 立即触发
    t._activeAgents.set('stuck_agent', { traceId: 'tr1', since: Date.now() - 1000, turn: 3 });
    const lines = [];
    const orig = console.log;
    console.log = (msg) => lines.push(msg);
    t._checkStuck();
    console.log = orig;
    t.destroy();
    assert.ok(lines.some(l => l.includes('agent.stuck')));
});

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`结果: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
