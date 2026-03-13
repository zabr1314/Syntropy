<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-09 12:42:06
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-09 13:23:34
 * @FilePath: /天命系统/.trae/documents/openclaw_debug_plan.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

# OpenClaw 连接问题排查计划

## 1. 目标

完成前端 (React + Phaser) 与 WebSocket 后端服务的联调，实现 Agent 状态的实时同步与指令下发。

**当前状态**: ✅ 已完成全链路联调，OpenClaw 真实连接正常。

## 2. 前端代码审查与准备

* [x] **WebSocket 服务检查 (`src/services/LiveAgentService.ts`)**:

  * [x] 确认 socket.io-client 初始化配置（URL、Transports）。

  * [x] 检查 `agent_update` 事件监听逻辑，确保正确解析并调用 Store 更新 Action。

  * [x] 检查 `agent_offline` 事件处理。

* [x] **状态管理确认 (`src/store/useAgentStore.ts`)**:

  * [x] 确认 Store 是否有 `updateAgentStatus` 或类似 Action，且参数与 WebSocket 消息 payload 兼容。

* [x] **服务初始化 (`src/App.tsx`** **/** **`src/main.tsx`)**:

  * [x] 确认 `LiveAgentService` 是否在应用启动时被正确初始化（单例模式）。

## 3. 联调测试步骤

### 3.1 模拟数据验证 (Mock Test)

* [x] **启动后端**: 运行 `node server/index.js`。

* [x] **启动前端**: 运行 `npm run dev`。

* [x] **手动注入状态**: 使用测试脚本模拟 Connector 发送 `report` 事件，验证前端是否能接收并更新 UI。

* [x] **观察前端**: 确认 UI 是否更新 Agent 状态（如移动、气泡）。

### 3.2 真实数据联调 (Integration Test)

* [x] **OpenClaw Gateway 连接**: 中转服务已成功连接本地 OpenClaw Gateway。

* [x] **Agent ID 适配**: 已将 OpenClaw 默认 ID `main` 映射为 `minister` (丞相)。

* [x] **验证全链路**: 确认 `OpenClaw -> Connector -> Server -> Frontend` 数据流通畅。

### 3.3 指令下发测试

* [x] **指令转发**: 后端已启用指令转发功能，前端指令可直达 OpenClaw。

## 4. 问题修复

* [x] **LiveAgentService 初始化**: 修复了 React 严格模式下的连接问题。

* [x] **连接状态可视化**: 添加了 `LIVE UPLINK` 指示器。

* [x] **Agent 离线误判**: 修复了模拟脚本和真实连接中的心跳/保持连接问题。

