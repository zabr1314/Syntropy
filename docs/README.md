# 天命系统 (Mandate of Heaven) - 项目技术文档

## 1. 项目简介

**天命系统 (Mandate of Heaven)** 是一个创新的 **AI Agent 可视化管理平台**。它摒弃了传统的控制台日志界面，创造性地将抽象的 AI 工作流隐喻为**中国古代官僚体系**，通过 2D 像素风沙盘进行直观展示。

*   **核心理念**: 让 AI 治理变得像治理国家一样直观、威严且有趣。
*   **适用场景**: 多 Agent 协作监控、复杂任务流程演示、AI 系统可观测性增强。

### 1.1 核心隐喻映射

| 天命系统概念 | 现代 AI 体系概念 | 说明 |
| :--- | :--- | :--- |
| **皇帝 (User)** | 用户 / 决策者 | 下达自然语言指令 (圣旨)，拥有最高裁决权。 |
| **丞相 (Minister)** | 主控 Agent (Orchestrator) | 负责任务拆解、规划、分发，是系统的核心大脑。 |
| **六部 (Ministries)** | 垂类 Agent / 工具集 | 负责具体执行。如工部(代码)、户部(资源)、刑部(审计)。 |
| **圣旨 (Decree)** | 任务 (Task) | 包含指令内容、执行计划、状态流转信息。 |
| **奏折 (Memorials)** | 任务日志 / 回复 | Agent 的执行反馈、对话记录。 |
| **起居注 (Logs)** | 系统日志 (System Logs) | 记录系统底层的运行状态、移动轨迹等。 |
| **天牢 (Jail)** | 错误处理 / 熔断机制 | 当 Agent 出错或越权时，将其关押，需用户手动释放。 |

---

## 2. 技术架构

本项目采用 **"React UI + Phaser Engine + Node.js Relay"** 的三层架构，通过 WebSocket 实现全双工实时通信。

```mermaid
graph TD
    User[用户/皇帝] -->|交互/下旨| UI[React UI 层]
    UI -->|状态同步| Store[Zustand Store]
    
    subgraph Frontend [前端应用]
        UI
        Store
        Game[Phaser 游戏引擎]
        Service[LiveAgentService]
    end
    
    subgraph Backend [中转服务]
        Relay[Relay Server (Node.js)]
        Adapter[OpenClaw Adapter]
    end
    
    subgraph External [外部系统]
        OpenClaw[OpenClaw Runtime]
    end
    
    User -- 1. 输入指令 --> UI
    UI -- 2. 创建圣旨 --> Store
    Service -- 3. WebSocket 发送指令 --> Relay
    Relay -- 4. 转发指令 --> OpenClaw
    OpenClaw -- 5. 执行并流式返回 --> Relay
    Relay -- 6. WebSocket 推送状态/消息 --> Service
    Service -- 7. 更新 Store/驱动动画 --> Game
    Game -- 8. 渲染画面 --> User
```

### 2.1 技术栈

*   **前端**:
    *   **React 18**: 用于构建 UI 界面 (奏折阁、起居注、输入框)。
    *   **TypeScript**: 强类型保障。
    *   **Vite**: 构建工具。
    *   **Tailwind CSS**: 样式库。
    *   **Framer Motion**: UI 动效。
*   **游戏引擎**:
    *   **Phaser 3**: 用于渲染 2D 像素沙盘、角色动画、寻路逻辑。
*   **状态管理**:
    *   **Zustand**: 全局状态中心，连接 React 组件与 Phaser 场景。
*   **后端/通信**:
    *   **Node.js + Socket.io**: 构建 Relay Server，实现 WebSocket 通信。
*   **外部集成**:
    *   **OpenClaw**: 作为实际的 Agent 运行时底座。

---

## 3. 目录结构

```text
/
├── server/                 # 后端 Relay Server
│   ├── index.js            # 服务入口 (WebSocket/HTTP)
│   └── lib/openclaw/       # OpenClaw 适配器逻辑
├── src/                    # 前端源代码
│   ├── assets/             # 静态资源 (图片、Sprite Sheet)
│   ├── components/         # React UI 组件
│   │   ├── Console/        # 控制台组件 (奏折阁、起居注)
│   │   └── ...
│   ├── constants/          # 常量定义 (坐标、配置)
│   ├── game/               # Phaser 游戏逻辑
│   │   ├── Agent.ts        # 角色类 (动画、移动、气泡)
│   │   ├── MainScene.ts    # 主场景 (地图、图层管理)
│   │   └── ...
│   ├── services/           # 业务逻辑服务
│   │   └── LiveAgentService.ts # 核心服务：WebSocket 通信与状态同步
│   ├── store/              # Zustand 状态库
│   │   ├── useAgentStore.ts # Agent 状态 (位置、动作)
│   │   └── useCourtStore.ts # 奏折状态 (任务、日志)
│   ├── App.tsx             # 应用入口
│   └── main.tsx
├── public/                 # 公共资源
├── scripts/                # 辅助脚本
└── package.json
```

