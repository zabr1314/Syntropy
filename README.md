# Syntropy (太和)

![Syntropy Preview](docs/assets/preview.png)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
  <img src="https://img.shields.io/badge/Status-Beta-blue.svg" alt="Status" />
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/Engine-Phaser%203-aa241f.svg" alt="Phaser 3" />
</p>

> **"当小人被关进天牢的那一刻，就是投资人决定掏钱的那一刻。"**

**Syntropy (太和)** 是一套基于 **"古代朝廷"** 视觉隐喻的 **可视化多智能体操作系统 (Visualized Multi-Agent Operating System)**。

它不仅仅是一个多 Agent 协作框架，更是一次将 **AI 黑盒具象化** 的尝试。通过将复杂的 Agent 思考链 (Chain-of-Thought)、任务流转和记忆回溯投射到一座 2D 像素风的“数字宫殿”中，Syntropy 让智能体的治理变得 **可观测 (Observable)、可交互 (Interactive)、可干预 (Intervenable)**。

---

## ✨ 核心创新 (Core Innovations)

### 1. 可视化智能体运行时 (Visualized Agent Runtime)
**"所见即所思 (What you see is what they think)"**

Syntropy 摒弃了枯燥的日志后台，通过 **React-Phaser Bridge** 模式构建了一个实时响应的数字沙盘。

*   **技术实现**: 采用 **Zustand** 作为单一事实来源 (Single Source of Truth)，实现 React 响应式 UI 与 Phaser 高性能游戏渲染引擎的毫秒级状态同步。
*   **状态映射**: Agent 的内部状态机 (`THINKING`, `ACTING`, `WAITING`, `ERROR`) 会实时映射为 2D 像素小人的行为动画（如来回踱步思考、伏案工作、头顶气泡交互）。

### 2. 基于 RRF 的混合记忆引擎 (Hybrid Memory Engine with RRF)
为了解决传统 RAG (检索增强生成) 在长上下文中的遗忘问题，我们实现了一套工业级的混合检索架构。

*   **三位一体存储**: 结合了 **SQLite** (结构化元数据)、**FTS5** (全文倒排索引) 和 **Vector** (语义向量) 的优势。
*   **倒数排名融合 (RRF)**: 引入 **Reciprocal Rank Fusion** 算法，将关键词匹配 (FTS) 和语义相似度 (Vector) 的结果进行加权重排。这使得 Agent 既能精准定位专有名词（如“昨天的税收”），又能理解模糊的语义指令。

### 3. 内核级状态机 (Kernel-Level State Machine)
我们将 Agent 的生命周期标准化为内核级的状态流转，确保了系统行为的确定性。

*   **解耦架构**: 采用类似操作系统的 **Kernel** 模式，将 LLM 的推理逻辑 (Reasoning) 与底层的工具执行 (Execution) 和 I/O 分离。
*   **标准生命周期**: `Idle` (空闲) -> `Thinking` (推理中) -> `Acting` (执行工具) -> `Waiting` (等待审批) -> `Sleeping` (休眠)。

### 4. 人机协同“御批”协议 (Human-in-the-loop Protocol)
针对 Agent 自主行动带来的安全风险，我们设计了沉浸式的 **"天牢" (Jail)** 与 **"御批" (Imperial Decree)** 机制。

*   **风险分级拦截**: 系统内核会对所有工具调用进行风险评估。一旦 Agent 试图执行高风险操作（如删除文件、大额转账），其状态会立即被挂起 (`WAITING_FOR_HUMAN`)，并被投入“天牢”。
*   **人机协同**: 管理者（皇帝）需通过“御批”弹窗审查 Agent 的操作意图。批准后，Agent 将被释放并继续执行；驳回后，Agent 将修正其行为。

---

## 🏰 系统功能详解 (System Features)

Syntropy 提供了一套完整的虚拟朝廷治理体系，包含以下核心模块：

### 1. 文武百官 (The Officials)
系统预置了 8 位各司其职的 AI 官员，构成了一个完整的智能体协作网络：

| 角色 | 职能 (Role) | 职责描述 |
| :--- | :--- | :--- |
| **📜 丞相 (Minister)** | **任务调度** | 总管廷议，协助皇帝决策，拆解复杂任务并调度六部尚书。 |
| **📚 史官 (Historian)** | **记忆检索** | 记录起居注，掌管历史档案，回答关于过去的查询。 |
| **💰 户部 (Revenue)** | **财政/数据** | 掌管天下钱粮，负责财务统计与数据分析。 |
| **⚔️ 兵部 (War)** | **运维/安全** | 掌管天下兵马，负责系统运维与安全防御。 |
| **🏗️ 工部 (Works)** | **工程/开发** | 掌管营造工程，负责代码生成与基础设施建设。 |
| **🕯️ 礼部 (Rites)** | **API/规范** | 掌管礼仪祭祀，负责 API 接口规范与对外交流。 |
| **📋 吏部 (Personnel)** | **权限/审计** | 掌管官员任免，负责系统权限管理与审计。 |
| **⚖️ 刑部 (Justice)** | **合规/风控** | 掌管刑狱法律，负责代码审查与风险控制。 |

