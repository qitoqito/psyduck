# Bug龙使用指南

## 一、快速开始

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
   - 复制 `demo.ini` 为 `config.ini`
   - 填写必要参数,需要删除配置项前的分号 `;`

2. 必填参数配置
   ```ini
   [env]
   QINGLONG_ClientId=your_client_id
   QINGLONG_ClientSecret=your_client_secret
   ```
   > 获取路径：青龙面板 → 系统设置 → 应用设置 → 创建应用 → 权限 → 环境变量,定时任务
   ```ini
   [cache]
   type=缓存类型
   ```
   > 开启缓存: 开启后自动跳过已执行账户
   > 选择json缓存,请定期清理`qitoqito_psyduck/temp`目录
   > 选择redis缓存,请正确填写`host,port,password,db`选项

3. 安装项目依赖
4. > 打开Bug龙终端: docker exec -it qinglong bash
   ```bash
   cd /ql/data/scripts/qitoqito_psyduck/
   npm install
   ```
5. 将Bug龙订阅的执行后改为
   ```
   cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck &&  task qitoqito_psyduck/qlCreate.js now
   ```


## 二、配置详解

### 1. INI 文件配置
> 如果你设置了iniPath目录,在iniPath目录(默认qitoqito_psyduck/config)自行创建分类配置文件,如jd.ini
```ini
# 脚本配置示例
[scriptName]
field=value
```
> 上述配置,在名为scriptName.js的脚本中,获取this.profile.field值为value
### 2. Sign 服务配置
```bash
# 部署 Sign 服务
docker run -dit  -p 17840:17840   -e TZ=Asia/Shanghai  --name Sign  --restart unless-stopped  seansuny/signapi:latest

# 配置文件添加
jdSign=http://ip:17840/sign
```
### 3. Redis 服务配置
```bash
# 部署 Redis 服务
docker run -itd --name redis -p 6379:6379 redis --requirepass 123456

# 配置文件修改
host=                            # Redis地址
port=                            # Redis端口
password=                        # Redis密码,如无设置请留空
db=                              # Redis Db
```
### 4. 通知配置
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
### 2. 脚本配置Profile
> 参考ini文件配置
> 
| 参数 | 用法 |  特殊说明 |
| :--- | :--- | :--- |
| task | n , n\|m , n:m , tn , pin ,  pin1\|pin2 | 执行哪些账户,当要执行前5个账户,请设置t5 |
| help | n , n\|m , n:m , tn , pin1\|pin2 | 同task |
| exclude | n , n\|m , n:m , tn , pin1\|pin2 | 同task |
| thread | n |并发运行任务,并发数|
|proxy|http://ip:port|代理地址|
|startTime|2025-02-05 16:03:35 \| 时间戳|任务开始时间|
|endTime|2025-02-05 16:03:35 \| 时间戳|任务结束时间|
|model|user, share, team, shuffle|框架运行方式|


### 3. 缓存说明
- 位置：`[cache]` 节点
- 功能：开启后自动跳过已执行账户

### 4. 注意事项
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