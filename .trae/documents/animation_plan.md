# 动画与站位优化计划

## 目标
1. 移除无关的 NPC (Staff 1-3)，聚焦核心角色 (Minister, Engineer)。
2. 优化 Agent 的站位布局，使其更符合“太和殿”、“军机处”等场景设定。
3. 增强 Agent 的动画表现力 (弹性缩放、更自然的移动)。
4. 调整 Mock 剧本中的坐标，确保演示流畅。

## 步骤 1: 清理无关人员与调整初始站位
- **文件**: `src/store/useAgentStore.ts`
  - [ ] 在 `addAgent` 初始化逻辑中，移除 `staff_1`, `staff_2`, `staff_3`。
  - [ ] 调整 `minister` 初始位置到 **太和殿** (右上区域, e.g., x: 600, y: 200)。
  - [ ] 调整 `engineer` 初始位置到 **军机处** (左下区域, e.g., x: 200, y: 500)。

- **文件**: `src/game/MainScene.ts`
  - [ ] 同步移除 `staff` 相关的初始化代码。
  - [ ] 确保 `createDesk` 在正确的位置生成办公桌 (太和殿、军机处)。

## 步骤 2: 增强动画表现 (Juice it up!)
- **文件**: `src/game/Agent.ts`
  - [ ] 优化 `playWorkAnimation`:
    - 添加 `scaleY` (0.9 -> 1.1) 和 `scaleX` (1.1 -> 0.9) 的 Tween，模拟呼吸/弹性效果。
    - 配合 Y 轴跳动，使其看起来更生动。
  - [ ] 优化 `moveTo`:
    - 在开始移动时，添加一个轻微的“启动”缩放效果。
    - 移动过程中保持 `walk` 动画。

## 步骤 3: 调整 Mock 剧本坐标
- **文件**: `src/services/scenarios/SecurityBreach.ts`
  - [ ] 更新 Minister 的路径：
    1. 从太和殿出发 -> 去藏书阁 (150, 150) 查阅。
    2. 从藏书阁 -> 回太和殿门口 (550, 250) 分派任务。
  - [ ] 更新 Engineer 的路径：
    1. 从军机处出发 -> 去午门办公区 (600, 450) 干活。

## 步骤 4: 验证
- [ ] 运行 `npm run dev`。
- [ ] 观察初始画面，确认只有 Minister 和 Engineer。
- [ ] 触发“安全审计”剧本，检查移动路径是否合理，动画是否流畅。
