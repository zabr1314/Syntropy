# 三省六部制 (Edict) 核心架构集成计划

## 🎯 目标
将“三省六部制”从一个独立的演示模块，升级为驱动整个游戏世界的核心逻辑引擎。它将接管现有的 `GameEventManager`，让游戏中的 Agent (丞相、工程师) 真正按照 **中书规划 -> 门下审核 -> 兵部执行** 的政治流程进行行动。

## 🏛️ 架构设计

### 1. 双层状态架构
*   **物理层 (`useAgentStore`)**: 现有的 Store，负责 Agent 的坐标、动画状态 (`idle`, `moving`, `working`)、气泡消息。
*   **行政层 (`useCourtStore`)**: **新增**。负责管理“奏折” (`Decree`) 的生命周期、部门审核状态、流转历史。
    *   *设计原则*: 行政层的变化 **驱动** 物理层的变化。

### 2. 场景区域映射 (基于 `MainScene.ts`)
根据现有地图代码，重新定义各部门的办公地点：
*   **皇宫/议政厅 (The Throne/Council)**: `(x: 400, y: 150)` —— 对应 `MainScene` 中上方区域。
    *   *驻扎*: **中书省 (Secretariat)**、**门下省 (Chancellery)**。
    *   *动作*: 丞相在此处徘徊思考 (规划)，或向屏幕前的用户汇报 (审核)。
*   **兵部工坊 (Engineering Bay)**: `(x: 600, y: 400)` —— 对应 `MainScene` 右下办公区。
    *   *驻扎*: **兵部 (Ministry of War)**。
    *   *动作*: 工程师在此处敲代码 (执行)。
*   **藏书阁 (Library)**: `(x: 150, y: 150)` —— 对应 `MainScene` 左上区域。
    *   *用途*: 查阅资料 (预留给未来的户部/礼部)。

## 📋 实施步骤

### 第一步：建立行政中枢 (Store)
创建 `src/store/useCourtStore.ts`，作为单一数据源。
*   **状态结构**:
    ```typescript
    interface CourtState {
      decrees: Decree[]; // 所有奏折
      activeDecreeId: string | null; // 当前处理的奏折
      systemStatus: 'idle' | 'busy' | 'emergency'; // 整体朝廷状态
    }
    ```
*   **Actions**: `addDecree` (下旨), `updateStep` (更新流转步骤), `archiveDecree` (归档)。

### 第二步：实现“内阁”服务 (CourtService)
创建 `src/services/court/CourtService.ts`，作为连接 **Store** 和 **Game** 的桥梁。
*   **监听器**: 监听 `useCourtStore` 的变化。
*   **副作用 (Side Effects)**:
    *   当 `status` 变为 `planning` -> 调用 `useAgentStore` 让 **Minister** 移动到 **藏书阁** 查找资料，然后回 **议政厅** 起草。
    *   当 `status` 变为 `reviewing` -> 让 **Minister** 面向用户 (屏幕前方)，弹出气泡请求审核。
    *   当 `status` 变为 `executing` -> 让 **Engineer** 移动到 **兵部工坊**，并播放工作动画。
*   **自动化逻辑**: 迁移之前的 Mock 逻辑，但增加随机性和时间延迟，使其看起来更像是在“工作”。

### 第三步：改造 UI 看板
重构 `src/components/CourtConsole.tsx`。
*   **风格统一**: 使用与游戏背景融合的半透明深色 UI。
*   **功能**:
    *   **奏折详情**: 显示当前任务的进度条 (Progress Bar)。
    *   **历史记录**: 简化的 Log 列表。
    *   **交互**: 允许用户对“门下省”的审核结果进行干预 (Force Approve / Reject)。

### 第四步：清理旧代码
*   修改 `App.tsx`，确保 `CourtService` 在应用启动时初始化。
*   (可选) 暂时禁用 `GameEventManager` 的随机事件，避免干扰演示。

## ✅ 验收标准
1.  用户在 UI 下旨 "修复服务器 bug"。
2.  **视觉反馈**: 丞相 (Minister) 自动走到左上角查资料，然后走到中间思考。
3.  **UI 反馈**: 看板显示 "中书省: 正在规划..."。
4.  **流程闭环**: 规划完成后，自动进入门下省审核（模拟驳回/通过），最后工程师 (Engineer) 自动走到右下角开始工作。
5.  **代码规范**: 所有新代码使用 TypeScript，状态管理分离清晰。
