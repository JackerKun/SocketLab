# SocketLab

SocketLab 是一个纯前端、零依赖的 WebSocket 调试工作台，面向接口联调、实时服务开发、物联网调试和协议验证。

![SocketLab](https://img.shields.io/badge/WebSocket-Workbench-55e6a5?style=flat-square) ![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?style=flat-square) ![Dependencies](https://img.shields.io/badge/dependencies-0-61a9ff?style=flat-square)

在线使用时可从工具底部进入 [`guide.html`](guide.html) 用户指南，查看连接、消息收发、WSS 部署和故障排查说明。

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
│   ├── guide.css            # 用户指南页面样式
│   └── styles.css           # 调试工作台设计系统与响应式样式
├── js/
│   ├── app.js               # UI 状态、消息流与业务编排
│   ├── store.js             # 本地持久化和默认设置
│   ├── utils.js             # 编解码、格式化等纯函数
│   └── websocket-client.js  # WebSocket 生命周期与重连策略
├── test/
│   └── utils.test.js        # 核心工具函数测试
├── index.html               # 应用页面结构
├── guide.html               # 响应式用户使用指南
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

SocketLab 是纯静态网站，可部署到 GitHub Pages、Nginx、Cloudflare Pages、Vercel 或任意对象存储。生产环境建议通过 HTTPS 提供页面，以便 Service Worker、剪贴板等浏览器能力稳定工作。

### GitHub Pages

将仓库发布到 GitHub Pages 后，页面地址通常类似：

```text
https://<username>.github.io/SocketLab/
```

GitHub Pages 会通过 HTTPS 提供 `github.io` 页面。此时 SocketLab 只能连接使用有效 TLS 证书的 `wss://` 服务，不能连接普通的 `ws://` 服务。

### HTTPS 页面连接 `ws://` 被阻止

如果控制台出现下面的错误：

```text
[blocked] The page at https://<username>.github.io/SocketLab/
requested insecure content from ws://192.168.1.140:5010/.
This content was blocked and must be served over HTTPS.
```

这是浏览器的 **Mixed Content（混合内容）安全策略**，不是 SocketLab 的程序错误。连接规则如下：

| SocketLab 页面 | WebSocket 服务 | 结果 |
| --- | --- | --- |
| `http://` | `ws://` | 可以连接，适合本地开发 |
| `http://` | `wss://` | 可以连接 |
| `https://` | `wss://` | 可以连接，推荐生产环境使用 |
| `https://` | `ws://` | 浏览器阻止 |

前端 JavaScript 无法关闭这项检查。仅把地址文字从 `ws://` 改成 `wss://` 也不够：WebSocket 服务端或它前面的反向代理必须真正配置 TLS，并提供浏览器信任的证书。

参考资料：

- [MDN：编写 WebSocket 客户端应用](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
- [MDN：Mixed Content](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content)
- [GitHub Pages：使用 HTTPS 保护站点](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

### 方案一：使用 Caddy 提供 WSS（推荐）

假设原始服务运行在：

```text
ws://127.0.0.1:5010
```

准备一个域名，例如 `ws.example.com`，将域名解析到代理服务器，并创建 `Caddyfile`：

```caddyfile
ws.example.com {
    reverse_proxy 127.0.0.1:5010
}
```

启动 Caddy 后，它会自动申请和续期 HTTPS 证书，并自动处理 WebSocket Upgrade。SocketLab 中连接：

```text
wss://ws.example.com/?token=1
```

申请公共证书时，服务器通常需要能从公网访问 `80` 和 `443` 端口。详细说明参见 [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https) 和 [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)。

### 方案二：使用 Nginx 提供 WSS

WebSocket 应用仍监听本机 `5010`，由 Nginx 在 `443` 端口终止 TLS：

```nginx
server {
    listen 443 ssl;
    server_name ws.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # 长连接需要根据业务适当增加超时时间
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

然后连接：

```text
wss://ws.example.com/?token=1
```

`Upgrade` 和 `Connection` Header 必须显式转发，参见 [Nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)。

### 局域网服务和私有 IP

`192.168.x.x`、`10.x.x.x` 和 `172.16.x.x` 等私有 IP 通常无法直接获得公共 CA 签发的证书。可选择以下方式：

#### A. 仅在局域网通过 HTTP 使用 SocketLab

在一台局域网电脑上启动：

```bash
npm run dev
```

其他设备通过该电脑的局域网地址访问：

```text
http://192.168.1.100:4173
```

然后可以连接：

```text
ws://192.168.1.140:5010/?token=1
```

该方式最适合临时开发调试。请确认防火墙允许访问 `4173` 和 WebSocket 服务端口。

#### B. 使用内部 CA 或自签名证书

Caddy 可以为私有 IP 生成内部证书：

```caddyfile
https://192.168.1.140 {
    tls internal
    reverse_proxy 127.0.0.1:5010
}
```

然后连接：

```text
wss://192.168.1.140/?token=1
```

每一台访问设备都必须安装并信任该内部 CA 的根证书，否则浏览器仍会因为证书不受信任而拒绝 WSS。手机也需要单独安装并信任证书。

#### C. 使用局域网域名和可信证书

可以使用类似 `ws.example.com` 的真实域名，通过局域网 DNS 将它解析到 `192.168.1.140`，并使用 DNS Challenge 申请证书。浏览器访问的主机名必须与证书中的域名一致。

### 使用安全隧道

如果需要从公网连接局域网服务，可以使用 Cloudflare Tunnel、VPN 或一台带公网 HTTPS 的反向代理服务器，将本地服务发布为：

```text
wss://socket.example.com
```

不要把没有鉴权的 WebSocket 服务直接暴露到公网。至少应增加身份验证、访问控制、速率限制和日志审计。

### 常见部署故障

| 现象 | 常见原因 | 处理方式 |
| --- | --- | --- |
| `requested insecure content from ws://...` | HTTPS 页面连接了明文 WS | 给服务配置 TLS 并使用 `wss://`，或在局域网通过 HTTP 打开 SocketLab |
| `ERR_CERT_AUTHORITY_INVALID` | 自签名或内部 CA 未受信任 | 在客户端安装根证书，或改用公共可信证书 |
| `ERR_CERT_COMMON_NAME_INVALID` | 连接地址与证书域名/IP 不匹配 | 使用证书包含的域名，重新签发带正确 SAN 的证书 |
| 关闭码 `1006` | TLS、代理、网络或服务端异常中断 | 查看浏览器控制台、代理日志和服务端日志 |
| Nginx 返回 `400` 或无法升级 | Upgrade Header 未转发 | 配置 `proxy_http_version`、`Upgrade` 和 `Connection` |
| 反向代理返回 `502` | 代理无法访问后端服务 | 检查 `proxy_pass` 地址、监听端口、防火墙和容器网络 |
| 连接一段时间后自动断开 | 代理空闲超时 | 增加代理读取超时，服务端定期发送 Ping/心跳 |
| 服务端拒绝连接 | `Origin`、Token 或子协议不符合要求 | 检查服务端鉴权、Origin 白名单和子协议配置 |

### 部署安全建议

- URL 查询参数可能出现在代理日志、浏览器历史或截图中。不要使用长期有效的敏感 Token。
- 优先使用短期 Token、HttpOnly Cookie 或经过设计的 WebSocket 子协议进行鉴权。
- 使用 `wss://` 只负责传输加密，不等于已经完成身份验证和权限控制。
- 公网服务应限制消息大小、连接数量和发送频率。
- 不建议通过关闭浏览器安全检查或允许 Mixed Content 的方式解决部署问题。

### 仅部署 SocketLab 静态页面到 Nginx

如果 Nginx 只负责托管 SocketLab 页面，最小配置如下：

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

静态页面服务器和目标 WebSocket 服务器可以是不同的机器。真正决定能否连接的是浏览器最终使用的 `ws://` / `wss://` 地址、证书信任状态以及网络可达性。

## 隐私

SocketLab 不包含分析脚本或后端接口。连接配置、模板和偏好保存在当前浏览器的 `localStorage`；消息记录只保存在当前页面内存中，除非主动导出。WebSocket 消息只在浏览器与输入的目标服务器之间传输。

## License

MIT
