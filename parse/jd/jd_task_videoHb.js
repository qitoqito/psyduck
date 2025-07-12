import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东视频红包',
            interval: 3000,
            round: 4,
            crontab: 4,
            headers: {
                referer: 'https://pro.m.jd.com/mall/active/4VRY8pVY1KRhYkVPgywV5Qa9Rovp/index.html?redsloganFlag=1&useractivity=1&activitySource=1&usertype=1&handTipSwitch=true&subPlayType=-100&cacheWebView=true'
            }
        }
    }

    async prepare() {
        let html = await this.curl({
                'url': `https://pro.m.jd.com/mall/active/4VRY8pVY1KRhYkVPgywV5Qa9Rovp/index.html?tttparams=i2c4MeyJnTGF0IjoiMjMuOTM5MTkyIiwidW5fYXJlYSI6IjE2XzEzNDFfMTM0N180NDc1MCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6Ijc2NTc3NTQ4ODIiLCJsYXQiOiIiLCJwb3NMYXQiOiIyMy45MzkxOTIiLCJwb3NMbmciOiIxMTcuNjExMjMiLCJncHNfYXJlYSI6IjBfMF8wXzAiLCJsbmciOiIiLCJ1ZW1wcyI6IjAtMC0yIiwiZ0xuZyI6IjExNy42MTEyMyIsIm1vZGVsIjoiaVBob25lMTMsMyIsImRMbmciOiIifQ5%3D%3D`,
                user: this.tester()
            }
        )
        let data = []
        for (let content of this.matchAll(/<script>([^\<]+)<\/script>/g, html)) {
            if (content && content.includes('__react_data__')) {
                var window = {}
                eval(content)
                for (let i of this.haskey(window, '__react_data__.activityData.floorList')) {
                    if (this.haskey(i, 'boardParams.scanTaskCode')) {
                        data = i
                    }
                }
            }
        }
        if (data) {
            for (let i in data.boardParams) {
                let v = data.boardParams[i]
                if (i.includes('scanTaskCode')) {
                    this.code.push({
                        "type": "20",
                        "assignmentId": v, "activitySource": "1", "realClient": "ios", "taskRewardType": "1"
                    })
                }
                else if (i == 'liveFollowTaskCode') {
                    this.code.push({
                        "type": "24",
                        "assignmentId": v,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1",
                        "followType": "3"
                    })
                }
                else if (i == 'secondsTaskCode') {
                    this.code.push({
                        "type": "25",
                        "assignmentId": i,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1",
                        "subPlayType": "-100"
                    })
                }
                else if (i == 'jumpTaskCode') {
                    this.code.push(
                        {
                            "type": "28",
                            "assignmentId": i,
                            "activitySource": "1",
                            "realClient": "ios",
                            "floatType": "1"
                        }
                    )
                }
                else if (i == 'fissionTaskCode') {
                    this.code.push({
                        "type": "29",
                        "assignmentId": v,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1"
                    })
                }
                else if (i == 'reserveTaskCode') {
                    this.code.push({
                        "type": "31",
                        "assignmentId": v,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1"
                    })
                }
                else if (i == 'checkTaskCode') {
                    this.code.push({
                        "type": "32",
                        "assignmentId": v,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1"
                    })
                }
                else if (i == 'shortCutTaskCode') {
                    this.code.push({
                        "type": "34",
                        "assignmentId": v,
                        "activitySource": "1",
                        "realClient": "ios",
                        "floatType": "1",
                        "preTaskStep": "1"
                    })
                }
            }
        }
        else {
            this.code = [{"type": "20", "assignmentId": "3pqBgSLxZYRuXYqHB3Mqt491gdW7"}, {
                "type": "20",
                "assignmentId": "42Nh2x5EzX6pdbtDhuSjCn5vbsvG"
            }, {"type": "20", "assignmentId": "3QNFKrBjMdhLAo3cLM9Ybn9A2pMK"}, {
                "type": "20",
                "assignmentId": "3vdcpRcRQYwA9gtaQwXCwz8ajLm"
            }, {"type": "20", "assignmentId": "2352pNzjbjkZmx42QWVeMQBsmVPf"}, {
                "type": "20",
                "assignmentId": "2sRpWMCxxwVPT1i5Z52iBiKe1ec9"
            }]
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let status = 1
        p.info.list = p.info.list || []
        if (context.round == 0) {
            let info = await this.curl({
                    'form': `functionId=videoRedPacketHomePage_info&appid=video-redbag-h5&body=${this.dumps(this.code)}&client=wh5&t=1699156906324&clientVersion=15.1.65`,
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
                    'form': `functionId=videoHb_sign&appid=video-redbag-h5&body={}&client=wh5&t=1704344655057&clientVersion=15.1.65`,
                    user,
                    algo: {appId: '2023f'}
                }
            )
            for (let i of this.haskey(info, 'data')) {
                if (i.type == 31) {
                    let done = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_done&appid=video-redbag-h5&body={"type":"${i.type}","assignmentId":"${i.assignmentId}","activitySource":"1","floatType":"1"}&client=wh5&t=1752112461702&clientVersion=15.1.65`,
                            user,
                            algo: {
                                appId: '12bf2',
                            },
                            referer: "https://pro.m.jd.com/mall/active/tAEkDgxWKkrU1bsKX2EUTU5gi4k/index.html"
                        }
                    )
                    if (this.haskey(done, 'data.rewardMsg')) {
                        p.log(done.data.rewardMsg)
                    }
                    let accept = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_accept&appid=video-redbag-h5&body={"type":"${i.type}","assignmentId":"${i.assignmentId}","activitySource":"1","floatType":"1"}&client=wh5&t=1699157368652&clientVersion=15.1.65`,
                            user,
                            algo: {appId: '57a9c'}
                        }
                    )
                }
                if (i.rewardType) {
                    p.log("已完成:", i.assignmentName, i.type)
                }
                else if (i.type == 24) {
                    p.log("正在运行:", i.assignmentName, i.type)
                    let accept = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_accept&appid=video-redbag-h5&body={"type":"${i.type}","taskRewardType":1,"assignmentId":"${i.assignmentId}","activitySource":"1","realClient":"ios","floatType":"1","preTaskStep":""}&client=wh5&t=1699157368652&clientVersion=15.1.65`,
                            user,
                            algo: {appId: '57a9c'}
                        }
                    )
                    let done = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_done&body={"type":"${i.type}","assignmentId":"${i.assignmentId}","taskRewardType":1,"browseDoneTaskScene":"1","activitySource":"1","realClient":"ios"}&uuid=9dc9d172a3bd4649&client=apple&clientVersion=15.1.65&st=1751954737060&sv=111&sign=0e651176e5d7d110739b4b2cbf545951`,
                            user,
                            algo: {
                                sign: true
                            }
                        }
                    )
                }
                else if (i.type == 32) {
                    p.log("正在运行:", i.assignmentName, i.type)
                    let done = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_done&body={"type":"${i.type}","assignmentId":"${i.assignmentId}","taskRewardType":1,"browseDoneTaskScene":"1","activitySource":"1","realClient":"ios"}&uuid=9dc9d172a3bd4649&client=apple&clientVersion=15.1.65&st=1751954737060&sv=111&sign=0e651176e5d7d110739b4b2cbf545951`,
                            user,
                            algo: {
                                sign: true
                            }
                        }
                    )
                }
                else if (i.type == 34) {
                    p.log("正在运行:", i.assignmentName, i.type)
                    let accept = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_accept&appid=video-redbag-h5&body={"type":"${i.type}","taskRewardType":1,"assignmentId":"${i.assignmentId}","activitySource":"1","realClient":"ios","floatType":"1","preTaskStep":"1"}&client=wh5&t=1699157368652&clientVersion=15.1.65`,
                            user,
                            algo: {appId: '57a9c'}
                        }
                    )
                    let reward = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_done&body={"preTaskStep":"1","projectId":null,"itemId":null,"nickName":null,"activitySource":"1","needMsgConf":null,"img":null,"floatType":"1","helpType":null,"isShowTips":1,"agid":null,"actionType":null,"sourceCode":null,"type":"${i.type}","subPlayType":null,"requestId":null,"riskBrushVo":null,"contentType":null,"interactiveSignTypeEnum":"HONGBAO_CASH","followType":null,"assignmentId":"${i.assignmentId}","contentId":null,"realClient":"ios","taskRewardType":1,"signTaskSource":"1","adid":null,"doneHide":false,"browseDoneTaskScene":"1"}&uuid=9dc9d172a3bd4649&client=apple&clientVersion=15.1.65&st=1751954737060&sv=111&sign=0e651176e5d7d110739b4b2cbf545951`,
                            user,
                            algo: {
                                sign: true
                            }
                        }
                    )
                }
                else {
                    status = 0
                    p.log("正在运行:", i.assignmentName, i.type)
                    let accept = await this.curl({
                            'form': `functionId=videoRedPacketHomePage_accept&appid=video-redbag-h5&body={"type":"${i.type}","assignmentId":"${i.assignmentId}","itemId":"${i.itemId}"}&client=wh5&t=1699157368652&clientVersion=15.1.65`,
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
                        'form': `functionId=videoRedPacketHomePage_done&appid=video-redbag-h5&body={"type":"20","assignmentId":"${i.assignmentId}","itemId":"${i.itemId}"}&client=wh5&t=1699157368652&clientVersion=15.1.65`,
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
                    'form': `functionId=videoRedPacketHomePage_exchangeCash&appid=video-redbag-h5&body={}&client=wh5&t=1699157963924&clientVersion=15.1.65`,
                    user,
                    algo: {appId: "8c80c"}
                }
            )
            if (this.haskey(exchange, 'success')) {
                p.log('金币兑换成功')
            }
            let home = await this.curl({
                    'form': `functionId=videoHbCw_homePage&appid=video-redbag-h5&body=%7B%7D&client=wh5&t=1699156595761&clientVersion=15.1.65`,
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
                                'form': `functionId=videoHbCw_doCw&appid=video-redbag-h5&body={"bizTraceId":"${i.bizTraceId}","amount":${i.amountStr}}&client=wh5&t=1699156604242&clientVersion=15.1.65`,
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
            var lists = ['419744560', '419744560', '419744560', '419744560', '419744560']
            let isOk = 1
            for (let i of lists.slice(0, 5)) {
                let coin = await this.curl({
                        'form': `avifSupport=0&body={"contentId":"${i}","playType":"163","jsLabel":"/DM3FV/PEde9BKNudk4NEQ7LYwslHVatolqZKq0h/nbpuOtrMZKpsSx6AY1fvblB0Dp+W9WGxfkrD/y8BAJ3iO5UO/CKNmGetDYZHD+x2E7ElUM0I3rMHO2XhEv5A+ihHfZ9zCMVtC2h+SmLy042QK2NPMlS2busoZYVVI1go5I=","activitySource":"1"}&build=169736&client=apple&clientVersion=15.0.20&functionId=videoHbGoldCoin_done`,
                        user,
                        algo: {
                            app: true
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
            if (isOk) {
                p.info.work = true
            }
        }
    }
}

