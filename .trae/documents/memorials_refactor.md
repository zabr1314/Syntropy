# 奏折阁 (Memorials Pavilion) 与 起居注 (Living Notes) 功能重构计划

## 1. 目标 (Goal)

在**保留现有 UI 布局和视觉风格**的前提下，重构“奏折阁”与“起居注”的核心功能逻辑。

* **奏折阁 (Memorials Pavilion)**: 转型为**任务分发中心**。保留左侧对话流/右侧输入框的布局，但增加**任务指派**功能（指定执行官员），并优化任务状态流转逻辑。

* **起居注 (Living Notes)**: 转型为**动态叙事流**。保留右侧边栏的滚动日志布局，但**重写日志内容**，将枯燥的技术日志替换为“史官叙事”风格的动态（包含官员头像、思考气泡、对话内容）。

## 2. 现状分析 (Current State)

* **UI**: 现有的 `MemorialsPanel`（对话式列表）和 `LogSidebar`（滚动日志）布局无需变动。

* **逻辑**:

  * `DecreePipeline` 目前只支持简单的文本输入，默认发给 `minister`。

  * `LogSidebar` 直接展示 `useCourtStore.logs` 中的原始数据，包含大量 JSON/Debug 信息。

* **数据**: `Decree` 对象缺乏 `assigneeId`（执行人）字段。

## 3. 实施步骤 (Implementation Steps)

### Phase 1: 数据结构升级 (`useCourtStore.ts`)

* [ ] **扩展 Decree 接口**:

  * 新增 `assigneeId`: string (指定执行官员的 ID)。

  * 新增 `priority`: 'high' | 'normal' (优先级)。

* [ ] **新增 Activity/Narrative 接口** (用于起居注):

  * `id`, `timestamp`, `agentId`, `type` (thought/speak/action/system), `content`.

  * 在 Store 中维护 `activities` 队列，用于替代旧的 `logs` 展示（或基于 logs 转换）。

### Phase 2: 奏折阁功能增强 (`DecreePipeline.tsx` & `MemorialsPanel.tsx`)

* [ ] **增强输入区 (`DecreePipeline`)**:

  * 在输入框旁增加一个**官员选择器** (Dropdown/Select)，允许用户指定任务执行人（默认为“丞相”或“自动分配”）。

  * 支持快捷指令（如 `/assign emperor`）。

* [ ] **优化列表展示 (`MemorialsPanel`)**:

  * 在每条奏折卡片上显示**执行官员的头像/名称**。

  * 优化状态显示（如：`等待[户部尚书]复命`）。

### Phase 3: 起居注内容重写 (`LogSidebar.tsx`)

* [ ] **日志格式化**:

  * 拦截/解析后端的原始日志，转换为**叙事性文本**。

  * 例如：

    * 原: `{"type": "thought", "agent": "minister", "content": "Checking resources..."}`

    * 新: `[丞相] 正在盘算国库充盈情况...` (配头像)

  * 原: `{"type": "move", "agent": "emperor", "target": {x:100, y:100}}`

  * 新: `[皇帝] 起驾前往御书房。`

* [ ] **UI 微调**:

  * 保持现有滚动条布局。

  * 将纯文本日志改为 **头像 + 气泡** 的列表项。

  * 增加简单的**按官员筛选**功能（顶部小图标）。

## 4. 验证 (Verification)

1. **指派任务**: 在输入框选择“工部尚书”，发布“修建水利”指令。
2. **任务反馈**: 奏折列表显示该任务由“工部尚书”接手。
3. **起居注**: 侧边栏实时刷出“\[工部尚书] 领旨，正在规划河道...”的叙事日志，而非 JSON 代码。

## 5. 待办清单 (Todo List)

* [ ] 修改 `useCourtStore` 添加 `assigneeId`。

* [ ] 更新 `DecreePipeline` 增加官员选择功能。

* [ ] 更新 `MemorialsPanel` 显示执行人信息。

* [ ] 重构 `LogSidebar` 的渲染逻辑，实现叙事化展示。

