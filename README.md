# Deno版本的图片代理服务

这是使用Deno实现的图片代理服务版本。

## 安装依赖

Deno不需要额外安装依赖，它会自动下载并缓存导入的模块。

## 运行服务

开发模式（使用--watch自动重启）：
```bash
deno run --allow-net --allow-read --allow-write --watch index.ts
```

生产模式：
```bash
deno run --allow-net --allow-read --allow-write index.ts
```

## 配置

配置文件位于 `../config/main_config.json`，共享主配置文件。

配置示例：
```json
{
    "title": "MIFENG CDN代理服务",
    "description": "高性能多源CDN代理解决方案",
    "footer": "© 2025 Mifeng CDN服务 | 提供稳定快速的资源访问",
    "establishTime": "2025/01/13/08/00",
    "port": 3000,
    "cache": {
        "enabled": true,
        "minSize": "8MB",
        "maxTime": "2678400S",
        "imageTypes": ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"]
    },
    "host": "localhost",
    "proxies": [
        {
            "prefix": "/example/",
            "target": "https://example.com/images/",
            "description": "示例图床服务",
            "visible": true
        },
        {
            "prefix": "/gh/",
            "target": "https://cdn.statically.io/gh/",
            "rawRedirect": "https://cdn.jsdmirror.cn/gh/{path}",
            "description": "GitHub静态文件加速",
            "visible": true
        }
    ]
}
```

### 配置说明

- `title`：服务标题
- `description`：服务描述
- `footer`：页面底部信息
- `establishTime`：服务建立时间
- `port`：服务端口
- `cache`：缓存配置
  - `enabled`：是否启用缓存
  - `minSize`：最小缓存大小
  - `maxTime`：最大缓存时间
  - `imageTypes`：支持的图片类型
- `host`：主机名
- `proxies`：代理配置数组
  - `prefix`：访问前缀
  - `target`：目标URL
  - `rawRedirect`：原始重定向URL（可选）
  - `description`：代理描述
  - `visible`：是否在界面上可见

## 特性

- 基于Deno标准库的HTTP服务
- 文件缓存支持
- 灵活的代理规则配置
- 支持多个CDN源
- HTML和JSON格式的配置查看界面 