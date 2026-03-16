# 前端动画设计审查与优化计划

## 1. 现状分析 (Current State Analysis)

经过对 `src/` 目录下代码的审查，发现当前系统主要存在三类动画实现：

1. **UI 交互动画** (`framer-motion`): 用于侧边栏、弹窗的进出场，质量较好。
2. **UI 状态动画** (Tailwind CSS): 用于 `DepartmentDock` 中的角色状态指示（如 `animate-spin`, `animate-pulse`）。
3. **游戏场景动画** (Phaser Tweens): 用于 `Agent` 角色的移动、工作状态表现（如挤压拉伸、启动弹跳）。

## 2. 问题诊断 (Problem Diagnosis)

### A. 逻辑缺陷 (Logic Defects)

* **问题 1：牵一发而动全身 (All Agents Move on Click)**

  * **现象**: 当点击地面移动皇帝时，所有官员都会重新触发移动动画。

  * **原因**: 前端状态管理 (`useAgentStore`) 保留了官员的历史目标位置。当 Store 更新（皇帝移动）时，`MainScene` 的订阅者会全量同步状态。由于 Phaser Agent 在到达目的地后会重置内部目标 (`_targetX = null`)，但 Store 中仍有旧坐标，导致 `syncAgents` 误判为“新指令”，再次调用 `moveTo`。虽然距离为 0，但 `moveTo` 会触发“启动弹跳”动画。

  * **影响**: 极差的用户体验，画面乱颤。

* **问题 2：无效信息噪音 (Info Noise)**

  * **现象**: 官员头顶和奏折阁中频繁出现 "Ready" 字样。

  * **原因**: 后端 `Agent.js` 在 `onWake` 时硬编码了 `setStatus(..., 'Ready')`。这是开发阶段的占位符。

  * **影响**: 破坏沉浸感。

### B. 风格违和 (Tonal Mismatch)

* **问题 3：卡通化的物理效果**

  * **位置**: `src/game/Agent.ts`

  * **描述**: 官员在“工作”时使用了 **Squash and Stretch (挤压与拉伸)** 动画；在“开始移动”时使用了 **Jump Start (启动弹跳)**。

  * **原因**: 迪士尼风格动画法则不适合严肃朝廷题材。

### C. 视觉语言不一致 (Visual Inconsistency)

* **问题 4**: UI 中的 `animate-spin`（旋转）与游戏内的行走逻辑不符。

## 3. 优化方案 (Proposed Changes)

### 1. 修复移动联动 Bug (`MainScene.ts`)

* **逻辑优化**: 在 `syncAgents` 中，在调用 `moveTo` 之前，增加距离检测。

* **判断条件**: 如果 `state.targetPosition` 与当前 Agent 的物理位置 (`agent.x`, `agent.y`) 距离小于阈值（如 4px），则**不**调用 `moveTo`，直接忽略。

### 2. 清理信息噪音 (`Agent.js` & `MemorialsPanel.tsx`)

* **后端**: 将 `Agent.js` 中的 `'Ready'` 修改为更符合语境的空字符串 `''` 或 `'待命'`。

* **前端**: 在 `MemorialsPanel` 中增加过滤条件，不渲染内容为 `'Ready'` 或 `'待命'` 的消息。

### 3. 移除卡通动画 (`Agent.ts`)

* **移除启动弹跳**: 删除 `moveTo` 中的 `Jump start` tween。

* **优化工作动画**: 将挤压变形改为微弱的 Y 轴浮动（呼吸感）。

### 4. 修正 UI 状态 (`DepartmentDock.tsx`)

* **移除旋转**: 移除 `animate-spin-slow`，改为 `border-dashed` 或其他静态/微动效样式。

## 4. 执行步骤 (Implementation Steps)

1. **修改** **`server/core/Agent.js`**: 将初始化消息改为 `''`。
2. **修改** **`src/game/MainScene.ts`**: 优化 `syncAgents` 逻辑，防止重复触发移动。
3. **修改** **`src/game/Agent.ts`**: 移除 `moveTo` 中的弹跳动画，重写 `playWorkAnimation`。
4. **修改** **`src/components/Console/DepartmentDock.tsx`**: 移除旋转动画类。
5. **修改** **`src/components/Console/MemorialsPanel.tsx`**: 过滤无效日志。
6. **验证**: 重启后端和前端，检查“皇帝移动”是否还会导致“百官乱颤”，检查“Ready”是否消失。

## 5. 决策与假设 (Assumptions)

* 假设用户更倾向于“严肃/模拟”风格而非“卡通/Q版”风格。

* 假设修改仅涉及代码逻辑，不需要新增美术资源。

