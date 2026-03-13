# OpenClaw 核心逻辑移植计划 (Agent, Tools, Memory)

## 1. 目标 (Goal)
基于您提供的《OpenClaw 源码深度学习计划》及相关文档，将 OpenClaw 的核心 Agent 管理、工具机制和记忆系统的设计理念移植到当前的 Node.js 后端中。
目标是让天命系统的后端 (`server/`) 拥有类似 OpenClaw 的强大内核，而不仅仅是一个简单的 Relay。

## 2. 现状与 OpenClaw 对比 (Gap Analysis)

| 模块 | OpenClaw 机制 (参考文档/源码) | 当前系统现状 | 差距 |
| :--- | :--- | :--- | :--- |
| **Agent 管理** | 基于 `Workspaces` (文件系统) + `Context` (运行时上下文)。支持 `subagent-spawn` 动态生成子进程。 | `Kernel` + `agents/` 目录。已支持动态 `register/unregister`。 | 缺少**父子层级关系**和**生命周期管理** (Spawn/Termination)。 |
| **Tools (技能)** | 动态加载 `skills/` 目录，支持权限控制 (Allowlist)。工具执行是在独立的 Sandbox 或 Context 中。 | `SkillManager` 加载 `skills/`。 | 工具执行上下文较弱，缺少**标准化的工具协议** (如 `sessions_spawn`)。 |
| **Memory (记忆)** | **混合检索 (Hybrid Search)**: SQLite 存储 + Vector (Embeddings) + FTS (全文检索)。支持自动同步和 `read/write`。 | `Storage.js` (JSONL 文件)。仅支持简单的追加和读取。 | **完全缺失**。无法进行语义搜索或高效的历史回溯。 |

## 3. 实施方案 (Implementation Plan)

### Phase 1: 记忆系统重构 (The Memory Engine)
**参考**: `openclaw/src/memory/manager.ts`, `openclaw/src/memory/sqlite.ts`
1.  **引入 SQLite**: 使用 `better-sqlite3` 替换当前的 JSONL 存储。
2.  **构建 Memory Manager**:
    - 创建 `server/runtime/MemoryManager.js`。
    - 实现 `chunks` 表 (存储对话片段) 和 `files` 表 (存储知识库)。
    - 实现 **FTS (Full Text Search)**: 利用 SQLite 的 FTS5 模块实现关键词搜索。
    - (可选) **Vector 预留**: 预留 `embedding` 字段，后续接入 OpenAI Embedding API。
3.  **集成到 Agent**: 每个 Agent 实例启动时，自动初始化专属的 `MemoryManager` (如 `data/agents/minister.db`)。

### Phase 2: 工具系统增强 (The Skill System)
**参考**: `openclaw/src/agents/skills.ts`
1.  **工具上下文**: 修改 `SkillManager.execute`，传入更丰富的 `Context` (包含 `memory`, `kernel`, `agentId`)。
2.  **标准工具集**: 实现 OpenClaw 的核心工具：
    - `memory_search`: 允许 Agent 搜索自己的 SQLite 记忆库。
    - `memory_save`: 允许 Agent 主动保存重要信息。
3.  **配置化**: 在 `server/config/officials.json` 中允许为每个 Agent 指定 `enabled_skills`。

### Phase 3: 子代理机制 (Sub-agent Spawning)
**参考**: `openclaw/src/agents/subagent-spawn.ts`
1.  **实现 `sessions_spawn` 工具**:
    - 这是一个特殊的 Tool，允许 Agent (如丞相) 调用它来“创建”一个新的 Agent 实例。
    - 逻辑：调用 `Kernel.createAgent` -> 分配临时 ID -> 绑定父子关系。
2.  **父子通信**:
    - 实现 `delegate_task`: 父 Agent 将任务委托给子 Agent。
    - 实现 `report_result`: 子 Agent 完成后将结果“汇报”回父 Agent 的 Context。

## 4. 关键技术决策 (Decisions)
- **数据库**: 选用 `better-sqlite3`，因为它是 Node.js 生态中最快且同步的 SQLite 驱动，适合模拟 OpenClaw 的本地文件数据库模式。
- **向量**: MVP 阶段先只做 **FTS (关键词搜索)**，因为向量数据库依赖外部 API (Costly) 或本地模型 (Heavy)。FTS 对于“查阅大明律”这种任务已经足够。
- **兼容性**: 保持 API 接口不变，前端感知不到底层存储的变化。

## 5. 待办事项 (Todos)
- [ ] **Infra**: 安装 `better-sqlite3`。
- [ ] **Memory**: 实现 `server/runtime/MemoryManager.js` (SQLite + FTS)。
- [ ] **Agent**: 修改 `BaseRole.js`，接入 `MemoryManager`。
- [ ] **Skill**: 实现 `memory_search` 工具。
- [ ] **Skill**: 实现 `spawn_agent` 工具 (复用之前的动态新增逻辑)。
