<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-13 08:49:41
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-13 09:03:56
 * @FilePath: /天命系统/docs/FRONTEND_DEV_PROGRESS.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 天命系统前端开发进度文档 (Frontend Development Progress)

本文档记录了“天命系统”前端模块的开发状态、架构设计及最新功能实现。

## 1. 概览 (Overview)
前端基于 **React + TypeScript + Vite** 构建，采用 **Zustand** 进行状态管理，**Socket.io** 实现实时通信。核心目标是提供一个可视化的“朝廷”控制台，用于管理和观测 AI Agent 的行为。

## 2. 核心模块 (Core Modules)

### 2.1 控制台组件 (Console Components)
位于 `src/components/Console/`，实现了系统的主要交互界面。

- **OfficialsPanel (百官名录)**:
  - 展示所有活跃 Agent 的状态（空闲/工作中/思考中）。
  - 支持点击查看详情。
- **AgentDetailModal (Agent 配置中心)**:
  - **核心配置**: 支持在线修改 Agent 的模型 (DeepSeek/GPT-4)、System Prompt 和基础信息。
  - **技能管理**: 可视化勾选 Skill，支持查看风险等级 (Risk Level)。
  - **知识库 (Files)**: [NEW] 支持文件拖拽上传、列表预览及删除，为 RAG 提供数据支撑。
- **DecreePipeline (诏令流水线)**:
  - 可视化展示任务（诏令）的流转状态：Draft -> Planned -> Execution -> Completed。
- **LogSidebar (起居注)**:
  - 实时滚动显示系统的运行日志和 Agent 的思考过程。
- **MemoryDebugger (记忆透视镜)**:
  - 集成在“内务府”模块中，提供 RAG 检索的可视化调试能力。
  - 支持输入 Query，实时查看后端返回的混合检索结果（FTS + Vector）。
  - 使用颜色编码展示不同检索策略的权重分布。

### 2.2 状态管理 (State Management)
基于 Zustand 实现，位于 `src/store/`。

- **useConfigStore**:
  - **配置持久化**: 管理 Agent 的静态配置（Prompt, Model, Skills）。
  - **文件操作**: 封装了 `fetchFiles`, `uploadFile`, `deleteFile` 等 API 调用。
  - **热更新**: 自动同步前端修改到后端 `officials.json`。
- **useAgentStore**:
  - **实时状态**: 维护 Agent 的坐标、当前动作和短期记忆。
  - **性能指标**: 记录 CPU/Memory 使用率模拟数据。
- **useCourtStore**:
  - **任务追踪**: 管理诏令的生命周期和执行进度。

### 2.3 实时服务 (Live Services)
位于 `src/services/`，负责前后端通信与即时反馈。

- **SocketManager**:
  - 维护 WebSocket 连接，监听 `agent_update`, `agent_offline` 等事件。
- **LiveAgentService**:
  - 前端总控服务，协调消息处理与动画触发。
  - 解析 Agent 消息中的 `SUMMON` 指令，自动控制 Agent 移动。

## 3. 最新特性 (Recent Features)

### 3.1 知识库管理 (Knowledge Base)
- **文件上传**: 在 Agent 详情页新增 "Files" 标签，支持上传文件到 Agent 专属工作区。
- **文件管理**: 支持查看文件元数据（大小、时间）及删除操作。

### 3.2 可视化配置 (Visual Configuration)
- **Prompt 编辑器**: 提供大尺寸文本域，方便调试 System Prompt。
- **模型切换**: 下拉菜单选择模型，支持 DeepSeek V3 和 GPT-4o。
- **技能安全**: 技能列表显示风险等级 (High/Medium/Low)，高风险技能会有醒目提示。

### 3.3 交互优化
- **状态反馈**: 修复了 "Thinking" 状态不显示的问题，现在 Agent 思考时会有明确的动画提示。
- **热更新**: 修改配置后无需重启后端，点击保存即可即时生效。

### 3.4 系统重构与优化 (System Refactoring & Optimization) [NEW]
- **内务府 (Internal Affairs)**:
  - 重构了系统设置面板，采用**皇家古典风格** (Imperial Style)，提升沉浸感。
  - 移除了废弃的 OpenClaw Gateway/Relay 配置，专注于 **API Key 管理** (DeepSeek/OpenAI) 和 **系统维护** (清空奏折/重置)。
  - 新增 **Memory Debugger (记忆透视镜)**，允许开发者实时调试 RAG 检索效果。
- **角色可视化 (Visual Customization)**:
  - **缩放标准化**: 统一了角色缩放逻辑。自定义高清角色 (如丞相) 缩放调整为 `0.75x` (原 `2.8x` 导致过大)，通用像素角色保持 `2.8x`，视觉比例更协调。
  - **皮肤持久化**: 修复了刷新页面后自定义皮肤 (Skin) 丢失的问题。优化了 `useConfigStore` 的同步逻辑，支持乐观更新 (Optimistic Updates) 和本地配置保留。
- **交互体验 (UX Improvements)**:
  - **即时响应**: 实现了 Agent 删除操作的 **乐观 UI**，点击删除立即生效，无需等待后端返回，并移除了繁琐的二次确认弹窗。
  - **异常修复**: 修复了点击新添加 Agent 时 `AgentDetailModal` 报错的问题 (增加了缺省角色信息处理)。
  - **幽灵数据清理**: 在 `MainScene` 中增加了自动清理逻辑，确保游戏画面与配置列表严格同步，不再显示已删除的 "幽灵角色"。
  - **皇帝保护机制**: 增加了强制保护逻辑，确保核心角色 "皇帝 (Emperor)" 始终存在于场景中，即使配置为空也会自动创建。

### 3.5 稳定性修复 (Stability Fixes) [2026-03-16]

- **修复重复启动问题**：移除 `GameContainer.tsx` 中对 `LiveAgentService.start()/stop()` 的重复调用。`App.tsx` 是服务生命周期的唯一所有者，避免了重复订阅和状态抖动。
- **修复 Decree 生命周期误判**：`LiveAgentService.updateCourtState()` 中给 decree 自动完结加了 2s debounce。minister 在工具调用间隙短暂 idle 时不再误触发完结，只有持续 idle 2 秒后才标记为 `completed`。

### 3.6 前端测试体系 (Frontend Testing) [2026-03-16]

- **测试框架**：Vitest + @testing-library/react + jsdom
- **测试脚本**：`npm test`（watch）、`npm test -- --run`（单次）
- **测试文件**：`src/services/LiveAgentService.test.ts`
  - 验证 minister working 时取消 completion timer
  - 验证 minister idle 2秒后自动完成 decree
  - 验证 stop() 清理 timer 防内存泄漏
  - 验证无 agent 日志时不误完成 decree
- **测试配置**：`vite.config.ts` 中 `test.include: ['src/**/*.test.{ts,tsx}']`，隔离子项目测试

## 4. 待办事项 (Todo)

- [x] **RAG 检索测试**: 在前端增加测试窗口，验证上传文件后的检索效果 (已通过 MemoryDebugger 实现)。
- [ ] **多文件上传**: 优化上传组件，支持批量文件选择。
- [ ] **文件预览**: 支持在前端直接预览文本或 PDF 文件内容。
- [x] **审批流 UI**: 实现 `WAITING_FOR_HUMAN` 状态的弹窗提示，允许用户批准/拒绝高风险操作。

---

*文档更新时间: 2026-03-16*
