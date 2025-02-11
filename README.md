# Bug龙订阅
```
链接: https://github.com/qitoqito/psyduck.git
定时类型: crontab
定时规则: 自定(23 23 * * *)
白名单: psyduck
执行后: cp -a /ql/data/repo/qitoqito_psyduck/. /ql/data/scripts/qitoqito_psyduck &&  task qitoqito_psyduck/qlCreate.js now
```

# Bug龙初始化

```
1. 打开config文件夹,将demo.ini重命名为config.ini,按需修改config.ini字段
2. QINGLONG_ClientId  QINGLONG_ClientSecret 两个字段必须填写
3. 进入bug龙终端安装依赖,执行以下命令: cd /ql/data/scripts/qitoqito_psyduck/ && npm install
4. 重新执行task qitoqito_psyduck/qlCreate.js now
```
# INI配置文件
	以JD为例:
	在指定文件夹(默认config)创建jd.ini文件
	
	具体格式:
	其中filename为需要字段的脚本名 
	
	[filename]
	field=test
	

# J东SIGN
    如果环境变量中,已经部署过 JD_SIGN_API, JD_SIGN_KRAPI 可以跳过以下步骤

```
docker run -dit \
  -p 17840:17840 \
  -e TZ=Asia/Shanghai \
  --name Sign \
  --hostname Sign \
  --restart unless-stopped \
  seansuny/signapi:latest
  
config.ini添加 jdSign=http://ip:17840/sign
```
   
	 
# 通知字段

	# telegram
	TELEGRAM_TOKEN=
	TELEGRAM_ID=
	TELEGRAM_URL=自定义TG代理链接
	TELEGRAM_PROXY=代理服务器 (http|https|sock)://ip:port, 使用sock需要安装 socks-proxy-agent 模块

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

 
    
# 框架结构
	util: 调用函数目录
	parse: 解析脚本目录
    temp: 缓存文件目录
	static: 静态文件目录
	cookie: 数据文件目录
	config:	配置文件目录
	log: 日志文件目录
	template.js: 项目主体文件
	main.js: 项目入口文件
	qlCreate: 青龙面板生成入口以及添加定时

# 使用方法
	node main.js filename [-help n -custom x -limit x]
