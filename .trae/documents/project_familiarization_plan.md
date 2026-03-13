# OpenClaw 集成与监控配置计划

## 1. 目标

* **接入 OpenClaw**: 启动连接器，使系统能够接收外部 Agent 的实时状态。

* **取消内部模拟**: 禁用 `CourtService` 的内部逻辑，确保可视化完全由外部数据驱动。

## 2. 执行步骤

### 步骤 1: 禁用内部模拟 (Court Mode)

* **文件**: `src/components/Console/ConsoleLayout.tsx`

* **操作**: 注释掉 `CourtService.getInstance()` 的调用。

* **原因**: 防止内部状态机与外部实时数据发生冲突，停止自动闲聊和模拟任务处理。

### 步骤 2: 启动连接器 (Connector)

* **命令**: `node scripts/openclaw-connector.js`

* **说明**: 该脚本监听 `state.json` 的变化并推送到 Relay Server。

* **注意**: 确保 `state.json` 文件存在（已确认存在）。

### 步骤 3: 验证

* 检查前端页面，确认角色不再自动进行内部模拟的闲聊。

* 手动修改 `state.json`，观察前端角色是否响应（如变更为 `working` 状态）。

## 3. 下一步建议

* 完成上述配置后，你可以将真实的 OpenClaw Agent 输出写入 `state.json`，即可在界面上看到实时可视化。

