# 前后端连接故障排查计划

## 1. 现状分析 (Phase 1: Explore)
- **现象**: 用户反馈 "还是不行"、"前端没人回"。
- **已排除**: DeepSeek API 本身可用（通过 `test_deepseek.js` 验证）。
- **疑似点**: Socket.io 连接不稳定、事件未送达、或者前端逻辑忽略了某些状态。
- **发现**:
  - `server/index.js` 开启了 CORS `*`。
  - `server/core/Kernel.js` 在 `command` 事件中处理消息。
  - `src/services/live/SocketManager.ts` 在 `connect` 时会自动发送 `register`。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: 彻底排查连接问题，确保前端说话后能收到回复。
- **分析结果**: 
  - 前端可能连接失败（CORS 或端口问题）。
  - 前端发送的 `targetId` 可能与后端不匹配。
  - 后端回复的 `agent_update` 事件可能未被前端正确捕获。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 创建连接诊断脚本 (Backend Diagnostic)
- 创建 `server/diagnostic.js`:
  - 启动一个独立的 Socket.io Client 连接到 `http://localhost:3001`。
  - 模拟前端行为：发送 `register` -> 发送 `command`。
  - 监听 `agent_update`，验证后端是否真的在广播。
  - 这样可以排除前端代码的问题，单纯测试后端 Socket 服务是否正常。

### 3.2 增加调试日志 (Backend Logs)
- 在 `server/core/Kernel.js` 中增加更详细的日志：
  - 打印收到的 `payload` 内容。
  - 打印广播的目标房间成员数量（`io.sockets.adapter.rooms.get('frontend')?.size`）。

### 3.3 检查前端配置 (Frontend Config)
- 检查前端连接的 URL 是否硬编码为 `localhost:3001`，如果是远程部署则会失效。
- 检查前端发送的 `targetId` 是否与 `officials.json` 中的 ID 一致。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  增加 Kernel 日志，监控 Socket 房间状态。
  2.  创建 `server/diagnostic.js` 进行回路测试。
  3.  根据测试结果修复问题（可能是 ID 不匹配或房间广播失败）。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 诊断报告和修复后的连接逻辑。
