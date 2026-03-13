# 天命系统 (Mandate of Heaven) 百官录前后端联调计划

## 1. 目标 (Goal)
将前端“百官录” (Officials Registry) 的数据源从本地硬编码配置 (`useConfigStore` + `COURT_ROLES`) 迁移至后端真实注册表 (`server/config/officials.json` + `Kernel` Runtime)。
实现“后端定义官员，前端动态展示”的架构。

## 2. 现状分析 (Current State)
- **Backend**: 
  - `server/config/officials.json` 定义了 8 位官员的元数据。
  - `Kernel` 启动时加载这些官员，但在 `BaseRole` 中丢失了部分元数据（如 `description`）。
  - 没有专门的 API 暴露这份名单。
- **Frontend**:
  - `OfficialsPanel.tsx` 读取 `useConfigStore` 中的 `configAgents`（本地持久化）。
  - 依赖 `COURT_ROLES` 常量来渲染图标、颜色和中文职官名称。
  - `useAgentStore` 仅通过 WebSocket 更新状态，不负责名单初始化。

## 3. 实施方案 (Implementation Plan)

### Phase 1: 后端改造 (Backend)
1.  **增强 BaseRole**: 修改 `server/agents/BaseRole.js`，使其在构造时保存完整的 `config` 对象（包含 `description`, `permissions` 等），以便 API 返回。
2.  **新增 API**: 在 `server/index.js` 中添加 `GET /api/officials` 接口。
    - 返回格式示例：
      ```json
      [
        {
          "id": "minister",
          "name": "丞相",
          "description": "总管廷议...",
          "status": "idle",
          "lastMessage": "..."
        },
        ...
      ]
      ```

### Phase 2: 前端改造 (Frontend)
1.  **类型定义**: 更新 `src/types/api.ts`，添加 `Official` 接口。
2.  **状态管理**: 
    - 修改 `src/store/useConfigStore.ts`，添加 `fetchOfficials` 异步 Action。
    - 移除默认的硬编码 `agents` 列表，改为启动时从后端拉取。
3.  **组件适配**:
    - 修改 `src/components/Console/OfficialsPanel.tsx`。
    - 使用 `useEffect` 在组件挂载时调用 `fetchOfficials`。
    - 渲染列表时，优先使用 `COURT_ROLES` 中的 UI 配置（图标/颜色），如果找不到则使用默认图标。
    - 显示来自后端的 `description` 和 `name`。

### Phase 3: 验证 (Verification)
1.  启动后端，访问 `http://localhost:3001/api/officials` 确认数据完整性。
2.  启动前端，检查“百官录”面板是否自动列出了所有 8 位官员。
3.  测试添加/删除功能（应当被禁用或改为“仅限访客”模式，因为正规官员由后端决定）。

## 4. 假设与决策 (Assumptions & Decisions)
- **UI 映射**: 我们保留 `src/constants/court.ts` 中的 `COURT_ROLES` 作为 UI 映射表（ID -> Icon/Color）。后端只负责逻辑和文本数据。
- **只读性**: “百官录”将变为只读展示（对于核心官员），不允许前端随意删除后端定义的官员。

## 5. 待办事项 (Todos)
- [ ] Backend: Update `BaseRole.js` to store metadata.
- [ ] Backend: Add `GET /api/officials` endpoint.
- [ ] Frontend: Update `useConfigStore` with fetch logic.
- [ ] Frontend: Update `OfficialsPanel` to render dynamic list.
