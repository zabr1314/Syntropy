# OpenClaw Agent 工具调用问题排查

您反馈“丞相并没有调用史官”，这可能是因为 **工具配置 (Skill Definition)** 与 **工具实现 (Implementation)** 之间存在断层。

在 OpenClaw 中，仅仅在 `agent.yaml` 的 `tools` 列表里声明一个工具是不够的，您还需要告诉 OpenClaw **如何执行** 这个工具。

## 1. 问题分析

在 `start_agents.sh` 中，我们只是简单地把 `call_agent.py` 拷贝到了 `skills` 目录，但可能没有正确生成 OpenClaw 所需的 Skill 配置文件。

通常一个 Skill 需要包含：
1.  `skill.yaml`: 定义 Skill 的元数据和包含的工具。
2.  `tools/`: 包含具体的工具定义。
3.  `implementation/`: 包含执行脚本。

而在我们的 `agent.yaml` 中，我们直接内联定义了 `tools`，但这通常需要配合 **Command Line Tool** 或 **Function Call** 的具体绑定。

## 2. 修正方案

我们需要为 `call_agent` 创建一个完整的 Skill 包，并在 Agent 中正确引用它。

### 2.1 重新组织 Skill 结构
我们将创建一个 `openclaw/skills/delegation` 目录，结构如下：
```
openclaw/skills/delegation/
├── skill.yaml
└── call_agent.py
```

### 2.2 更新 `skill.yaml`
```yaml
name: delegation
version: 1.0.0
description: Delegate tasks to other agents
tools:
  - name: call_agent
    description: Call another agent with an instruction
    parameters:
      type: object
      properties:
        agent_id:
          type: string
          description: The target agent ID
        instruction:
          type: string
          description: The instruction to send
      required: [agent_id, instruction]
    command: python3 ${skill_dir}/call_agent.py
```

### 2.3 更新 `agent.yaml`
在 `agent.yaml` 中，我们不再内联定义 `tools`，而是使用 `skills` 引用。

```yaml
skills:
  - delegation
```

## 3. 立即执行
我将为您重新生成 Skill 结构，并更新 `start_agents.sh` 以正确安装 Skill。
