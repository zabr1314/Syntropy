# 三省六部制 (Edict) 架构深度集成计划

## 🎯 目标
将当前的“三省六部”演示从简单的文本日志升级为具有**全局状态管理**、**可视化看板**和**游戏场景深度联动**的完整功能模块。利用 `Zustand` 重构数据流，并让游戏中的 Agent 根据行政流程真实地在地图上移动和交互。

## 📋 实施步骤

### 1. 核心架构重构 (State Management)
将 `CourtSystem` 的类实例状态迁移到全局 Store，以便 UI 和游戏场景能同时响应状态变化。

*   **创建 `src/store/useCourtStore.ts`**:
    *   定义 `CourtState`，包含 `decrees` (圣旨列表), `activeDecreeId` (当前焦点任务)。
    *   实现 `addDecree`, `updateDecreeStatus`, `addLog` 等 Action。
    *   实现 `processCommand` 异步 Action，包含原本 `CourtSystem` 中的完整流转逻辑（中书规划 -> 门下审核 -> 尚书分发 -> 六部执行）。
*   **重构 `src/services/court/roles/`**:
    *   将角色类改为纯粹的服务/逻辑类，不再持有状态，只负责处理输入并返回结果。
    *   优化 `Secretariat` (中书省) 的 `proposePlan` 方法，使其生成的计划更具结构化。
    *   优化 `Chancellery` (门下省) 的 `reviewPlan` 方法，增加多样化的驳回理由。

### 2. 游戏场景深度联动 (Game Integration)
让 Agent 的行为与行政流程紧密绑定，而不仅仅是弹气泡。

*   **定义办公区域**:
    *   在 `LiveAgentService` 中定义坐标点：
        *   `COUNCIL_CHAMBER` (议政厅): 坐标 `(300, 300)` —— 中书/门下省办公地。
        *   `ENGINEERING_BAY` (兵部工坊): 坐标 `(600, 300)` —— 兵部/工程师办公地。
*   **实现自动调度逻辑**:
    *   在 `LiveAgentService` 中监听 `useCourtStore` 的变化。
    *   **规划/审核阶段 (`planning`, `reviewing`)**: 强制调度 `Minister` (大臣) 前往 `COUNCIL_CHAMBER`，并播放思考/讨论动画。
    *   **执行阶段 (`executing`)**: 强制调度 `Engineer` (工程师) 前往 `ENGINEERING_BAY`，并播放工作动画。
    *   **空闲阶段 (`idle`, `completed`)**: Agent 返回各自的休息区或随机游走。

### 3. UI 升级：军机处看板 (Dashboard Upgrade)
将简单的控制台升级为信息丰富的看板。

*   **重写 `src/components/CourtConsole.tsx`**:
    *   **状态卡片**: 顶部显示当前圣旨的状态（如“门下省审议中...”）。
    *   **计划视图**: 专门区域展示中书省生成的 `Plan` (步骤列表)，并高亮当前正在执行的步骤。
    *   **流转日志**: 保留日志区域，但样式更加紧凑。
    *   **控制区**: 允许皇上（用户）随时“撤回旨意”或“强制通过”（行使皇权）。

### 4. 验证与测试
*   启动应用，下达指令“为我建造一座宫殿”。
*   观察 `Minister` 移动到议政厅，控制台显示“中书省正在规划”。
*   观察 `Plan` 列表中出现具体步骤。
*   模拟“门下省驳回”，观察日志和状态变化。
*   审核通过后，观察 `Engineer` 移动到工坊开始工作。
