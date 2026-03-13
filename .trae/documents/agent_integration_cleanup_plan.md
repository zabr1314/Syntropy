<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-12 22:14:22
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-12 22:18:39
 * @FilePath: /天命系统/.trae/documents/agent_integration_cleanup_plan.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 天命系统 Agent 模块重构与增强计划 - Phase 4 (Cleanup & Integration)

## 1. 现状分析 (Phase 1: Explore)
- **目标**: 确认新架构是否已完全集成到项目中，并识别残留的旧代码。
- **发现**:
  - `server/index.js` 已经全面使用 `server/core/Agent.js` (新架构)。
  - `server/config/officials.json` 配置已与新 `Agent` 类对齐。
  - `agents/` 目录下的 `BaseRole.js`, `Minister.js`, `Historian.js` 等是基于旧架构的代码，目前不再被主程序引用。
  - `EmbeddingService` 和 `MemoryManager` 已在 `Agent` 类内部正确实例化。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "你这些实现有没有跟我本身的项目相结合"。
- **分析结果**:
  - 用户关心的是新写的代码（`Agent`, `ContextManager`, `MemoryManager`）是否真的被项目使用了，还是只是摆设。
  - 实际上，新代码已经通过 `server/index.js` 集成到了主流程中。
  - 但是，项目中仍然存在大量的旧代码 (`agents/` 目录)，这可能会造成混淆。
- **结论**:
  - 需要明确告知用户集成情况（已集成）。
  - 建议清理旧代码，或者将其迁移到新架构的配置中（如果还有残留逻辑）。
  - 需要验证新架构是否能正常启动和运行。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 验证与演示 (Verification)
- 创建一个集成测试脚本 `test_integration.js`，模拟 `server/index.js` 的行为，加载一个真实的 Agent (如 `minister`) 并执行对话。
- 验证 `ContextManager` 和 `MemoryManager` 是否在日志中正常工作。

### 3.2 清理旧代码 (Cleanup)
- 确认 `agents/` 目录下的逻辑（如 `Minister.js` 中的 `call_official` 工具处理）是否已完全迁移到 `skills/` 和 `officials.json` 中。
- 如果已迁移，建议将 `agents/` 目录重命名为 `agents_legacy/` 或直接删除，以避免混淆。
- *注意*: `skills/call_official.js` 已经存在，涵盖了 `Minister.js` 的主要功能。

### 3.3 文档更新
- 更新 `docs/AGENT_DEV_PROGRESS.md`，添加关于“集成状态”的说明。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  创建 `test_integration.js` 并运行，向用户证明新架构已工作。
  2.  重命名 `agents/` 为 `agents_legacy/`。
  3.  更新文档。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 集成测试报告和清理后的项目结构。
