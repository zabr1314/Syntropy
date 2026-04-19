# 太和系统 新人上手指南

> 5分钟快速接手项目，10分钟开始改代码

---

## 这是什么项目？

一个**古风 AI Agent 管理系统**。你是"皇帝"，通过浏览器下诏令，后端的 AI Agent（丞相、六部官员）会自动协作完成任务。

**技术栈**：
- 后端：Node.js + Socket.io + DeepSeek API
- 前端：React + TypeScript + Phaser（游戏引擎）
- 数据：SQLite（会话、记忆）

---

## 快速启动（3步）

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（必须）
# 在项目根目录创建 .env 文件：
echo "DEEPSEEK_API_KEY=sk-your-key-here" > .env

# 3. 启动
npm run dev        # 前端 (localhost:5173)
node server/index.js  # 后端 (localhost:3001)
```

打开浏览器访问 `http://localhost:5173`，看到"太和殿"界面就成功了。

---

## 核心概念（必读）

### 1. Agent 是什么？
每个 Agent 是一个独立的 AI 角色（丞相、户部、兵部...），有自己的：
- **System Prompt**：角色设定
- **Skills**：可调用的工具（如 `call_official` 传唤其他官员）
- **Memory**：SQLite 存储的长期记忆

### 2. 消息怎么流转？
```
用户下诏令 → 前端 (React)
           → Socket.io
           → 后端 Kernel
           → 丞相 Agent (minister)
           → 调用 call_officials
           → 并行派发给各部官员
           → 汇总结果返回前端
```

### 3. 关键设计
- **ACP 协议**：Agent 间通过 `Kernel.dispatch()` 通信，结构化传递指令
- **流式输出**：LLM 回复实时推送到前端，逐字显示
- **人机协同**：高风险操作（如删除数据）会暂停等待用户审批

---

## 目录结构（重点文件）

```
天命系统/
├── server/                    # 后端
│   ├── core/                  # 核心引擎
│   │   ├── Kernel.js          # 调度中枢（Agent 注册、消息路由）
│   │   ├── Agent.js           # Agent 基类（执行循环、工具调用）
│   │   └── LLM.js             # DeepSeek API 封装
│   ├── runtime/               # 运行时服务
│   │   ├── SocketGateway.js   # Socket.io 传输层
│   │   ├── SkillManager.js    # 技能加载器
│   │   └── MemoryManager.js   # 记忆检索（RRF 混合检索）
│   ├── infra/                 # 基础设施
│   │   ├── Tracer.js          # 链路追踪（traceId）
│   │   └── SessionStore.js    # 会话持久化（SQLite）
│   └── index.js               # 入口文件
├── src/                       # 前端
│   ├── services/
│   │   └── LiveAgentService.ts  # 前端总控（WebSocket、decree 生命周期）
│   ├── store/
│   │   ├── useAgentStore.ts     # Agent 状态
│   │   └── useCourtStore.ts     # Decree（诏令）状态
│   └── components/
│       └── Console/             # 控制台 UI
├── skills/                    # 技能库（Agent 可调用的工具）
│   ├── call_official.js       # 传唤单个官员
│   └── call_officials.js      # 并行传唤多个官员
├── data/                      # 数据目录
│   ├── agents/                # 各 Agent 的 SQLite 记忆库
│   ├── sessions.db            # 会话历史
│   └── logs.jsonl             # 系统日志
└── test/                      # 测试
    └── run_tests.js           # 后端测试（31个）
```

---

## 改代码前必看

### 规则 1：先读文件，再动手
```bash
# 错误示例：直接猜测代码位置
vim server/core/Agent.js  # ❌ 不知道里面有什么

# 正确示例：先读懂再改
cat server/core/Agent.js  # ✅ 看清楚逻辑
# 然后再用编辑器修改
```

### 规则 2：改完必须跑测试
```bash
# 后端测试
node test/run_tests.js

# 前端测试
npm test -- --run

# 如果测试挂了，说明你改错了
```

### 规则 3：不要破坏配对关系
- `tool_call` 和 `tool_result` 必须成对出现（否则 API 400 错误）
- `Agent.execute()` 和 `Agent.stop()` 必须配对
- `setTimeout` 必须有对应的 `clearTimeout`

