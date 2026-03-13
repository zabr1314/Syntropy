# 天命系统 Agent 模块重构与增强计划 - Phase 7 (Files & Tool Selection)

## 1. 现状分析 (Phase 1: Explore)
- **目标**: 模仿 OpenClaw，为 Agent 增加文件管理 (Files) 和更灵活的工具/技能选择 (Tool/Skill Selection) 功能。
- **发现**:
  - `SkillManager.js` 负责加载和执行工具，目前支持通过 `skillsFilter` 过滤。
  - `Storage.js` 仅支持 JSONL 文本存储，缺乏二进制文件管理能力。
  - `Agent.js` 每个 Agent 都有独立的 `workspace` 目录 (`./data/workspaces/<id>`)，适合作为文件存储地。
  - 前端 `AgentDetailModal.tsx` 已有 "技能配置" 区域，但不支持文件上传管理。

## 2. 意图澄清 (Phase 2: Clarify Intent)
- **用户需求**: "我看openclaw 的files 有很多，还有 tool 和 skill 的功能可以选择，你也给我模仿的加上吧"。
- **分析结果**:
  - **Files**: Agent 需要有自己的“知识库”或“工作区文件”。
    - 功能: 上传文件、列出文件、删除文件。
    - 作用: 这些文件可以被 RAG 系统索引，或者作为工具的输入/输出。
  - **Tool/Skill**: 已经在 Phase 6 初步实现了 Skill 选择，但用户可能希望更像 OpenClaw 那样区分 "Native Tools" (内置能力) 和 "Skills" (扩展能力)，或者只是指 UI 上的体验优化。
  - **Scope**: 本次计划重点在于 **文件管理系统** 的全栈实现。

## 3. 实施方案 (Phase 3: Implementation)

### 3.1 后端：文件管理 API (Backend)
- **路径**: `server/index.js` (或拆分出 `server/api/files.js`)
- **API 设计**:
  - `GET /api/agents/:id/files`: 列出 `data/workspaces/:id` 下的所有文件。
  - `POST /api/agents/:id/files`: 上传文件 (使用 `multer`) 到工作区。
  - `DELETE /api/agents/:id/files/:filename`: 删除文件。
- **RAG 联动 (进阶)**:
  - 当文件上传时，如果支持 (txt/md/pdf)，自动触发 `MemoryManager` 进行切片和向量化 (需 `EmbeddingService` 支持)。
  - *MVP 阶段先实现文件存取，RAG 联动留作后续优化。*

### 3.2 前端：文件管理 UI (Frontend)
- **Store**: 更新 `useConfigStore.ts`，增加 `fetchFiles`, `uploadFile`, `deleteFile` 方法。
- **Component**: 改造 `AgentDetailModal.tsx`。
  - 新增 **"知识库 (Files)"** 选项卡/区域。
  - 展示文件列表 (图标 + 文件名 + 大小)。
  - 提供上传按钮 (Drag & Drop)。
  - 提供删除按钮。

### 3.3 增强 Skill 选择 (Frontend)
- 优化 `AgentDetailModal.tsx` 的技能选择区域。
- 明确区分:
  - **Global Skills**: 系统提供的通用能力 (如 `call_official`, `web_search`)。
  - **Agent Tools**: Agent 特有的工具 (目前主要是 hardcoded tools，未来可扩展)。
- 增加 "Select All" / "Deselect All" 功能。

## 4. 生成计划 (Phase 4: Generate Plan)
- **步骤**:
  1.  **后端**: 安装 `multer`，实现文件上传/列表/删除 API。
  2.  **前端 Store**: 实现文件操作的 Actions。
  3.  **前端 UI**: 在 `AgentDetailModal` 中集成文件管理界面。
  4.  **UI 优化**: 美化 Skill 选择列表，对齐 OpenClaw 风格。

## 5. 通知用户 (Phase 5: Notify)
- **交付物**: 具备文件投喂能力的 Agent 配置界面。
