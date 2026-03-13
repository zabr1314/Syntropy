# OpenClaw "上奏机制" 原理解析计划

## 1. 目标
通过图文并茂的方式，深入浅出地解释 OpenClaw Agent 如何与“天命系统”前端进行通信。我们将使用“朝廷隐喻”结合“技术流程图”来帮助理解。

## 2. 核心内容规划

### A. 架构图解 (Mermaid)
我们将绘制一张清晰的时序图 (Sequence Diagram)，展示从用户下达指令到屏幕上小人开始移动的全过程。
- **角色**: 皇帝 (User), 朝廷命官 (OpenClaw Agent), 通政使 (Local Script), 枢密院 (Relay Server), 乾清宫 (Frontend UI)。

### B. 隐喻对照表
为了让你更直观地理解，我们将建立一个对照表：
- **OpenClaw Agent** = **朝廷命官** (负责干活的)
- **report_status Tool** = **上奏折** (汇报进度的手段)
- **report_skill.js** = **通政使司** (负责送信的驿站)
- **Relay Server** = **枢密院** (存储和分发情报的中枢)
- **Frontend** = **乾清宫沙盘** (皇帝看到的实时监控)

### C. 数据流向解析
1.  **下旨**: 用户在 OpenClaw 聊天框输入指令。
2.  **领旨**: Agent 思考后，决定先调用 `report_status` 工具说“我开工了”。
3.  **传信**: `report_skill.js` 脚本被执行，它把这句话打包成 HTTP 请求发给 Server。
4.  **存档**: Server 收到请求，更新内存中的“官员状态表”。
5.  **御览**: 前端页面每隔 2 秒问一次 Server：“现在爱卿们都在干嘛？”，然后根据拿到的状态播放动画。

## 3. 交付物
我将在 `.trae/documents/openclaw_principle_diagram.md` 中生成上述图文内容，您可以直接预览该文件。

## 4. 立即执行动作
1.  创建并编写 `.trae/documents/openclaw_principle_diagram.md`。
