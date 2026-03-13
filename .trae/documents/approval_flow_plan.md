# 天命系统后续开发计划：人机协同审批流 (Human-in-the-loop Approval Flow)

## 1. 目标 (Goal)
根据项目文档（`FRONTEND_DEV_PROGRESS.md` 和 `AGENT_DEV_PROGRESS.md`）及代码现状分析，当前的“后续工作”重点是完成 MVP 阶段的核心特性——**人机协同拦截机制**。
具体目标是实现前端对后端 `WAITING_FOR_HUMAN` 状态的响应，允许用户在界面上审批（批准/驳回）Agent 的高风险操作。

## 2. 现状分析 (Current State Analysis)
- **后端 (Backend)**:
  - `Agent.js` 已实现风险分级，当调用高风险工具时会进入 `WAITING_FOR_HUMAN` 状态。
  - `Agent.js` 会触发 `approval:request` 事件。
  - `Kernel.js` 会通过 Socket 广播 `approval_request` 事件给前端。
  - `Kernel.js` 已实现 `resumeFromApproval` 逻辑，接收 `approve` / `reject` 指令。
- **前端 (Frontend)**:
  - `useAgentStore.ts` 尚未定义 `waiting_for_human` 状态。
  - `SocketManager.ts` 尚未监听 `approval_request` 事件。
  - 缺少用于审批的 UI 组件 (`ApprovalModal`)。
  - `JailModal` 目前仅处理 `jailed` 状态（惩罚/错误），逻辑与审批（暂停/请求）不同。

## 3. 实施步骤 (Implementation Steps)

### 3.1 前端状态管理 (Store Update)
- **文件**: `src/store/useAgentStore.ts`
- **内容**:
  - 在 `AgentState['status']` 中添加 `'waiting_for_human'`。
  - 添加 `approvalRequest` 状态，用于存储当前的审批请求详情（`agentId`, `toolCallId`, `functionName`, `args`, `riskLevel`）。
  - 添加 `setApprovalRequest(request)` 和 `clearApprovalRequest()` action。

### 3.2 Socket 通信 (Socket Integration)
- **文件**: `src/services/live/SocketManager.ts`
- **内容**:
  - 在 `setupSocket` 中监听 `approval_request` 事件。
  - 收到事件后，调用 `useAgentStore.getState().setApprovalRequest(data)`。
  - 收到事件后，同时更新对应 Agent 的状态为 `waiting_for_human`。

### 3.3 UI 组件开发 (UI Component)
- **文件**: `src/components/Console/ApprovalModal.tsx` (新建)
- **功能**:
  - 监听 `useAgentStore` 中的 `approvalRequest`。
  - 当有请求时弹出模态框（样式参考 `JailModal` 但区分主题，例如使用黄色/金色代表“御批”）。
  - 显示请求详情：哪个 Agent (ID/Name)、想执行什么工具 (Function)、参数 (Args)、风险等级 (Risk Level)。
  - 提供 "批准 (Approve)" 和 "驳回 (Reject)" 按钮。
  - 点击按钮后，通过 `SocketManager.sendCommand` 发送指令：
    ```javascript
    {
      targetId: agentId,
      action: 'approve' | 'reject',
      payload: { toolCallId, feedback: '...' }
    }
    ```
  - 操作完成后清除 `approvalRequest`。

### 3.4 集成与验证 (Integration & Verification)
- **文件**: `src/components/Dashboard/DashboardLayout.tsx`
- **内容**:
  - 引入并渲染 `ApprovalModal` 组件。
- **验证**:
  - 由于后端环境可能未完全就绪或难以触发高风险操作，将编写一个临时测试按钮或脚本，模拟触发 `approval_request` 事件，验证 UI 流程是否通畅。

## 4. 验收标准 (Acceptance Criteria)
1.  Agent 进入 `WAITING_FOR_HUMAN` 状态时，前端能正确识别并显示“审批中”状态。
2.  前端自动弹出 `ApprovalModal`，显示正确的工具调用信息。
3.  点击“批准”或“驳回”能通过 Socket 发送正确的指令格式。
4.  审批处理后，Modal 自动关闭。
