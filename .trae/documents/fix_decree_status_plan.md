# 奏折状态逻辑修复计划

## 1. 问题分析
用户反馈“奏折阁所有的任务都是执行中”，且存在逻辑问题。
经检查代码发现：
1.  **自动状态更新逻辑过于激进** (`LiveAgentService.ts`):
    ```typescript
    if (status === 'working') {
        // ...
        if (decree && decree.status !== 'executing') {
             updateDecreeStatus(activeId, 'executing');
        }
    }
    ```
    只要 Agent 处于 `working` 状态（包括打字回复），就会把关联的奏折强制设为 `executing`。

2.  **缺乏完结逻辑**:
    目前的逻辑里，**没有**任何地方将奏折状态从 `executing` 更新为 `completed`。Agent 回复完了变回 `idle`，但奏折状态依然停留在 `executing`。

## 2. 修复方案

### 2.1 优化状态流转 (`LiveAgentService.ts`)
- **完结检测**: 当 Agent 从 `working` 变为 `idle` 时，检查是否刚刚完成了一次回复。
- **自动完结**: 如果是，可以将关联的奏折标记为 `completed`（或者 `reviewing`，视业务逻辑而定）。考虑到这是一个聊天式的交互，每次对话结束通常意味着当前指令处理完毕。

### 2.2 优化奏折创建状态 (`useCourtStore.ts`)
- 初始状态为 `drafting`。
- 发送时（`DecreePipeline`）应立即更新为 `planning` 或 `executing`。

### 2.3 具体逻辑调整
在 `LiveAgentService.ts` 的 `updateAgentState` 方法中：

```typescript
// 记录上一次的状态，以便检测 status 变化
// (需要增加成员变量 lastAgentStatus: Record<string, string>)

// ...

if (status === 'working') {
    // 保持现有的 "变为 executing" 逻辑
} else if (status === 'idle') {
    // 如果之前是 working，说明工作/回复结束
    if (this.lastAgentStatus[frontendId] === 'working') {
         // 找到对应的 executing 奏折，将其设为 completed
         // 并清除 activeDecreeId，准备接受下一条
    }
}
```

## 3. 实施步骤

1.  **修改 `LiveAgentService.ts`**:
    - 增加 `lastAgentStatus` 字典来跟踪状态变化。
    - 在 `updateAgentState` 中处理 `working -> idle` 的跳变。
    - 当检测到任务结束时，调用 `useCourtStore` 的 `updateDecreeStatus(id, 'completed')` 和 `setActiveDecree(null)`。

2.  **可选**: 在 `useCourtStore` 中增加 `completeDecree(id)` 辅助方法。

## 4. 立即执行
修改 `LiveAgentService.ts`，添加自动完结逻辑。
