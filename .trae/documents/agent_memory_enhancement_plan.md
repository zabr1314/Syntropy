# 天命系统 Agent 模块重构与增强计划 - Phase 2 (Context & Memory)

## 1. 探索与分析 (Phase 1: Explore)
- **目标**: 分析 OpenClaw 的 `Context` 和 `Memory` 模块源码，设计适合当前项目的增强方案。
- **执行**:
  - 阅读了 `openclaw/src/agents/context.ts` (Context Window Management)。
  - 阅读了 `openclaw/src/memory/manager.ts`, `openclaw/src/memory/hybrid.ts` (Hybrid Search & Ranking)。
  - 对比了当前 `server/runtime/MemoryManager.js` 的实现。
- **发现**:
  - OpenClaw 使用 `Context` 模块动态管理 Token 预算，支持自动发现模型上下文窗口。
  - OpenClaw 的 `MemoryManager` 是基于 SQLite FTS5 + Vector Search 的混合检索系统，支持 BM25 排序和 MMR 重排序。
  - 当前项目 `MemoryManager.js` 仅实现了基础的 SQLite 存储和简单的关键词检索，缺乏 Token 管理和向量检索。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "继续沿用 OpenClaw 的设计，设置可以去看他的源码"。
- **分析结果**: 用户希望我参考 OpenClaw 的设计，进一步增强 Agent 的上下文管理和记忆能力。
- **结论**: 无需进一步澄清，直接制定实施计划。

## 3. 实施方案 (Phase 3: Implementation)
- **核心组件**:
  1.  **ContextManager**: 负责 Token 计数、上下文窗口管理和消息修剪 (Pruning)。
  2.  **MemoryManager 增强**: 引入向量检索 (Vector Search) 接口（即使暂时只实现 Mock 或简单的基于关键词的模拟），并优化检索逻辑。
  3.  **Hybrid Search**: 实现关键词 + 向量（可选）的混合检索策略。

- **具体步骤**:
  1.  创建 `server/runtime/ContextManager.js`:
      - 实现 `TokenCounter` (使用 `tiktoken` 或简单的字符估算作为 fallback)。
      - 实现 `ContextWindow` 管理，支持自动修剪历史消息以适应模型限制。
  2.  重构 `server/runtime/MemoryManager.js`:
      - 增加 `search(query, options)` 方法，支持混合检索。
      - 引入 `embedding` 接口占位符，为未来集成向量数据库做准备。
  3.  集成到 `Agent.js`:
      - 在 `execute` 循环中使用 `ContextManager` 来构建 Prompt。
      - 在 `execute` 中使用 `MemoryManager` 的增强检索功能。

## 4. 生成计划 (Phase 4: Generate Plan)
- **下一步行动**:
  - 编写 `server/runtime/ContextManager.js`。
  - 更新 `server/runtime/MemoryManager.js`。
  - 更新 `server/core/Agent.js` 以使用新的 `ContextManager`。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 增强后的 `ContextManager` 和 `MemoryManager`，以及集成了这些组件的 `Agent.js`。
