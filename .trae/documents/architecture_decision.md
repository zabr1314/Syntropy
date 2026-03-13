# 方案评估：自研后端 vs 继续使用 OpenClaw

## 1. 核心问题回顾
目前的架构中，Node Server 仅仅是一个“传声筒”，核心逻辑都在 OpenClaw 里。
这就导致了我们刚刚发现的问题：**前后端逻辑割裂**。
- 丞相（OpenClaw）想叫人，用的是 `call_agent` 工具。
- 前端（React）想看动画，等的是 `正在传唤:` 的字符串。
- 中间件（Node）没对上暗号，导致系统“瘫痪”。

## 2. 方案对比

### 方案 A：继续使用 OpenClaw (修补现状)
**思路**：
1.  修改 `server/index.js`，增加对 `call_agent` 工具的解析逻辑。
2.  或者修改 `minister.yml`，强行让丞相输出符合前端要求的特殊字符串（Prompt Engineering）。

*   ✅ **优点**：改动最小，利用现有的 OpenClaw 能力（如内置的 Memory、Skill 生态）。
*   ❌ **缺点**：架构依然复杂（需要同时跑 Gateway 和 Node Server），调试困难（Agent 在黑盒里），逻辑脆弱（依赖字符串匹配）。

### 方案 B：自研后端 (重构为 Direct LLM) **(推荐)**
**思路**：
在 `server/index.js` 中直接集成 LLM SDK (如 OpenAI SDK)，接管所有 Agent 逻辑。

*   ✅ **优点**：
    1.  **完全控制**：您可以定义清晰的事件协议（如 `{ type: 'SUMMON', target: 'historian' }`），而不是去猜字符串。
    2.  **架构简化**：只需要一个 Node 进程，不再需要启动 OpenClaw Gateway。
    3.  **调试方便**：所有逻辑都在您的代码里，想打 Log 就打 Log。
    4.  **业务贴合**：天命系统更像是一个“角色扮演游戏”，自研后端可以更容易地实现“上朝礼仪”、“官职晋升”等游戏逻辑，而不需要受限于通用 Agent 框架。

*   ❌ **缺点**：需要自己写一点代码来调用 LLM API 和管理上下文（但这其实很简单）。

## 3. 迁移路线图 (如果选择方案 B)

如果您决定采用自研后端，我们可以分三步走：

1.  **环境准备**:
    -   安装 `openai` 库：`npm install openai dotenv`
    -   配置 `.env` 文件放入 API Key。

2.  **重写 `server/index.js`**:
    -   废弃 `OpenClawGatewayAdapter`。
    -   实现一个简单的 `AgentRuntime` 类。
    -   **核心逻辑**:
        -   接收前端 `command`。
        -   调用 LLM (GPT-4o)。
        -   **关键**: 在 System Prompt 中定义 `tools` (如 `summon_official`)。
        -   当 LLM 想要调用工具时，直接在后端触发 `socket.emit('agent_update', { status: 'summoning', target: '...' })`。

3.  **前端微调**:
    -   前端逻辑几乎不用变，或者可以简化（不再需要复杂的字符串解析，直接听事件）。

## 4. 我的建议
鉴于您提到“我有写文档，你可以看看了解”，说明您对项目有掌控力。
**我强烈建议选择方案 B (自研后端)**。
OpenClaw 对于通过 API 调用的场景来说可能过重了，而且它的“通用性”反而成为了我们定制“天命系统”这种特定业务场景的阻碍。

如果您同意，我可以为您生成一份**自研后端的 MVP 代码框架**，让您看看其实现起来有多简单。