### 2. 沉浸式控制台 (Immersive Console)

*   **大议会 (Grand Council)**: 
    *   **上朝/退朝**: 一键切换工作模式。上朝时百官归位，退朝时百官休整。
    *   **状态 HUD**: 实时监控每位官员的运行状态（空闲、思考、执行、报错），支持悬停查看详细日志。

*   **奏折阁 (Imperial Archives)**:
    *   **可视化任务流**: 将每一次交互封装为一份“奏折”，完整记录从拟旨、受理、分发到复命的全过程。
    *   **多视角叙事**: 左侧展示百官的回复与思考，右侧展示皇帝（用户）的指令，清晰还原对话脉络。

*   **内务府 (Internal Affairs)**:
    *   **印信管理**: 安全存储与管理 DeepSeek / OpenAI 等模型的 API Key。
    *   **重整朝纲**: 提供一键清空历史奏折或重置系统状态的维护工具。

### 3. 动态配置与知识增强
*   **配置热更新 (Hot Reload)**: 支持在运行时动态调整 Agent 的 System Prompt、模型参数与技能配置，无需重启服务即可生效。
*   **专属知识库**: 为每位官员分配独立的 `workspace`，支持上传 Markdown/Text 文档。Agent 会自动通过 RRF 引擎索引这些文档，实现领域知识增强。

---

## 🛠️ 技术架构 (Architecture)

Syntropy 采用现代化的全栈架构，确保高性能与可扩展性：

| 层级 | 技术栈 | 核心职责 |
| :--- | :--- | :--- |
| **Frontend** | **React 18 + TypeScript** | 构建高性能的交互界面与控制台 |
| | **Phaser 3** | 专业的 2D 游戏引擎，负责沙盘渲染与寻路 |
| | **Zustand** | 全局状态管理，连接 React 与 Phaser 的桥梁 |
| | **Tailwind CSS** | 原子化 CSS 框架 |
| **Backend** | **Node.js (Express)** | 稳健的后端服务与 API 接口 |
| | **Socket.io** | 实现前后端双向实时通信 (Events/State Push) |
| | **Better-SQLite3** | 轻量级数据库，集成 Vector 扩展与 FTS5 |
| **AI Core** | **LLM APIs** | 接入 OpenAI / DeepSeek 等主流大模型 |
| | **Local Embedding** | 本地/云端向量化服务 |

---

## 🚀 快速开始 (Getting Started)

### 前置要求
- **Node.js**: >= 18.0.0
- **包管理器**: pnpm (推荐) 或 npm/yarn

### 启动步骤

1. **克隆仓库**
   ```bash
   git clone git@github.com:zabr1314/Syntropy.git
   cd Syntropy
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **环境配置**
   复制示例配置文件并填入你的 API Key：
   ```bash
   cp .env.example .env
   ```
   *推荐使用 DeepSeek V3 或 GPT-4o 模型以获得最佳体验。*

4. **启动系统** (双终端模式)

   **终端 1: 启动后端** (Port: 3001)
   ```bash
   node server/index.js
   ```

   **终端 2: 启动前端** (Port: 5173)
   ```bash
   npm run dev
   ```

5. **访问系统**
   打开浏览器访问 [http://localhost:5173](http://localhost:5173) 即可开始“上朝”。

---

## 📂 项目结构 (Project Structure)

```
Syntropy/
├── src/                # 前端源码
│   ├── components/     # React 交互组件 (Console, Dashboard)
│   ├── game/           # Phaser 游戏核心 (MainScene, Agent Sprites)
│   ├── store/          # Zustand 状态管理 (React-Phaser Bridge)
│   └── services/       # 业务服务 (Socket, API)
├── server/             # 后端源码
│   ├── core/           # 智能体内核 (Kernel, Agent State Machine)
│   ├── runtime/        # 运行时 (MemoryManager, Context)
│   └── config/         # 官员设定 (Officials Configuration)
├── data/               # 数据持久化 (SQLite DBs)
└── docs/               # 项目文档
```

---

## 🤝 贡献指南 (Contributing)

Syntropy 是一个开放的实验性项目，欢迎每一位开发者参与共建：

1. **Fork** 本仓库到你的账户。
2. 创建一个新的分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 提交 **Pull Request**。

---

## 📄 许可证 (License)

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  <strong>Syntropy (太和)</strong> - 赋予 AI 以生命，赋予管理以天命。
</p>
