# OpenClaw 本地“上奏机制”集成计划

## 1. 可行性与匹配度分析

### 1.1 项目目标契合度 (High)
本项目“天命系统”的核心愿景是将 AI Agent 的运行状态以“朝廷命官”的形式可视化。
- **原方案**：依赖 `state.json` 文件监听。这是一种“旁路监听”模式，Agent 本身不知道自己在被监控，且需要 Agent 运行时配合写文件。
- **新方案 (本计划)**：让 Agent 主动调用 `report_status` 工具。这是一种“主动汇报”模式，完美契合“臣子向皇帝上奏”的设定。Agent 的每一次工具调用，都对应一次“奏折”的呈递，逻辑更加自洽。

### 1.2 技术可行性 (High)
- **OpenClaw 能力**：OpenClaw 原生支持 `exec` 类型技能，调用本地脚本是其基础能力，无兼容性风险。
- **通信链路**：`Agent (Node.js)` -> `Local Script` -> `Relay Server (Express)` -> `Frontend (React)`。全链路在 localhost 运行，延迟极低，足以支持秒级动画同步。
- **代码变动**：
    - **前端/后端**：几乎零修改（`server/index.js` 已具备接收能力）。
    - **Agent 端**：仅需增加一个 Skill 和修改 Prompt。
- **风险点**：唯一的风险是 Agent 可能偶尔“忘记”调用工具，但这可以通过强化 System Prompt (如“绝对铁律”) 来解决。

## 2. 实施步骤

### 第一步：设立“通政使司” (编写上报脚本)
创建一个供 OpenClaw 调用的本地 Node.js 脚本，作为 Exec 工具。
- **文件路径**: `scripts/report_skill.js`
- **功能**: 接收命令行参数 (`instance_id`, `status`, `current_task`)，并 POST 发送到 `http://127.0.0.1:3001/api/report`。

### 第二步：赐予“密奏之权” (配置 OpenClaw Skill)
使用 OpenClaw CLI 将上述脚本注册为 Agent 可用的技能。
- **Skill 名称**: `report_status`
- **Skill 类型**: `exec`
- **命令模板**: `node ./scripts/report_skill.js {{instance_id}} {{status}} {{current_task}}`

### 第三步：下发“皇帝圣旨” (修改 System Prompt)
修改 Agent 的系统提示词 (System Prompt)，强制要求其在任务开始和结束时调用 `report_status`。
- **核心规则**: “办事必先上报”。

### 第四步：内阁中枢验证 (Relay Server)
确保 `server/index.js` 能够正确处理上报请求。(已验证，当前代码支持)

## 3. 立即执行动作
1. 创建 `scripts/report_skill.js` 文件。
2. 指导用户运行 OpenClaw 注册命令。
3. 提供 System Prompt 模板。
