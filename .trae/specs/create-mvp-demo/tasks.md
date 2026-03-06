<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-05 08:52:50
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-05 09:09:50
 * @FilePath: /天命系统/.trae/specs/create-mvp-demo/tasks.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# 任务列表 (Tasks)

- [x] 任务 1：初始化项目结构 (Project Setup)
  - [ ] 初始化 Vite + React + TypeScript 项目。
  - [ ] 安装核心依赖：`phaser` (武将), `zustand` (通信), `tailwindcss` (文官), `clsx`, `lucide-react`。
  - [ ] 配置 TailwindCSS。
  - [ ] 创建基础目录结构 (`src/components`, `src/game`, `src/store`, `src/assets`)。

- [x] 任务 2：实现核心布局 (Civilian System)
  - [ ] 创建 `Sidebar` 组件：用于展示日志、控制台。
  - [ ] 创建 `GameContainer` 组件：作为 Phaser 画布的容器。
  - [ ] 使用 TailwindCSS 实现左侧控制台、右侧/中间游戏画布的响应式布局。

- [x] 任务 3：搭建 Phaser 游戏 (Military System)
  - [ ] 创建 `MainScene` 类，配置基础物理引擎（Arcade）。
  - [ ] 在 React 中初始化 Phaser 游戏实例，并挂载到 DOM。
  - [ ] 预加载资源（如果无美术资源，使用色块或占位符生成）。
  - [ ] 渲染基础办公室地图（Tilemap），包含地板、墙壁等层级。

- [x] 任务 4：实现角色逻辑 (Agent Logic)
  - [ ] 创建 `Agent` 类（继承自 `Phaser.GameObjects.Sprite`）。
  - [ ] 实现 `moveTo(x, y)` 方法，包含简单的平滑移动逻辑。
  - [ ] 在场景中实例化至少 2 个 Agent（“丞相”、“工部”）。
  - [ ] 添加简单的交互（如点击地图移动角色）以验证移动逻辑。

- [x] 任务 5：状态管理桥梁 (The Bridge)
  - [ ] 创建 Zustand store，定义 Agent 的状态结构（位置、状态、日志）。
  - [ ] 实现 React 组件与 Zustand store 的绑定，初步测试 React 控制 Phaser。
