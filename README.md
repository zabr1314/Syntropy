# Syntropy (天命系统) - Your AI Empire

![Syntropy Banner](docs/assets/banner.png)

> **"当小人被关进天牢的那一刻，就是投资人决定掏钱的那一刻。"**

**Syntropy (天命系统)** 是一个可视化的、基于“朝廷”隐喻的 Multi-Agent 操作系统。它将复杂的 AI 智能体协作过程具象化为古代朝廷的运作，提供了一个**可观测、可干预、游戏化**的管理平台。

在这里，AI Agents 化身为“文武百官”，在“太和殿”中处理政务（任务），而你则是拥有最高决策权的“皇帝”，通过“奏折”下达指令，通过“起居注”监控动态，并通过“内务府”管理系统资源。

---

## ✨ 核心特性 (Features)

### 🏛️ 可视化控制台 (Visual Console)
系统提供了一套完整的“朝廷”管理界面，让复杂的 Agent 操作变得直观易懂：

- **奏折阁 (Grand Council / Memorials Pavilion)**: 
  - **任务分发中心**：向特定官员（Agent）下达“圣旨”（指令）。
  - **任务看板**：实时查看任务状态（待办、进行中、已完成）。
- **起居注 (Living Notes / Chronicles)**: 
  - **动态叙事流**：以“史官”视角，实时记录朝廷大事、官员的思考（Thought）与对话（Speak）。
  - **沉浸式体验**：告别枯燥的 JSON 日志，体验羊皮纸风格的叙事记录。
- **内务府 (Internal Affairs)**: 
  - **系统配置**：管理 DeepSeek / OpenAI 等模型的 API Key。
  - **大内维护**：一键清空奏折或重整朝纲（重置系统）。
- **百官名录 (Officials Panel)**: 
  - **状态监控**：实时查看每位官员的在线状态、当前行动及思考内容。

### 🎮 游戏化沙盘 (Gamified Sandbox)
- **像素风太和殿**：基于 Phaser 3 引擎构建的 2D 像素世界。
- **实时交互**：观察官员们在朝堂上的移动、交互和工作状态。
- **视觉反馈**：通过头顶气泡（Thinking/Working）和动画直观展示 Agent 的心理活动。

### 🧠 认知增强 (Cognitive Layer)
- **RAG 知识库**：支持为每位官员上传专属的“典籍”（文件），增强其专业知识。
- **多模型支持**：灵活切换 DeepSeek V3、GPT-4o 等多种大模型，为不同职能的官员分配最强“大脑”。
- **混合记忆**：结合 SQLite 全文检索与向量检索，实现高效的记忆回溯。

### 🛡️ 人机协同 (Human-in-the-loop)
- **御批机制**：对于高风险操作（如删除文件、对外转账），Agent 会自动挂起并呈递“御批”，需经由你（皇帝）批准后方可执行。
- **天牢系统**：违规或失控的 Agent 将被投入“天牢”，等待发落。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: 
  - [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/)
  - [Zustand](https://github.com/pmndrs/zustand) (State Management)
  - [Phaser 3](https://phaser.io/) (Game Engine)
  - [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: 
  - [Node.js](https://nodejs.org/) (Express)
  - [Socket.io](https://socket.io/) (Real-time Communication)
  - [SQLite](https://www.sqlite.org/) (Database & Vector Store)
- **AI & LLM**: 
  - OpenAI API / DeepSeek API
  - RAG (Retrieval-Augmented Generation)

---

## 🚀 快速开始 (Quick Start)

### 前置要求 (Prerequisites)
- Node.js >= 18.0.0
- pnpm (推荐) 或 npm/yarn

### 安装 (Installation)

```bash
# 克隆仓库
git clone git@github.com:zabr1314/Syntropy.git
cd Syntropy

# 安装依赖
pnpm install
```

### 配置 (Configuration)

1. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```
2. 编辑 `.env` 文件，填入你的 API Key（可选，也可在系统启动后通过“内务府”配置）：
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   # 其他配置...
   ```

### 启动 (Running)

```bash
# 同时启动前端和后端服务
npm run dev
```

- **前端地址**: http://localhost:5173
- **后端地址**: http://localhost:3000

---

## 📂 项目结构 (Project Structure)

```
Syntropy/
├── src/
│   ├── components/     # React 组件 (Console, Dashboard等)
│   ├── game/           # Phaser 游戏逻辑 (MainScene, Agent等)
│   ├── store/          # Zustand 状态管理
│   ├── services/       # 业务服务 (Socket, API)
│   ├── constants/      # 常量配置 (AgentConfig等)
│   └── assets/         # 静态资源 (图片, 字体)
├── server/             # 后端服务代码
│   ├── core/           # 核心逻辑 (Agent, Kernel, LLM)
│   ├── runtime/        # 运行时环境
│   └── config/         # 后端配置 (officials.json等)
├── docs/               # 项目文档
└── public/             # 公共资源
```

---

## 🤝 贡献 (Contributing)

欢迎各路“谋士”为天命系统出谋划策！如果你有好的想法或发现了 Bug：

1. Fork 本仓库。
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 开启一个 Pull Request。

---

## 📄 许可证 (License)

本项目采用 [MIT License](LICENSE) 许可证。

---

> **Syntropy (天命系统)** - 赋予 AI 以生命，赋予管理以天命。
