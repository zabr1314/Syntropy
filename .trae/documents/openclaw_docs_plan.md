# OpenClaw 核心机制文档编写计划

根据您的要求，我将深入阅读 OpenClaw 源码，编写四份详细的核心技术文档，并将它们归档于项目根目录下的 `openclaw_core_docs/` 文件夹中，以便团队成员快速掌握系统核心。

## 1. 准备工作
- [ ] 创建文档目录: `openclaw_core_docs/`

## 2. 文档编写任务

### 2.1 第一部分：Gateway 通信协议
**目标**: 阐明后端与 Gateway 的连接机制，这是天命系统的通信基石。
- **源码研读**:
    - `server/lib/openclaw/adapter.js` (客户端适配器实现)
    - `openclaw/src/gateway/server.impl.ts` (服务端 WebSocket 处理)
    - `openclaw/src/gateway/call.ts` (RPC 调用逻辑)
    - `openclaw/src/gateway/events.ts` (系统事件定义)
- **输出文档**: `openclaw_core_docs/1_Gateway通信协议详解.md`
- **核心内容**:
    - WebSocket 握手与 Token 鉴权流程。
    - 消息帧结构 (`req`, `res`, `event`) 解析。
    - 关键事件 (`lifecycle.spawn` 等) 的触发与负载格式。

### 2.2 第二部分：子代理系统 (Sub-agent System)
**目标**: 解析“丞相调度百官”的底层实现，这是业务逻辑的核心。
- **源码研读**:
    - `openclaw/src/agents/subagent-spawn.ts` (子代理生成核心逻辑)
    - `openclaw/src/agents/subagent-registry.ts` (子代理状态注册表)
    - `openclaw/src/agents/tools/sessions-spawn-tool.ts` (LLM 工具接口)
    - `openclaw/src/agents/subagent-announce.ts` (结果回传机制)
- **输出文档**: `openclaw_core_docs/2_子代理系统深度解析.md`
- **核心内容**:
    - `sessions_spawn` 工具的完整执行链路。
    - 父子 Session 的关联与上下文隔离/继承。
    - 自动宣告 (Auto-announce) 机制：子代理如何不经轮询直接汇报结果。

### 2.3 第三部分：Agent 配置与工具
**目标**: 指导如何新增和配置“官员”角色。
- **源码研读**:
    - `openclaw/src/config/config.ts` (配置加载与解析)
    - `openclaw/agents/minister.yml` (丞相配置实例)
    - `openclaw/src/agents/context.ts` (Prompt 构建逻辑)
- **输出文档**: `openclaw_core_docs/3_Agent配置与工具指南.md`
- **核心内容**:
    - `yaml` 配置文件全字段解析。
    - System Prompt 的动态注入机制。
    - 工具 (Tools) 的挂载与权限控制策略。

### 2.4 第四部分：会话管理 (Session Management)
**目标**: 解释系统记忆与状态的存储原理。
- **源码研读**:
    - `openclaw/src/config/sessions.ts` (会话存储实现)
    - `openclaw/src/routing/session-key.ts` (Session Key 解析)
- **输出文档**: `openclaw_core_docs/4_会话管理机制说明.md`
- **核心内容**:
    - Session Key 的结构 (`agent:<id>:subagent:<uuid>`) 及其路由意义。
    - 会话转录 (Transcript) 的 JSONL 持久化格式。
    - 会话的生命周期管理 (创建、活跃、归档)。

## 3. 交付标准
- 所有文档均为中文。
- 包含源码引用链接。
- 包含关键数据结构示例 (JSON/YAML)。
- 存放在 `openclaw_core_docs/` 文件夹下。
