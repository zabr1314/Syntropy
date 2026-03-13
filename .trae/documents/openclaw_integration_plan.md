# OpenClaw 集成完善计划

## 目标
完善 `LiveAgentService`，使其能够从 Relay Server (`http://localhost:3001/api/agents`) 获取 OpenClaw 的实时状态，并同步到前端的 `useAgentStore`，从而在界面上展示真实的 Agent 工作状态。

## 现状分析
- **后端**: `server/index.js` 已提供 `/api/agents` 接口，返回 Agent 列表。
- **前端服务**: `src/services/LiveAgentService.ts` 结构已存在，但缺少轮询和状态同步逻辑。
- **状态管理**: `useAgentStore` 支持 `setAgentStatus` 和 `setTargetPosition`。
- **ID 不一致**: 后端使用 `engineer`，前端使用 `official_works`，需要映射。

## 任务列表

### 1. 完善 LiveAgentService
- [ ] 定义 ID 映射表 (`minister` -> `minister`, `engineer` -> `official_works` 等)。
- [ ] 定义位置坐标常量 (参考 `CourtService` 的 `LOCATIONS`)。
- [ ] 在 `start()` 中启动轮询定时器 (每 1-2 秒)。
- [ ] 实现 `fetchAgents` 方法：
    - 调用 API 获取数据。
    - 遍历返回的 Agent。
    - 映射 ID。
    - 根据状态 (`idle`/`working`/`offline`) 调用 `setAgentStatus` 和 `setTargetPosition`。
        - `working`: 移动到对应工位。
        - `idle`/`offline`: 移动到休息区或保持原位。
- [ ] 在 `stop()` 中清除定时器。

### 2. 协调 CourtService
- [ ] (可选) 为 `CourtService` 添加 `pause()` / `resume()` 方法，或者在 Live 模式下通过 Store 标记来抑制其自动行为（如闲聊）。
    - 目前 `CourtService` 会自动闲聊。为避免冲突，建议在 Live 模式下，`LiveAgentService` 的更新频率足以覆盖 `CourtService` 的闲聊，或者简单地让两者共存（OpenClaw 状态优先）。
    - 鉴于 `GameEventManager` 已经被停止，主要的干扰源是 `CourtService` 的 idle chatter。

### 3. 验证
- [ ] 启动 Server 和 Connector。
- [ ] 启动前端，点击 "连接 OpenClaw" (如果 UI 有入口) 或自动启动。
- [ ] 观察 Agent 是否根据 `state.json` 的变化而移动和改变气泡。

## 映射关系 (暂定)
- `minister` -> `minister` (丞相)
- `engineer` -> `official_works` (工部)
- `product_manager` -> `official_rites` (礼部/策划) - *需确认*
- `designer` -> `official_works` (或分拆) - *需确认*

目前仅处理 `minister` 和 `engineer`。
