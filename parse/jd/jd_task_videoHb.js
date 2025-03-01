import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东视频红包',
            interval: 3000,
            round: 4,
            crontab: 4
        }
    }

    async prepare() {
        let html = await this.curl({
                'url': `https://pro.m.jd.com/mall/active/4VRY8pVY1KRhYkVPgywV5Qa9Rovp/index.html?tttparams=i2c4MeyJnTGF0IjoiMjMuOTM5MTkyIiwidW5fYXJlYSI6IjE2XzEzNDFfMTM0N180NDc1MCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6Ijc2NTc3NTQ4ODIiLCJsYXQiOiIiLCJwb3NMYXQiOiIyMy45MzkxOTIiLCJwb3NMbmciOiIxMTcuNjExMjMiLCJncHNfYXJlYSI6IjBfMF8wXzAiLCJsbmciOiIiLCJ1ZW1wcyI6IjAtMC0yIiwiZ0xuZyI6IjExNy42MTEyMyIsIm1vZGVsIjoiaVBob25lMTMsMyIsImRMbmciOiIifQ5%3D%3D`,
                user: this.tester()
            }
        )
        // console.log(html)
        let code = this.matchAll(/"scanTaskCode(?:_\d+)*"\s*:\s*"(\w+)"/g, html)
        if (code) {
            this.code = code.map(d => {
                return {
                    "type": "20",
                    "assignmentId": d,
                    "scanTaskCodeIndex": "2",
                    "activitySource": "1",
                    "realClient": "ios",
                    "taskRewardType": "1"
                }
            })
            // for (let d of this.matchAll(/"signInTaskCode(?:_\d+)*"\s*:\s*"(\w+)"/g, html)) {
            //     this.code.push({
            //         "type": "21",
            //         "assignmentId": d,
            //         "activitySource": "1", "realClient": "ios", "floatType": "1"
            //     })
            // }
            for (let d of this.matchAll(/"liveFollowTaskCode(?:_\d+)*"\s*:\s*"(\w+)"/g, html)) {
                this.code.push({
                    "type": "24",
                    "assignmentId": d,
                    "activitySource": "1",
                    "realClient": "ios",
                    "floatType": "1",
                    "subPlayType": "-100"
                })
            }
            for (let d of this.matchAll(/"secondsTaskCode(?:_\d+)*"\s*:\s*"(\w+)"/g, html)) {
                this.code.push({
                    "type": "25",
                    "assignmentId": d,
                    "activitySource": "1",
                    "realClient": "ios",
                    "floatType": "1",
                    "subPlayType": "-100"
                })
            }
            for (let d of this.matchAll(/"fissionTaskCode(?:_\d+)*"\s*:\s*"(\w+)"/g, html)) {
                this.code.push({
                    "type": "29", "assignmentId": d, "activitySource": "1", "realClient": "ios", "floatType": "1"
                })
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let status = 1
        p.info.list = p.info.list || []
        if (context.round == 0) {
            let info = await this.curl({
                    'url': `https://api.m.jd.com/videoRedPacketHomePage_info`,
                    'form': `functionId=videoRedPacketHomePage_info&appid=video-redbag-h5&body=${this.dumps(this.code)}&client=wh5&t=1699156906324&clientVersion=12.3.1`,
                    user,
                    algo: {
                        appId: 'd51cc',
                        expire: {
                            busiCode: '3'
                        }
                    }
                }
            )
            let sign = await this.curl({
                    'url': `https://api.m.jd.com/videoHb_sign`,
                    'form': `functionId=videoHb_sign&appid=video-redbag-h5&body={}&client=wh5&t=1704344655057&clientVersion=12.3.1`,
                    user,
                    algo: {appId: '2023f'}
                }
            )
            for (let i of this.haskey(info, 'data')) {
                if (i.status == 2) {
                    p.log("已完成:", i.assignmentName)
                }
                else {
                    status = 0
                    p.log("正在运行:", i.assignmentName)
                    let accept = await this.curl({
                            'url': `https://api.m.jd.com/videoRedPacketHomePage_accept`,
                            'form': `functionId=videoRedPacketHomePage_accept&appid=video-redbag-h5&body={"type":"20","assignmentId":"${i.assignmentId}","itemId":"${i.itemId}"}&client=wh5&t=1699157368652&clientVersion=12.3.1`,
                            user,
                            algo: {appId: '57a9c'}
                        }
                    )
                    if (this.haskey(accept, 'success')) {
                        if (i.waitDuration) {
                            p.log("预等待:", i.waitDuration)
                        }
                        p.info.list.push({
                            "assignmentId": i.assignmentId, "itemId": i.itemId,
                            'time': new Date().getTime() / 1000 + parseInt(i.waitDuration),
                            'title': i.assignmentName
                        })
                        await this.wait(1000)
                    }
                    else {
                        if (this.haskey(accept, 'busiCode', '8014')) {
                            p.log('活动太火爆，等会再来吧~')
                            p.info.jump = 1
                            return
                        }
                        p.log(accept)
                    }
                }
            }
            if (status) {
                p.info.work = true
            }
        }
        else if (context.round == 1) {
            for (let i of p.info.list) {
                let wait = i.time - new Date().getTime() / 1000
                p.log("正在获取:", i.title)
                if (wait>0) {
                    p.log("正在等待:", wait)
                    await this.wait(wait * 1000)
                }
                let done = await this.curl({
                        'url': `https://api.m.jd.com/videoRedPacketHomePage_done`,
                        'form': `functionId=videoRedPacketHomePage_done&appid=video-redbag-h5&body={"type":"20","assignmentId":"${i.assignmentId}","itemId":"${i.itemId}"}&client=wh5&t=1699157368652&clientVersion=12.3.1`,
                        user,
                        algo: {appId: '12bf2'}
                    }
                )
                if (this.haskey(done, 'success')) {
                    p.log(done.data.rewardMsg)
                    status = 1
                }
                else {
                    status = 0
                    p.log(done)
                }
                await this.wait(1000)
            }
            if (p.info.list.length && status) {
                p.info.work = true
            }
            else {
                p.log("没有可执行的任务")
                p.info.work = true
            }
        }
        else if (context.round == 2) {
            let exchange = await this.curl({
                    'url': `https://api.m.jd.com/videoRedPacketHomePage_exchangeCash`,
                    'form': `functionId=videoRedPacketHomePage_exchangeCash&appid=video-redbag-h5&body={}&client=wh5&t=1699157963924&clientVersion=12.3.1`,
                    user,
                    algo: {appId: "8c80c"}
                }
            )
            if (this.haskey(exchange, 'success')) {
                p.log('金币兑换成功')
            }
            let home = await this.curl({
                    'url': `https://api.m.jd.com/videoHbCw_homePage`,
                    'form': `functionId=videoHbCw_homePage&appid=video-redbag-h5&body=%7B%7D&client=wh5&t=1699156595761&clientVersion=12.3.1`,
                    user,
                    algo: {appId: '7f9c4'}
                }
            )
            if (this.haskey(home, 'success')) {
                let data = this.haskey(home, 'data')
                let amount = data.cashBalanceFloor.amount
                p.log('现有奖金:', amount)
                let status = 1
                for (let i of data.cwCardFloor.cards.reverse()) {
                    if (i.topDesc == '已连续来访0天' && i.amount == 0.88) {
                        let init = await this.curl(this.modules.jdUrl.app('videoHb_newCustomerHbLayer', {}, 'post', user)
                        )
                        p.log(init)
                        if (this.haskey(init, 'data.popAlertInfo.hbAmount')) {
                            p.log("初始化成功,获得:", init.data.popAlertInfo.hbAmount)
                        }
                    }
                    if (i.cwStatus == 0) {
                        p.log("正在提款至京东余额:", i.amountStr)
                        let cash = await this.curl({
                                'url': `https://api.m.jd.com/videoHbCw_doCw`,
                                'form': `functionId=videoHbCw_doCw&appid=video-redbag-h5&body={"bizTraceId":"${i.bizTraceId}","amount":${i.amountStr}}&client=wh5&t=1699156604242&clientVersion=12.3.1`,
                                user,
                                algo: {appId: 'c5b74'}
                            }
                        )
                        if (this.haskey(cash, 'success')) {
                            p.msg(`提款成功: ${i.amountStr}`)
                        }
                        else {
                            status = 0
                            p.log(cash)
                        }
                        await this.wait(5000)
                    }
                    else if (i.cwStatus == 1) {
                        status = 1
                    }
                }
                if (status) {
                    p.info.work = true
                }
            }
            else {
                p.log(home)
            }
        }
        else {
            var lists = ['740963579',
                '419744560', '419744560', '419744560', '419744560', '419744560', '590181549', '626885205'
            ]
            if (!context.list) {
                let videoDetail = await this.curl({
                        'url': `https://api.m.jd.com/video_videoDetail?g_ty=ls&g_tk=2107606655`,
                        'form': `appid=mini_content&body={"id":"711886908","offset":"5_41","playtype":"9999","modeid":"1","style":"11","projectid":"100967","adid":"","pi":"","mpplaytype":"11","extParam":"{\\"activityId\\":\\"BPC-20240513-0019\\"}","skuId":""}&client=wxapp&clientVersion=10.14.200&functionId=video_videoDetail`,
                        user,
                        algo: {
                            appId: 'd734e'
                        }
                    }
                )
                if (this.haskey(videoDetail, 'list')) {
                    lists = this.column(videoDetail.list, 'id')
                    context.list = lists
                }
            }
            else {
                lists = context.list
            }
            let jsLable = [
                "Q/g3kHW+Z0OYavMQtYHrNA7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBiQLM/X3mONW05GImZM/KBH7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==", "4Nc6P/zwB+60A2aTvNSx9w7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBiQLM/X3mONW05GImZM/KBH7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==", "gF1/9jdFDopw6w6LGhzbeQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBiQLM/X3mONW05GImZM/KBH7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==", "27ulfi2CH8N0JwjosX1ulg7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBiQLM/X3mONW05GImZM/KBH7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==", "zM36K2DPt0ARtmy6GComUQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBiQLM/X3mONW05GImZM/KBH7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "VStpTFFcPyNVMZXHhdgYdQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBdFtCn/2sVW4/51duXMv5DX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "t6XttZjgZni/znFvFXvlUg7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBdFtCn/2sVW4/51duXMv5DX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "78kfI5MBs8LDtC0gTr7Xdw7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBdFtCn/2sVW4/51duXMv5DX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "Vnwf2U7YFC71f6bqRet05A7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBdFtCn/2sVW4/51duXMv5DX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "iQX3z0f5Gt9z3+kVgwKnSQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBdFtCn/2sVW4/51duXMv5DX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==", "m0M0jZT19vGManJFn6JUtw7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "AjmJ8sS/Z9lcMhvwONeMGw7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "ZBQB4MvvDkmjDdq2n5qX2Q7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "DYG1oqdj0YcKMrFS+Uj3OQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "lDbJke38X/LYwQ4NXzjcXw7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
                "m0M0jZT19vGManJFn6JUtw7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblBM4R7PDP6fNrkpORnefS1PX7CINMd/iXLDxurzYcNmVVPsPYyuq6ZgPn/28UD24t+rY08yVLZu6yhlhVUjWCjkg==",
            ]
            let isOk = 1
            for (let i of lists.slice(0, 5)) {
                let coin = await this.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=videoHbGoldCoin_done`,
                        'form': `avifSupport=0&body={"contentId":"${i}","playType":"163","jsLabel":"${this.random(jsLable)}","activitySource":"1"}&build=169736&client=apple&clientVersion=15.0.20`,
                        user,
                        algo: {
                            sign: true
                        }
                    }
                )
                if (this.haskey(coin, 'success')) {
                    p.log('获得金币:', coin.data.rewardValue)
                    if (!coin.data.rewardValue) {
                        isOk = 0
                        break
                    }
                }
                else {
                    p.log(coin)
                    break
                }
                await this.wait(8000)
            }
            if (!isOk) {
                context.list = null
                for (let i of lists.slice(0, 5)) {
                    let coin = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=videoHbGoldCoin_done`,
                            'form': `avifSupport=0&body={"contentId":"${i}","playType":"163","jsLabel":"\/DM3FV\/PEde9BKNudk4NEQ7LYwslHVatolqZKq0h\/nbpuOtrMZKpsSx6AY1fvblB0Dp+W9WGxfkrD\/y8BAJ3iO5UO\/CKNmGetDYZHD+x2E7ElUM0I3rMHO2XhEv5A+ihHfZ9zCMVtC2h+SmLy042QK2NPMlS2busoZYVVI1go5I=","activitySource":"1"}&build=169736&client=apple&clientVersion=15.0.20`,
                            user,
                            algo: {
                                sign: true
                            }
                        }
                    )
                    if (this.haskey(coin, 'success')) {
                        p.log('获得金币:', coin.data.rewardValue)
                        if (!coin.data.rewardValue) {
                            isOk = 0
                            break
                        }
                    }
                    else {
                        p.log(coin)
                        break
                    }
                    await this.wait(8000)
                }
            }
            if (isOk) {
                p.info.work = true
            }
        }
    }
}

