# OpenClaw 深度联通与数据重构计划

## 1. 问题分析
用户反馈“发出去后没效果”，且希望“把之前的数据都删了”。经排查发现：
1.  **后端数据丢失**: `server/index.js` 中对于 OpenClaw 的 `assistant` (回复) 流，硬编码了 `message = '正在思考...'`，导致 Agent 的真实回复内容被丢弃，前端根本收不到。
2.  **数据展现断层**: 前端 `MemorialsPanel` (奏折阁) 和 `LogSidebar` (起居注) 展示的是 `CourtStore` 的数据，而 `LiveAgentService` 目前只更新 `AgentStore`。两者未打通，导致 OpenClaw 的回复无法进入奏折记录。
3.  **脏数据**: 本地 `localStorage` 中可能残留了大量旧的调试数据。

## 2. 实施步骤

### 2.1 后端修复 (`server/index.js`)
- [ ] **透传回复内容**: 修改 `onDomainEvent` 逻辑。
    - 当 `payload.stream === 'assistant'` 时，提取 `payload.data` (假设为文本内容) 作为 `message`。
    - 当 `payload.stream === 'tool'` 时，保留工具名称。
    - 确保这些信息通过 `agent_update` 或新的事件发送给前端。

### 2.2 前端状态桥接 (`src/services/LiveAgentService.ts`)
- [ ] **打通 CourtStore**: 在 `LiveAgentService` 接收到 WebSocket 消息时：
    - 引入 `useCourtStore`。
    - 当收到 Agent 的有效回复 (message) 时，调用 `useCourtStore.addLog()` 将其记录到当前的“起居注”中。
    - 当 Agent 状态变为 `working` 时，将当前奏折状态更新为 `executing`。
    - 当 Agent 状态变回 `idle` 时，将奏折状态更新为 `completed` (或保持，视业务逻辑而定)。

### 2.3 数据清理 (`src/App.tsx`)
- [ ] **清除旧数据**: 在 `App.tsx` 的初始化逻辑中，添加一次性的 `localStorage.clear()` 或者提供一个“重置系统”的按钮（开发模式下）。
- [ ] **更优雅的方式**: 在控制台提供一个 `/reset` 指令，调用 `useCourtStore.getState().clearCompletedDecrees()` 和 `useAgentStore` 的重置方法。

## 3. 验证方案
1.  **输入**: “请向我汇报国库情况”。
2.  **预期**:
    - 奏折阁出现新奏折。
    - 起居注显示“皇帝：...”。
    - **关键**: 起居注随后显示“丞相：[OpenClaw的真实回复]”。
    - 界面上丞相气泡显示回复内容。

## 4. 立即执行
先修复后端数据透传问题，再打通前端 Store。
