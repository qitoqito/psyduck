# 一、IPv6 代理池

> 本项目需要使用 IPv6 转发或代理池。
>
> 以下项目均经测试可用；也可自行搜索其他 IPv6 代理池项目。同类项目较多，优先推荐 relayPool。

``` 
https://github.com/parseurl/relayPool

https://github.com/mkr-0920/ipv6_proxy_pool_rust

https://github.com/XiaoMiku01/go-proxy-ipv6-pool
```

## 二、一键安装（在 Bug龙终端执行）

```bash
git clone https://github.com/qitoqito/onekey.git && cd onekey && sh ./psyduck.sh
```

一键安装完成后，还需自行修改 `config.ini`，以开启所需功能。

为方便修改 INI 配置文件，这里提供了 INI 编辑器。如需启用，请运行：

```bash
task qitoqito_psyduck/iniServer.js now
```
## 三、快速开始（手动安装）🚀

### 1. 订阅配置

- 仓库地址：https://github.com/qitoqito/psyduck.git
- 定时类型：`crontab`
- 定时规则：`23 */3 * * *`
- 白名单：`psyduck`
- 执行后：

```bash
cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck
```

- 不勾选：自动添加任务、自动删除任务

### 2. 初始化步骤

1. 配置文件设置
   - 打开 `qitoqito_psyduck/config` 目录
   - 将 `demo.ini` 重命名为 `config.ini`
   - 填写必要参数，并删除配置项前的分号 `;`

2. 必填参数配置

```ini
[env]
QINGLONG_ClientId=your_client_id
QINGLONG_ClientSecret=your_client_secret
```

> 获取路径：青龙面板 → 系统设置 → 应用设置 → 创建应用 → 权限 → 环境变量、定时任务、订阅管理。

```ini
[cache]
type=缓存类型
```

> 开启缓存后，将自动跳过已执行账户。
>
> 若选择 JSON 缓存，请定期清理 `qitoqito_psyduck/temp` 目录。
>
> 若选择 Redis 缓存，请正确填写 `host`、`port`、`password`、`db` 选项。

3. 安装项目依赖

> 打开 Bug龙终端：

```bash
docker exec -it qinglong bash
```

```bash
cd /ql/data/scripts/qitoqito_psyduck/
npm install
```

4. 将 Bug龙订阅的“执行后”改为：

```bash
cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck && task qitoqito_psyduck/qlCreate.js now
```

## 四、配置详解

### 1. Sign 服务配置

```bash
# 部署 Sign 服务
```

任选其一安装：
 
- https://hub.docker.com/r/zhx47/jd_sign
- https://hub.docker.com/r/seansuny/jd-sign

注意：N1 盒子只能安装：https://hub.docker.com/r/seansuny/signapi

### 2. Redis 服务配置

```bash
# 部署 Redis 服务
docker run -itd --name redis -p 6379:6379 --restart=always redis --requirepass 你的密码
```

修改配置文件：

```ini
host=                            # Redis 地址，只需填写 IP 地址
port=                            # Redis 端口
password=                        # Redis 密码，如未设置请留空
db=                              # Redis DB，0-15 随意选一个
```

### 3. 通知配置

```ini
# telegram
TELEGRAM_TOKEN=
TELEGRAM_ID=
TELEGRAM_URL=自定义 Telegram 代理链接
TELEGRAM_PROXY=代理服务器

# bark
BARK_TOKEN=
BARK_URL=自定义 URL
BARK_SOUND=自定义铃声

# 钉钉
DINGTALK_TOKEN=
DINGTALK_SECRET=密钥

# igot
IGOT_TOKEN=

# Server酱
FTQQ_TOKEN=

# pushplus
PUSHPLUS_TOKEN=
PUSHPLUS_TOPIC=群组

# 企业微信
WEIXIN_TOKEN=

# 企业微信 AM
WXAM_TOKEN=
```

### 4. INI 文件配置

> 在 `iniPath` 目录（默认 `qitoqito_psyduck/config`）中自行创建分类配置文件，例如 `jd.ini`。

```ini
# 脚本配置示例
[jd_task_test]
abc=234
```

