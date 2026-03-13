<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-09 11:53:22
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-09 11:55:00
 * @FilePath: /天命系统/.trae/specs/connector-optimization/spec.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# Connector 健壮性与归一化升级 (Robustness & Normalization)

## 1. 目标
借鉴竞品 (OpenClaw Doc) 的最佳实践，对现有的 `scripts/openclaw-connector.js` 进行重构，提升连接器的健壮性和标准化能力。
1.  **多源探测 (Multi-Source Detection)**: 同时支持文件监听 (`state.json`) 和 HTTP 接口轮询。
2.  **客户端归一化 (Client-Side Normalization)**: 将杂乱的状态映射逻辑从前端移至连接器内部。
3.  **鉴权机制 (Join Key Auth)**: 增加简单的连接密钥验证。

## 2. 架构变更

### 2.1 Connector (`scripts/openclaw-connector.js`)
*   **新增配置**:
    *   `OPENCLAW_API_URL`: 可选，OpenClaw 本地接口地址（如 `http://localhost:18791/status`）。
    *   `JOIN_KEY`: 必选，连接密钥（如 `ocj_secret_key`）。
*   **新增逻辑**:
    *   **探测循环**: 优先读文件 -> 失败则调 API -> 失败则默认 `idle`。
    *   **归一化函数**: `normalizeState(rawState)`，输出标准状态 (`working`, `idle`, `error`, `moving`, `offline`)。
    *   **鉴权**: 在 `socket.emit('register')` 时携带 `joinKey`。

### 2.2 Relay Server (`server/index.js`)
*   **新增鉴权**: 在 `socket.on('register')` 中校验 `joinKey`。
*   **配置**: 简单的硬编码 Key 列表或环境变量 `ALLOWED_KEYS`。

### 2.3 Frontend (`src/services/LiveAgentService.ts`)
*   **移除逻辑**: 删除复杂的 `ID_MAPPING` 和状态映射代码，直接使用服务端传来的标准状态。
*   **简化**: 前端只负责渲染，不再负责“翻译”状态。

## 3. 状态归一化标准 (Normalization Standard)

| 原始输入 (Raw State) | 标准输出 (Normalized Status) | 含义 |
| :--- | :--- | :--- |
| `writing`, `busy`, `exec`, `run` | `working` | 正在工作 |
| `research`, `search` | `working` | 正在调研 |
| `sync`, `backup` | `working` | 正在同步 |
| `error`, `bug`, `alert`, `fail` | `error` | 发生错误 |
| `idle`, `wait`, `done`, `sleep` | `idle` | 空闲/待命 |
| `think`, `plan` | `moving` | 思考中 (移动) |
| (网络断开/超时) | `offline` | 离线 |

## 4. 实施步骤
1.  **Server**: 增加 `JOIN_KEY` 校验逻辑。
2.  **Connector**: 重构为多源探测 + 归一化逻辑。
3.  **Frontend**: 简化状态处理逻辑。
