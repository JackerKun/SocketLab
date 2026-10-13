# SocketLab

SocketLab 是一个纯前端、零依赖的 WebSocket 调试工作台，面向接口联调、实时服务开发、物联网调试和协议验证。

![SocketLab](https://img.shields.io/badge/WebSocket-Workbench-55e6a5?style=flat-square) ![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?style=flat-square) ![Dependencies](https://img.shields.io/badge/dependencies-0-61a9ff?style=flat-square)

## 功能

### 连接管理

- 支持 `ws://` 与 `wss://`，未填写协议时自动补全 `ws://`
- 支持 WebSocket 子协议（`Sec-WebSocket-Protocol`）
- 可配置连接超时、`Blob` / `ArrayBuffer` 二进制类型
- 断线自动重连，使用指数退避并限制最大重试次数
- 保存最近使用的服务器地址
- 展示连接状态、协商协议、扩展和在线时长
- 解析常见 WebSocket 关闭码

### 消息收发

- Text、JSON、Hex、Base64 四种发送模式
- JSON 格式化与压缩
- 二进制文件发送
- 定时发送，支持发送间隔、有限次数和无限循环
- 回显式延迟测试（适用于 echo 服务或会原样返回消息的服务）
- `Ctrl / ⌘ + Enter` 快速发送
- 可选“发送后清空”

### 调试与记录

- 收到、发送、系统事件分色显示
- JSON 自动识别和美化
- 按方向筛选、全文搜索、暂停记录、复制单条消息
- 每条消息可独立折叠/展开，也可一键折叠全部消息；折叠后保留单行内容预览
- 新消息默认折叠，可在消息流顶部切换为默认展开；选择会自动保存
- JSON 消息自动格式化，并对键名、字符串、数字和布尔值进行语法高亮
- 发送编辑区可拖动顶部横条调整高度，并自动记忆上次高度
- 桌面端消息流限制在独立滚动区域内，消息再多也不会挤走底部发送按钮
- 单条消息大小、收发数量、流量和消息速率统计
- 最多保留 2,000 条消息，避免长时间运行导致页面失控
- 会话导出为 JSON，支持重新导入查看
- 独立运行日志与错误提示

### 工作效率

- 消息模板可保存、加载、删除
- 深色 / 浅色主题
- 设置、模板和最近地址自动保存到 `localStorage`
- PWA 支持，可添加到桌面并离线打开 UI
- 桌面、平板、手机自适应
- 无框架、无构建步骤、无运行时依赖

## 快速开始

WebSocket API 在浏览器安全上下文中工作得最好，不建议直接双击 `index.html`。在项目目录启动任意静态服务器：

```bash
npm run dev
```

然后访问：

```text
http://localhost:4173
```

也可以使用其他静态服务器：

```bash
npx serve .
# 或
python3 -m http.server 4173
```

默认地址使用公开 Echo 服务 `wss://echo.websocket.org`，可直接用于验证收发和延迟测试。公开服务的可用性由服务提供方决定，实际开发建议连接自己的测试环境。

## 使用说明

1. 在左侧输入 WebSocket 地址。
2. 如服务要求子协议，展开“高级连接设置”并填写，多个协议使用英文逗号分隔。
3. 点击“建立连接”。连接成功后发送区会启用。
4. 选择 Text、JSON、Hex 或 Base64 模式并输入载荷。
5. 点击“发送消息”或按 `Ctrl / ⌘ + Enter`。
6. 使用消息流顶部的方向筛选、搜索、暂停或导出功能分析会话。

### 发送格式

| 模式 | 输入示例 | 实际发送内容 |
| --- | --- | --- |
| Text | `hello` | UTF-8 文本 |
| JSON | `{ "type": "ping" }` | 压缩后的 JSON 文本 |
| Hex | `48 65 6c 6c 6f` | `Uint8Array` 二进制 |
| Base64 | `SGVsbG8=` | Base64 解码后的二进制 |
| 文件 | 选择本地文件 | 文件的 `ArrayBuffer` |

### 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl / ⌘ + Enter` | 发送当前消息 |
| `Ctrl / ⌘ + K` | 聚焦服务器地址 |
| `Ctrl / ⌘ + F` | 聚焦消息搜索 |
| `Esc` | 断开连接（没有弹窗时） |

## 浏览器限制

这是纯浏览器工具，因此有几项 WebSocket 平台限制：

- 浏览器原生 `WebSocket` 构造器**不能设置自定义 HTTP Header**。Token 鉴权通常使用 Cookie、URL 查询参数或 WebSocket 子协议。
- HTTPS 页面通常不能连接不安全的 `ws://` 地址，这是浏览器的 Mixed Content 规则；请使用 `wss://` 或在本地 HTTP 页面调试。
- 浏览器 JavaScript 不能发送协议层 Ping Frame。“延迟测试”发送一个普通文本载荷并等待服务端原样回显，因此只适用于 Echo 服务或实现了回显逻辑的服务。
- 跨域规则与普通 HTTP 不完全相同，但服务端仍可能检查 `Origin` 并拒绝连接。
- 服务端证书无效、代理不支持 Upgrade、反向代理超时等问题通常只会表现为浏览器的通用连接错误，请同时查看浏览器开发者工具和服务端日志。

## 项目结构

```text
.
├── assets/
│   └── favicon.svg          # 应用图标
├── css/
│   └── styles.css           # 设计系统、布局与响应式样式
├── js/
│   ├── app.js               # UI 状态、消息流与业务编排
│   ├── store.js             # 本地持久化和默认设置
│   ├── utils.js             # 编解码、格式化等纯函数
│   └── websocket-client.js  # WebSocket 生命周期与重连策略
├── test/
│   └── utils.test.js        # 核心工具函数测试
├── index.html               # 应用页面结构
├── manifest.webmanifest     # PWA 元数据
├── sw.js                    # 离线资源缓存
└── package.json             # 本地开发与检查脚本
```

## 开发与检查

项目不需要安装依赖。

```bash
# 语法检查
npm run check

# 单元测试
npm test

# 本地预览
npm run dev
```

代码使用原生 ES Modules。新增功能时建议保持以下边界：

- WebSocket 生命周期与重连逻辑放在 `websocket-client.js`
- 无 DOM 依赖的转换函数放在 `utils.js`
- 需要持久化的偏好放在 `store.js`
- DOM 交互和业务编排放在 `app.js`

## 部署

这是静态网站，可直接部署到 Nginx、GitHub Pages、Cloudflare Pages、Vercel 或任意对象存储。生产环境建议使用 HTTPS，以便 Service Worker、剪贴板等能力稳定工作。

Nginx 最小配置示例：

```nginx
server {
    listen 80;
    server_name websocket.example.com;
    root /var/www/socketlab;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

若 WebSocket 服务也通过 Nginx 代理，需要为服务路径配置 Upgrade Header；这属于目标 WebSocket 服务的反向代理配置，与 SocketLab 静态站点本身无关。

## 隐私

SocketLab 不包含分析脚本或后端接口。连接配置、模板和偏好保存在当前浏览器的 `localStorage`；消息记录只保存在当前页面内存中，除非主动导出。WebSocket 消息只在浏览器与输入的目标服务器之间传输。

## License

MIT
