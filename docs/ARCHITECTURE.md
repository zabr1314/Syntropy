# 太和系统 架构设计文档

> 版本：v2.5 | 更新日期：2026-04-19

---

## 目录

1. [系统全景架构](#1-系统全景架构)
2. [多 Agent 协作流程](#2-多-agent-协作流程)
3. [记忆引擎设计](#3-记忆引擎设计)
4. [内核状态机](#4-内核状态机agent-生命周期)
5. [人机协同协议](#5-人机协同协议)
6. [技术选型对比](#6-技术选型对比)
7. [核心创新点](#7-核心创新点)

---

## 1. 系统全景架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户（皇帝）                             │
│                    浏览器 / React Frontend                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (Socket.io)
                            │ Events: command / agent_update /
                            │         agent_stream / plan_preview /
                            │         approval_request
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SocketGateway（传输层）                         │
│   连接管理 │ 入站归一化 + traceId 生成 │ 出站事件广播             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ handleCommand(data, traceId)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Kernel（调度层）                             │
│                                                                  │
│   ┌────────────┐   ┌────────────┐   ┌──────────────────────┐   │
│   │  EventBus  │   │  Session   │   │    SkillManager       │   │
│   │  (Pub/Sub) │   │ (对话历史)  │   │  (技能注册 & 执行)    │   │
│   └────────────┘   └────────────┘   └──────────────────────┘   │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    Agent Registry                         │  │
│   │  丞相 │ 史官 │ 户部 │ 兵部 │ 工部 │ 礼部 │ 吏部 │ 刑部  │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌──────────────┐  ┌─────────┐  ┌──────────────────┐
     │  LLM Service │  │ Tracer  │  │  Storage / Memory │
     │ (DeepSeek /  │  │(链路追踪│  │  SQLite + Vector  │
     │  GPT-4o)     │  │ 诊断事件│  │  (BGE Embeddings) │
     └──────────────┘  └─────────┘  └──────────────────┘
```

### 核心组件职责

| 组件 | 职责 | 关键文件 |
|------|------|---------|
| **SocketGateway** | Socket.io 连接管理、入站归一化、出站广播 | `server/runtime/SocketGateway.js` |
| **Kernel** | Agent 注册、消息调度（dispatch/handleCommand） | `server/core/Kernel.js` |
| **Agent** | 执行循环、工具调用、记忆写入 | `server/core/Agent.js` |
| **EventBus** | 内部 Pub/Sub，解耦组件 | `server/core/EventBus.js` |
| **SkillManager** | 动态加载技能、权限检查、执行 | `server/runtime/SkillManager.js` |
| **MemoryManager** | RRF 混合检索、BM25 + 向量双路 | `server/runtime/MemoryManager.js` |
| **Session** | 每个 Agent 的对话历史持久化 | `server/core/Session.js` |
| **SessionStore** | SQLite 会话持久化（替代 JSONL Storage）| `server/infra/SessionStore.js` |
| **Tracer** | traceId 链路追踪、诊断事件、日志脱敏、卡死检测 | `server/infra/Tracer.js` |

---

## 2. 多 Agent 协作流程

### 2.1 标准并行调度（Plan → Parallel Execute → Summarize）

当用户下达需要多部门协同的指令时：

```
用户：检查各部最近工作进展

    ┌──────────────────────────────────────────────────────────┐
    │                      丞相（Orchestrator）                 │
    │                                                          │
    │  1. 解析意图 → 识别需要调用多部门                         │
    │  2. 选择工具: call_officials（并行）                      │
    │  3. 发布 plan:preview 事件 → 前端显示执行计划             │
    └──────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │ Promise.allSettled            │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  户部    │   │  兵部    │   │  工部    │
        │税收报告  │   │兵力情况  │   │工程进展  │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             └──────────────┴──────────────┘
                              │ 聚合结果（单个失败不阻塞其他）
                              ▼
                       ┌──────────┐
                       │   丞相   │
                       │ 汇总复命 │
                       └──────────┘
```

### 2.2 ACP 结构化调度协议（Agent Communication Protocol）

**旧方式（信息损耗）：**
```
Kernel.dispatch() → 手工拼接自然语言 prompt → targetAgent.execute(prompt)
                                                      ↑
                                            LLM 需重新解析结构化信息
                                            （信息二次损耗）
```

**新方式（结构化传递）：**
```
Kernel.dispatch(message, depth) → targetAgent.executeAsSubAgent({
                               from: message.from,
                               instruction: message.payload.instruction,
                               depth: depth + 1        // 透传派生深度
                           })
                           ↓
                   临时注入 [任务来源：{from}] 上下文
                   → 执行 → 还原 systemPrompt
```

关键改进：结构化字段直接传递，无自然语言转换损耗。官员知道被哪位官员召唤，可以按"响应契约"简洁回复。

### 2.3 官员响应契约（Sub-Agent Response Contract）

当官员被其他官员（非皇帝）召唤时，响应格式收敛为：

```
**结论**：（一句话核心答案）
**要点**：（2-3条关键信息，用数字或事实）
**备注**：（如有不确定，注明）
```

这消除了 LLM 在 sub-agent 模式下倾向于"展开对话"的过度生成问题，大幅提升丞相的聚合效率。

---

## 3. 记忆引擎设计

### 3.1 RRF 混合检索原理

```
查询 Query: "去年税收情况"
        │
        ├──────────────────────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                 ┌────────────────┐
│  BM25 检索    │                 │  向量检索      │
│  关键词匹配    │                 │  语义相似度    │
│  "税收" "去年" │                 │  BGE Embedding │
└───────┬───────┘                 └────────┬───────┘
        │ rank_bm25[]                       │ rank_vec[]
        │                                  │
        └──────────────┬───────────────────┘
                       │ RRF Fusion
                       │ score = Σ 1/(k + rank_i)
                       ▼
               ┌───────────────┐
               │  Top-K 结果   │
               │  综合排序     │
               └───────────────┘
```

### 3.2 记忆分层

| 层级 | 存储介质 | 生命周期 | 用途 |
|------|---------|---------|------|
| **工作记忆** | In-Memory（ContextManager）| 单次会话 | LLM 上下文窗口 |
| **短期记忆** | SQLite（BM25索引）| 会话持久化 | 近期对话检索 |
| **长期记忆** | SQLite + 向量索引 | 永久 | 跨会话语义检索 |

### 3.3 LLM 主动记忆捕获

传统记忆系统依赖关键词匹配或规则触发，存在覆盖不全、误判率高的问题。太和系统采用 **LLM 主动决策** 的记忆捕获机制：

```
用户：我的生日是9月29日

    ┌──────────────────────────────────────┐
    │          丞相（Minister）             │
    │                                      │
    │  1. 识别：这是个人信息，值得记忆      │
    │  2. 调用 save_memory 工具            │
    │     - content: "皇帝的生日是9月29日"  │
    │     - category: "personal"           │
    │     - importance: "high"             │
    └──────────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────┐
    │      MemoryManager.save()            │
    │  role='user_preference' 标记         │
    │  metadata: { category, importance,   │
    │             savedBy, savedAt }       │
    └──────────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────┐
    │  SQLite chunks 表 + 向量索引          │
    │  前端 Memory API 可查询/编辑/删除     │
    └──────────────────────────────────────┘
```

**关键优势**：
- **零规则**：无需维护关键词列表，LLM 自主判断记忆价值
- **语义理解**：能识别隐含信息（如"下周二"→ 具体日期）
- **分类准确**：LLM 根据上下文选择 category（personal/preference/project/decision）
- **去重内置**：MemoryManager.save() 自动检测重复内容

**Memory API**：
- `GET /api/memory`：获取所有 user_preference 记忆
- `POST /api/memory`：手动创建记忆
- `PATCH /api/memory/:id`：编辑记忆内容
- `DELETE /api/memory/:id`：删除记忆

---

## 4. 内核状态机（Agent 生命周期）

```
                    ┌─────────────┐
                    │ INITIALIZING│
                    └──────┬──────┘
                           │ onWake()
                           ▼
              ┌──────────────────────────┐
         ┌───▶│          IDLE            │◀───┐
         │    └──────┬──────────────────┘    │
         │           │ execute(input)         │
         │           ▼                        │
         │    ┌──────────────┐               │
         │    │   THINKING   │               │
         │    └──────┬───────┘               │
         │           │ LLM 返回工具调用        │
         │           ▼                        │
         │    ┌──────────────┐               │
         │    │    ACTING    │               │
         │    └──┬───────┬───┘               │
         │       │       │ 高风险工具         │
         │       │       ▼                    │
         │       │  ┌────────────────────┐   │
         │       │  │ WAITING_FOR_HUMAN  │   │
         │       │  └──────┬─────────────┘   │
         │       │         │ approve/reject   │
         │       │         ▼                  │
         │       └─────────┴──────────────────┘
         │                    任务完成
         │
         │    ┌──────────────┐
         └────│   SLEEPING   │
              └──────────────┘
                    │
                    ▼
              ┌──────────────┐
              │  TERMINATED  │
              └──────────────┘
```

### 状态转换触发

| 事件 | 来源 | 目标 |
|------|------|------|
| `execute()` 调用 | IDLE | THINKING |
| LLM 返回工具调用 | THINKING | ACTING |
| 工具执行完成，继续循环 | ACTING | THINKING |
| 无工具调用（最终回复）| THINKING | IDLE |
| 高风险工具触发 | ACTING | WAITING_FOR_HUMAN |
| 用户审批/拒绝 | WAITING_FOR_HUMAN | ACTING |
| `onSleep()` | IDLE | SLEEPING |

---

## 5. 人机协同协议

### 5.1 天牢机制（Jailing）

对违规或需要人工审查的 Agent，系统支持"下狱"操作：

```
Emperor → 御批：将某官员下狱
        → agentStore.setAgentStatus(id, 'jailed')
        → Agent 停止接收新指令
        → 前端显示监狱动画
```

### 5.2 御批机制（Approval Workflow）

当 Agent 调用中风险（medium）或高风险（high）工具时：

```
Agent.handleToolCalls()
    → 检测 riskLevel >= 'medium'
    → 暂停执行，保存 pendingApproval
    → EventBus.publish('approval:request', {...})
    → Kernel 广播 approval_request 给前端

Frontend
    → 显示审批弹窗（InternalAffairsModal）
    → 用户点击"批准"或"拒绝"
    → socket.emit('command', { action: 'approve'|'reject', ... })

Kernel.handleCommand()
    → agent.resumeFromApproval(approved, feedback)
    → 恢复执行或注入拒绝反馈
```

### 5.3 流式输出（Streaming）

LLM 输出通过 SSE → Socket.io 实时推送：

```
LLM.chatStream()
    → onChunk callback
    → EventBus.publish('agent:stream', { id, chunk })
    → Kernel 广播 agent_stream
    → Frontend MessageProcessor 拼接 chunk → 实时显示
```

---

## 6. 技术选型对比

### 为什么不用 LangGraph / AutoGen？

| 维度 | LangGraph | AutoGen | 太和系统 |
|------|-----------|---------|---------|
| **定制化** | 受 DAG 约束，难以实现动态分支 | Agent 间通信模式固定 | 完全自定义调度逻辑 |
| **前端集成** | 无 UI 层，需额外开发 | 无 UI 层 | React + Phaser 深度融合 |
| **记忆系统** | 依赖外部向量库 | 无内置记忆 | 内置 RRF 混合检索 |
| **并发模型** | 受 Python GIL 影响 | 多进程复杂 | Node.js 事件循环天然并发 |
| **角色扮演** | 无 | 无 | 古风角色系统、天牢机制 |
| **实时可视化** | 无 | 无 | Agent 状态动画、执行计划预览 |

### 为什么选 Node.js + Socket.io？

- **事件驱动**：Agent 并行执行天然匹配 Node.js 非阻塞 I/O
- **全栈统一**：前后端 TypeScript/JavaScript，类型共享
- **实时通信**：Socket.io 成熟稳定，支持 room 广播
- **轻量部署**：无需 Python 环境，单进程即可运行完整系统

### 为什么选 DeepSeek？

- **成本**：API 价格约为 GPT-4o 的 1/20
- **中文能力**：对古风语境理解优于多数西方模型
- **工具调用**：完整支持 OpenAI Function Calling 格式

---

## 7. 核心创新点

### 7.1 结构化 ACP 调度（消除信息损耗）

传统 Multi-Agent 框架将结构化消息转换为自然语言再传递给下游 LLM，存在不可避免的信息损耗。

太和系统通过 `executeAsSubAgent({ from, instruction })` 直接传递结构化字段，并通过系统提示词注入来源上下文，在不改变 LLM 接口的前提下实现了零损耗结构化通信。

### 7.2 并行批量调度（call_officials）

`call_officials` 技能使用 `Promise.allSettled` 实现真正的并发调度，将 N 个串行任务压缩到单次最长任务的耗时，理论加速比为 N 倍。单个官员超时或失败不会阻塞其他官员的结果返回，系统整体鲁棒性更强。

配合 `plan:preview` 事件，前端在并行执行开始前即可展示执行计划，提升用户的感知透明度。

### 7.3 官员响应契约（收敛 Sub-Agent 输出）

通过系统提示词注入标准化响应格式（结论/要点/备注），解决了 Sub-Agent 在无用户可见界面时过度生成对话内容的问题，使丞相的聚合质量大幅提升。

### 7.4 RRF 混合记忆检索

结合 BM25（关键词精确匹配）和 BGE 向量语义检索的倒数排名融合（Reciprocal Rank Fusion），在不增加 token 消耗的前提下实现了"精确+模糊"双路召回，记忆检索 Recall@10 显著优于单一检索策略。

### 7.5 人机协同的"御批"机制

不同于简单的"人在回路"（Human-in-the-Loop），太和系统实现了基于风险等级的动态审批路由：低风险工具自动执行，中高风险工具暂停并请求人工审批，审批结果（含反馈）作为上下文注入 Agent 继续执行，保持了任务的连续性。

### 7.6 派生深度控制（防无限递归）

`Kernel.dispatch()` 携带 `depth` 参数，超过 `MAX_SPAWN_DEPTH=2` 时直接返回错误字符串，阻断潜在的无限递归调用链。depth 通过 skill context 透传，官员调用官员时自动累加。

### 7.7 Dispatch 超时保护

`Kernel.dispatch()` 使用 `Promise.race` + 60s timeout 包装每次子 Agent 调用，防止单个官员卡死导致丞相永久挂起。

### 7.8 上下文安全压缩（保护 tool_call 配对）

`ContextManager.pruneContext()` 采用"安全删除单元"策略：将 `assistant(tool_calls)` 及其所有对应 `tool result` 视为原子组，只整组删除，绝不拆散配对，从根本上消除 400 API 错误。

### 7.9 Session SQLite 持久化

会话历史从 JSONL 文件迁移到 `SessionStore`（better-sqlite3），带索引的 SQLite 查询性能不随文件增长劣化，并天然支持按 agent_id 隔离和原子清空。

### 7.10 结构化可观测性（Tracer）

每次 dispatch 或用户指令生成根 traceId，子 Agent 继承并派生（`parent.depth` 格式）。8种结构化诊断事件（`agent.turn`、`tool.call`、`model.usage`、`dispatch`、`approval.wait`、`agent.stuck`）贯穿全链路，日志脱敏层自动截断 API Key 等敏感字段，3分钟卡死检测兜底。

### 7.11 路由统一化（SocketGateway）

Socket.io 职责从 Kernel 完全剥离到独立的 `SocketGateway`。Kernel 不再持有 `io`，只负责调度逻辑，可独立测试。SocketGateway 在入站时生成 traceId 并注入 `handleCommand()`，实现传输层与调度层的清晰边界。

### 7.12 LLM 主动记忆（save_memory 技能）

传统 Agent 记忆系统依赖关键词匹配或固定规则触发，存在覆盖不全、误判率高的问题。太和系统通过 `save_memory` 技能将记忆捕获决策权完全交给 LLM：Agent 在对话中自主判断哪些信息值得长期保存，并主动调用工具写入 SQLite（`role='user_preference'`）。

这消除了规则维护成本，同时利用 LLM 的语义理解能力实现了更准确的分类（personal/preference/project/decision）和去重。前端 MemoryVault 组件通过 Memory API 提供记忆的查看、编辑、删除和搜索能力，形成完整的记忆管理闭环。

---

*文档维护：太和系统核心团队 | 如有更新请同步修改此文档*
