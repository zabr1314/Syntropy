# OpenClaw 多 Agent 架构排查指南

您质疑“到底有没有做好子 Agent 架构”，这是一个非常核心的问题。目前前端和 Relay Server 已经准备好了，但关键在于 **OpenClaw 后端是否真正配置了多 Agent 协作**。

## 1. 核心问题定位

如果丞相没有调用子 Agent，可能有以下原因：

1.  **丞相没有“工具”**: 丞相 (`minister`) 这个 Agent 身上，是否挂载了能调用其他 Agent 的工具？
    *   在 OpenClaw 中，Agent 之间的调用通常是通过 **Tool (工具)** 实现的。
    *   例如：丞相需要一个名为 `call_historian` 的工具，这个工具的底层逻辑是向 `historian` Agent 发送消息。
    *   如果丞相只有一个 LLM 大脑，没有工具，他当然只能自己“瞎编”或者说“我做不到”。

2.  **子 Agent 未启动/未绑定**: 
    *   OpenClaw 后端是否真的启动了 `historian` 进程？
    *   或者是否通过 `openclaw bind` 命令将它们绑定到了同一个 Gateway？

3.  **Prompt 问题**:
    *   丞相的 System Prompt 里是否写明了“你有几个下属，遇到 xx 问题请调用 xx 工具”？
    *   如果没告诉他，他自然不会去调用。

## 2. 排查步骤

我们需要确认 OpenClaw 的配置。由于我无法直接访问您的 OpenClaw 配置文件（它们在您的本地环境，可能在 `~/.openclaw` 或 Docker 容器里），我需要您协助检查。

### 步骤一：检查 OpenClaw Agent 列表
请在您的终端（运行 OpenClaw 的那个终端）执行：
```bash
openclaw agents list
```
**期望结果**: 应该能看到 `minister`, `historian`, `official_revenue` 等多个 Agent 在线。
**如果只有 `minister`**: 那就是子 Agent 压根没跑起来。您需要启动它们。

### 步骤二：检查丞相的工具
请检查丞相的配置文件（通常是 `agent.yaml` 或在 Web 界面配置）。
**期望结果**: `tools` 列表中应该包含类似 `delegate_to_agent` 或具体的 `call_historian` 工具。

### 步骤三：验证前端日志
我在 `server/index.js` 中增加了一些日志。请观察 `node server/index.js` 的输出。
*   当您发送指令时，看是否有 `[Socket] Forwarding to OpenClaw: chat.send`。
*   看 OpenClaw 返回的 `stream` 类型。如果是 `tool`，说明他试图调用工具。如果是 `assistant` 且内容是“好的我查查”，说明他只是在敷衍（自己在回答）。

## 3. 解决方案：如果后端未配置

如果您发现 OpenClaw 后端确实只有一个“光杆司令”丞相，我们需要**手动配置多 Agent**。

由于 OpenClaw 的具体配置方式依赖于版本（Python/Node/Go），且我无法直接操作您的环境，我建议：

1.  **模拟多 Agent (Mock)**: 
    *   如果我们暂时搞不定 OpenClaw 的复杂配置，我可以修改 `server/index.js`，**在 Relay 层模拟子 Agent**。
    *   逻辑：当丞相回复中包含特定关键词（如“史官”），Relay Server 自动伪造一条来自 `historian` 的回复。
    *   这能立马让前端动起来，看起来像是有子 Agent 在工作。

2.  **配置 OpenClaw (True)**:
    *   您需要为每个官员创建一个 Agent 配置文件。
    *   为丞相编写一个能够调用 API 的工具（指向 OpenClaw 的 `chat.send` 接口，目标是子 Agent）。

**您希望我先用“方案 1 (Mock)”让系统跑起来，还是协助您进行“方案 2 (真实配置)”？**
