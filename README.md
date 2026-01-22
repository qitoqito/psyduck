
## 一、快速开始 🚀
### 0. 一键安装(bug龙终端执行)
```git clone https://github.com/qitoqito/onekey.git && cd onekey && sh ./psyduck.sh```
### 1. 订阅配置
```markdown
仓库地址：https://github.com/qitoqito/psyduck.git
定时类型: crontab
定时规则：23 */3 * * *
白名单：psyduck
执行后: cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck
不勾选: 自动添加任务 自动删除任务
```

### 2. 初始化步骤
1. 配置文件设置
   - 打开`qitoqito_psyduck/config`目录
   - 重命名 `demo.ini` 为 `config.ini`
   - 填写必要参数,需要删除配置项前的分号 `;`

2. 必填参数配置
   ```ini
   [env]
   QINGLONG_ClientId=your_client_id
   QINGLONG_ClientSecret=your_client_secret
   ```
   > 获取路径：青龙面板 → 系统设置 → 应用设置 → 创建应用 → 权限 → 环境变量,定时任务,订阅管理
   ```ini
   [cache]
   type=缓存类型
   ```
   > 开启缓存: 开启后自动跳过已执行账户 
   >
   > 选择json缓存,请定期清理`qitoqito_psyduck/temp`目录
   >
   > 选择redis缓存,请正确填写`host,port,password,db`选项

3. 安装项目依赖
   > 打开Bug龙终端: docker exec -it qinglong bash
   ```bash
   cd /ql/data/scripts/qitoqito_psyduck/
   npm install
   ```
4. 安装LibreSSL
    ```bash
    cd /ql/data/scripts/qitoqito_psyduck/sh && chmod +x libressl.sh && ./libressl.sh && node ./libressl.js
    ```
    > 安装完成,在config.ini添加curlPath=/opt/psyduck/curl/bin/psyduck-curl
4. 将Bug龙订阅的执行后改为
   ```
   cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck &&  task qitoqito_psyduck/qlCreate.js now
   ```


## 二、配置详解
### 1. Sign 服务配置
```bash
# 部署 Sign 服务

自选一个安装
https://hub.docker.com/r/qninq/signapi (框架兼容性最好)
https://hub.docker.com/r/zhx47/jd_sign
https://hub.docker.com/r/seansuny/jd-sign

注意: N1盒子只能安装:https://hub.docker.com/r/seansuny/signapi

docker run -dit \
  --name official \
  --restart always \
  --hostname official \
  -p 9527:80 \
  qninq/signapi:latest

# 配置文件添加
jdSign=http://ip:9527/jd/sign
```
### 2. Redis 服务配置
```bash
# 部署 Redis 服务
docker run -itd --name redis -p 6379:6379 --restart=always redis --requirepass 你的密码

# 配置文件修改
host=                            # Redis地址,只需ip地址
port=                            # Redis端口
password=                        # Redis密码,如无设置请留空
db=                              # Redis Db,0-15随意选一个
```
### 3. 通知配置
```ini
# telegram
TELEGRAM_TOKEN=
TELEGRAM_ID=
TELEGRAM_URL=自定义TG代理链接
TELEGRAM_PROXY=代理服务器
# bark
BARK_TOKEN=
BARK_URL=自定义url
BARK_SOUND=自定义铃声

# 钉钉
DINGTALK_TOKEN=
DINGTALK_SECRET=密钥

# igot
IGOT_TOKEN=

# server酱
FTQQ_TOKEN=

# pushplus
PUSHPLUS_TOKEN=
PUSHPLUS_TOPIC=群组

# 企业微信
WEIXIN_TOKEN=

# 企业微信AM
WXAM_TOKEN=
```
### 4. INI 文件配置
> 在iniPath目录(默认qitoqito_psyduck/config)自行创建分类配置文件,如jd.ini
```ini
# 脚本配置示例
[jd_task_test]
abc=234
```
> 本框架不支持环境变量,此设置相当于其他脚本使用的环境变量: export jd_task_test_abc=123
>
> 脚本日志头如带有[Field]标识,请按要求修改添加到配置文件中
## 三、项目结构
```
项目目录
├── util/          # 工具函数
├── parse/         # 解析脚本
├── temp/          # 缓存文件
├── static/        # 静态资源
├── cookie/        # 数据存储
├── config/        # 配置文件
├── log/           # 日志文件
├── template.js    # 核心模板
├── main.js       # 入口文件
└── qlCreate.js    # 青龙配置
```

## 四、使用说明

### 1. 基本用法
```bash
node main.js filename [-help n -custom x -thread x]
```
### 2. 脚本配置 Profile 📝

 
| 参数 | 用法 | 说明 |
|:--|:--|:--|
| 🎯 **任务相关** |||
| `task` | `n`, `n\|m`, `n:m`, `tn`, `pin`, `pin1\|pin2` | 指定执行账户，例如 `t5` 表示执行前 5 个账户 |
| `help` | 同 task | 指定被助力的账户 |
| `exclude` | 同 task | 指定需要排除的账户 |
| `thread` | `n` | 并发执行任务数量 |
| 🕒 **时间控制** |||
| `startTime` | `2025-02-05 16:03:35` 或时间戳 | 任务开始时间 |
| `endTime` | `2025-02-05 16:03:35` 或时间戳 | 任务结束时间 |
| `interval` | 毫秒数，如 `1000` | 账户间执行间隔时间 |
| `delay` | 毫秒数，如 `1000` | API 调用等待时间 |
| 🌐 **代理设置** |||
| `proxy` | `http://ip:port` | 指定代理服务器地址 |
| `proxyUrl` | 代理 API 地址 | 可设为全局变量或脚本变量 |
| `pool` | 参考 `config.proxy` | 代理池配置，可全局或单独设置 |
| `seconds` | 数字 | 代理 IP 更换间隔(秒) |
| 🔄 **运行模式** |||
| `model` | `user`, `share`, `team`, `shuffle` | 框架运行方式选择 |

 
```ini
[示例脚本]
# 基础配置
task=1             # 执行1号账户
thread=3           # 3个任务并发执行
interval=1000      # 每个账户执行间隔1秒

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
```bash
proxyGroup=                      # 静态代理池,适用长期有效ip,需要自行创建proxy.ini
proxyUrl=                        # 代理ip请求地址
pool=                            # 代理池缓存数量,为正整数时候,框架向proxyUrl获取n个ip存储在代理池,运行账号依次取出ip,数量小于n时,自动补充ip. n为-1时,取一个ip,运行账户共用此ip
seconds=                         # 代理ip每隔几秒换新一个
proxy=                           # 代理ip
```

> proxyUrl,proxyGroup,proxy自选一个使用,无需同时设置
> 
> 使用proxyUrl模式,pool,seconds参数必须同时设置
> 
> 在config.ini设置为全局参数,如只想作用于某个脚本,可在脚本节点单独设置
### 5. relayApi安装
> 项目地址: https://github.com/xoyoxoyo/relayApi
>
> 该项目实现本地数据转发,解决部分脚本因IP引起的运行问题

### 6. 注意事项
- 订阅时禁用自动任务管理
- 确保配置文件格式正确
- 注意权限设置
- 不支持旧版本bug龙安装使用

## 五、常见问题
1. 配置解析失败
   - 检查分号是否删除
   - 确认格式是否正确

2. 运行异常
   - 检查依赖安装
   - 确认权限配置

3. 推送失败
   - 验证通知配置
   - 检查网络连接
4. 活动火爆
   - Docker容器网络选择host
   - 安装libressl

 
