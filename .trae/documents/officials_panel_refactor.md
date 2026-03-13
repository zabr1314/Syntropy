# 前端百官录 (Officials Panel) 重构计划

## 1. 目标
将“百官录”从游戏化的角色属性面板，改造为 **OpenClaw 多 Agent 监控仪表盘**。去除“忠诚度”、“体力”等游戏数值，转而展示 Agent 的实时运行状态、当前任务和技术职能。

## 2. 修改文件
*   `src/components/Console/OfficialsPanel.tsx`

## 3. 具体改动

### A. 移除游戏化元素
*   删除 `getStats` 函数及其生成的 `efficiency` (效率), `loyalty` (忠诚度), `energy` (体力) 数值。
*   删除对应的进度条 UI。
*   移除“官员点卯 (Roll Call)”等古风标题，改为更具科技感的标题（如 "AGENT CLUSTER" 或 "系统节点状态"）。

### B. 增强技术监控视角
*   **状态展示**: 强化 `status` (Idle/Working/Moving/Error/Offline) 的视觉反馈。
*   **实时日志**: 将 `message` (气泡消息) 改为终端风格的单行日志显示，展示 Agent 当前正在处理的具体事务。
*   **职能描述**: 突出显示 `role.description` (如 "掌管系统安全与运维")，弱化古风官职名称，或者两者并列展示以保持“天命”特色但增加可读性。
*   **元数据**: 如果可能，显示 Agent 的 ID (`minister`, `official_war` 等) 作为节点标识符。

### C. UI 样式调整
*   保持现有的暗色/金色调（符合天命系统风格），但布局更像服务器监控面板。
*   为每个 Agent 卡片增加“终端”风格的背景框来显示消息。

## 4. 执行步骤
1.  修改 `OfficialsPanel.tsx`，重写渲染逻辑。
2.  (可选) 检查 `DepartmentDock.tsx` 的 Tooltip 是否需要同步调整文案风格。
