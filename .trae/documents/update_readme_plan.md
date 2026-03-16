# 计划：更新 Syntropy (太和) 项目 README 文档

## 目标

更新 `README.md` 文件，将项目名称正式更改为 **"Syntropy (太和)"**，并重点突出项目的创新技术架构，特别是可视化智能体运行时、混合记忆系统和人机协同安全机制。

## 现状分析

* **项目名称**: 目前文档中为 "Taihe (太和)"，`package.json` 中为 "temp\_app"。

* **文档现状**: 现有的 README 是一个很好的起点，但缺乏关于自定义 RRF 记忆实现和 React-Phaser 桥接模式等“前沿”特性的深度技术描述。

* **代码库特性**:

  * **后端**: Node.js 自研内核，实现了标准化的智能体状态机 (`server/core/Agent.js`) 和基于 RRF 的混合记忆系统 (`server/runtime/MemoryManager.js`)。

  * **前端**: React + Phaser 3 架构，通过 Zustand 实现单向数据流同步 (`src/game/MainScene.ts`)。

  * **安全机制**: 基于风险等级的工具执行拦截机制 (`WAITING_FOR_HUMAN`)。

## 拟定变更

### 1. 项目重命名

* 将 `README.md` 中的标题和所有引用更新为 **"Syntropy (太和)"**。

### 2. 重写 README.md

我将重构文档结构，使其更具技术深度和吸引力，主要包含以下部分：

#### **A. 项目简介 (Introduction)**

* 将 Syntropy 定义为一个基于“古代朝廷”隐喻的 **“可视化多智能体操作系统 (Visualized Multi-Agent Operating System)”**。

* 强调其核心价值：将复杂的 AI 思考过程具象化、可观测化、可干预化。

#### **B. 核心创新 (Core Innovations - The "Cutting Edge")**

1. **可视化智能体运行时 (Visualized Agent Runtime)**

   * **技术亮点**: 详解 **React-Phaser Bridge** 模式。解释如何利用 Zustand 作为单一数据源 (Single Source of Truth)，实现高性能游戏渲染 (Phaser) 与响应式 UI (React) 的毫秒级同步。

   * **效果**: 实现“所见即所思 (What you see is what they think)”，通过 2D 像素小人的行为实时映射 Agent 的内部状态 (`THINKING`, `ACTING`, `ERROR`)。

2. **基于 RRF 的混合记忆引擎 (Hybrid Memory Engine with RRF)**

   * **技术亮点**: 详细介绍 **SQLite + FTS5 (全文检索) + Vector (向量检索)** 的三位一体架构。

   * **算法优势**: 重点介绍引入了 **Reciprocal Rank Fusion (RRF, 倒数排名融合)** 算法，解决了单一向量检索丢失关键词上下文的痛点，实现了工业级的长短期记忆召回。

3. **内核级状态机 (Kernel-Level State Machine)**

   * **技术亮点**: 描述标准化的 Agent 生命周期 (`Idle` -> `Thinking` -> `Acting` -> `Waiting`)。

   * **架构优势**: 解释 **Kernel** 模式如何将 LLM 推理逻辑与运行时执行解耦，确保了系统的稳定性和可扩展性。

4. **人机协同“御批”协议 (Human-in-the-loop Protocol)**

   * **技术亮点**: 解释基于风险分级的工具拦截机制。高风险操作（如资金转账、删除文件）会自动触发 `WAITING_FOR_HUMAN` 中断。

   * **隐喻设计**: 描述“天牢”与“御批”机制如何将枯燥的权限管理转化为沉浸式的游戏化体验。

#### **C. 架构概览 (Architecture Overview)**

* 提供清晰的全栈技术图谱：

  * **Frontend**: React 18, Phaser 3, Zustand, TailwindCSS.

  * **Backend**: Node.js (Express), Socket.io, Better-SQLite3 (with Vector extension).

  * **AI**: DeepSeek / OpenAI API, Local Embedding.

#### **D. 快速开始 (Quick Start)**

* 保留并优化现有的安装和启动说明，确保端口信息准确 (Backend: 3001, Frontend: 5173)。

## 验证计划

* 编写完成后，我将读取文件以确保 Markdown 格式正确。

* 检查所有图片链接和文档引用是否有效。

