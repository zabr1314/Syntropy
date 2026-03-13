# Taihe (太和)

![Taihe Preview](docs/assets/preview.png)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
  <img src="https://img.shields.io/badge/Status-Beta-blue.svg" alt="Status" />
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/Engine-Phaser%203-aa241f.svg" alt="Phaser 3" />
</p>

> **"当小人被关进天牢的那一刻，就是投资人决定掏钱的那一刻。"**

**Taihe (太和)** 是一套基于**Multi-Agent（多智能体）协作**的沉浸式可视化操作系统。它通过“古代朝廷”的视觉隐喻，将复杂的 AI 智能体治理、任务流转与记忆回溯具象化为一座**可观测、可干预、可交互**的数字宫殿。

在这个系统中，每个 AI Agent 化身为各司其职的“文武百官”，在“太和殿”中处理政务。作为系统的最高管理者（皇帝），你通过下达“圣旨”驱动系统运转，通过“起居注”洞察智能体的思维链，并通过“御批”机制对高风险操作进行最终裁决。

---

## ✨ 核心特性 (Key Features)

### 🏛️ 沉浸式控制台 (Immersive Console)
告别枯燥的后台面板，Taihe 提供了一套极具代入感的管理界面：

- **奏折阁 (Grand Council)**
  - **任务分发**：以“下旨”的形式向特定官员（Agent）指派任务。
  - **可视化看板**：实时追踪奏折（任务）从拟旨、受理到复命的全生命周期状态。
- **起居注 (Chronicles)**
  - **动态叙事流**：以“史官”视角，实时记录朝廷大事。
  - **思维可视化**：不仅记录结果，更展示 Agent 的思考过程（Thought Chain）与对话互动。
- **内务府 (Internal Affairs)**
  - **系统治理**：管理 DeepSeek / OpenAI 等模型的 API 密钥。
  - **大内维护**：一键清空奏折或重整朝纲（系统重置），确保系统稳定运行。

### 🎮 像素风沙盘 (Pixel Art Sandbox)
- **太和殿场景**：基于 Phaser 3 引擎构建的高精度 2D 像素世界。
- **实时行为映射**：Agent 的思考、移动、交互等行为实时投射到沙盘角色上。
- **视觉反馈**：通过头顶气泡（Thinking/Working/Speaking）直观展示智能体当前状态。

### 🧠 认知增强 (Cognitive Layer)
- **RAG 知识库**：支持为每位官员上传专属“典籍”（文档），构建垂直领域知识库。
- **多模型调度**：灵活切换 DeepSeek V3、GPT-4o 等模型，为不同职能的官员分配最强“大脑”。
- **混合记忆系统**：结合 SQLite 全文检索与向量检索，实现高效的上下文回溯。

### 🛡️ 人机协同 (Human-in-the-loop)
- **御批机制**：涉及删除文件、资金流转等高风险操作时，Agent 会自动挂起并呈递“御批”，需经由你亲自批准方可执行。
- **天牢系统**：违规或失控的 Agent 将被投入“天牢”，等待发落，确保系统安全可控。

---

## 🛠️ 技术架构 (Architecture)

Taihe 采用现代化的全栈架构，确保高性能与可扩展性：

| 层级 | 技术栈 | 说明 |
| :--- | :--- | :--- |
| **Frontend** | **React + TypeScript** | 构建高性能的交互界面 |
| | **Vite** | 极速构建工具 |
| | **Phaser 3** | 专业的 2D 游戏引擎，负责沙盘渲染 |
| | **Zustand** | 轻量级状态管理 |
| | **Tailwind CSS** | 原子化 CSS 框架 |
| **Backend** | **Node.js (Express)** | 稳健的后端服务 |
| | **Socket.io** | 实现前后端毫秒级实时双向通信 |
| | **SQLite** | 轻量级数据库，支持向量存储与全文检索 |
| **AI Core** | **LLM APIs** | 接入 OpenAI / DeepSeek 等主流大模型 |
| | **RAG** | 检索增强生成技术 |

---

## 🚀 快速开始 (Getting Started)

### 前置要求
- **Node.js**: >= 18.0.0
- **包管理器**: pnpm (推荐) 或 npm/yarn

### 安装步骤

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
   复制示例配置文件并填入你的 API Key（也可在启动后通过“内务府”配置）：
   ```bash
   cp .env.example .env
   ```

4. **启动系统**
   ```bash
   # 同时启动前端和后端服务
   npm run dev
   ```

   - **前端控制台**: [http://localhost:5173](http://localhost:5173)
   - **后端服务**: [http://localhost:3000](http://localhost:3000)

---

## 📂 项目结构 (Project Structure)

```
Taihe/
├── src/
│   ├── components/     # React 交互组件 (Console, Dashboard)
│   ├── game/           # Phaser 游戏核心逻辑 (MainScene, Agent)
│   ├── store/          # Zustand 全局状态管理
│   ├── services/       # 业务服务层 (Socket, API)
│   └── constants/      # 系统常量配置
├── server/             # 后端服务
│   ├── core/           # 智能体核心 (Kernel, Agent, LLM)
│   ├── runtime/        # 运行时环境
│   └── config/         # 后端配置 (officials.json)
├── docs/               # 项目文档与资源
└── public/             # 静态公共资源
```

---

## 🤝 贡献指南 (Contributing)

Taihe 是一个开放的实验性项目，欢迎每一位开发者参与共建：

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
  <strong>Taihe (太和)</strong> - 赋予 AI 以生命，赋予管理以天命。
</p>
