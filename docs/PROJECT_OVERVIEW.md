<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-13 09:09:01
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-13 14:30:00
 * @FilePath: /天命系统/docs/PROJECT_OVERVIEW.md
-->
# Syntropy (太和) - 项目全景进度概览

> **最后更新时间**: 2026-03-13
> **当前版本**: Beta v1.2 (Cognitive & Visual Update)

本文档旨在提供“Syntropy (太和)”的宏观开发进度视图，汇总后端架构与前端交互的核心成果，并明确后续迭代方向。

---

## 1. 项目愿景 (Vision)
构建一个**可视化、可观测、可干预**的古代朝廷隐喻版 Multi-Agent 操作系统。
- **可视化**: 通过 2D 像素沙盘（Phaser）将 Agent 的思考、寻路与协作过程具象化。
- **可观测**: 实时监控 Agent 的思维链、记忆检索过程（RAG Debugger）与状态流转。
- **可干预**: 通过“天牢”与“御批”机制，实现 Human-in-the-loop 的高风险操作拦截。

---

## 2. 核心里程碑 (Milestones)

### ✅ 第一阶段：基础架构 (Infrastructure)
- [x] **后端运行时**: 摆脱 OpenClaw 依赖，建立基于 `AgentState` 状态机的自研 Runtime。
- [x] **双端通信**: 实现 Socket.io 实时双向通信，支持状态推送与指令下发。
- [x] **沙盘渲染**: 完成 Phaser 3 游戏引擎集成，实现 Agent 在“朝廷”地图上的寻路与交互。

### ✅ 第二阶段：认知升级 (Cognitive Layer)
- [x] **混合记忆系统**: 集成 SQLite FTS5 (全文检索) + Embedding (向量检索)，实现 RRF 混合排序。
- [x] **记忆压缩 (Memory Compression)**: 实现 `onSleep` 钩子，Agent 休眠时自动总结当日对话并持久化，防止长期记忆遗忘。
- [x] **动态上下文**: 实现基于 Token 预算的上下文修剪与 System Prompt 动态组装。
- [x] **ACP 协议**: 定义 Agent Collaboration Protocol，规范多智能体间的协作通信。

### ✅ 第三阶段：管控与交互 (Control & Interaction)
- [x] **配置热更新**: 支持运行时在线修改 Agent 模型、Prompt 及技能配置。
- [x] **知识库管理**: 实现 Agent 专属工作区的文件上传与管理。
- [x] **人机协同审批**: 实现高风险操作拦截，前端弹出“御批”窗口进行人工确认。
- [x] **RAG 调试工具**: 前端“内务府”集成记忆透视镜，可视化展示 RAG 检索结果与 RRF 得分。
- [ ] **天牢视觉特效**: 完善 Agent 被捕获/释放的沙盘动画表现。

---

## 3. 详细功能清单 (Feature Matrix)

### 3.1 后端 (Agent Runtime)
| 模块 | 功能点 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **生命周期** | 状态机 (FSM) | ✅ 已完成 | 含 Init, Idle, Thinking, Acting, Waiting, Sleeping, Error |
| | 记忆压缩 | ✅ 已完成 | Agent 休眠时触发 LLM 总结，生成 `daily_summary` |
| **记忆系统** | 向量存储 | ✅ 已完成 | 基于 OpenAI Embedding |
| | 混合检索 (RAG) | ✅ 已完成 | FTS5 + Vector Cosine + RRF Fusion |
| | 调试接口 | ✅ 已完成 | 提供 `/api/agent/:id/memory/debug` 接口 |
| **工具系统** | 风险分级 | ✅ 已完成 | Low/Medium/High 风险等级定义 |
| | 审批挂起 | ✅ 已完成 | 触发 `WAITING_FOR_HUMAN` 状态 |
| **通信** | ACP 路由 | ✅ 已完成 | 支持 `Kernel.dispatch` 消息分发 |

### 3.2 前端 (Visual Console)
| 模块 | 功能点 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **控制台** | 百官名录 | ✅ 已完成 | 实时展示 Agent 状态列表 |
| | 诏令流水线 | ✅ 已完成 | 可视化任务流转 |
| | 起居注 (Logs) | ✅ 已完成 | 实时系统日志流 |
| **配置中心** | 可视化编辑 | ✅ 已完成 | Prompt/Model/Skill 在线配置 |
| | 记忆透视镜 | ✅ 已完成 | **New!** 实时调试 RAG 检索效果 |
| | 文件管理 UI | ✅ 已完成 | 上传/删除 Agent 知识库文件 |
| **审批流** | 御批弹窗 | ✅ 已完成 | 展示高风险操作详情，支持批准/驳回 |
| **沙盘** | 自动寻路 | ✅ 已完成 | 基于 Grid 的 A* 寻路 |
| | 状态气泡 | ✅ 已完成 | 头顶显示 Thinking/Working 等状态 |

---

## 4. 近期更新 (Recent Updates)

### 🧠 2026-03-13: 认知与可解释性增强
- **后端**: 实现了 `MemoryManager` 的 RRF 混合排序算法，并在 Agent 休眠时引入了记忆压缩机制。
- **前端**: 在“内务府”模块中新增了 `MemoryDebugger` 组件，允许开发者输入测试 Query，直观查看关键词匹配与向量匹配的权重分布。

### 🚀 2026-03-13: 人机协同审批流 (Human-in-the-loop Approval)
- **后端**: 完善了 `resumeFromApproval` 逻辑，支持接收前端的批准/驳回指令并恢复 Agent 执行。
- **前端**: 
  - 新增 `ApprovalModal` 组件（御批弹窗）。
  - 集成 Socket 监听 `approval_request` 事件。

---

## 5. 下一步计划 (Next Steps)

1.  **沙盘交互增强**:
    - 实现“拖拽指派”功能，允许用户将任务拖拽到特定 Agent 身上直接下达指令。
    - 增加动态环境反馈（如系统高负载时机房冒烟特效）。
2.  **多文件索引优化**:
    - 优化文件上传后的索引流程，支持批量文件的后台异步向量化。
3.  **演示脚本自动化**:
    - 编写 Mock 脚本，一键触发“Agent 违规 -> 天牢拦截 -> 御批释放”的完整演示流程，用于展示系统能力。

---

## 6. 文档索引 (References)
- [前端详细进度 (FRONTEND_DEV_PROGRESS.md)](./FRONTEND_DEV_PROGRESS.md)
- [后端详细进度 (AGENT_DEV_PROGRESS.md)](./AGENT_DEV_PROGRESS.md)
- [技术架构文档 (技术文档.md)](../技术文档.md)
