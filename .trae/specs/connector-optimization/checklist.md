# Connector 升级检查清单

## 1. 服务端 (Relay Server)
- [ ] `server/index.js`: 定义允许的 `JOIN_KEY` (如 `mandate_of_heaven`)
- [ ] `server/index.js`: 在 `register` 事件中校验 `joinKey`
- [ ] `server/index.js`: 校验失败则断开连接 (`socket.disconnect()`)

## 2. 连接器 (Connector)
- [ ] `scripts/openclaw-connector.js`: 引入 `axios` 或 `fetch` 用于 API 探测
- [ ] `scripts/openclaw-connector.js`: 实现 `normalizeState` 函数
- [ ] `scripts/openclaw-connector.js`: 实现多源探测逻辑 (File > API > Default)
- [ ] `scripts/openclaw-connector.js`: 在 `register` 时发送 `joinKey`
- [ ] `scripts/openclaw-connector.js`: 移除旧的文件监听逻辑，改用统一的轮询/监听混合模式 (文件用 watch，API 用 poll)

## 3. 前端 (Frontend)
- [ ] `src/services/LiveAgentService.ts`: 移除本地的状态映射表
- [ ] `src/services/LiveAgentService.ts`: 直接使用后端下发的 `status`
- [ ] `src/services/LiveAgentService.ts`: 简化 `updateAgentState` 方法

## 4. 验证
- [ ] 启动 Server，设置 Key
- [ ] 启动 Connector (带正确 Key)，验证连接成功
- [ ] 启动 Connector (带错误 Key)，验证连接被拒绝
- [ ] 模拟 `state.json` 写入 `busy`，前端应显示 `working` (归一化生效)
