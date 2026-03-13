# 多 OpenClaw 实例监控大屏优化计划

## 1. 现状问题诊断
当前系统是基于“六部官员”的 RPG 隐喻设计的，对于多实例监控存在以下硬伤：
- **硬编码限制**: `LiveAgentService.ts` 强制过滤了不在 `ID_MAPPING` 中的实例。如果启动了第 8 个 OpenClaw，前端会直接忽略。
- **信息密度低**: RPG 界面适合看“剧情”，不适合看“运维数据”。无法一眼看到所有节点的健康状况、心跳延迟和详细报错。
- **排版局限**: 固定的工位坐标无法容纳动态增加的 Agent。

## 2. 优化目标
打造一个**“天眼”监控系统**（Sky Eye Dashboard），既保留古风沉浸感，又提供现代化的运维监控能力。

### A. 核心能力升级
1.  **动态接入**: 任何连接到 Server 的 OpenClaw 实例，无论 ID 是什么，都应立即在前端可见。
2.  **自动编排**: 对于未映射到“六部”的额外实例，自动分配为“侍卫”或“翰林学士”，并在广场区域自动排列。

### B. 新增“天眼”大屏
创建一个可视化的数据面板，包含：
- **实例矩阵**: 以卡片或列表形式展示所有节点。
- **健康雷达**: 实时显示在线/离线状态、心跳延迟。
- **任务流**: 滚动的全局任务日志。

## 3. 实施计划

### 第一阶段：解除限制与动态生成 (优先级：High)
1.  **改造 `LiveAgentService.ts`**:
    - 移除 `ID_MAPPING` 的白名单限制。
    - 实现 `Dynamic Agent` 注册逻辑：遇到未知 ID，自动生成前端 Agent。
    - 实现 `Grid Layout` 算法：将额外 Agent 排列在 `LOCATIONS.SQUARE` (广场) 区域。
2.  **资源复用**:
    - 为未知 Agent 分配随机或默认的皮肤（如 `guard` 或 `scholar`）。

### 第二阶段：开发“天眼”面板 (优先级：High)
1.  **新建组件 `SkyEyeDashboard.tsx`**:
    - 位于 `src/components/Console/SkyEyeDashboard.tsx`。
    - 采用半透明深色玻璃质感，结合古风边框。
    - 展示内容：
        - **总览**: 在线数、忙碌数、异常数。
        - **节点列表**: 表格显示 ID、别名、状态、当前任务、最后心跳。
2.  **入口集成**:
    - 在 `DepartmentDock` 或 `SystemStatus` 中添加“天眼”按钮。

### 第三阶段：后端数据增强 (建议)
- 虽然主要改前端，但建议在前端对 `last_updated` 进行计算，显示“延迟 x ms”或“x 秒前心跳”，以体现监控的实时性。

## 4. 立即执行动作
我将优先执行 **第一阶段** 和 **第二阶段**，确保您可以立即看到多实例的效果。
1. 修改 `src/services/LiveAgentService.ts` 支持动态 Agent。
2. 创建 `src/components/Console/SkyEyeDashboard.tsx`。
3. 更新 `src/components/Console/ConsoleLayout.tsx` 引入新面板。
