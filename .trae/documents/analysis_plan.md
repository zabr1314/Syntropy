# 天命系统项目分析与计划

## 1. 项目概览

通过对代码库的探索和《天命系统_接手指南.md》的阅读，我对项目架构有了清晰的理解。这是一个基于 OpenClaw 的多 Agent 协作系统，通过 React 前端以“上朝”的动画形式展示 Agent 之间的交互。

### 核心架构
- **前端 (Frontend)**: React + Vite，负责展示“金銮殿”场景，通过 WebSocket 连接中转服务。核心逻辑在 `src/services/LiveAgentService.ts`。
- **中转服务 (Node Server)**: `server/index.js`，运行在 3001 端口。它作为前端和 OpenClaw Gateway 之间的桥梁，负责鉴权、事件转发和状态映射。
- **Agent 运行时 (OpenClaw)**: 运行在 18799 端口。包含 Gateway 和多个 Agent (Minister, Historian 等)。
- **Agent 配置**: 位于 `openclaw/agents/` (如 `minister.yml`, `historian.yml`)。

## 2. 关键发现与潜在问题

在分析代码时，我发现了一个关键的**配置与实现不一致**的问题，这很可能导致丞相无法正确“传唤”其他官员（即动画无法触发）。

### 问题详情
1.  **指南描述**: 指南提到丞相应该使用 `sessions_spawn` 工具来调度下属。
2.  **后端实现 (`server/index.js`)**:
    -   代码第 110 行专门检测 `payload.data?.name === 'sessions_spawn'`。
    -   如果检测到，它会解析参数中的 `agentId` 并生成消息 `正在传唤: <agentId>`。
    -   这个特殊消息格式是前端触发动画的关键。
3.  **Agent 配置 (`openclaw/agents/minister.yml`)**:
    -   丞相的工具被定义为 `call_agent`，而不是 `sessions_spawn`。
    -   参数是 `agent_id` 和 `instruction`。
4.  **前端实现 (`LiveAgentService.ts`)**:
    -   代码第 134 行监听 `正在传唤:` 开头的消息来触发编排动画。
    -   代码第 141 行有备用逻辑监听 `使用工具:`，但它尝试从工具名称中匹配 `historian` 等关键词。由于工具名是 `call_agent`，且不包含官员名字，**备用逻辑也会失效**。

### 结论
按照当前代码，当丞相调用 `call_agent` 时：
1.  后端会将其视为普通工具，生成消息 `使用工具: call_agent`。
2.  前端接收到此消息，无法识别出目标官员。
3.  **结果**: 丞相会直接输出结果，或者后台默默调用了子 Agent，但前端**不会展示“传唤”动画**，用户体验大打折扣。

## 3. 建议的修复方案

为了解决上述问题，建议修改 `server/index.js` 以支持 `call_agent` 工具的解析。

### 计划步骤

1.  **修改 `server/index.js`**:
    -   在处理 `tool` 事件的逻辑中，增加对 `call_agent` 的支持。
    -   解析 `call_agent` 的 `agent_id` 参数。
    -   将其格式化为前端可识别的 `正在传唤: <agent_id>` 消息。

2.  **验证**:
    -   启动服务。
    -   在前端向丞相发送指令（如“查一下去年的税收”）。
    -   观察丞相是否触发 `call_agent`，以及前端是否正确显示传唤动画。

## 4. 下一步行动

如果您同意，我将执行上述修复方案。

### 待确认事项
- 您是否希望我直接修改 `server/index.js`？
- 或者您更倾向于修改 `minister.yml` 将工具改名为 `sessions_spawn`（这可能涉及到 OpenClaw 的内部机制，风险稍大）？

我建议采用**方案 1（修改后端代码）**，因为这样更稳健且不影响 Agent 的 Prompt 逻辑。
