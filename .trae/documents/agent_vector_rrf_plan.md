# 天命系统 Agent 模块重构与增强计划 - Phase 3 (Vector & RRF)

## 1. 探索与分析 (Phase 1: Explore)
- **目标**: 设计并实现向量检索 (Vector Search) 与混合排序 (Hybrid Ranking)。
- **发现**:
  - OpenClaw 使用 `sqlite-vec` 扩展进行向量计算，并有 JS 计算作为回退 (Fallback)。
  - 项目根目录 `package.json` 中已包含 `openai`，但未包含 `sqlite-vec`。
  - `server/runtime/MemoryManager.js` 已有 FTS5 实现，且预留了 `embedding` (BLOB) 字段。
  - 考虑到环境配置的复杂性，MVP 阶段建议先实现 **纯 JS 余弦相似度计算** (Client-side Vector Search)，数据量增长后再引入 `sqlite-vec`。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "继续完成待完成的部分"，即实现 Roadmap 中的向量数据库集成和混合排序。
- **分析结果**:
  - 需要引入 Embedding 生成能力 (使用 OpenAI 兼容接口)。
  - 需要在 `MemoryManager` 中实现向量搜索。
  - 需要实现 RRF (Reciprocal Rank Fusion) 算法来合并 FTS 和 Vector 结果。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 引入 Embedding 服务
- 创建 `server/infra/EmbeddingService.js`:
  - 封装 `openai.embeddings.create`。
  - 支持配置 `model` (默认为 `text-embedding-3-small`)。
  - 简单的内存缓存 (LRU) 以减少 API 调用（可选）。

### 3.2 升级 MemoryManager (向量搜索)
- 修改 `server/runtime/MemoryManager.js`:
  - 引入 `EmbeddingService`。
  - 实现 `searchVector(queryEmbedding, limit)`:
    - 读取所有含 `embedding` 的 chunk。
    - 计算余弦相似度 (Cosine Similarity)。
    - 排序并返回 Top K。
  - 优化 `save()`: 自动为新内容生成 Embedding (如果配置了 EmbeddingService)。

### 3.3 实现混合排序 (Hybrid Ranking)
- 修改 `server/runtime/MemoryManager.js`:
  - 实现 `hybridSearch(query, options)`:
    - 并行执行 `searchFTS` 和 `searchVector`。
    - 使用 **RRF (Reciprocal Rank Fusion)** 算法合并结果。
    - RRF 公式: `score = 1 / (k + rank_fts) + 1 / (k + rank_vec)`。

### 3.4 集成到 Agent Runtime
- 修改 `server/core/Agent.js`:
  - 在初始化时注入 `EmbeddingService` 给 `MemoryManager`。
  - 在 `execute` 循环中，使用 `hybridSearch` 替代原来的 `getRecent` 或简单的 `search`，以获取更相关的上下文。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  创建 `server/infra/EmbeddingService.js`。
  2.  更新 `server/runtime/MemoryManager.js` 实现向量搜索和 RRF。
  3.  更新 `server/core/Agent.js` 集成 Embedding 能力。
  4.  更新 `docs/AGENT_DEV_PROGRESS.md`。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 具备混合检索能力的 Agent 运行时。
