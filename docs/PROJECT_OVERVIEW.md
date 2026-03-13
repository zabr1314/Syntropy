<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-13 09:09:01
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-13 10:03:45
 * @FilePath: /天命系统/docs/PROJECT_OVERVIEW.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 天命系统 (Mandate of Heaven) - 项目全景进度概览

> **最后更新时间**: 2026-03-13
> **当前版本**: MVP v1.1 (人机协同增强版)

本文档旨在提供“天命系统”的宏观开发进度视图，汇总后端架构与前端交互的核心成果，并明确后续迭代方向。

---

## 1. 项目愿景 (Vision)
构建一个**可视化、可观测、可干预**的古代朝廷隐喻版 Multi-Agent 操作系统。
- **可视化**: 通过 2D 像素沙盘（Phaser）将 Agent 的思考、寻路与协作过程具象化。
- **可观测**: 实时监控 Agent 的状态机流转、Token 消耗与记忆检索。
- **可干预**: 通过“天牢”与“御批”机制，实现 Human-in-the-loop 的高风险操作拦截。

---

## 2. 核心里程碑 (Milestones)

### ✅ 第一阶段：基础架构 (Infrastructure)
- [x] **后端运行时**: 摆脱 OpenClaw 依赖，建立基于 `AgentState` 状态机的自研 Runtime。
- [x] **双端通信**: 实现 Socket.io 实时双向通信，支持状态推送与指令下发。
- [x] **沙盘渲染**: 完成 Phaser 3 游戏引擎集成，实现 Agent 在“朝廷”地图上的寻路与交互。

### ✅ 第二阶段：认知升级 (Cognitive Layer)
- [x] **混合记忆系统**: 集成 SQLite FTS5 (全文检索) + Embedding (向量检索)，实现 RRF 混合排序。
- [x] **动态上下文**: 实现基于 Token 预算的上下文修剪与 System Prompt 动态组装。
- [x] **ACP 协议**: 定义 Agent Collaboration Protocol，规范多智能体间的协作通信。

### 🔄 第三阶段：管控与交互 (Control & Interaction) - **进行中**
- [x] **配置热更新**: 支持运行时在线修改 Agent 模型、Prompt 及技能配置。
- [x] **知识库管理**: 实现 Agent 专属工作区的文件上传与管理。
- [x] **人机协同审批**: 实现高风险操作拦截，前端弹出“御批”窗口进行人工确认。
- [ ] **RAG 调试工具**: 前端可视化测试检索效果。
- [ ] **天牢视觉特效**: 完善 Agent 被捕获/释放的沙盘动画表现。

---

## 3. 详细功能清单 (Feature Matrix)

### 3.1 后端 (Agent Runtime)
| 模块 | 功能点 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **生命周期** | 状态机 (FSM) | ✅ 已完成 | 含 Init, Idle, Thinking, Acting, Waiting, Sleeping, Error |
| | 异常恢复 | ⚠️ 优化中 | 需增强错误后的自动重试机制 |
| **记忆系统** | 向量存储 | ✅ 已完成 | 基于 OpenAI Embedding |
| | 混合检索 (RAG) | ✅ 已完成 | FTS5 + Vector Cosine + RRF Fusion |
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
| | 文件管理 UI | ✅ 已完成 | 上传/删除 Agent 知识库文件 |
| **审批流** | 御批弹窗 | ✅ 已完成 | 展示高风险操作详情，支持批准/驳回 |
| **沙盘** | 自动寻路 | ✅ 已完成 | 基于 Grid 的 A* 寻路 |
| | 状态气泡 | ✅ 已完成 | 头顶显示 Thinking/Working 等状态 |

---

## 4. 近期更新 (Recent Updates)

### 🚀 2026-03-13: 人机协同审批流 (Human-in-the-loop Approval)
- **后端**: 完善了 `resumeFromApproval` 逻辑，支持接收前端的批准/驳回指令并恢复 Agent 执行。
- **前端**: 
  - 新增 `ApprovalModal` 组件（御批弹窗）。
  - 集成 Socket 监听 `approval_request` 事件。
  - `useAgentStore` 新增 `waiting_for_human` 状态支持。

### 📅 2026-03-12: 知识库与配置中心
- 实现了 Agent 专属文件管理，支持上传文档作为 RAG 知识源。
- 上线了配置热更新功能，修改 Agent 设定无需重启服务。

---

## 5. 下一步计划 (Next Steps)

1.  **RAG 检索验证**:
    - 在前端开发一个“检索测试器”，输入 Query，实时展示后端 RAG 召回的文档片段及相似度得分。
2.  **文件预览增强**:
    - 支持在前端直接预览上传的文本或 PDF 文件内容。
3.  **演示脚本自动化**:
    - 编写 Mock 脚本，一键触发“Agent 违规 -> 天牢拦截 -> 御批释放”的完整演示流程，用于展示系统能力。

---

## 6. 文档索引 (References)
- [前端详细进度 (FRONTEND_DEV_PROGRESS.md)](./FRONTEND_DEV_PROGRESS.md)
- [后端详细进度 (AGENT_DEV_PROGRESS.md)](./AGENT_DEV_PROGRESS.md)
- [MVP 完善计划 (mvp_plan.md)](../.trae/documents/mvp_plan.md)
