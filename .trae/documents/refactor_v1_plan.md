# 天命系统：架构演进与重构计划 (Phase 1 & 2)

## 1. 目标
基于《天命系统架构设计文档 v1.0》，我们将分阶段实施架构重构，从当前的 MVP 状态升级为可维护、可扩展的“微内核 + 角色插件”架构。

## 2. 详细步骤

### Phase 1: 核心层重构 (Kernel Refactoring)
**目标**: 建立稳定的微内核，解耦 Socket 通信与业务逻辑。

1.  **创建基础类库**:
    -   `server/runtime/Kernel.js`: 系统的核心控制器，负责初始化 Runtime、连接数据库、加载插件。
    -   `server/runtime/EventBus.js`: 基于 Node.js `EventEmitter` 的事件总线，处理系统级事件（如 `AUDIENCE_START`, `MEMORIAL_SUBMIT`）。
    -   `server/runtime/LLM.js`: 封装 OpenAI SDK，提供统一的 `chat` 接口，支持错误重试和日志记录。

2.  **实现上下文管理**:
    -   `server/runtime/ContextManager.js`: 管理会话历史 (Memory)，支持简单的内存存储（MVP 阶段）。

3.  **重构入口文件**:
    -   修改 `server/index.js`，使其仅作为启动脚本，实例化 `Kernel` 并启动服务。

### Phase 2: 角色插件化 (Role Pluginization)
**目标**: 将官员逻辑从硬编码转变为插件化，支持动态加载和扩展。

1.  **定义角色基类**:
    -   `server/runtime/roles/BaseRole.js`: 定义所有官员的通用接口（如 `onWake`, `chat`, `tools`）。
    -   实现基础的 `chat` 方法，自动调用 LLM 并处理工具调用。

2.  **迁移现有角色**:
    -   将 `Minister.js` 重构为继承自 `BaseRole`，剥离出其特有的 System Prompt 和 `call_official` 工具。
    -   将 `Historian.js` 和 `Revenue.js` 迁移为标准插件。

3.  **实现动态加载**:
    -   在 `Kernel` 中实现 `loadRoles()` 方法，扫描 `server/runtime/roles/` 目录并自动注册所有继承自 `BaseRole` 的类。

### Phase 3: 工具与配置 (Tools & Config)
**目标**: 进一步解耦配置与代码。

1.  **配置文件**:
    -   创建 `server/config/officials.json`，存储官员的元数据（ID, Name, Description）。
    -   创建 `server/config/system.json`，存储系统级配置（LLM Model, Port）。

2.  **工具注册表**:
    -   创建 `server/runtime/tools/ToolRegistry.js`，管理所有可用工具。
    -   将 `call_official` 注册为系统级工具，供丞相使用。

## 3. 验证标准
1.  **功能一致性**: 重构后的系统应能完全复现 MVP 的功能（丞相传唤官员）。
2.  **代码结构**: `server/index.js` 应少于 50 行；所有业务逻辑应位于 `server/runtime/roles/` 中。
3.  **可扩展性**: 添加一个新的“兵部尚书”角色只需添加一个文件，无需修改核心代码。

## 4. 下一步行动
请确认此计划，我将开始执行 Phase 1。
