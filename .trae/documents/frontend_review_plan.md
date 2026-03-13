# 前端代码审查与优化计划

## 1. 现状分析
通过对项目结构的深度扫描，我们发现当前系统正处于从“本地模拟”向“实时 Agent 驱动”架构迁移的中间状态。虽然界面框架（Dashboard, GameContainer, Console）已经成熟，但底层逻辑存在新旧共存的情况。

## 2. 冗余功能清理
以下模块已被新的 `LiveAgentService` 替代或明确标记为废弃，建议移除以减轻维护负担：

*   **`src/components/HUD.deprecated.tsx`**: 旧版界面组件，已被 `ConsoleLayout` 和 `DashboardLayout` 替代。
*   **`src/services/court/` 目录**: 包含 `CourtService.ts` 及 `roles/` 子目录。这是旧的本地模拟逻辑（硬编码的圣旨流程和随机闲聊），现在状态流转已由 `LiveAgentService` 通过 WebSocket 实时驱动。
*   **`src/game/GameEventManager.ts`**: 旧的随机事件生成器，目前在 `LiveAgentService` 中仅被调用以执行 `stop()`，应彻底移除并清理相关调用。

## 3. 缺失功能建议（基于“天命系统”完整性）
为了让系统从单纯的“监控面板”进化为真正的“治理模拟系统”，建议补充以下功能：

### A. 核心数值体系 (The Metrics of Mandate)
目前系统仅有 CPU/内存等技术指标，缺乏“治理”指标。
*   **建议新增**:
    *   **国库 (Treasury)**: 影响工部/户部任务执行。
    *   **民心 (Stability)**: 过低可能触发暴乱事件。
    *   **军力 (Military)**: 影响兵部任务成功率。
    *   **天命值 (Mandate)**: 核心评分，归零导致 Game Over。

### B. 深度官员系统
目前的官员仅有“位置”和“状态”两个属性。
*   **建议新增**:
    *   **属性面板**: 点击官员头像显示忠诚度、贪腐度、能力值。
    *   **派系机制**: 官员之间的关系网，影响圣旨执行的配合度。

### C. 全局事件系统
目前仅有圣旨驱动的单向流程。
*   **建议新增**:
    *   **突发事件**: 如“边境入侵”、“水旱灾害”，需要强制打断当前任务并优先处理。
    *   **视觉反馈**: 在 GameContainer 中增加天气变化或警报特效。

### D. 历史与存档
*   **建议新增**:
    *   **起居注归档**: 允许按日期回溯历史圣旨和执行记录。
    *   **多存档槽**: 允许尝试不同的治理策略。

## 4. 执行步骤

1.  **清理阶段**:
    *   删除 `HUD.deprecated.tsx`。
    *   删除 `src/services/court`。
    *   清理 `App.tsx` 和 `ConsoleLayout.tsx` 中的无用引用。
    *   重构 `LiveAgentService` 以移除对 `GameEventManager` 的依赖，然后删除 `GameEventManager`。

2.  **构建阶段 (待用户确认优先级)**:
    *   第一阶段：实现 **核心数值体系**，并在界面顶部显示。
    *   第二阶段：增强 **官员属性** 数据结构和 UI 展示。
