# 天命系统：内务府（System Settings）重构计划

## 1. 目标 (Goal)
将现有的简陋“系统设置”弹窗重构为符合世界观的“内务府”面板。
- **视觉风格**：沿用“册封大典”的**皇家古典风格**（金/黑/红配色，卷轴元素）。
- **功能定位**：仅专注于**模型密钥管理**（DeepSeek/GPT 等）和**系统维护**。**不再包含** OpenClaw Gateway 或中继服务器地址配置。

## 2. 现状分析 (Current State)
- **旧组件**：`SettingsModal.tsx`
  - 风格：现代科技风，与整体不搭。
  - 功能：大量代码用于配置 OpenClaw Gateway URL 和 Token，目前已废弃。
  - 状态：混杂了 API 节点管理和连接检测逻辑。

## 3. 实施步骤 (Implementation Steps)

### 3.1 新建组件：内务府 (`InternalAffairsModal.tsx`)
- **位置**: `src/components/Console/InternalAffairsModal.tsx`
- **功能模块**:
  1.  **印信管理 (Keys & Secrets)**:
      - 配置 DeepSeek API Key
      - 配置 OpenAI API Key (可选)
  2.  **大内维护 (Maintenance)**:
      - 清空所有奏折 (Clear Decrees)
      - 重置所有 Agent (Reset Agents - 危险操作，需二次确认)
  3.  **视听陈设 (Audio & Visual)**:
      - 背景音乐开关/音量（预留 UI）
      - 音效开关

### 3.2 更新状态管理 (`useConfigStore.ts`)
- **新增字段**:
  - `deepseekKey`: string
  - `openaiKey`: string
- **移除字段** (清理旧代码):
  - `openclawUrl`, `openclawToken`, `relayUrl` (不再需要)
  - 相关 action (`setOpenClawConfig`, `setRelayUrl`)

### 3.3 集成到主界面 (`SystemStatus.tsx`)
- **替换组件**:
  - 将 `<SettingsModal />` 替换为 `<InternalAffairsModal />`。
  - 修改按钮图标/提示为“内务府”。

## 4. 验证 (Verification)
1.  **界面检查**: 点击设置按钮，弹出新的“内务府”界面，风格与“册封大典”一致。
2.  **功能检查**: 
    - 输入 API Key 并保存，刷新页面后不丢失（持久化验证）。
    - 点击“清空奏折”，确认主界面奏折列表被清空。
3.  **代码清理**: 确认旧的 OpenClaw 和 Relay URL 配置代码已被移除。

## 5. 待办清单 (Todo)
- [ ] 修改 `useConfigStore.ts` 添加 Key 字段
- [ ] 创建 `InternalAffairsModal.tsx` 组件
- [ ] 更新 `SystemStatus.tsx` 入口
- [ ] (可选) 删除旧的 `SettingsModal.tsx`
