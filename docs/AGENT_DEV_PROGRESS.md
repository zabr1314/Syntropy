<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-12 22:05:55
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-12 22:11:59
 * @FilePath: /天命系统/docs/AGENT_DEV_PROGRESS.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 天命系统 Agent 模块研发进度追踪 (基于 OpenClaw 架构)

> 本文档用于持续追踪 Agent 模块的研发进度，记录基于 OpenClaw 架构的核心功能实现、技术决策及后续规划。

## 1. 总体目标 (Overview)
将“天命系统”的 Agent 核心升级为具备**高鲁棒性、可观测性、自适应上下文管理**的智能体运行时 (Agent Runtime)。参考 OpenClaw 的 Cognitive Layer 设计，实现生命周期管理、长短时记忆融合及混合检索能力。

---

## 2. 已完成模块 (Completed Modules)

### 2.1 生命周期管理 (Lifecycle Management)
引入了完整的状态机，使 Agent 的行为更加可控且易于观测。

- **核心状态 (`AgentState`)**:
  - `INITIALIZING`: 初始化资源加载。
  - `IDLE`: 就绪，等待任务。
  - `THINKING`: 接收输入，正在调用 LLM。
  - `ACTING`: 执行工具调用 (Tool Call)。
  - `WAITING_FOR_HUMAN`: (预留) 等待人工确认。
  - `SLEEPING`: 休眠模式，进行记忆归档。
  - `ERROR`: 运行时错误。

- **生命周期钩子 (Hooks)**:
  - `onInit()`: 构造后调用，用于加载配置。
  - `onWake()`: 激活时调用，用于恢复上下文。
  - `onSleep()`: 闲置超时调用，用于压缩记忆。
  - `onError(error)`: 统一错误捕获与状态更新。

