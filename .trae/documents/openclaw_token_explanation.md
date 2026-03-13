# OpenClaw Auth Token (鉴权令牌) 解释

## 1. 什么是 Auth Token？

Auth Token（或称 Join Key）是您连接 OpenClaw Gateway 的“入场券”或“密码”。

### 作用

OpenClaw Gateway 为了安全起见，不允许任意连接。只有持有正确 Token 的客户端（如我们的天命系统、OpenClaw Studio）才能：

* **读取数据**: 获取 Agent 列表、实时状态、聊天记录。

* **发送指令**: 控制 Agent 思考、说话、暂停或执行任务。

## 2. 如何获取 Token？

### 场景一：本地运行 (Localhost)

如果您是在自己电脑上运行 OpenClaw，Token 存储在您的本地配置文件中。
**获取步骤**:

1. 打开终端。
2. 运行命令查看配置：

   ```bash
   cat ~/.openclaw/openclaw.json
   ```

   *(Windows 用户通常在* *`C:\Users\您的用户名\.openclaw\openclaw.json`)*
3. 找到 `gateway` -> `auth` -> `token` 字段。

### 场景二：远程服务器 (Server)

如果是连接别人搭建的或远程服务器上的 OpenClaw：

* **询问管理员**: 您需要向服务器管理员索要 Token。

* **服务器日志**: 管理员可以在 OpenClaw 启动日志中看到生成的 Token。

## 3. 优化建议：自动获取 Token (仅限本地)

为了方便您（作为本地用户）使用，我们可以尝试在后端增加一个“自动探测”功能。如果检测到您是本地运行 (`localhost`)，后端可以直接读取 `~/.openclaw/openclaw.json` 文件来预填充 Token，免去手动查找的麻烦。

### 计划实施

1. **后端探测**: 在 `server/index.js` 中，增加读取用户主目录配置文件的逻辑。
2. **前端展示**: 在设置界面增加一个“自动获取本地 Token”按钮，或者默认显示读取到的 Token。

