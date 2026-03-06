# AI 帝国·数字中枢 MVP (Sprint 1) 规格说明书

## 为什么要做 (Why)
本项目旨在通过 2D 像素沙盘（Phaser）将多智能体（Multi-Agent）的工作流完全可视化。Sprint 1 的核心目标是建立“视觉与移动”的基础架构：搭建 React + Phaser 环境，并实现角色的实例化与程序化移动。

## 做什么改动 (What Changes)
- 初始化一个新的 Vite + React + TailwindCSS 项目。
- 集成 Phaser 3 作为渲染引擎（即“武将系统”）。
- 实现基础的 React UI 界面（即“文官系统”）。
- 在 Phaser 中创建 `MainScene` 场景，用于加载办公室地图和角色精灵。
- 实现 `Agent` 类，包含基本的移动逻辑（从点 A 到点 B）。
- 引入 Zustand 进行状态管理（为 Sprint 2 的状态流转做准备）。

## 影响范围 (Impact)
- **新项目**: 建立全新的 Web 应用架构。
- **核心依赖**: `phaser`, `zustand`, `tailwindcss`, `vite`。
- **资源需求**: 需要像素美术资源（地图 Tilemap、角色 Sprite Sheet）或临时占位符。

## 新增需求 (ADDED Requirements)
### 需求：项目基础设施
系统必须使用 Vite, React 18, 和 TailwindCSS 构建。
系统必须集成 Phaser 3 用于游戏画布渲染。

### 需求：视觉层 (Phaser)
系统必须渲染代表办公室环境的 2D Tilemap 地图。
系统必须渲染至少 2 个角色精灵（如“丞相”、“工部”）。
系统必须支持角色从起始点 (Point A) 移动到目标点 (Point B)。

### 需求：UI 层 (React)
系统必须显示侧边栏用于控制/日志展示（文官系统）。
系统必须显示 Phaser 画布区域（武将系统）。

## 修改需求 (MODIFIED Requirements)
无（新项目）

## 移除需求 (REMOVED Requirements)
无
