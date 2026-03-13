# 天命系统 Agent 模块重构与增强计划 (基于 OpenClaw 架构参考)

## 1. 现状与目标 (Status & Goals)

### 当前状态 (Current State)
- **BaseRole.js**: 实现了基础的 Agent 结构，包含 ID、Name、Prompt、Tools 和基本的 LLM 执行循环 (`execute`)。
- **功能**: 支持工具调用 (Tool Call)、简单的多轮对话 (Max 5 turns) 和状态更新。
- **局限性**:
  - **生命周期简单**: 仅有 `execute` 和 `setStatus`，缺乏初始化、休眠、唤醒等精细控制。
  - **上下文管理薄弱**: 依赖 `MemoryManager` 但缺乏 Token 精细控制和长短时记忆的自动流转。
  - **容错性不足**: 缺乏重试机制、模型降级 (Fallback) 和详细的错误诊断。
  - **协作机制缺失**: Agent 之间缺乏标准化的通信协议 (如 OpenClaw 的 ACP)。

### 目标 (Goals)
参考 OpenClaw 的 **认知层 (Cognitive Layer)** 和 **智能体运行时 (Agent Runtime)** 设计，将 `BaseRole` 升级为具备**高鲁棒性、可观测性、自适应上下文管理**的智能体基类。

## 2. 核心架构改进建议 (Architecture Improvements)

### 2.1 生命周期管理 (Lifecycle Management)
参考 OpenClaw 的守护进程与运行时设计，引入更完整的生命周期钩子。

- **新增状态**: `INITIALIZING`, `IDLE`, `THINKING`, `ACTING`, `WAITING_FOR_HUMAN`, `SLEEPING`, `TERMINATED`。
- **新增钩子方法**:
  - `onInit()`: 资源加载、配置读取。
  - `onWake()`: 从持久化存储恢复上下文。
  - `onSleep()`: 上下文压缩、记忆归档。
  - `onError(error)`: 统一错误处理与恢复策略。

### 2.2 上下文与记忆增强 (Context & Memory)
参考 OpenClaw 的 `Context Engine` 和 `Memory Architecture`。

- **Token 预算管理 (Token Budgeting)**:
  - 在 `execute` 前计算当前上下文 Token 消耗。
  - 实现 **自动压缩 (Auto-Compaction)**: 当超出阈值时，自动触发摘要 (Summarization) 或修剪 (Pruning) 历史消息。
- **分级记忆 (Tiered Memory)**:
  - **短期 (Working Memory)**: 当前会话的完整对话流。
  - **长期 (Long-term Memory)**: 关键事实 (Facts) 和 偏好 (Preferences) 的向量存储 (Vector Store)。
  - **自动提取 (Auto-Extraction)**: 在对话结束或闲置时，自动从短期记忆中提取关键信息存入长期记忆。

### 2.3 运行时容错与鲁棒性 (Runtime Resilience)
参考 OpenClaw 的基础设施安全篇。

- **重试机制 (Retry Strategy)**: 对 LLM API 调用实现指数退避 (Exponential Backoff) 重试。
- **模型降级 (Model Fallback)**: 主模型 (如 GPT-4) 失败或超时时，自动切换至备用模型 (如 GPT-3.5/Claude-Instant)。
- **死循环检测 (Loop Detection)**: 检测 Agent 是否陷入重复的工具调用循环，并强制中断或请求人工干预。

### 2.4 工具与技能系统 (Skills & Capabilities)
参考 OpenClaw 的插件加载机制。

- **标准化工具定义**: 将工具定义从代码中解耦，支持更丰富的元数据 (Metadata)，如 `risk_level` (风险等级，决定是否需要人工审批)。
- **动态加载**: 支持运行时动态挂载/卸载技能，而非硬编码在构造函数中。

## 3. 实施路线图 (Implementation Roadmap)

### Phase 1: 基础重构 (Base Refactoring)
- [ ] **Refactor `BaseRole.js`**:
  - 引入 `Lifecycle` 状态机。
  - 增加 `Configuration` 对象，支持配置模型参数、重试次数等。
- [ ] **Enhance `execute` loop**:
  - 增加 Token 计数与限制检查。
  - 增加基础的 Error Handling `try-catch` 块。

### Phase 2: 记忆升级 (Memory Upgrade)
- [ ] **Implement `ContextManager`**:
  - 独立于 `MemoryManager`，专门负责构建 LLM 的 Prompt Context。
  - 实现 `FIFO` 或 `Summarization` 策略。
- [ ] **Integrate Vector DB (Optional)**:
  - 如果项目已有向量库，集成至 BaseRole 以支持长期记忆检索。

### Phase 3: 高级特性 (Advanced Features)
- [ ] **Resilience Logic**:
  - 实现 `LLMClient` 包装器，处理重试和降级。
- [ ] **Observability**:
  - 增加详细的结构化日志 (Structured Logging)，记录思考过程 (Thought Chain)。

## 4. 下一步行动 (Next Steps)
我建议首先从 **Phase 1: 基础重构** 开始，重点改造 `BaseRole.js` 的生命周期和错误处理机制。

**问题 (Questions)**:
1. 您是否同意引入更复杂的生命周期状态机？还是希望保持简单？
2. 目前项目是否已经集成了 Token 计算库 (如 `tiktoken`)？
3. 对于长期记忆，项目目前使用的是什么存储方案？(SQLite/VectorDB?)