---

## 常见任务速查

### 任务 1：加一个新 Agent
1. 在前端"内务府"点"添加官员"
2. 填写 ID、名字、System Prompt
3. 勾选需要的 Skills
4. 保存后自动生成配置文件 `data/config/officials.json`

### 任务 2：加一个新 Skill
1. 在 `skills/` 目录新建 `my_skill.js`
2. 导出格式：
```javascript
export default {
  name: 'my_skill',
  description: '技能描述',
  parameters: { /* JSON Schema */ },
  riskLevel: 'low',  // low/medium/high
  handler: async (params, context) => {
    // 你的逻辑
    return '执行结果';
  }
};
```
3. 重启后端，技能自动加载

### 任务 3：调试 Agent 行为
```bash
# 查看 Agent 的记忆库
sqlite3 data/agents/minister.db "SELECT * FROM chunks LIMIT 10;"

# 查看会话历史
sqlite3 data/sessions.db "SELECT * FROM messages WHERE agent_id='minister' ORDER BY created_at DESC LIMIT 20;"

# 查看链路追踪日志（找 [TRACE] 开头的行）
tail -f data/logs.jsonl | grep TRACE
```

### 任务 4：修复前端 Bug
1. 打开浏览器 DevTools（F12）
2. 看 Console 有没有报错
3. 看 Network 标签，WebSocket 连接是否正常
4. 前端状态在 Zustand DevTools 里可以看到（需要装浏览器插件）

---

## 架构关键点（面试会问）

### 1. 为什么不用 LangGraph？
- LangGraph 是 DAG 约束，我们需要动态分支（丞相根据任务决定调哪些官员）
- 我们有深度定制的前端（Phaser 游戏引擎），LangGraph 没 UI 层

### 2. 并行调度怎么实现的？
`call_officials` 用 `Promise.allSettled` 并发调用多个 Agent，单个失败不影响其他。配合 `Kernel.dispatch()` 的 60s 超时保护。

### 3. 记忆检索用的什么算法？
RRF (Reciprocal Rank Fusion)：BM25 全文检索 + BGE 向量检索，双路召回后融合排序。

### 4. 怎么防止无限递归？
`Kernel.dispatch(message, depth)` 有 `MAX_SPAWN_DEPTH=2` 限制，官员调官员最多 2 层。

### 5. 前端怎么保证 decree 不误完成？
`LiveAgentService.updateCourtState()` 有 2s debounce，minister 持续 idle 2 秒才标记 decree 为 `completed`。

---

## 遇到问题怎么办？

### 1. 后端报错
```bash
# 看完整日志
tail -100 data/logs.jsonl

# 看链路追踪（找卡在哪个 Agent）
grep "agent.stuck" data/logs.jsonl
```

### 2. 前端白屏
```bash
# 检查后端是否启动
curl http://localhost:3001/health

# 检查 WebSocket 连接
# 浏览器 DevTools -> Network -> WS 标签
```

### 3. Agent 不回复
- 检查 API Key 是否配置正确（`.env` 文件）
- 检查 DeepSeek API 余额是否充足
- 看后端日志有没有 `model.usage` 事件（说明 LLM 调用成功）

### 4. 测试挂了
- 先看报错信息，定位是哪个测试
- 读测试代码，理解预期行为
- 对比实际代码，找差异

---

## 重要文档

- `docs/ARCHITECTURE.md` — 系统架构设计（必读）
- `docs/AGENT_DEV_PROGRESS.md` — 后端开发进度
- `docs/FRONTEND_DEV_PROGRESS.md` — 前端开发进度
- `技术文档.md` — 早期设计文档（部分过时）

---

## 第一个 PR 建议

**不要一上来就重构核心逻辑**。先做这些安全的改动：

1. 加一个新 Skill（如 `get_weather`）
2. 优化一个 UI 组件的样式
3. 给某个函数加注释
4. 修复一个明显的 typo

熟悉流程后再改核心代码。

---

## 联系方式

- 遇到卡点直接问，别憋着
- 改代码前先过一遍设计，避免返工
- 提 PR 前自己先跑一遍测试

**记住**：这个项目的哲学是"默认代码是错的，用测试证明它对"。

---

*祝你顺利上手！有问题随时问。*
