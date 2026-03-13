# WebSocket 升级检查清单

## 1. 依赖安装
- [ ] 在项目根目录安装 `socket.io`
- [ ] 在项目根目录安装 `socket.io-client`

## 2. 后端改造 (Relay Server)
- [ ] `server/index.js`: 引入 `socket.io`
- [ ] `server/index.js`: 将 HTTP Server 包装为 Socket.io Server
- [ ] `server/index.js`: 实现 `connection` 事件处理
- [ ] `server/index.js`: 实现 `register` 事件，记录客户端身份
- [ ] `server/index.js`: 实现 `report` 事件，更新内存状态并广播 `agent_update`
- [ ] `server/index.js`: 实现 `command` 事件，转发给目标 Agent
- [ ] `server/index.js`: 实现 `disconnect` 事件，清理连接并广播 `agent_offline`

## 3. 连接器改造 (Connector)
- [ ] `scripts/openclaw-connector.js`: 引入 `socket.io-client`
- [ ] `scripts/openclaw-connector.js`: 建立 Socket 连接
- [ ] `scripts/openclaw-connector.js`: 发送 `register` 事件 (`type: 'agent'`)
- [ ] `scripts/openclaw-connector.js`: 修改 `readAndReport`，使用 `socket.emit('report')` 替代 `fetch`
- [ ] `scripts/openclaw-connector.js`: 监听 `socket.on('command')`，打印收到的指令（模拟执行）

## 4. 前端改造 (Frontend)
- [ ] `src/services/LiveAgentService.ts`: 引入 `socket.io-client`
- [ ] `src/services/LiveAgentService.ts`: 在 `start()` 中建立 Socket 连接
- [ ] `src/services/LiveAgentService.ts`: 发送 `register` 事件 (`type: 'frontend'`)
- [ ] `src/services/LiveAgentService.ts`: 监听 `socket.on('agent_update')`，调用 `useAgentStore` 更新状态
- [ ] `src/services/LiveAgentService.ts`: 监听 `socket.on('agent_offline')`，处理离线状态
- [ ] `src/services/LiveAgentService.ts`: 移除原有的 `setInterval` 轮询逻辑

## 5. 验证测试
- [ ] 启动 Server，无报错
- [ ] 启动 Frontend，控制台显示 Socket 连接成功
- [ ] 启动 Connector，控制台显示 Socket 连接成功
- [ ] 修改 `state.json`，Frontend 立即（毫秒级）响应变化
- [ ] 停止 Connector，Frontend 收到离线通知（可选，取决于是否实现心跳超时）
