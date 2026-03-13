# 恢复记忆能力：集成 Local Embedding (Transformers.js)

## 1. 现状分析 (Phase 1: Explore)
- **问题**: 使用 DeepSeek API 时，Embedding 接口不可用 (404)，导致 MemoryManager 的向量检索 (Vector Search) 和 RAG 功能失效。
- **目标**: 引入本地 Embedding 模型，使系统不再依赖 OpenAI 的 `text-embedding-3-small`。
- **技术选型**: 使用 `@xenova/transformers` 运行 `Xenova/all-MiniLM-L6-v2` (轻量级，性能好，384维)。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "先恢复记忆吧"。
- **方案**:
  1.  安装 `@xenova/transformers`。
  2.  修改 `EmbeddingService.js` 支持本地模式。
  3.  修改 `.env` 启用本地模式。
  4.  验证向量生成。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 依赖安装
- 运行 `npm install @xenova/transformers`。

### 3.2 重构 EmbeddingService
- 修改 `server/infra/EmbeddingService.js`:
  - 引入 `pipeline` from `@xenova/transformers`。
  - 增加 `initLocalModel()` 方法（懒加载）。
  - 在 `embed()` 中根据配置切换 OpenAI / Local。
  - 设置本地缓存路径为 `./data/models` (保持数据统一)。

### 3.3 环境变量配置
- 更新 `.env` (或 `.env.example`):
  - `EMBEDDING_PROVIDER=local` (默认)
  - `EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2`

### 3.4 兼容性处理
- 注意：`all-MiniLM-L6-v2` 输出维度是 384，而 OpenAI 是 1536。
- **关键决策**: 数据库中的旧向量 (1536维) 将无法与新向量 (384维) 进行计算。
- **迁移策略**: 
  - 简单粗暴：建议用户清除旧数据 (Delete `data/agents/*.db`)。
  - 或者：在 `MemoryManager` 初始化时检测维度，如果不匹配则重建表 (MVP 阶段选方案1)。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  安装依赖。
  2.  重构 `EmbeddingService.js`。
  3.  更新 `Agent` 初始化逻辑 (如有必要)。
  4.  创建测试脚本验证本地 Embedding。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 支持离线记忆的 Agent 系统。
