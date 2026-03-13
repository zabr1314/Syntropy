# 前端 OpenClaw API 动态配置功能实现计划

## 1. 需求分析
用户希望在前端界面中提供一个功能，允许用户手动添加和管理多个 OpenClaw 实例的 API 地址。目前系统仅支持硬编码的单一地址 (`http://localhost:3001/api/agents`)。

## 2. 核心改动
我们将引入一个配置管理模块，并更新服务层以支持多源数据轮询。

### A. 状态管理 (Store)
创建一个新的 Zustand Store 用于持久化存储配置信息。
- **文件**: `src/store/useConfigStore.ts`
- **功能**:
  - 存储 `apiEndpoints` 列表 (默认包含 `http://localhost:3001/api/agents`)。
  - 提供 `addEndpoint` 和 `removeEndpoint` 方法。
  - 使用 `persist` 中间件将配置保存到 localStorage。

### B. 服务层升级 (Service)
改造 `LiveAgentService` 以支持多端点轮询。
- **文件**: `src/services/LiveAgentService.ts`
- **改动**:
  - 移除 `API_URL` 常量。
  - 在 `fetchAgents` 方法中，读取 `useConfigStore` 中的所有端点。
  - 并行请求所有 API，并将结果合并处理。
  - 增加对每个端点的健康检查状态记录（可选，用于 UI 显示连接状态）。

### C. UI 界面 (Component)
新增“系统设置”面板，用于管理 API 地址。
- **文件**: `src/components/Console/SettingsModal.tsx`
- **风格**: 保持现有的“天命系统”古风科幻 UI 风格。
- **功能**:
  - 列表展示当前所有 API 地址。
  - 输入框添加新地址。
  - 删除按钮移除地址。
  - (可选) “测试连接” 按钮。

### D. 入口集成
在系统状态栏添加设置入口。
- **文件**: `src/components/Console/SystemStatus.tsx`
- **改动**: 添加一个“设置”图标按钮，点击打开 `SettingsModal`。

## 3. 实施步骤

1.  **创建 `useConfigStore`**: 实现配置的持久化存储。
2.  **升级 `LiveAgentService`**: 修改轮询逻辑，支持从 Store 获取地址列表并并行请求。
3.  **开发 `SettingsModal`**: 实现配置管理的 UI 界面。
4.  **集成入口**: 在 `SystemStatus` 中添加按钮并连接 Modal。

## 4. 预期效果
用户点击状态栏的设置按钮，弹出一个面板，可以输入新的 OpenClaw API 地址（例如 `http://192.168.1.100:3001/api/agents`）。保存后，系统会自动开始轮询新地址，并将新发现的 Agent 自动显示在广场区域。
