# OpenClaw Agent 配置与工具指南

OpenClaw 采用灵活的 YAML/JSON 配置系统来定义 Agent 的行为、能力和模型参数。本文档详细说明 Agent 的配置结构及工具定义方式。

## 1. 配置文件结构

Agent 的配置通常位于 `agents/` 目录下，每个文件对应一个 Agent 定义（如 `minister.yml`）。

### 1.1 基础字段

```yaml
# Agent 的显示名称
name: Minister
# 简短描述，用于 Agent 列表展示
description: 天命系统的丞相，统筹全局。
# 唯一标识符 (通常由文件名决定，但在配置中也可以引用)
id: minister
```

### 1.2 模型配置 (`model`)

指定该 Agent 使用的底层 LLM 模型。

```yaml
model:
  provider: openai        # 模型提供商 (openai, anthropic, google, etc.)
  name: gpt-4o            # 具体模型名称
  temperature: 0.7        # 随机性 (0-1)
  max_tokens: 4000        # 最大输出长度
```

### 1.3 System Prompt (`system_prompt`)

这是 Agent 的核心灵魂，定义了它的角色、职责和行为准则。

```yaml
system_prompt: |
  您是“天命系统”的丞相。
  您的职责是接收皇帝指令，调度六部官员。
  
  **原则**:
  - 保持古风语气 ("微臣遵旨")。
  - 不要编造数据，必须调用下属官员查询。
```

## 2. 工具定义 (`tools`)

OpenClaw 支持为 Agent 挂载自定义工具 (Function Calling)。工具定义遵循标准的 JSON Schema 格式。

### 2.1 结构示例

```yaml
tools:
  - name: call_agent
    description: 呼叫下属官员执行任务。
    parameters:
      type: object
      properties:
        agent_id:
          type: string
          description: 目标官员 ID
          enum: [historian, official_revenue]
        instruction:
          type: string
          description: 具体指令
      required: [agent_id, instruction]
```

### 2.2 内置工具
除了自定义工具外，OpenClaw 还提供了一系列内置工具（通常由系统自动注入，受 `allowlist` 控制）：
- `sessions_spawn`: 创建子 Agent。
- `subagents`: 管理子 Agent 状态。
- `web_search`: 联网搜索。
- `read_file` / `write_file`: 文件系统操作 (受沙箱限制)。

## 3. 子代理配置 (`subagents`)

控制 Agent 创建子代理的权限和默认行为。

```yaml
subagents:
  # 允许调用的 Agent ID 列表。使用 "*" 代表允许所有。
  allowAgents: 
    - historian
    - official_revenue
  
  # 子 Agent 默认使用的模型配置 (如果 spawn 时未指定)
  model:
    provider: openai
    name: gpt-3.5-turbo
```

## 4. 全局模型配置 (`models.json`)

除了在每个 Agent 中指定模型外，OpenClaw 还支持全局模型配置文件 `models.json`，用于定义 Provider 的凭证和可用模型列表。

```json
{
  "providers": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "models": [
        { "id": "gpt-4o", "name": "GPT-4o", "contextWindow": 128000 }
      ]
    }
  }
}
```

## 5. 最佳实践

1.  **角色分离**: 将不同的职责拆分为不同的 Agent (如 `minister`, `historian`)，通过 `subagents` 机制协作，而不是写一个巨型 Prompt。
2.  **Schema 严谨**: 工具的参数描述 (`description`) 越详细，模型调用的准确率越高。
3.  **温度控制**: 对于逻辑严密任务 (如查询数据库)，使用低温度 (0-0.2)；对于创意任务 (如写诗)，使用高温度 (0.7-1.0)。
