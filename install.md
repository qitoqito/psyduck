# 此项目需要ipv6+relayApi才能愉快玩耍...

## 1. 进入青龙终端
```
sudo docker exec -it qinglong bash
cd /ql/data/scrips/
```
## 2. 快速安装
```
git clone https://github.com/qitoqito/onekey.git && cd onekey && sh ./psyduck.sh
```

<img width="950" height="620" alt="图片" src="https://github.com/user-attachments/assets/1526d7e8-6066-4691-af0c-26e97378fa92" />

> 安装过程中,会先安装libressl和request模块,估计5分钟内安装完,安装完后

> 创建青龙应用,权限:订阅管理,环境变量,定时任务
> 
<img width="1274" height="971" alt="图片" src="https://github.com/user-attachments/assets/66a43b47-5dd5-46ec-922e-efcf7f632d7e" />

> 回到终端,输入相关选项
> 
<img width="965" height="333" alt="图片" src="https://github.com/user-attachments/assets/39d23bb4-0c0b-4411-a067-c072c53bf5b7" />

> jdSign: docker镜像 https://hub.docker.com/r/zhx47/jd_sign

> iniPath: 这个变量是来设置jdUser.ini,proxy.ini,jd.ini存放位置,如设置为 /ql/data/config, 方便后期你能在在面板的配置文件中直接修改
<img width="1280" height="569" alt="图片" src="https://github.com/user-attachments/assets/0e0c6903-d4a1-41d8-8372-043ab35db600" />

> 安装完成

<img width="792" height="889" alt="图片" src="https://github.com/user-attachments/assets/8a9fadf6-701f-475f-921c-30d1bd5e3a2f" />

> 此时,基本安装完成

<img width="1265" height="603" alt="图片" src="https://github.com/user-attachments/assets/898b1bd4-721a-4813-8c44-af9d16f2dbf0" />

> 其他参数,你可以回到config.ini里面修改
## 3. relayApi
 
> relayApi是某个吃瓜群众基于psyduck框架开发的一个数据转发模块,这个模块能够突破某些脚本只能跑3个账号后的火爆问题

> 项目地址: https://github.com/xoyoxoyo/relayApi

> 由于relayApi不能装在主路由和旁路由,需要你用单独的设备安装relayApi

> 如果你有飞牛nas,或者其他可以刷armbian/docker的设备,可以使用上

> 如果都没设备,可以买个玩客云,30块

> 创建容器的数量取决于你的cookie数量,如果你cookie数量比较少,完全可以创建cookie数/3的容器,当然可以一对一分配一个

<img width="1270" height="552" alt="图片" src="https://github.com/user-attachments/assets/bfff1986-a06e-4c1b-bbf3-2210553f9a45" />

> 回到青龙,运行下jd_task_relay.js,如果不报错,一般没啥问题

 
