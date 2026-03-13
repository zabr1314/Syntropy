# 天命系统 (Mandate of Heaven) 动态子智能体管理计划

## 1. 目标 (Goal)
实现系统运行时的**动态子智能体 (Sub-Agent) 管理**，包括：
1.  **动态新增**: 允许通过 API 或前端界面在运行时创建新的 Agent 实例。
2.  **动态删除**: 允许在运行时注销和移除 Agent 实例。
3.  **前端适配**: 修复“百官录”点击详情页时的“神经连接”显示问题，并支持在前端界面进行增删操作。

## 2. 现状分析 (Current State)
- **Backend**:
  - `Kernel` 有 `registerAgent` 方法，但没有 `unregisterAgent` 方法。
  - `server/index.js` 仅在启动时从 `config/officials.json` 加载 Agent。
  - 缺少用于动态增删 Agent 的 API (`POST /api/agents`, `DELETE /api/agents/:id`)。
- **Frontend**:
  - `OfficialsPanel` 依赖 `useConfigStore` 获取列表，虽然已经对接了 `fetchOfficials`，但“新增”按钮逻辑（`handleAddAgent`）仍然是操作本地 Config Store，未调用后端 API。
  - `AgentDetailModal` 显示的“神经连接”等信息可能与当前后端架构不符（可能是 OpenClaw 遗留 UI）。

## 3. 实施方案 (Implementation Plan)

### Phase 1: 后端核心升级 (Backend Core)
1.  **Kernel 增强**:
    - 在 `server/core/Kernel.js` 中添加 `unregisterAgent(agentId)` 方法。
    - 确保注销时清理相关资源（如 Event 监听器）。
2.  **API 扩展**:
    - 在 `server/index.js` 中添加 `POST /api/agents` 接口，接收 Agent 配置并动态注册。
    - 在 `server/index.js` 中添加 `DELETE /api/agents/:id` 接口，调用 Kernel 注销 Agent。

### Phase 2: 前端逻辑适配 (Frontend Logic)
1.  **API Client**:
    - 在 `src/store/useConfigStore.ts` 中添加 `createAgent` 和 `deleteAgent` 的异步 Action，调用上述新 API。
    - 操作成功后自动调用 `fetchOfficials` 刷新列表。
2.  **UI 交互**:
    - 修改 `src/components/Console/OfficialsPanel.tsx` 的 `handleAddAgent`，改为调用 `createAgent`。
    - 修改删除按钮逻辑，改为调用 `deleteAgent`。

### Phase 3: 详情页 UI 修复 (Frontend UI)
1.  **AgentDetailModal**:
    - 检查 `AgentDetailModal.tsx`，移除或隐藏不相关的“神经连接” (Neural Connection) / MCP 等 OpenClaw 遗留概念，除非我们确实实现了它们。
    - 简化详情页，重点展示 Agent 的状态、描述和最近消息。

## 4. 验证 (Verification)
1.  **新增测试**: 在前端点击“新增节点”，填写 ID 和名称，确认后端日志显示“Registered Agent”，且前端列表自动刷新。
2.  **删除测试**: 点击删除按钮，确认后端日志显示“Unregistered Agent”，且前端列表该项消失。
3.  **详情页检查**: 点击 Agent 卡片，确认详情页展示内容清晰，无报错或奇怪的未定义字段。

## 5. 待办事项 (Todos)
- [ ] Backend: Add `unregisterAgent` to `Kernel`.
- [ ] Backend: Add POST/DELETE API endpoints.
- [ ] Frontend: Update `useConfigStore` with async create/delete actions.
- [ ] Frontend: Wire up `OfficialsPanel` add/delete buttons.
- [ ] Frontend: Cleanup `AgentDetailModal` UI.
