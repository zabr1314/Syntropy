# 单 Agent 链路测试计划

## 1. 目标
在只有一个 OpenClaw Agent 的环境下，验证从“用户下令”到“前端小人移动”的完整链路是否畅通。

## 2. 准备工作 (Checklist)

### A. 环境确认
- [ ] **Relay Server**: `node server/index.js` 正在运行 (端口 3001)。
- [ ] **Frontend**: `npm run dev` 正在运行 (端口 5173)。
- [ ] **OpenClaw**: 本地已安装 OpenClaw，且已配置好一个 Agent (假设 ID 为 `my-agent-01`)。

### B. Agent 配置 (关键!)
我们需要确保您的 Agent 已经学会了“上奏”技能。
1.  **Skill**: 确保 `report_skill.js` 存在，且已通过 OpenClaw CLI 注册为 `report_status`。
2.  **Prompt**: 确保 Agent 的 System Prompt 中包含“绝对铁律：上奏机制”。

## 3. 测试步骤

### 场景一：模拟上奏 (无需 OpenClaw)
先排除 OpenClaw 因素，单纯测试 Server 和前端是否正常。
1.  打开终端，手动运行命令模拟 Agent 上报：
    ```bash
    curl -X POST http://localhost:3001/api/report \
      -H "Content-Type: application/json" \
      -d '{"instance_id": "my-agent-01", "status": "working", "current_task": "正在测试连接..."}'
    ```
2.  **预期结果**: 
    - Server 控制台输出 `[Report] Agent my-agent-01: working...`
    - 前端页面左下角广场出现一个小人，头上气泡显示“正在测试连接...”，并开始做动作。

### 场景二：真实调用 (集成 OpenClaw)
1.  启动您的 OpenClaw Agent。
2.  在 OpenClaw 的对话框中输入指令：
    > “向朝廷汇报你的状态，告诉他们你准备好工作了。”
    *(或者直接下达具体任务，如“写一个 Hello World 文件”)*
3.  **预期结果**:
    - OpenClaw 界面显示它调用了 `report_status` 工具。
    - 前端页面上的小人状态更新，显示 Agent 的回复内容。

## 4. 故障排查指南
如果小人没动：
- **查 Server**: 看终端有没有 `POST /api/report` 的日志。如果没有，说明 OpenClaw 没发出来（检查 Skill 注册或脚本路径）。
- **查 Frontend**: 刷新页面，看 Console 有没有报错，或者点击右上角“设置”检查 API 地址是否为 `http://localhost:3001/api/agents`。

## 5. 立即执行动作
我将为您提供一段**自动测试脚本**，您可以直接运行它来完成“场景一”的验证。
