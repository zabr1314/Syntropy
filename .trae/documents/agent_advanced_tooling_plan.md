# 天命系统 Agent 模块重构与增强计划 - Phase 5 (Advanced Tooling & ACP)

## 1. 现状分析 (Phase 1: Explore)
- **目标**: 实现高级工具系统（风险分级与审批流）和多智能体协作协议 (ACP)。
- **发现**:
  - `SkillManager.js` 负责加载和执行工具，但缺乏权限控制和审批逻辑。
  - `Agent.js` 通过 `handleToolCalls` 直接执行工具，没有暂停/恢复机制。
  - `officials.json` 中定义了 `minister` 作为协调者，拥有 `call_official` 技能。
  - 目前缺乏统一的 Agent 通信协议，委托是通过直接调用 `target.execute()` 实现的。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "继续开发高级工具系统 (审批流) 和多智能体协作"。
- **分析结果**:
  - **审批流**: 需要对高风险工具（如 `delete_agent`, `modify_database`）进行拦截，进入 `WAITING_FOR_HUMAN` 状态，用户批准后才能继续。
  - **ACP (Agent Collaboration Protocol)**: 规范 Agent 间的通信格式（Request/Response/Error），而非随意的函数调用。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 高级工具系统 (Advanced Tooling)
- **风险分级**:
  - 修改 `SkillManager`，支持在 Skill 定义中增加 `riskLevel` (low, medium, high)。
  - `low`: 自动执行。
  - `medium/high`: 需要审批。
- **审批流程**:
  - 修改 `Agent.js`:
    - 在 `handleToolCalls` 中，检查工具风险等级。
    - 如果需要审批，将 Agent 状态设为 `WAITING_FOR_HUMAN`，保存当前上下文（Tool Call ID, Args）。
    - 暂停执行循环，向前端发送审批请求事件。
  - 修改 `Kernel.js`:
    - 增加 `handleApproval(agentId, toolCallId, approved)` 方法。
    - 如果批准，恢复 Agent 执行；如果拒绝，返回 "User rejected" 给 LLM。

### 3.2 多智能体协作协议 (ACP)
- **标准化通信**:
  - 定义标准消息结构:
    ```json
    {
      "id": "msg_123",
      "from": "minister",
      "to": "historian",
      "type": "REQUEST", // REQUEST, RESPONSE, ERROR
      "action": "query_history",
      "payload": { ... }
    }
    ```
- **重构 `call_official`**:
  - 不再直接调用 `target.execute()`。
  - 而是通过 `kernel.dispatch(message)` 发送 ACP 消息。
  - 目标 Agent 收到消息后，将其放入收件箱，在下一个 tick 处理。
  - **注意**: 这是一个较大的架构变更。为了 MVP，我们可以先实现一个轻量版的 ACP：
    - `Kernel.send(from, to, content)` -> 目标 Agent 的 Context。
    - 目标 Agent 执行后，`Kernel.reply(to, from, content)`。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  **Skill 定义增强**: 更新 `SkillManager` 支持 `riskLevel`。
  2.  **审批流实现**: 修改 `Agent.js` 实现 `WAITING_FOR_HUMAN` 挂起与恢复。
  3.  **前端交互适配**: 确保 `Kernel` 发送审批请求事件，并能处理前端的 `approve` 指令。
  4.  **ACP 基础**: 实现标准化的 `Kernel.dispatch` 方法，规范 Agent 间调用。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 支持敏感操作审批的 Agent 系统，以及更规范的多智能体通信机制。
