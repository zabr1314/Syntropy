# 子 Agent 管理机制深度思考

## 1. 当前架构痛点分析

### 1.1 静态配置 vs 动态需求
*   **现状**: 我们的子 Agent（史官、户部等）是通过 `start_agents.sh` 脚本**硬编码**创建的。丞相的 Prompt 里也是**写死**了下属清单。
*   **痛点**: 
    *   **增加角色麻烦**: 如果皇帝想新设一个“锦衣卫”，我们需要：
        1.  在 `agentConfig.ts` 加配置。
        2.  创建 `agents/jinyiwei.yml`。
        3.  修改 `start_agents.sh` 添加启动命令。
        4.  修改丞相的 Prompt，告诉他有了新下属。
        5.  重启 Gateway。
    *   **无法动态扩缩**: 比如遇到“工程部任务繁重”的情况，丞相无法临时招募两个“工部侍郎”来帮忙。

### 1.2 资源浪费
*   **现状**: 所有配置的 Agent (史官、六部) 都是**常驻进程**（虽然 OpenClaw 可能有休眠机制，但在逻辑上它们一直存在）。
*   **痛点**: 如果今天皇帝只问历史，其他五个尚书就一直占着坑位（和系统资源）。

### 1.3 上下文隔离
*   **现状**: 目前丞相调用子 Agent 是通过 `sessions_spawn`，每次都是新开一个任务 (`mode: "run"`)。
*   **痛点**: 
    *   **缺乏连续性**: 丞相刚让史官查了数据，下一句问“那这个数据说明了什么”，史官可能已经退出了，新的史官没有上下文。
    *   **解决方案**: 需要利用 OpenClaw 的 `mode: "session"` 和 `thread` 机制。

## 2. 动态管理方案设计 (Dynamic Sub-Agent Management)

我们需要从“静态编制”转向“动态雇佣”。

### 2.1 注册中心 (Registry) 模式
我们不再手动启动所有 Agent，而是维护一个 **Agent Profiles (档案库)**。

*   **Profiles**: 定义了角色的能力（System Prompt）、模型配置、可用工具。
*   **Registry**: 一个 JSON/YAML 文件或数据库，存储所有可用 Profile。

### 2.2 按需实例化 (Spawn on Demand)
丞相不需要知道“史官进程是否在运行”，他只需要知道“史官这个职位存在”。

*   **当丞相需要史官时**:
    1.  调用 `sessions_spawn(agentId="historian", ...)`。
    2.  OpenClaw 检查是否有空闲的 historian 实例，如果没有则从 Profile 创建一个。
    3.  任务完成后，实例可以销毁（节约资源）或保留一段时间（保持上下文）。

### 2.3 自动发现 (Auto-Discovery)
丞相的 System Prompt 不应该写死下属名单，而是应该**动态注入**或**通过工具查询**。

*   **方案 A (动态 Prompt)**: 在丞相启动时，读取 `agentConfig.ts`，自动生成 System Prompt 中的“下属清单”。
*   **方案 B (工具查询)**: 给丞相一个 `list_available_roles` 工具。
    *   丞相：“我想查数据，但我不知道该找谁。”
    *   工具：“你可以找 historian, official_revenue...”。

## 3. 具体实施计划

### 第一阶段：配置中心化 (已部分完成)
我们已经在 `agentConfig.ts` 里有了前端配置。现在需要把 **后端配置** 也统一起来。

### 第二阶段：动态启动脚本
修改 `start_agents.sh`，使其不再是硬编码的列表，而是遍历 `agentConfig.ts` (或者一个共享的 `roles.json`) 来生成 OpenClaw Agent。

### 第三阶段：丞相的动态感知
修改丞相的 Prompt 生成逻辑，使其能感知到当前系统中注册了哪些角色。

## 4. 如何增加/减少 Agent (用户操作指南)

基于上述设计，未来增加一个子 Agent 的流程将简化为：

1.  **在 `src/constants/roles.json` (新建) 中添加一行配置**:
    ```json
    {
      "id": "jinyiwei",
      "name": "锦衣卫",
      "prompt": "负责情报刺探...",
      "tools": ["search", "spy"]
    }
    ```
2.  **运行 `npm run sync-agents`**:
    *   自动生成 `openclaw/workspaces/jinyiwei/agent.yaml`。
    *   自动注册到 OpenClaw。
    *   自动更新丞相的 System Prompt。

这样，您就拥有了一个**可扩展的官僚体系**。
