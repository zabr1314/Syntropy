# 前端美术优化计划 (基于“可视化龙虾”风格)

## 1. 项目现状分析
- **技术栈**: React 19 + Phaser 3.90 + Tailwind CSS。
- **当前美术**: 纯代码绘制的几何图形，缺乏视觉吸引力。
- **目标风格**: 参考本地项目“可视化龙虾”，采用 **像素风 (Pixel Art)**，复用其美术资源。

## 2. 优化目标
利用“可视化龙虾”项目中的高质量像素美术资源，快速提升“天命系统”的视觉表现。

### 核心改进点
1.  **场景 (Environment)**
    - 背景：使用 `office_bg.webp` 替换纯色背景。
    - 家具：使用 `desk-v3.webp` 替换矩形桌子。
    - 装饰：添加猫咪 (`cats-spritesheet`) 和植物 (`plants-spritesheet`)。

2.  **角色 (Agents)**
    - 外观：使用 `sprite_sheet.png` (32x32 像素小人) 或 `star-working` 系列替换几何图形 Agent。
    - 动画：实现基于 Sprite Sheet 的行走和待机动画。

3.  **UI (Interface)**
    - 字体：引入 `ArkPixel` 像素字体（如果适用）。
    - 风格：调整对话气泡样式，使其更接近像素风格。

## 3. 实施步骤

### 阶段一：资源迁移 (Asset Migration)
- [ ] **S1.1**: 从 `~/Desktop/可视化龙虾/Star-Office-UI/frontend` 复制以下资源到 `public/assets/`：
    - 背景: `office_bg.webp`
    - 家具: `desk-v3.webp`
    - 角色: `sprite_sheet.png`, `star-working-spritesheet-grid.webp`
    - 装饰: `cats-spritesheet.webp`
- [ ] **S1.2**: 在 `MainScene.ts` 的 `preload` 方法中加载这些新资源。

### 阶段二：场景重构 (Scene Refactoring)
- [ ] **S2.1**: 修改 `MainScene.ts` 的 `create` 方法：
    - 添加背景图 `this.add.image(..., 'office_bg')`。
    - 修改 `createOfficeLayout`，使用 `desk` 图片代替 `Graphics` 绘制桌子。
- [ ] **S2.2**: 调整场景缩放和布局坐标，以适应新素材的尺寸（背景图可能需要缩放）。

### 阶段三：角色升级 (Agent Upgrade)
- [ ] **S3.1**: 修改 `Agent.ts`：
    - 移除 `drawAgent` 中的 `Graphics` 绘图代码。
    - 改为创建 `Phaser.GameObjects.Sprite`。
    - 使用 `sprite_sheet.png` 并定义 `idle` 和 `walk` 动画。
- [ ] **S3.2**: 在 `MainScene.ts` 中初始化角色动画（`this.anims.create`）。

### 阶段四：细节打磨 (Polishing)
- [ ] **S4.1**: 添加一只像素猫咪作为场景吉祥物（复用 `cats-spritesheet`）。
- [ ] **S4.2**: 调整 Agent 的名字标签样式，使其更清晰（参考“可视化龙虾”的半透明背景）。

## 4. 资源清单
| 资源名称 | 原文件名 | 用途 |
| :--- | :--- | :--- |
| 背景 | `office_bg.webp` | 游戏主背景 |
| 桌子 | `desk-v3.webp` | 办公桌 |
| 角色 | `sprite_sheet.png` | Agent 形象 |
| 装饰 | `cats-spritesheet.webp` | 场景装饰 |

## 5. 待办事项
- [ ] 检查 WebP 兼容性（Phaser 默认支持，但在 Safari 旧版可能需要 fallback，暂时假设环境支持）。
- [ ] 确认资源版权（用户自有项目，无版权问题）。
