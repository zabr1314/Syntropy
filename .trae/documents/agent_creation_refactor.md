# 天命系统：官员册封（Agent Creation）功能重构计划

## 1. 目标 (Goal)
将现有的简易“添加节点”功能升级为沉浸式的“官员册封”系统。
- **界面升级**：替换原有的技术风弹窗，采用符合“天命系统”世界观的古代诏书/册封大典风格。
- **功能增强**：支持在创建时直接配置 Agent 的**人设 (System Prompt)**、**模型 (Model)** 和 **职权 (Skills)**。
- **体验优化**：移除“端口/连接”等无关技术参数，简化创建流程。

## 2. 现状分析 (Current State)
- **前端 (`OfficialsPanel.tsx`)**:
  - 只有一个简单的模态框，仅支持输入 Role ID 和 Port。
  - 样式为现代科技风，与项目整体氛围不符。
  - 创建后需要再次进入详情页才能配置 Prompt 和 Skills。
- **后端 (`server/index.js`)**:
  - `POST /api/agents` 接口已支持接收 `systemPrompt`, `model`, `skills` 等完整配置。
  - 目前前端未充分利用此接口能力。

## 3. 实施步骤 (Implementation Steps)

### 3.1 新建组件：册封大典 (`AppointmentModal.tsx`)
- **位置**: `src/components/Console/AppointmentModal.tsx`
- **功能**:
  - **基本信息**: 
    - 姓名 (Name): 如 "诸葛亮"
    - 官职代码 (ID): 如 "prime_minister" (自动生成或手动输入)
    - 职责描述 (Description): 如 "统筹全局，制定国策"
  - **核心人设**:
    - 圣谕 (System Prompt): 大文本域，支持 Markdown，预设一些模板。
  - **能力配置**:
    - 模型选择 (Model): 下拉菜单 (DeepSeek V3 / GPT-4o)。
    - 职权授予 (Skills): 多选框，列出系统可用技能（从 `useConfigStore` 获取）。
  - **视觉风格**:
    - 采用金/黑/红配色，模拟圣旨或奏折的视觉效果。
    - 按钮文案改为“册封 (Appoint)”和“退朝 (Cancel)”。

### 3.2 更新状态管理 (`useConfigStore.ts`)
- **修改 `addAgent` 方法**:
  - 确保传递完整的 `AgentConfig` 对象给后端，包括 `systemPrompt`, `model`, `skills`。
  - 移除对 `port` 字段的强制依赖（后端默认处理）。

### 3.3 集成到主界面 (`OfficialsPanel.tsx`)
- **替换模态框**:
  - 移除旧的 `addNodeModal` 代码。
  - 引入并使用新的 `<AppointmentModal />` 组件。
- **逻辑对接**:
  - 点击“Add Node”按钮（建议重命名为“册封官员 / Appoint Official”）触发新模态框。
  - 提交时调用 `store.addAgent`。

## 4. 验证 (Verification)
1.  **界面检查**: 点击添加按钮，应弹出新的“册封”界面，样式符合预期。
2.  **功能检查**: 填写完整信息（含 Prompt 和 Skills）并提交。
3.  **数据验证**: 
    - 检查新 Agent 是否出现在列表中。
    - 点击详情，确认 Prompt 和 Skills 已正确保存。
    - 检查后端 `officials.json` 是否包含新配置。
4.  **运行验证**: 唤醒新 Agent，确认其能根据设定的人设进行对话。

## 5. 待办清单 (Todo)
- [ ] 创建 `AppointmentModal.tsx` 组件
- [ ] 更新 `useConfigStore.ts` 的类型定义和 `addAgent` 方法
- [ ] 重构 `OfficialsPanel.tsx` 以集成新组件
- [ ] 验证全流程