- **代码索引**:
  - [server/core/Agent.js](file:///server/core/Agent.js) (基于组合的新架构)
  - [agents/BaseRole.js](file:///agents/BaseRole.js) (基于继承的旧架构兼容)

### 2.2 上下文管理 (Context Management)
实现了基于 Token 预算的动态上下文窗口管理，防止 LLM 请求溢出。

- **Token 估算 (Token Estimation)**:
  - 实现了基于字符的启发式算法 (Heuristic)，支持中英文混合计数。
  - 预留了 `tiktoken` 接入接口。
- **动态修剪 (Context Pruning)**:
  - 策略: 优先保留 System Prompt 和最近的用户查询。
  - 自动从历史记录中间部分修剪过期的 User/Assistant 消息对。
- **Prompt 组装**:
  - 统一了 `composeContext({ systemPrompt, history, tools, query })` 接口。

- **代码索引**:
  - [server/runtime/ContextManager.js](file:///server/runtime/ContextManager.js)

### 2.3 记忆系统 (Memory System)
基于 SQLite 构建了支持混合检索 (Hybrid Search) 的记忆存储层。

- **全文检索 (FTS5)**:
  - 启用了 SQLite FTS5 虚拟表，实现毫秒级关键词检索。
  - 配置了 Triggers 自动同步主表 (`chunks`) 与索引表 (`chunks_fts`)。
- **向量检索 (Vector Search)**:
  - 接入 `EmbeddingService` (基于 OpenAI API)，自动为新内容生成 Embedding。
  - 实现了基于余弦相似度 (Cosine Similarity) 的向量搜索。
- **混合排序 (RRF)**:
  - 实现了 Reciprocal Rank Fusion (RRF) 算法。
  - 自动合并全文检索 (FTS) 和向量检索 (Vector) 的结果，提供更精准的上下文召回。
- **RAG 集成**:
  - 在 Agent 执行循环中，自动检索与用户输入相关的长时记忆并注入 System Prompt。

- **代码索引**:
  - [server/runtime/MemoryManager.js](file:///server/runtime/MemoryManager.js)
  - [server/infra/EmbeddingService.js](file:///server/infra/EmbeddingService.js)

### 2.5 高级工具系统 (Advanced Tooling)
实现了基于风险分级的工具执行与人工审批流。

- **风险分级 (Risk Levels)**:
  - `SkillManager` 支持为工具定义 `riskLevel` (low, medium, high)。
  - 低风险工具自动执行，中高风险工具触发审批。
- **审批工作流 (Approval Workflow)**:
  - Agent 在调用高风险工具时自动挂起，进入 `WAITING_FOR_HUMAN` 状态。
  - 通过 `kernel.events` 向前端广播 `approval:request`。
  - 支持 `approve` / `reject` 指令，用户批准后 Agent 自动恢复执行 (Resumption)。

### 2.6 多智能体协作协议 (ACP)
规范了 Agent 间的通信机制，取代了直接的方法调用。

- **ACP 消息结构**:
  - 定义了标准消息格式: `{ from, to, type, action, payload }`。
- **消息分发 (Dispatch)**:
  - `Kernel.dispatch(message)` 负责消息路由。
  - 重构了 `call_official` 技能，通过 ACP 发送任务请求，而非直接操作目标 Agent 实例。

### 2.7 配置中心与热更新 (Config & Hot Reload)
实现了 Agent 配置的可视化管理与运行时热更新。

- **ConfigManager**:
  - 提供对 `officials.json` 的持久化读写能力。
- **运行时热更**:
  - `Agent.updateConfig()` 支持动态更新 System Prompt、Tools 和 Model，无需重启服务。
- **配置 API**:
  - `PATCH /api/agents/:id`: 更新配置并触发热更。
  - `GET /api/skills`: 获取全局可用技能列表。
- **可视化界面**:
  - 升级 `AgentDetailModal`，支持在线编辑 Prompt、切换模型及勾选技能。

### 2.8 文件管理系统 (File Management System)
模仿 OpenClaw 实现了 Agent 专属的知识库/文件管理能力。

- **工作区隔离**:
  - 每个 Agent 拥有独立的物理工作区目录 (`data/workspaces/<id>`)。
- **文件 API**:
  - `POST /api/agents/:id/files`: 支持 `multer` 文件上传。
  - `GET /api/agents/:id/files`: 列出工作区文件及元数据。
  - `DELETE /api/agents/:id/files/:filename`: 安全删除文件。
- **可视化界面**:
  - 在 `AgentDetailModal` 中新增 **"知识库 (Files)"** 选项卡。
  - 支持拖拽上传、文件预览与删除操作。

---

## 3. 待开发特性 (Roadmap)

- [x] **向量数据库集成 (Vector DB Integration)**
  - [x] 接入 Embedding 服务 (OpenAI / Local Models)。
  - [x] 实现向量相似度搜索 (Cosine Similarity)。
- [x] **混合排序算法 (Hybrid Ranking)**
  - [x] 实现 Reciprocal Rank Fusion (RRF) 算法，合并 FTS 和 Vector 的搜索结果。
- [x] **架构集成与清理 (Integration & Cleanup)**
  - [x] 验证新架构在主流程中的运行。
  - [x] 隔离旧版代码。
- [x] **高级工具系统 (Advanced Tooling)**
  - [x] 实现工具的风险分级 (Risk Levels)。
  - [x] 实现审批流 (Human-in-the-loop) 和状态挂起/恢复。
- [x] **多智能体协作协议 (Agent Collaboration Protocol)**
  - [x] 实现 `Kernel.dispatch` 消息路由。
  - [x] 规范 Agent 间的通信标准。
- [x] **配置中心与热更新 (Config & Hot Reload)**
  - [x] 实现配置持久化与 API。
  - [x] 实现前端可视化配置界面。
- [x] **文件管理系统 (File Management)**
  - [x] 实现后端上传/下载 API。
  - [x] 实现前端文件管理 UI。

---

## 4. 更新日志 (Changelog)

- **2024-03-12**:
  - 实现文件管理系统：支持 Agent 工作区文件上传与管理。
  - 实现配置中心：支持 Prompt/Skill/Model 的可视化配置与热更新。
  - 实现高级工具系统：风险分级与人工审批流。
  - 实现 ACP 协议：标准化 Agent 间通信与消息路由。
  - 完成新架构集成测试，重命名 `agents_legacy` 目录。
  - 增加 `EmbeddingService`，实现 OpenAI Embedding 封装与缓存。
  - 升级 `MemoryManager`，实现 RRF 混合检索与向量相似度计算。
  - 升级 `Agent` 运行时，集成自动 Embedding 生成与 RAG 检索。
  - 完成 Agent 核心重构，引入 `AgentState` 状态机。
  - 创建 `ContextManager`，实现基础 Token 管理。
  - 升级 `MemoryManager`，支持 SQLite FTS5 全文检索。
