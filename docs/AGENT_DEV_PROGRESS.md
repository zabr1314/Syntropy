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
  - 策略: 识别"安全删除单元"，`assistant(tool_calls)` + 所有对应 `tool result` 作为原子组整体删除。
  - 绝不拆散 tool_call/tool_result 配对，消除 400 API 错误。
  - 优先保留 System Prompt 和最近的用户查询。
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
- **记忆压缩 (Memory Compression)**:
  - 实现了 `onSleep` 钩子，当 Agent 闲置超时进入休眠时触发。
  - 自动提取最近未总结的对话记录，调用 LLM 生成 "每日摘要 (Daily Summary)" 并持久化。
  - 解决了长对话导致的上下文遗忘问题，实现知识的长期沉淀。
- **RAG 集成**:
  - 在 Agent 执行循环中，自动检索与用户输入相关的长时记忆并注入 System Prompt。
  - 提供了 `/api/agent/:id/memory/debug` 调试接口，支持前端可视化验证检索效果。

- **代码索引**:
  - [server/runtime/MemoryManager.js](file:///server/runtime/MemoryManager.js)（含去重逻辑）
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
  - `Kernel.dispatch(message, depth)` 负责消息路由，携带派生深度。
  - `MAX_SPAWN_DEPTH=2`：超限直接返回错误字符串，阻断无限递归。
  - 60s 超时保护：`Promise.race` 包装，防止官员卡死导致丞相挂起。
  - 重构了 `call_official` 技能，通过 ACP 发送任务请求，而非直接操作目标 Agent 实例。
  - `call_officials` 改用 `Promise.allSettled`，单个官员失败不影响其他。

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

### 2.9 结构化可观测性 (Structured Observability)
参考 OpenClaw 的诊断事件体系，实现了链路追踪、结构化事件和日志脱敏。

- **链路追踪 (Trace ID)**:
  - 每次用户指令或 `dispatch` 生成根 traceId（8位十六进制）。
  - 子 Agent 继承父链路，格式为 `parent.depth`（如 `ab12cd34.1`）。
- **诊断事件 (Diagnostic Events)**:
  - `agent.turn.start/end`：每个 LLM 回合的开始/结束和耗时。
  - `tool.call.start/end`：工具执行前后，含成功/失败标记。
  - `model.usage`：LLM 返回后记录 promptTokens、completionTokens、耗时。
  - `dispatch.start/end`：ACP 调度入口和出口。
  - `approval.wait`：进入人工审批等待时记录。
  - `agent.stuck`：Agent 在 THINKING/ACTING 超过 3 分钟时自动告警。
- **日志脱敏 (Redaction)**:
  - 自动识别并截断 Bearer token、sk- 格式 API Key、password/secret 字段。
  - 保留前6位用于调试确认，不暴露完整明文。

- **代码索引**:
  - [server/infra/Tracer.js](file:///server/infra/Tracer.js)（单例 `tracer`，`redact()`）

### 2.10 路由统一化 (Routing Separation)
将 Socket.io 职责从 Kernel 完全剥离，实现控制平面与传输层解耦。

- **SocketGateway**:
  - 独立负责连接管理、入站命令归一化、出站事件广播。
  - 入站：socket `command` 事件 → 生成 traceId → `kernel.handleCommand(data, traceId)`。
  - 出站：订阅 EventBus（`agent:status`、`agent:stream`、`approval:request`、`plan:preview`）→ 广播到 frontend room。
- **Kernel 职责收窄**:
  - 构造函数不再接收 `io`，不再有 `setupSocket()` / `broadcastState()`。
  - 只负责 Agent 注册、`dispatch()`、`handleCommand()`。
- **traceId 贯穿入口**:
  - `handleCommand()` 接收 traceId，每条用户指令从 socket 入口就有链路 ID。

- **代码索引**:
  - [server/runtime/SocketGateway.js](file:///server/runtime/SocketGateway.js)
  - [server/core/Kernel.js](file:///server/core/Kernel.js)（已移除 socket 逻辑）

---

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
  - [x] 派生深度控制（MAX_SPAWN_DEPTH=2，防无限递归）。
  - [x] Dispatch 60s 超时保护（Promise.race）。
  - [x] call_officials 改用 Promise.allSettled（单点失败隔离）。
- [x] **上下文安全压缩 (Safe Context Pruning)**
  - [x] 安全删除单元策略，保护 tool_call/tool_result 配对。
- [x] **记忆自动捕获 (Auto Memory Capture)**
  - [x] 启发式关键词过滤，自动保存用户偏好。
  - [x] MemoryManager 去重，避免噪音污染记忆库。
- [x] **Session SQLite 持久化 (SessionStore)**
  - [x] 新建 `server/infra/SessionStore.js`，替代 JSONL Storage。
  - [x] 带索引的 SQLite，性能不随文件增长劣化。
- [x] **结构化可观测性 (Structured Observability)**
  - [x] `Tracer` 单例：traceId 生成/传播、8种诊断事件、日志脱敏、卡死检测。
  - [x] `Kernel.dispatch()` / `Agent.execute()` / `LLM.chatStream()` 全链路注入。
- [x] **路由统一化 (Routing Separation)**
  - [x] 新建 `SocketGateway`，Socket.io 职责完全从 Kernel 剥离。
  - [x] Kernel 不再持有 `io`，只负责调度。
  - [x] traceId 从 socket 入口贯穿到 Agent 执行。
- [ ] **插件契约化 (Skill Manifest)**
  - [ ] 统一 skill metadata（版本、config schema）。
  - [ ] 生命周期钩子（onLoad / onUnload）。
- [ ] **安全参数卫兵 (Security Guards)**
  - [ ] Shell 元字符静态分析。
  - [ ] SSRF 出口 IP 过滤。

---

## 4. 更新日志 (Changelog)

- **2026-03-16 (续)**:
  - 新建 `server/infra/Tracer.js`：traceId 链路追踪、8种结构化诊断事件、日志脱敏、3分钟卡死检测。
  - `Kernel.dispatch()` / `Agent.execute()` / `handleToolCalls()` / `LLM.chatStream()` 全链路注入 traceId 和诊断事件。
  - 新建 `server/runtime/SocketGateway.js`，Socket.io 职责从 Kernel 完全剥离。
  - `Kernel` 构造函数移除 `io` 参数，`handleCommand()` 新增 traceId 参数。
  - 测试用例扩展至 31 个，全部通过。

- **2026-03-16**:
  - 优化1：`Kernel.dispatch()` 加 `depth` 参数，`MAX_SPAWN_DEPTH=2` 防无限递归。
  - 优化2：`ContextManager.pruneContext()` 重写为安全删除单元策略，保护 tool_call/tool_result 配对。
  - 优化3：`Agent.execute()` 加启发式记忆自动捕获；`MemoryManager.save()` 加去重。
  - 优化4：`Kernel.dispatch()` 加 60s `Promise.race` 超时；`call_officials` 改用 `Promise.allSettled`。
  - 优化5：新建 `SessionStore`（better-sqlite3），Session 持久化从 JSONL 迁移到 SQLite。
  - 新增 `test/run_tests.js`，20 个单元测试全部通过。

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
