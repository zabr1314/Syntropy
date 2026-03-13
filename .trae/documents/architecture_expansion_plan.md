# 天命系统架构升级计划 (Phase 3: Capability Expansion)

## 1. 现状回顾
目前系统已完成“微内核 + 角色插件”的基础架构重构。
- **Kernel**: 负责生命周期管理。
- **Roles**: 8 位官员已就位。
- **Memory**: JSONL 持久化。
- **Tools**: 基础注册表。

但与 OpenClaw 相比，我们还缺少几个关键模块，限制了系统的“智能化”和“仿真度”。

## 2. 拟引入模块 (From OpenClaw)

经过对 OpenClaw 源码的二次深度分析，建议引入以下模块：

### 2.1 调度器 (Scheduler / Cron)
**参考**: `openclaw/src/cron/`
**目的**: 为系统注入“时间”概念，驱动周期性事件。
- **早朝 (Morning Court)**: 每日 08:00 自动触发。
- **税收 (Tax Collection)**: 每月自动触发户部结算。
- **随机事件 (Random Events)**: 灾害、祥瑞、边关急报。

### 2.2 技能加载器 (Skill Loader)
**参考**: `openclaw/src/agents/skills/`
**目的**: 解耦工具代码，支持动态扩展。
- 当前工具是硬编码在 `ToolRegistry` 中的。
- 目标：从 `server/skills/` 目录动态加载工具定义（如 `finance_tools.js`, `military_tools.js`）。

### 2.3 钩子系统 (Hooks)
**参考**: `openclaw/src/hooks/`
**目的**: 增强事件系统的扩展性。
- 允许插件“拦截”或“监听”系统事件。
- 场景：**东厂 (Spy Agency)** 可以监听所有官员的私下对话。

### 2.4 向量记忆 (Vector Memory / RAG)
**参考**: `openclaw/src/memory/`
**目的**: 让史官和户部尚书拥有真正的“海量知识库”。
- 引入 SQLite + Vector 扩展（或纯向量库）。
- 支持对《明史》、《大明律》的语义搜索。

## 3. 实施路线图

### Phase 3.1: 调度器 (Scheduler)
1.  创建 `server/runtime/Scheduler.js`。
2.  集成 `node-cron` 或实现简单的 `setInterval` 封装。
3.  在 `Kernel` 中启动调度器，并注册“早朝”任务。

### Phase 3.2: 技能文件化 (File-based Skills)
1.  创建 `server/skills/` 目录。
2.  将 `search_knowledge` 提取为独立文件。
3.  更新 `ToolRegistry` 支持扫描目录加载。

### Phase 3.3: 钩子系统 (Hooks)
1.  升级 `EventBus`，支持 `intercept` 或 `middleware` 模式。
2.  实现一个简单的“史官记录员”钩子，自动将所有对话写入日志文件。

## 4. 下一步
建议优先实施 **Phase 3.1 (Scheduler)** 和 **Phase 3.2 (Skill Loader)**，这将立即使系统具备“自我驱动”能力和更好的开发体验。
