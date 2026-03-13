# 天命系统 OpenClaw 源码深度学习计划

鉴于“天命系统”是一个基于 OpenClaw Gateway 的多 Agent 协作系统，为了深入掌控项目逻辑并具备扩展能力（如添加新官员、优化调度逻辑），建议您重点研究以下 OpenClaw 源码和逻辑模块。

## 1. Gateway 通信协议 (Gateway Protocol)

**背景**: 您的后端服务 (`server/index.js`) 通过 `OpenClawGatewayAdapter` 与 OpenClaw Gateway 保持长连接。理解这一层协议是确保系统稳定和扩展 API 的基础。

**核心关注点**:
- **WebSocket 握手与鉴权**: 理解 Gateway 如何验证 `X-OpenClaw-Token` 和 `Authorization` 头。
- **消息帧格式**: 请求 (`req`)、响应 (`res`) 和事件 (`event`) 的 JSON 结构。
- **方法白名单**: 您的 Adapter 中定义了 `DEFAULT_METHOD_ALLOWLIST`，需要了解这些方法在 Gateway 端的具体实现。

**代码参考**:
- [src/gateway/server.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/gateway/server.ts): Gateway WebSocket 服务器入口。
- [src/gateway/call.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/gateway/call.ts): 内部调用处理逻辑。
- [src/gateway/events.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/gateway/events.ts): 事件分发机制。

## 2. 子代理系统 (Sub-agent System)

**背景**: “丞相”调度“史官”、“户部”的核心机制是 OpenClaw 的子代理系统。这是天命系统“上朝”逻辑的灵魂。

**核心关注点**:
- **`sessions_spawn` 工具**: 理解该工具如何创建新会话、注入上下文（System Prompt）以及处理参数（如 `sandbox`）。
- **生命周期事件**: 关注 `lifecycle.spawn`, `lifecycle.end` 等事件的触发时机，这些事件直接驱动前端的动画（如“正在传唤”）。
- **结果回传 (Announce)**: 子代理完成任务后，结果是如何“宣告”回父代理（丞相）的。

**代码参考**:
- [src/agents/subagent-spawn.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/agents/subagent-spawn.ts): 子代理生成逻辑。
- [src/agents/subagent-registry.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/agents/subagent-registry.ts): 子代理状态管理。
- [src/agents/tools/sessions-spawn-tool.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/agents/tools/sessions-spawn-tool.ts): 暴露给 Agent 的工具实现。

## 3. Agent 配置与工具 (Configuration & Tools)

**背景**: 您需要通过配置 `yaml` 文件来定义新官员（如锦衣卫）。

**核心关注点**:
- **配置文件解析**: OpenClaw 如何加载和解析 `openclaw/workspaces/` 下的配置。
- **Prompt 注入**: System Prompt 是如何被构建并发送给 LLM 的。
- **工具挂载**: 如何给特定 Agent 启用或禁用工具（例如只给丞相 `sessions_spawn`）。

**代码参考**:
- [src/config/config.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/config/config.ts): 配置加载逻辑。
- [src/agents/context.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/agents/context.ts): 上下文构建。

## 4. 会话管理 (Session Management)

**背景**: 理解 Session 的持久化和状态对于调试“丞相不理人”或“上下文丢失”等问题至关重要。

**核心关注点**:
- **Session ID 与 Key**: 理解 `agent:minister:subagent:xxx` 这种 Key 的结构和含义。
- **转录 (Transcript)**: 聊天记录是如何存储的（JSONL 格式），以及如何通过 API 读取历史记录。

**代码参考**:
- [src/config/sessions.ts](file:///Users/hongyulin/Desktop/天命系统/openclaw/src/config/sessions.ts): 会话存储逻辑。

## 学习路径建议

1.  **从 `server/lib/openclaw/adapter.js` 入手**，对照 `src/gateway/server.ts` 看一遍 WebSocket 通信流程，确保你能手写一个简单的脚本连上 Gateway。
2.  **深入 `minister.yml` 和 `subagent-spawn.ts`**，弄清楚“丞相”说一句话是如何变成代码调用并生成“史官”进程的。
3.  **阅读 `src/gateway/events.ts`**，理解事件流是如何流向前端触发动画的。
