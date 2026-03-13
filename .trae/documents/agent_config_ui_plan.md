# 天命系统 Agent 模块重构与增强计划 - Phase 6 (Configuration UI & Hot Reload)

## 1. 现状分析 (Phase 1: Explore)
- **目标**: 参考 OpenClaw 的设计，实现 Agent 配置（System Prompt, Skills, Model）的 UI 化管理和动态热更新。
- **发现**:
  - 后端 API (`server/index.js`) 仅支持 `GET/POST/DELETE` Agent，缺少更新 (`PATCH`) 接口。
  - `SkillManager.js` 加载技能后不支持动态重载。
  - 前端 `AgentDetailModal.tsx` 有展示逻辑，但修改配置后仅更新本地 Store，未同步到后端。
  - 配置文件 `server/config/officials.json` 是静态的，修改需要重启服务。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "对于工具，prompt，和 skill方面呢，你研究一下 openclaw 是怎么做的，放在 ui 界面给用户配置的"。
- **分析结果**:
  - 用户希望在界面上直接修改 Agent 的 System Prompt。
  - 用户希望在界面上启用/禁用 Skill，甚至上传新 Skill（进阶）。
  - 修改后，Agent 应当立即生效（热更新），无需重启服务器。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 后端增强 (Backend)
- **配置持久化**:
  - 创建 `ConfigManager` (单例)，负责读写 `server/config/officials.json`。
  - 实现 `updateAgentConfig(id, config)` 方法，更新 JSON 文件并同步更新 `Kernel` 中的 Agent 实例。
- **API 扩展**:
  - `PATCH /api/agents/:id`: 接收 `{ systemPrompt, tools, model, ... }`。
    - 更新 `officials.json`。
    - 调用 `kernel.getAgent(id).updateConfig(...)` 实现运行时热更。
  - `GET /api/skills`: 返回所有可用技能列表（包含描述、参数、风险等级）。

### 3.2 Agent 运行时热更 (Runtime Hot Reload)
- **Agent.js**:
  - 新增 `updateConfig(newConfig)` 方法。
  - 动态更新 `this.systemPrompt`, `this.tools`, `this.modelConfig`。
  - 如果 `tools` 发生变化，重新校验 `isSkillAllowed`。

### 3.3 前端改造 (Frontend)
- **状态管理**:
  - 更新 `useConfigStore.ts`: `updateAgent` action 需要调用后端 `PATCH` API。
- **UI 组件**:
  - 改造 `AgentDetailModal.tsx`:
    - **Prompt 编辑**: 将 System Prompt 展示框改为 `Monaco Editor` 或 `Textarea`。
    - **Skill 选择**: 使用 Checkbox List 展示所有可用技能 (从 `GET /api/skills` 获取)，允许用户勾选。
    - **模型配置**: 允许选择模型 (DeepSeek/GPT-4)。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  **后端 API**: 实现 `PATCH /api/agents/:id` 和 `GET /api/skills`。
  2.  **运行时支持**: 在 `Agent.js` 中实现配置热更新逻辑。
  3.  **前端 Store**: 对接后端 API。
  4.  **前端 UI**: 升级 `AgentDetailModal` 支持编辑 Prompt 和选择 Skills。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 可视化配置界面，支持 Agent 行为的热更新。
