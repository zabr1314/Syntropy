# OpenClaw 架构重构：确立丞相为主 Agent

## 1. 核心理念
您希望确立**丞相 (Minister)** 的绝对核心地位。在 OpenClaw 的架构中，这意味着：
1.  **Minister 必须是默认的 `main` Agent**。当用户连接 Gateway 时，默认对话的对象就是丞相。
2.  **其他 Agent (史官、六部) 是 Worker Agent**。它们通常不直接面对用户，而是等待丞相的召唤 (Spawn)。

## 2. 实施方案

### 2.1 Agent ID 调整
*   **当前**: 我们分别注册了 `minister` 和 `historian`。
*   **改进**: 
    *   保留 `historian` 作为独立的 Profile。
    *   但对于丞相，我们应该将其配置应用到 OpenClaw 的 **默认 Agent (通常 ID 为 `main`)** 上，或者确保 `minister` 是系统的入口点。
    *   为了简化前端逻辑，我们保持 `minister` 这个 ID，但在 OpenClaw 启动时，指定 `minister` 为默认会话的主角。

### 2.2 启动逻辑优化
在 `start_agents.sh` 中，我们需要明确这种主从关系。虽然 OpenClaw 的 Agent 是平级的，但通过 Prompt 和工具配置，我们人为构建了层级。

### 2.3 配置优化
确保只有丞相拥有 `sessions_spawn` 权限（或者说 Prompt 里只有他被教导去使用），而史官等下属只能被动接受任务。

## 3. 具体步骤
1.  **修改 `start_agents.sh`**:
    *   确保丞相的 Prompt 足够权威。
    *   确保史官的 Prompt 足够专注（只干活，不闲聊）。
2.  **验证前端连接**:
    *   前端默认连接 `minister`，这已经符合“主 Agent”的设定。

## 4. 立即行动
我将微调 `start_agents.sh` 中的配置，强化这种主从关系。
