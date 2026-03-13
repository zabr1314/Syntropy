# 天命系统本地部署与进度分析计划

## 1. 目标
在本地环境中完整部署“天命系统”，使其能够运行并演示“丞相”与“史官”的交互。同时，分析当前代码库的开发进度，识别已完成功能和待办事项。

## 2. 环境准备
- [ ] **Node.js 环境检查**: 确认 Node.js 版本 >= 22 (OpenClaw 要求)。
- [ ] **依赖安装**:
    - [ ] 根目录 (`frontend` + `server`): `npm install`
    - [ ] OpenClaw 核心 (`openclaw/`): `cd openclaw && npm install -g pnpm && pnpm install`

## 3. OpenClaw 核心构建与配置
- [ ] **构建 OpenClaw**: 在 `openclaw/` 目录下执行 `pnpm build`。
- [ ] **配置 Token**:
    - [ ] 检查 `server/index.js` 中的硬编码 Token (`8e307497...`)。
    - [ ] 创建或更新 `~/.openclaw/openclaw.json`，确保 Gateway 使用相同的 Token，以便 Backend Relay 能成功连接。
    - [ ] 配置 Gateway 端口为 `18799` (默认)。

## 4. Agent (官员) 初始化
- [ ] **修复与执行 `start_agents.sh`**:
    - [ ] 分析脚本：当前脚本只创建了 `minister` (丞相) 和 `historian` (史官)。
    - [ ] **补全缺失**: 指南中提到的 `official_revenue` (户部) 和 `official_works` (工部) 尚未在脚本中创建。计划在本次部署中先**补充创建 `official_revenue`** 的基础配置，以匹配丞相的 Prompt，防止调用失败。
    - [ ] 执行脚本初始化 Agent Workspace。

## 5. 系统启动
- [ ] **启动 OpenClaw Gateway**: 使用 `pnpm gateway:watch` (在 `openclaw/` 目录)。
- [ ] **启动后端中转 (Relay)**: 使用 `node server/index.js` (在根目录)。
- [ ] **启动前端 (Frontend)**: 使用 `npm run dev` (在根目录)。

## 6. 进度分析与验证
- [ ] **验证**:
    - [ ] 访问前端页面，测试与“丞相”对话。
    - [ ] 测试指令“让史官查一下数据”，验证丞相是否成功调用史官 Agent。
- [ ] **进度报告**:
    - [ ] 总结已实现的功能模块 (Frontend UI, Gateway, Basic Agents)。
    - [ ] 列出发现的遗留问题或未实现功能 (如缺失的 Agent、鉴权机制的安全性改进等)。

## 7. 交付物
- 运行中的本地系统。
- 修复后的 `start_agents.sh`。
- 当前开发进度简报。
