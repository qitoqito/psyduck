import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东新农场',
            help: 'main',
            prompt: {
                'tenWater': '1 #每天只做20次浇水任务',
                'stock': "200 #保留水滴数",
                'tree': '1 #如果检测到没有种树,自动选择一个商品进行种植',
                'inviteJson': 'true #使用自定义助力码'
            },
            headers: {
                'x-rp-client': "h5_1.0.0",
                'request-from': 'native',
                referer: 'https://h5.m.jd.com/pb/015686010/Bc9WX7MpCW7nW9QjZ5N3fFeJXMH/index.html'
            },
            tempExpire: 86400000,
            readme: `如要使用自定义助力码,请在框架目录/inviter创建jd_task_plantBean.json,按需修改[{"user":"a","inviteCode":"abc"},{"user":"b","inviteCode":"efg"}]`,
            turn: 4,
            crontab: 3,
            interval: 1000
        }
    }

    async prepare() {
    }

    async middle() {
        if (this.turnCount == 3) {
            for (let inviter of this.inviter) {
                inviter.category = 'inviteCode'
                inviter.times = 35
                inviter.limit = 1
                this.shareCode(inviter)
            }
            for (let user of this.help) {
                let inviteCode = await this.getTemp(user)
                if (inviteCode) {
                    this.shareCode({
                        user,
                        inviteCode,
                        category: 'inviteCode',
                        times: 35,
                        limit: 1
                    })
                }
            }
        }
        else if (this.turnCount == 1) {
            this.shareCode({
                task: 'main'
            })
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (this.turnCount == 0) {
            p.context.complete = true
        }
        if (this.turnCount == 0) {
            if (this.turnCount == 0) {
                let signIn = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `functionId=dongDongFarmSignIn&body={"linkId":"LCH-fV7hSnChB-6i5f4ayw"}&t=1740546479554&appid=activities_platform&client=ios&clientVersion=15.0.20&&build=169736&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&lang=zh_CN&osVersion=15.1.1&partner=-1&cthr=1`,
                        user, algo: {
                            appId: '65f9d'
                        }
                    }
                )
                if (this.haskey(signIn, 'success')) {
                    p.log('签到成功')
                }
                else {
                    p.log(this.haskey(signIn, 'errMsg') || '签到失败')
                }
            }
            let farmHome = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `appid=signed_wh5&body={"version":9,"channelParam":"1"}&client=apple&clientVersion=15.0.11&functionId=farm_home`,
                    user,
                    algo: {
                        appId: 'c57f6',
                        expire: {
                            code: -30001
                        }
                    }
                }
            )
            if (!farmHome) {
                return
            }
            let home = this.haskey(farmHome, 'data.result') || {}
            let bizCode = farmHome.data.bizCode
            let treeFullStage = home.treeFullStage
            if (bizCode == -1001) {
                p.err('活动太火爆了， 请稍后再试~')
                return
            }
            if (treeFullStage == 5) {
                p.msg(`商品可兑换`)
            }
            if (treeFullStage == 5 && this.profile.tree) {
                p.log('没有种树')
                let board = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `appid=signed_wh5&body={"version":10,"channelParam":"1","boardType":"level"}&client=apple&clientVersion=15.0.11&functionId=farm_tree_board`,
                        user,
                    }
                )
                try {
                    let skus = board.data.result.farmTreeLevels[2].farmLevelTrees[0]
                    p.log("正在种树,选择商品:", skus.skuName)
                    await this.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `appid=signed_wh5&body=${this.dumps({
                                "version": 10,
                                "channelParam": "1",
                                "uid": skus.uid,
                                "type": "plantSku"
                            })}&client=apple&clientVersion=15.0.11&functionId=farm_plant_tree`,
                            user,
                        }
                    )
                    if (this.haskey(tree, 'data.success')) {
                        farmHome = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_wh5&body={"version":10,"channelParam":"1"}&client=apple&clientVersion=15.0.11&functionId=farm_home`,
                                user,
                                algo: {
                                    appId: 'c57f6',
                                }
                            }
                        )
                        if (!farmHome) {
                            return
                        }
                        home = this.haskey(farmHome, 'data.result') || {}
                    }
                    else {
                        p.log("种树失败")
                        return
                    }
                } catch (e) {
                    console.log(e)
                    p.log("种树失败2")
                }
            }
            let inviteCode = home.farmHomeShare.inviteCode
            let bottleWater = home.bottleWater
            p.log("当前进度:", home.waterTips)
            let taskList = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&t=1740322939720&body={"version":10,"channelParam":"1","channel":0,"pushSwitch":false,"showSubscribe":true,"babelChannel":"ttt6","lbsSwitch":false}&functionId=farm_task_list&rfs=0000`,
                    user
                }
            )
            let waterConut = 0
            let status = 1
            for (let i of this.haskey(taskList, 'data.result.taskList')) {
                if (i.mainTitle.includes("助力")) {
                }
                else if (i.mainTitle.includes("通知")) {
                }
                else if (i.mainTitle.includes("下单")) {
                }
                else if (i.mainTitle.includes("浇水")) {
                    if (i.taskDoTimes != i.taskLimitTimes) {
                        p.log("正在运行:", i.mainTitle)
                        let isOk = 1
                        status = 0
                        for (let n of Array(parseInt((i.taskLimitTimes - i.taskDoTimes) / 5))) {
                            let water = await this.curl({
                                    'url': `http://api.m.jd.com/client.action`,
                                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.20&screen=390*812&wqDefault=false&build=169736&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740546580076&body={"version":10,"channelParam":"1","waterType":2,"babelChannel":"ttt6","lbsSwitch":false}&functionId=farm_water`,
                                    user,
                                    algo: {
                                        appId: '28981'
                                    }
                                }
                            )
                            let bottleWater = this.haskey(water, 'data.result.bottleWater')
                            if (bottleWater) {
                                p.log("浇水中,剩余水滴:", bottleWater)
                                if (bottleWater<10) {
                                    isOk = 0
                                    break
                                }
                                await this.wait(1000)
                            }
                            else {
                                console.log(water)
                                p.log('浇水失败:', this.haskey(water, 'data.bizMsg'))
                                isOk = 0
                                status = 0
                                break
                            }
                        }
                        for (let n of Array(((i.taskLimitTimes - i.taskDoTimes) % 5))) {
                            let water = await this.curl({
                                    'url': `http://api.m.jd.com/client.action`,
                                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.20&screen=390*812&wqDefault=false&build=169736&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740546580076&body={"version":10,"channelParam":"1","waterType":1,"babelChannel":"ttt6","lbsSwitch":false}&functionId=farm_water`,
                                    user,
                                    algo: {
                                        appId: '28981'
                                    }
                                }
                            )
                            let bottleWater = this.haskey(water, 'data.result.bottleWater')
                            if (bottleWater) {
                                p.log("浇水中,剩余水滴:", bottleWater)
                                if (bottleWater<10) {
                                    isOk = 0
                                    break
                                }
                                await this.wait(1000)
                            }
                            else {
                                p.log('浇水失败:', this.haskey(water, 'data.bizMsg'))
                                isOk = 0
                                break
                            }
                        }
                        if (isOk) {
                            let award = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740323796058&body={"version":10,"channelParam":"1","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                                    user,
                                    algo: {'appId': '33e0f'},
                                }
                            )
                            if (this.haskey(award, 'data.result.taskAward')) {
                                status = 1
                                // p.log("获得奖励:", award.data.result.taskAward)
                                for (let kk of award.data.result.taskAward) {
                                    if (this.haskey(kk, 'awardType', 1)) {
                                        bottleWater += kk.awardValue
                                        p.log(`获得水滴:`, kk.awardValue)
                                    }
                                }
                            }
                            else {
                                status = 0
                                p.err("获取失败:", this.haskey(award, 'data.bizMsg'))
                            }
                        }
                        if (bottleWater<200) {
                            status = 0
                        }
                    }
                }
                else if (i.taskDoTimes != i.taskLimitTimes) {
                    status = 0
                    p.log("正在运行:", i.mainTitle)
                    let itemId = i.taskSourceUrl
                    let taskDetaiList = []
                    if (itemId) {
                        taskDetaiList.push({'itemId': itemId})
                    }
                    else {
                        let detail = await await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&body={"version":10,"channelParam":"1","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_detail`,
                                user
                            }
                        )
                        if (this.haskey(detail, 'data.result.taskDetaiList')) {
                            taskDetaiList = detail.data.result.taskDetaiList
                        }
                    }
                    for (let kk of taskDetaiList) {
                        if (i.timePeriod) {
                            p.log("等待:", i.timePeriod, 's')
                            await this.wait(i.timePeriod * 1000)
                        }
                        let doTask = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740323572547&body={"version":10,"channelParam":"1","taskType":"${i.taskType}","taskId":${i.taskId},"taskInsert":${kk.taskInsert || false},"itemId":"${new Buffer.from(kk.itemId).toString('base64')}","channel":0}&functionId=farm_do_task`,
                                user,
                                algo: {
                                    appId: '28981'
                                }
                            }
                        )
                        if (this.haskey(doTask, 'data.success')) {
                            let award = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740323796058&body={"version":10,"channelParam":"1","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                                    user, algo: {'appId': '33e0f'},
                                }
                            )
                            if (this.haskey(award, 'data.result.taskAward')) {
                                status = 1
                                // p.log("获得奖励:", award.data.result.taskAward)
                                for (let kk of award.data.result.taskAward) {
                                    if (this.haskey(kk, 'awardType', 1)) {
                                        bottleWater += kk.awardValue
                                        p.log(`获得水滴:`, kk.awardValue)
                                    }
                                }
                            }
                            else {
                                p.err("获取失败:", this.haskey(award, 'data.bizMsg'))
                            }
                        }
                        else {
                            p.err("任务失败:", this.haskey(doTask, 'data.bizMsg'))
                        }
                    }
                }
                else if (i.taskStatus == 2) {
                    let award = await this.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `appid=signed_wh5&client=apple&clientVersion=15.0.15&screen=390*812&wqDefault=false&build=169720&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740323796058&body={"version":10,"channelParam":"1","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                            user,
                            algo: {'appId': '33e0f'},
                        }
                    )
                    if (this.haskey(award, 'data.result.taskAward')) {
                        status = 1
                        // p.log("获得奖励:", award.data.result.taskAward)
                        for (let kk of award.data.result.taskAward) {
                            if (this.haskey(kk, 'awardType', 1)) {
                                bottleWater += kk.awardValue
                                p.log(`获得水滴:`, kk.awardValue)
                            }
                        }
                    }
                    else {
                        status = 0
                        p.err("获取失败:", this.haskey(award, 'data.bizMsg'))
                    }
                    await this.wait(4000)
                }
                else {
                    p.log("任务已完成:", i.mainTitle)
                    status = 1
                }
            }
            let s1 = 1
            if (this.profile.tenWater) {
                p.log("跳过浇水: 检测到配置了tenWater参数,跳过浇水")
            }
            else {
                let stock = parseInt(this.profile.stock || 200)
                p.log("剩余水滴:", bottleWater, '保留水滴数:', stock)
                if (bottleWater>stock) {
                    while (true) {
                        s1 = 0
                        let water = await this.curl({
                                'url': `http://api.m.jd.com/client.action`,
                                'form':
                                    `appid=signed_wh5&client=apple&clientVersion=15.0.20&screen=390*812&wqDefault=false&build=169736&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&partner=&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&t=1740546580076&body={"version":10,"channelParam":"1","waterType":2,"babelChannel":"ttt6","lbsSwitch":false}&functionId=farm_water`,
                                user,
                                algo:
                                    {
                                        appId: '28981'
                                    }
                            }
                        )
                        let bottleWater = this.haskey(water, 'data.result.bottleWater')
                        if (bottleWater) {
                            s1 = 1
                            p.log("浇水中,剩余水滴:", bottleWater)
                            if (bottleWater<stock) {
                                break
                            }
                            await this.wait(1000)
                        }
                        else {
                            s1 = 0
                            p.log('浇水失败:', this.haskey(water, 'data.bizMsg'))
                            break
                        }
                    }
                }
            }
            if (status && s1) {
                p.info.work = true
            }
        }
        else if (this.turnCount == 3) {
            if (context.user == user) {
                p.log("不能助力自己")
            }
            else {
                let help = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `appid=signed_wh5&body=${this.dumps({
                            "version": 9,
                            "inviteCode": context.inviteCode,
                            "shareChannel": "ttt7",
                            "assistChannel": ""
                        })}&client=apple&clientVersion=15.0.11&functionId=farm_assist`,
                        user,
                        algo: {
                            appId: '28981',
                            expire: {
                                "code": -30001,
                            }
                        }
                    }
                )
                let bizCode = this.haskey(help, 'data.bizCode')
                if (bizCode == 5003) {
                    p.log("今天已经帮过TA啦")
                    p.info.help = true
                }
                else if (bizCode == 5004) {
                    p.info.complete = true
                    p.log("今天不能再助力啦")
                }
                else if (bizCode == 5005) {
                    p.log("助力满了,跳过助力")
                    p.context.finish = true
                }
                else if (bizCode == -1001) {
                    p.log("活动火爆")
                    p.info.jump = true
                }
                else if (this.haskey(help, 'data.success')) {
                    p.info.help = true
                    p.log(`助力成功: ${context.user || context.inviteCode}`)
                }
                else {
                    p.log(this.haskey(help, 'data') || help)
                }
                await this.wait(1000)
            }
        }
        else if (this.turnCount == 2) {
            p.lottery = function(lottery) {
                let data = lottery.data
                let prizeType = data.prizeType || data.rewardType
                let amount = data.amount || data.rewardValue
                if (prizeType == 0) {
                    p.log('没抽到奖品')
                }
                else if (prizeType == 1) {
                    p.log('优惠券:', data.codeDesc || data.prizeCode, data.prizeDesc || data.prizeName)
                }
                else if (prizeType == 2) {
                    p.draw(`红包: ${amount}`)
                }
                else if (prizeType == 3) {
                    p.draw(`京豆: ${amount}`)
                }
                else if (prizeType == 17) {
                    p.log('谢谢参与')
                }
                else if (prizeType == 18) {
                    p.log(`水滴: ${amount}`)
                }
                else if (prizeType == 22) {
                    p.draw(`超市卡: ${amount}`)
                }
                else if (prizeType) {
                    p.draw(`抽到类型: ${prizeType} ${data.codeDesc || data.prizeCode} ${data.prizeDesc || data.prizeName}`)
                }
                else {
                    p.log("什么也没有")
                }
            }
            let linkId = "VssYBUKJOen7HZXpC8dRFA"
            let apTask = await this.curl({
                    'url': `https://api.m.jd.com/api`,
                    'form': `functionId=apTaskList&body={"linkId":"${linkId}","channel":4}&t=1738479849113&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user,
                }
            )
            if (!apTask) {
                p.err("没有获取到转盘数据...")
                return
            }
            let isOk = 1
            for (let i of this.haskey(apTask, 'data')) {
                if (i.taskLimitTimes == i.taskDoTimes) {
                    p.log("任务已完成:", i.taskShowTitle)
                }
                else {
                    isOk = 0
                    p.log(`正在运行:`, i.taskTitle, i.taskType)
                    switch (i.taskType) {
                        case 'SIGN':
                            let sign = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                    'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}","pipeExt":${this.dumps(i.pipeExt)}}&t=1738480459228&appid=activities_platform&client=ios&clientVersion=15.0.11&loginType=2&loginWQBiz=wegame`,
                                    algo: {
                                        appId: '54ed7'
                                    },
                                    user
                                }
                            )
                            if (this.haskey(sign, 'data.finished')) {
                                p.log("任务完成...")
                            }
                        case 'ORDER_MARK':
                        case 'SUBSCRIBE_WITH_RECEIVE':
                            break
                        case 'BROWSE_CHANNEL':
                        case  'BROWSE_PRODUCT':
                        case 'FOLLOW_SHOP':
                            if (i.taskSourceUrl) {
                                var doTask = await this.curl({
                                        'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                        'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}","pipeExt":${this.dumps(i.pipeExt)},"taskInsert":false,"itemId":"${encodeURIComponent(i.taskSourceUrl)}"}&t=1738480908001&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                                        algo: {'appId': '54ed7'},
                                        user
                                    }
                                )
                                if (this.haskey(doTask, 'success')) {
                                    p.log("任务完成")
                                }
                                else {
                                    p.log("任务失败:", this.haskey(doTask, 'errMsg') || doTask)
                                }
                                if (i.canDrawAwardNum) {
                                    let award = await this.curl({
                                            'url': `https://api.m.jd.com/api?functionId=apTaskDrawAward`,
                                            'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}"}&t=1739360342034&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                                            user,
                                            algo: {
                                                appId: 'f0f3f'
                                            }
                                        }
                                    )
                                    if (this.haskey(award, 'data')) {
                                        p.log(`抽奖次数+1`)
                                    }
                                    else {
                                        p.err("抽奖领取失败")
                                    }
                                }
                            }
                            else {
                                let apTaskDetail = await this.curl({
                                        'url': `https://api.m.jd.com/api?functionId=apTaskDetail`,
                                        'form': `functionId=apTaskDetail&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}","pipeExt":${this.dumps(i.pipeExt)}}&t=1738480907628&appid=activities_platform&client=ios&clientVersion=15.0.11&`,
                                        user
                                    }
                                )
                                let taskItemList = this.haskey(apTaskDetail, 'data.taskItemList')
                                if (taskItemList) {
                                    for (let j in Array.from(Array(i.taskLimitTimes - i.taskDoTimes), (_val, index) => index)) {
                                        if (taskItemList[j] && taskItemList[j].itemId) {
                                            if (i.timeLimitPeriod) {
                                                let start = await this.curl({
                                                        'url': `https://api.m.jd.com/api?functionId=apStartTaskTime`,
                                                        'form': `functionId=apStartTaskTime&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}","pipeExt":${this.dumps({
                                                            ...i.pipeExt, ...taskItemList[j].pipeExt
                                                        })},"taskInsert":false,"itemId":"${encodeURIComponent(taskItemList[j].itemId)}"}&t=1738483884373&appid=activity_platform_se&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                                        user,
                                                        algo: {
                                                            appId: 'acb1e'
                                                        }
                                                    }
                                                )
                                                if (this.haskey(start, 'code', 1)) {
                                                    p.log("失败了")
                                                    break
                                                }
                                                p.log(`等待${i.timeLimitPeriod}秒...`)
                                                await this.wait(i.timeLimitPeriod * 1000)
                                                var doTask = await this.curl({
                                                    'url': `https://api.m.jd.com/api?functionId=apDoLimitTimeTask`,
                                                    'form': `functionId=apDoLimitTimeTask&body={"linkId":"${linkId}"}&t=1738483906048&appid=activities_platform&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                                    user,
                                                    algo: {
                                                        appId: 'ebecc'
                                                    }
                                                })
                                            }
                                            else {
                                                var doTask = await this.curl({
                                                        'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                                        'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}","pipeExt":${this.dumps({
                                                            ...i.pipeExt, ...taskItemList[j].pipeExt
                                                        })},"taskInsert":false,"itemId":"${encodeURIComponent(taskItemList[j].itemId)}"}&t=1738480908001&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                                                        algo: {'appId': '54ed7'},
                                                        user
                                                    }
                                                )
                                            }
                                            if (this.haskey(doTask, 'success')) {
                                                p.log("任务完成", `[${parseInt(j) + 1}/${i.taskLimitTimes - i.taskDoTimes}]`)
                                            }
                                            else {
                                                p.log("任务失败:", this.haskey(doTask, 'errMsg') || doTask)
                                            }
                                            if (i.canDrawAwardNum) {
                                                let award = await this.curl({
                                                        'url': `https://api.m.jd.com/api?functionId=apTaskDrawAward`,
                                                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${linkId}"}&t=1739360342034&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                                                        user,
                                                        algo: {
                                                            appId: 'f0f3f'
                                                        }
                                                    }
                                                )
                                                if (this.haskey(award, 'data')) {
                                                    p.log(`抽奖次数+1`)
                                                }
                                                else {
                                                    p.err("抽奖领取失败")
                                                }
                                            }
                                            await this.wait(3000)
                                        }
                                    }
                                }
                            }
                            break
                    }
                }
            }
            let home = await this.curl({
                    'url': `http://api.m.jd.com/api`,
                    'form': `functionId=wheelsHome&body={"linkId":"${linkId}","inviteActId":"","inviterEncryptPin":"","inviteCode":""}&t=1739590571889&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                    user,
                    algo: {'appId': 'c06b7',},
                }
            )
            if (!home) {
                isOk = 0
            }
            let drawNum = this.haskey(home, 'data.lotteryChances') || 0
            p.log("可抽奖次数:", drawNum)
            for (let i of Array(drawNum)) {
                try {
                    let lottery = await this.curl({
                        url: 'https://api.m.jd.com/api',
                        form: `functionId=wheelsLottery&body={"linkId":"${linkId}"}&t=1739590600753&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                        algo: {
                            'appId': 'bd6c8',
                            expire: {
                                code: 1000
                            },
                            status: true
                        },
                        referer: `https://lotterydraw-new.jd.com/?id=${linkId}`,
                        user
                    })
                    if (this.haskey(lottery, 'code', 4000)) {
                        p.log('抽奖机会用完啦')
                        break
                    }
                    if (this.haskey(lottery, 'data')) {
                        drawNum--
                        p.lottery(lottery)
                    }
                    else {
                        p.err("抽奖错误")
                        break
                    }
                    await this.wait(2000)
                } catch (e) {
                }
            }
            if (isOk && drawNum == 0) {
                p.info.work = true
            }
        }
        else if (this.turnCount == 1) {
            let helpInfo = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `appid=signed_wh5&client=apple&clientVersion=15.0.11&screen=820*1110&wqDefault=false&build=169714&osVersion=16.6&networkType=wifi&d_brand=iPhone&d_model=iPad13,18&partner=&t=1740556273015&body={"version":10,"channelParam":"1"}&functionId=farm_assist_init_info`,
                    user
                }
            )
            if (!helpInfo) {
                p.err("没有获取到助力数据")
            }
            else {
                p.log("正在领取助力奖励")
            }
            for (let i of this.haskey(helpInfo, 'data.result.assistStageList')) {
                if (i.stageStaus == 2) {
                    let award = await this.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `appid=signed_wh5&client=apple&clientVersion=15.0.11&screen=820*1110&wqDefault=false&build=169714&osVersion=16.6&networkType=wifi&d_brand=iPhone&d_model=iPad13,18&partner=&t=1740556273015&body={"version":10,"channelParam":"1"}&functionId=farm_assist_receive_award`,
                            user,
                            algo: {'appId': 'c4332'},
                        }
                    )
                    if (this.haskey(award, 'data.success')) {
                        p.log("获取助力奖励成功:", award.data.result.amount)
                    }
                    else {
                        p.log("获取助力奖励失败")
                    }
                    await this.wait(4000)
                }
            }
        }
    }
}