> 本框架不支持环境变量。此设置等价于其他脚本中使用的环境变量：`export jd_task_test_abc=123`。
>
> 如果脚本日志头带有 `[Field]` 标识，请按提示修改，并添加到配置文件中。

## 五、项目结构

```text
项目目录
├── util/          # 工具函数
├── parse/         # 解析脚本
├── temp/          # 缓存文件
├── static/        # 静态资源
├── cookie/        # 数据存储
├── config/        # 配置文件
├── log/           # 日志文件
├── template.js    # 核心模板
├── main.js        # 入口文件
└── qlCreate.js    # 青龙配置
```

## 六、使用说明

### 1. 基本用法

```bash
node main.js filename [-help n -custom x -thread x]
```

### 2. 脚本配置 Profile 📝

| 参数 | 用法 | 说明 |
|:--|:--|:--|
| 🎯 **任务相关** | | |
| `task` | `n`、`n\|m`、`n:m`、`tn`、`pin`、`pin1\|pin2` | 指定执行账户。例如 `t5` 表示执行前 5 个账户 |
| `help` | 同 `task` | 指定被助力的账户 |
| `exclude` | 同 `task` | 指定需要排除的账户 |
| `thread` | `n` | 并发执行任务数量 |
| 🕒 **时间控制** | | |
| `startTime` | `2025-02-05 16:03:35` 或时间戳 | 任务开始时间 |
| `endTime` | `2025-02-05 16:03:35` 或时间戳 | 任务结束时间 |
| `interval` | 毫秒数，如 `1000` | 账户间执行间隔时间 |
| `delay` | 毫秒数，如 `1000` | API 调用等待时间 |
| 🌐 **代理设置** | | |
| `proxy` | `http://ip:port` | 指定代理服务器地址 |
| `proxyUrl` | 代理 API 地址 | 可设为全局变量或脚本变量 |
| `pool` | 参考 `config.proxy` | 代理池配置，可全局或单独设置 |
| `seconds` | 数字 | 代理 IP 更换间隔（秒） |
| 🔄 **运行模式** | | |
| `model` | `user`、`share`、`team`、`shuffle` | 框架运行方式选择 |

```ini
[示例脚本]
# 基础配置
task=1             # 执行 1 号账户
thread=3           # 3 个任务并发执行
interval=1000      # 每个账户执行间隔 1 秒

# 时间控制
startTime=2025-02-05 08:00:00  # 指定开始时间
endTime=2025-02-05 20:00:00    # 指定结束时间

# 代理设置
proxy=http://127.0.0.1:7890    # 使用本地代理
```

### 3. 缓存说明

- 位置：`[cache]` 节点
- 功能：开启后自动跳过已执行账户

### 4. 代理设置

```ini
proxyGroup=                      # 静态代理池，适用于长期有效 IP，需要自行创建 proxy.ini
proxyUrl=                        # 代理 IP 请求地址
pool=                            # 代理池缓存数量。为正整数时，框架会从 proxyUrl 获取 n 个 IP 并存入代理池，运行账户依次取用；当池中数量少于 n 时自动补充。n 为 -1 时只取一个 IP，所有运行账户共用该 IP
seconds=                         # 代理 IP 每隔几秒更换一次
proxy=                           # 代理 IP
```

> `proxyUrl`、`proxyGroup`、`proxy` 任选其一使用，无需同时设置。
>
> 使用 `proxyUrl` 模式时，`pool` 和 `seconds` 参数必须同时设置。
>
> 可在 `config.ini` 中设置为全局参数；若只想作用于某个脚本，可在该脚本节点单独设置。

### 5. 注意事项

- 订阅时请禁用自动任务管理
- 确保配置文件格式正确
- 注意权限设置
- 不支持旧版本 Bug龙 安装使用

## 七、常见问题

1. 配置解析失败
   - 检查是否已删除分号
   - 确认格式是否正确

2. 运行异常
   - 检查依赖安装
   - 确认权限配置

3. 推送失败
   - 验证通知配置
   - 检查网络连接

4. 活动火爆
   - Docker 容器网络选择 `host`