---

## 4. 核心模块详解

### 4.1 LiveAgentService (`src/services/LiveAgentService.ts`)

这是系统的心脏，负责前端与后端的实时通信。

*   **连接管理**: 维护 Socket.io 连接，处理重连。
*   **指令下发**: 将用户的自然语言指令 (`addDecree`) 包装后发送给 Server。
*   **状态同步**: 监听 `agent_update` 事件。
    *   **流式消息拼接**: OpenClaw 返回的是字符流，Service 负责将其缓冲 (`buffer`) 并拼接成完整句子，再传给 UI 显示。
    *   **状态机**: 处理 `working` (忙碌/说话) -> `idle` (空闲) 的状态流转。
    *   **自动完结**: 当 Agent 结束说话并变为空闲时，自动将对应的奏折标记为“已办结”。
    *   **移动控制**: 控制 Agent 在“说话时原地不动”、“说完话停留 2 秒”、“空闲时回休息区”等行为。

### 4.2 Relay Server (`server/index.js`)

负责连接 OpenClaw 与前端的中转站。

*   **OpenClaw Adapter**: 模拟 OpenClaw 的客户端，连接到 OpenClaw Gateway。
*   **协议转换**: 将 OpenClaw 的复杂 JSON 事件转换为前端易读的 `{ id, status, message }` 格式。
*   **消息清洗**: 过滤掉无效的 JSON 字段，提取纯文本回复 (`delta` 或 `text`)。

### 4.3 奏折阁 (`MemorialsPanel.tsx`)

任务管理与对话历史的核心 UI。

*   **对话流模式**: 采用类似 IM 的聊天界面，左侧显示丞相回复，右侧显示皇帝圣旨。
*   **长文本优化**: 对话区域有最大高度限制，支持内部滚动，避免刷屏。
*   **状态可视化**: 清晰展示任务是“执行中”还是“已办结”。

### 4.4 游戏场景 (`MainScene.ts` & `Agent.ts`)

负责视觉呈现。

*   **Y-Sorting**: 实现伪 3D 遮挡关系（角色走在桌子后面会被遮挡）。
*   **气泡系统**: 角色头顶的气泡支持优先级控制（说话 > 状态提示），并支持长文本截断（显示 `...`）。
*   **沉浸式交互**: 点击地板可移动皇帝，角色移动带有平滑插值。

---

## 5. 开发指南

### 5.1 环境准备
*   Node.js v18+
*   npm

### 5.2 启动项目

需要同时启动 **前端** 和 **后端** 两个进程。

**终端 1: 启动 Relay Server**
```bash
node server/index.js
# 输出: OpenClaw Relay Server listening on port 3001
# 输出: [Socket] Forwarding to OpenClaw... (若配置了 OpenClaw)
```

**终端 2: 启动前端**
```bash
npm run dev
# 访问 http://localhost:5173
```

### 5.3 常见修改场景

*   **修改角色坐标**: 编辑 `src/constants/court.ts`。
*   **调整移动速度/气泡时间**: 编辑 `src/services/LiveAgentService.ts` 中的 `shouldWait` 和 `Math.max` 逻辑。
*   **新增角色**:
    1.  在 `src/game/MainScene.ts` 中加载新的 Sprite Sheet。
    2.  在 `src/services/LiveAgentService.ts` 的 `ID_MAPPING` 中添加后端 ID 到前端 ID 的映射。

---

## 6. 常见问题 (FAQ)

**Q: 为什么丞相回复是乱码或 JSON？**
A: 请检查 `server/index.js` 中的消息解析逻辑。我们已修复为优先读取 `delta` 或 `text` 字段，避免直接 `JSON.stringify`。

**Q: 为什么任务一直显示“执行中”？**
A: `LiveAgentService.ts` 中有自动完结逻辑。请确保 Agent 确实发送了结束信号（状态变为 `idle`），且之前有过回复记录。

**Q: 如何连接真实的 OpenClaw？**
A: 在 `server/index.js` 中配置 OpenClaw Gateway 的地址 (默认为 `ws://localhost:8080`)。确保 OpenClaw 服务已启动。
