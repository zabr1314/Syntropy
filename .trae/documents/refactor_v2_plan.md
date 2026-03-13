<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-09 14:51:33
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-09 16:30:55
 * @FilePath: /天命系统/.trae/documents/refactor_v2_plan.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 代码优化与重构建议

经过对项目核心代码 (`LiveAgentService` 及其子模块、`MainScene.ts`、`Agent.ts` 等) 的审查，我发现以下几个可以进一步优化的点：

## 1. 消除 Magic Strings 和硬编码
**问题**: 
- `ID_MAPPING`、`LOCATIONS` 等配置分散在多个文件中。
- 状态字符串 (`working`, `idle`, `offline`) 散落在各处，容易拼写错误。
- 纹理名称 (`revenue_char`, `minister_char`) 硬编码在 `MainScene` 和 `AgentController` 中。

**改进**:
- 创建统一的 `Constants` 或 `Types` 模块。
- 使用 `Enum` 管理 Agent 状态。
- 将纹理映射逻辑集中管理。

## 2. `AgentController` 逻辑解耦
**问题**: 
- `AgentController` 目前既负责**状态更新**，又负责**初始化创建**，还负责**移动逻辑计算**。
- `initAgent` 方法中包含了具体的纹理选择逻辑 (`if (id === 'minister') ...`)，这属于配置而非逻辑。

**改进**:
- 将**纹理选择逻辑**提取为独立的配置表。
- 将**移动策略** (Movement Strategy) 提取出来，比如区分 `PatrolBehavior` (巡逻) 和 `WorkBehavior` (工作)。

## 3. `MessageProcessor` 的状态管理
**问题**:
- 目前使用 `agentMessageBuffers` 存储消息缓冲，但没有清理机制（除了状态变为非 working）。如果 Agent 异常断开，buffer 可能会残留。
- 截断逻辑 (`> 50` 字) 是硬编码的。

**改进**:
- 增加超时清理机制。
- 将截断长度作为配置参数传入。

## 4. `Agent.ts` 与 `MainScene.ts` 的交互
**问题**:
- `MainScene` 直接操作 `agent.say()`。
- `Agent` 类中包含了一些具体的业务逻辑（如根据 texture key 判断缩放比例），这违反了单一职责原则。

**改进**:
- `Agent` 类应该只负责渲染和动画，具体的属性（缩放、气泡偏移）应该在初始化时通过配置对象传入，而不是在类内部 `if-else` 判断。

## 5. 立即执行的重构计划 (本次聚焦)
鉴于时间，我们优先解决最影响可维护性的问题：**统一配置管理** 和 **Agent 初始化逻辑优化**。

1.  **统一常量**: 创建 `src/constants/agentConfig.ts`，集中管理 Agent ID、纹理映射、缩放比例等。
2.  **优化 `AgentController`**: 使用配置表替代硬编码的 `if-else`。
3.  **优化 `Agent.ts`**: 移除内部的纹理判断逻辑，改为构造函数接收 `AgentConfig`。
