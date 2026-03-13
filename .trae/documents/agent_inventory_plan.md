# Agent 详情页与“装备栏”功能开发计划

## 1. 目标
为每个 Agent 增加一个详细的配置面板（详情页），模拟游戏中的“角色装备栏”。用户可以在此界面：
*   **修改连接**: 更改 Agent 的端口/URL。
*   **安装/卸载技能 (Skills)**: 类似于装备武器/道具。
*   **配置 MCP 工具**: 类似于安装插件。

## 2. 修改范围
*   `src/store/useConfigStore.ts`: 扩展数据结构以支持 skills 和 mcp 配置。
*   `src/components/Console/OfficialsPanel.tsx`: 增加点击 Agent 卡片打开详情页的交互。
*   **新增** `src/components/Console/AgentDetailModal.tsx`: 新的详情页组件。

## 3. 具体改动

### A. 数据结构升级 (useConfigStore)
扩展 `AgentConfig` 接口：
```typescript
interface AgentConfig {
  role: AgentId;
  name: string;
  port: string;
  // 新增字段
  skills: string[]; // 已启用的技能列表，如 ['search', 'python']
  mcpServers: {
     name: string;
     url: string;
     enabled: boolean;
  }[];
}
```

### B. Agent 详情页 (AgentDetailModal)
设计一个类似于 RPG 角色面板的界面：
*   **左侧 (Character Info)**:
    *   显示 Agent 头像、职能描述。
    *   **连接设置**: 允许修改 `port`，修改后需重启连接。
*   **右侧 (Inventory/Loadout)**:
    *   **技能槽 (Skills)**: 列出可用技能（如 `Search`, `Code Analysis`, `Image Gen`），用户可勾选“装备”。
    *   **MCP 插件槽**: 允许添加/删除 MCP 服务器地址。
*   **底部**: 保存按钮。

### C. 交互逻辑
1.  在 `OfficialsPanel` 中点击 Agent 卡片（非删除按钮区域），弹出一个新的全屏模态框 `AgentDetailModal`。
2.  在 `AgentDetailModal` 中修改配置后，调用 `updateAgent` 方法更新 Store。
3.  如果修改了端口或 MCP，可能需要触发 `LiveAgentService` 的重连逻辑（后续迭代实现后端对接，目前先做前端配置存储）。

## 4. 执行步骤
1.  修改 `useConfigStore.ts`，增加 `updateAgent` 方法和新的类型定义。
2.  创建 `AgentDetailModal.tsx` 组件，实现 UI 布局。
3.  修改 `OfficialsPanel.tsx`，集成详情页弹窗。
