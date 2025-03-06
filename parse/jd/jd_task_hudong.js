import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东互动整合',
            crontab: 12,
            sync: 1,
            verify: ['linkId'],
            tempExpire: 3 * 86400,
            prompt: {
                id: "活动Id #url里的那部分id,暂只支持部分类型"
            },
            headers: {
                'x-rp-client': "h5_1.0.0",
                'request-from': 'native',
                referer: 'https://h5.m.jd.com/pb/015686010/Bc9WX7MpCW7nW9QjZ5N3fFeJXMH/index.html'
            }
        }
    }

    async prepare() {
        await this.field('id')
    }

    async batch(p) {
        p = await this.getTemp(p.pid) || p
        if (!p.linkId && !p.enAwardK) {
            let url = `https://prodev.m.jd.com/mall/active/${p.id}/index.html?utm_medium=tuiguang&tttparams=zZ1qguleyJnTGF0IjozOS45NjEwNTQsInVuX2FyZWEiOiIxXzI4MDBfNTU4MzhfMCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6IjUzODg3NDg3NyIsImxhdCI6IiIsInBvc0xhdCI6MzkuOTYxMDU0LCJwb3NMbmciOjExNi4zMjIwNjEsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IiIsInVlbXBzIjoiMC0wLTAiLCJnTG5nIjoxMTYuMzIyMDYxLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn70=&utm_source=kong&cu=true`
            let html = await this.curl(url)
            let mainJs = this.unique(this.matchAll(/src="(.*?\.js)"/g, html).filter(d => d.includes('main.')))
            let js = ''
            for (let j of mainJs) {
                js += await this.curl({
                    url: j.includes('http') ? j : `https://${j}`
                })
            }
            let lids = this.unique(this.matchAll(/"linkId"\s*:\s*"([^\"]+)"/g, html))
            if (html.includes('lottery-machine')) {
                for (let linkId of lids) {
                    let lottery = await this.curl({
                            'url': `https://api.m.jd.com/api`,
                            'form': `functionId=lotteryMachineHome&body={"linkId":"${linkId}","taskId":"","inviter":""}&t=1713449252402&appid=activities_platform&client=ios&clientVersion=15.1.1&uuid=de21c6604748f97dd3977153e51a47f4efdb9a47&build=168960&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&lang=zh_CN&osVersion=15.1.1&partner=-1&cthr=1`,
                            delay: 1,
                            algo: {
                                appId: "d7439",
                            }
                        }
                    )
                    if (this.haskey(lottery, 'data.prizeItems')) {
                        p.linkId = linkId
                        p.category = 'lotteryMachine'
                    }
                }
            }
            else if (js.includes('inviteFission')) {
                for (let linkId of lids) {
                    let pl = await this.curl({
                            'url': `https://api.m.jd.com/api`,
                            form: `appid=activities_platform&body={"linkId":"${linkId}","taskId":"","inviter":""}&client=ios&clientVersion=12.3.4&functionId=inviteFissionBeforeHome&t=1718017177605&osVersion=16.2.1&build=169143&rfs=0000`,
                            algo: {
                                appId: '02f8d'
                            },
                        }
                    )
                    if (this.haskey(pl, 'data')) {
                        p.linkId = linkId
                        p.category = 'inviteFission'
                        break
                    }
                }
            }
            else if (js.includes('superLeague')) {
                for (let linkId of lids) {
                    let pl = await this.curl({
                            'url': `https://api.m.jd.com/api`,
                            form: `appid=activities_platform&body={"linkId":"${linkId}","taskId":"","inviter":""}&client=ios&clientVersion=12.3.4&functionId=superLeagueHome&t=1718017177605&osVersion=16.2.1&build=169143&rfs=0000`,
                            algo: {
                                appId: 'b7d17'
                            },
                        }
                    )
                    if (this.haskey(pl, 'data')) {
                        p.linkId = linkId
                        p.category = 'superLeague'
                        break
                    }
                }
            }
            else if (js.includes('wheelsLottery')) {
                for (let linkId of lids) {
                    let pl = await this.curl({
                            'url': `https://api.m.jd.com/api`,
                            'form': `functionId=wheelsHome&body={"linkId":"${linkId}","inviteActId":"","inviterEncryptPin":"","inviteCode":""}&t=1739590571889&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                            algo: {'appId': 'c06b7'},
                        }
                    )
                    if (this.haskey(pl, 'data')) {
                        p.linkId = linkId
                        p.category = 'wheels'
                        break
                    }
                }
            }
            else if (html.includes('enAwardK') && html.includes('encryptAssignmentId')) {
                p.encryptAssignmentId = this.match(/"encryptAssignmentId"\s*:\s*"(\w+)"/, html)
                p.enAwardK = this.match(/"enAwardK"\s*:\s*"([^\"]+)"/, html)
                p.mid = this.match(/"moduleId"\s*:\s*(\d+)/, html)
                p.aid = this.match(/"activityId"\s*:\s*"(\d+)"/, html)
                p.encryptProjectId = this.match(/"encryptProjectId"\s*:\s*"(\w+)"/, html)
                p.category = 'babelGet'
            }
            else {
            }
        }
        return p
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
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
        await this.wait(3000)
        if (this[`_${context.category}`]) {
            try {
                await this[`_${context.category}`](p)
            } catch (e) {
            }
        }
        if (p.prize.length) {
            p.prize.unshift(`linkId: ${context.linkId}`)
            p.msg(p.prize.join("\n"))
            p.prize = []
        }
    }

    async doTask(p) {
        let user = p.data.user;
        let context = p.context;
        let algo = context.algo || {}
        let apTask = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=apTaskList&body={"linkId":"${context.linkId}","channel":4}&t=1738479849113&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                user,
                algo
            }
        )
        if (!apTask) {
            return {
                finish: false
            }
        }
        let isOk = 1
        let userFinishedTimes
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
                                'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}","pipeExt":${this.dumps(i.pipeExt)}}&t=1738480459228&appid=activities_platform&client=ios&clientVersion=15.0.11&loginType=2&loginWQBiz=wegame`,
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
                    case 'FOLLOW_CHANNEL':
                        break
                    case 'BROWSE_CHANNEL':
                    case  'BROWSE_PRODUCT':
                    case 'FOLLOW_SHOP':
                        if (i.taskSourceUrl) {
                            var doTask = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                    'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}","pipeExt":${this.dumps(i.pipeExt)},"taskInsert":false,"itemId":"${encodeURIComponent(i.taskSourceUrl)}"}&t=1738480908001&appid=activities_platform&client=ios&clientVersion=15.0.11`,
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
                                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}"}&t=1739360342034&appid=activities_platform&client=ios&clientVersion=15.0.11`,
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
                                    'form': `functionId=apTaskDetail&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}","pipeExt":${this.dumps(i.pipeExt)}}&t=1738480907628&appid=activities_platform&client=ios&clientVersion=15.0.11&`,
                                    user
                                }
                            )
                            let taskItemList = this.haskey(apTaskDetail, 'data.taskItemList')
                            if (taskItemList.length) {
                                for (let j in Array.from(Array(i.taskLimitTimes - i.taskDoTimes), (_val, index) => index)) {
                                    if (taskItemList[j] && taskItemList[j].itemId) {
                                        if (i.timeLimitPeriod) {
                                            let start = await this.curl({
                                                    'url': `https://api.m.jd.com/api?functionId=apStartTaskTime`,
                                                    'form': `functionId=apStartTaskTime&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}","pipeExt":${this.dumps({
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
                                                'form': `functionId=apDoLimitTimeTask&body={"linkId":"${context.linkId}"}&t=1738483906048&appid=activities_platform&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                                user,
                                                algo: {
                                                    appId: 'ebecc'
                                                }
                                            })
                                        }
                                        else {
                                            var doTask = await this.curl({
                                                    'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                                    'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}","pipeExt":${this.dumps({
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
                                                    'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}"}&t=1739360342034&appid=activities_platform&client=ios&clientVersion=15.0.11`,
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
                            else if (this.haskey(apTaskDetail, 'data.status.userFinishedTimes', 0)) {
                                userFinishedTimes = true
                            }
                        }
                        break
                }
            }
        }
        if (!isOk) {
            isOk = 1
            apTask = await this.curl({
                    'url': `https://api.m.jd.com/api`,
                    'form':
                        `functionId=apTaskList&body={"linkId":"${context.linkId}","channel":4}&t=1738479849113&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user
                }
            )
            for (let i of this.haskey(apTask, 'data')) {
                if (i.taskLimitTimes == i.taskDoTimes) {
                    if (i.canDrawAwardNum) {
                        let award = await this.curl({
                                'url': `https://api.m.jd.com/api?functionId=apTaskDrawAward`,
                                'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"linkId":"${context.linkId}"}&t=1739360342034&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                                user,
                                algo: {
                                    appId: 'f0f3f',
                                    expire: {
                                        code: 1000
                                    }
                                }
                            }
                        )
                        if (this.haskey(award, 'data')) {
                            p.log(`抽奖次数+1`)
                        }
                        else {
                            p.err("抽奖领取失败")
                        }
                        await this.wait(2000)
                    }
                }
                else {
                    switch (i.taskType) {
                        case'ORDER_MARK':
                        case 'SHARE_INVITE':
                        case 'SUBSCRIBE_WITH_RECEIVE':
                        case 'FOLLOW_CHANNEL':
                            break
                        case  'BROWSE_CHANNEL':
                            isOk = userFinishedTimes ? 1 : 0
                            break
                        default:
                            isOk = 0
                            break
                    }
                }
            }
        }
        return {
            finish: isOk
        }
    }

    async _wheels(p) {
        let user = p.data.user;
        let context = p.context;
        let doIt = await this.doTask(p)
        let home = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=wheelsHome&body={"linkId":"${context.linkId}","inviteActId":"","inviterEncryptPin":"","inviteCode":""}&t=1739590571889&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                user,
                algo: {'appId': 'c06b7',},
            }
        )
        if (this.haskey(home, 'code', 12)) {
            p.context.finish = true
            return
        }
        let drawNum = this.haskey(home, 'data.lotteryChances') || 0
        p.log("可抽奖次数:", drawNum)
        for (let i of Array(drawNum)) {
            try {
                let lottery = await this.curl({
                    url: 'https://api.m.jd.com/api',
                    form: `functionId=wheelsLottery&body={"linkId":"${context.linkId}"}&t=1739590600753&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                    algo: {
                        'appId': 'bd6c8',
                        expire: {
                            code: 1000
                        },
                        status: true
                    },
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
                p.log(e)
            }
        }
        if (drawNum != 0) {
            home = await this.curl({
                    'url': `https://api.m.jd.com/api`,
                    'form': `functionId=wheelsHome&body={"linkId":"${context.linkId}","inviteActId":"","inviterEncryptPin":"","inviteCode":""}&t=1739590571889&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                    user,
                    algo: {'appId': 'c06b7'},
                }
            )
            drawNum = this.haskey(home, 'data.lotteryChances')
        }
        if (doIt.finish && drawNum == 0 && home) {
            p.info.work = true
        }
    }

    async _inviteFission(p) {
        let user = p.data.user;
        let context = p.context;
        let doIt = await this.doTask(p)
        let home = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=inviteFissionHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                user,
                algo: {'appId': 'eb67b', status: true},
            }
        )
        if (this.haskey(home, 'code', 12)) {
            p.context.finish = true
            return
        }
        let drawNum = this.haskey(home, 'data.prizeNum') || 0
        p.log("可抽奖次数:", drawNum)
        for (let i of Array(drawNum)) {
            try {
                let lottery = await this.curl({
                    url: 'https://api.m.jd.com/api',
                    form: `functionId=inviteFissionDrawPrize&body={"linkId":"${context.linkId}"}&t=1739359908592&appid=activities_platform&client=ios&clientVersion=15.0.11&loginType=2&loginWQBiz=wegame`,
                    algo: {
                        'appId': 'c02c6',
                        expire: {
                            code: 1000
                        }
                    },
                    user
                })
                if (this.haskey(lottery, 'code', 18002)) {
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
                p.log(e)
            }
        }
        if (drawNum != 0) {
            home = await this.curl({
                    'url': `https://api.m.jd.com/api`,
                    'form': `functionId=inviteFissionHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user,
                    algo: {'appId': 'eb67b', status: true},
                }
            )
            drawNum = this.haskey(home, 'data.prizeNum')
        }
        if (doIt.finish && drawNum == 0 && home) {
            p.info.work = true
        }
    }

    async _superLeague(p) {
        let user = p.data.user;
        let context = p.context;
        let doIt = await this.doTask(p)
        let home = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=superLeagueHome`,
                'form': `functionId=superLeagueHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                user,
                algo: {'appId': 'b7d17', status: true},
            }
        )
        if (this.haskey(home, 'code', 12)) {
            p.context.finish = true
            return
        }
        let drawNum = this.haskey(home, 'data.remainTimes') || 0
        p.log("可抽奖次数:", drawNum)
        for (let i of Array(drawNum)) {
            try {
                let lottery = await this.curl({
                    url: 'https://api.m.jd.com/api?functionId=superLeagueLottery',
                    form: `functionId=superLeagueLottery&body={"linkId":"${context.linkId}"}&t=1738481447131&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    algo: {
                        'appId': '60dc4',
                        expire: {
                            code: 1000
                        }
                    },
                    user
                })
                if (this.haskey(lottery, 'code', 18002)) {
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
                p.log(e)
            }
        }
        if (drawNum != 0) {
            home = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=superLeagueHome`,
                    'form': `functionId=superLeagueHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user,
                    algo: {'appId': 'b7d17'},
                }
            )
            drawNum = this.haskey(home, 'data.remainTimes')
        }
        if (doIt.finish && drawNum == 0 && home) {
            p.info.work = true
        }
    }

    async _lotteryMachine(p) {
        let user = p.data.user;
        let context = p.context;
        let doIt = await this.doTask(p)
        let home = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=lotteryMachineHome`,
                'form': `functionId=lotteryMachineHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                user,
                algo: {'appId': 'd7439'},
            }
        )
        if (this.haskey(home, 'code', 12)) {
            p.context.finish = true
            return
        }
        let drawNum = this.haskey(home, 'data.remainTimes') || 0
        let num = drawNum>5 ? 6 : drawNum
        p.log("可抽奖次数:", num)
        for (let i of Array(num)) {
            try {
                let lottery = await this.curl({
                    url: 'https://api.m.jd.com/api?functionId=lotteryMachineDraw',
                    form: `functionId=lotteryMachineDraw&body={"linkId":"${context.linkId}"}&t=1738481447131&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    algo: {
                        'appId': 'd7439',
                        expire: {
                            code: 1000
                        },
                        status: true
                    },
                    user
                })
                if (this.haskey(lottery, 'code', 18002)) {
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
                p.log(e)
            }
        }
        if (drawNum != 0 && drawNum<6) {
            home = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=lotteryMachineHome`,
                    'form': `functionId=lotteryMachineHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user,
                    algo: {'appId': 'd7439'},
                }
            )
            drawNum = this.haskey(home, 'data.remainTimes')
        }
        if (doIt.finish && drawNum == 0 && home) {
            p.info.work = true
        }
    }

    async _babelGet(p) {
        let user = p.data.user;
        let context = p.context;
        while (true) {
            let lottery = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=babelGetLottery`,
                    'form': `body=%7B%22enAwardK%22%3A%22${encodeURIComponent(context.enAwardK)}%22%2C%22awardSource%22%3A%221%22%2C%22srv%22%3A%22%7B%5C%22bord%5C%22%3A%5C%220%5C%22%2C%5C%22fno%5C%22%3A%5C%220-0-2%5C%22%2C%5C%22mid%5C%22%3A%5C%22${context.mid}%5C%22%2C%5C%22bi2%5C%22%3A%5C%222%5C%22%2C%5C%22bid%5C%22%3A%5C%220%5C%22%2C%5C%22aid%5C%22%3A%5C%22${context.aid}%5C%22%7D%22%2C%22encryptProjectId%22%3A%22${context.encryptProjectId}%22%2C%22encryptAssignmentId%22%3A%22${context.encryptAssignmentId}%22%2C%22authType%22%3A%222%22%2C%22riskParam%22%3A%7B%22platform%22%3A%223%22%2C%22orgType%22%3A%222%22%2C%22openId%22%3A%22-1%22%2C%22pageClickKey%22%3A%22Babel_WheelSurf%22%2C%22eid%22%3A%22UT42BFT33TGS6GOIOWXCCOFR2T5UM44HG27BZ3JBLL5TQWMEHHCGMANY7T3YNDDBPISS4SS7Z7C7T3OFBOP5QFT2KI%22%2C%22fp%22%3A%2272e488edc504c9c767b6866b3576387c%22%2C%22shshshfp%22%3A%22c23f1c90f0550b5c54792f20fb6ba35b%22%2C%22shshshfpa%22%3A%22dc7ab86b-e448-fce6-09f4-bc6cbb608517-1711437197%22%2C%22shshshfpb%22%3A%22BApXcqszQTOpAjBZ7Fg8SUrs91RsApjTNBlMCdrhW9xJ1NN1Sb4LRlxX-7i2a%22%2C%22childActivityUrl%22%3A%22https%253A%252F%252Fpro.m.jd.com%252Fmall%252Factive%252F${context.id}%252Findex.html%253Fstath%253D47%2526navh%253D44%2526tttparams%253DTMjLskeyJnTGF0IjoiMjMuOTM5MTkyIiwidW5fYXJlYSI6IjE2XzEzNDFfMTM0N180NDc1MCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6Ijc2NTc3NTQ4ODIiLCJsYXQiOiIwLjAwMDAwMCIsInBvc0xhdCI6IjIzLjkzOTE5MiIsInBvc0xuZyI6IjExNy42MTEyMyIsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IjAuMDAwMDAwIiwidWVtcHMiOiIwLTAtMCIsImdMbmciOiIxMTcuNjExMjMiLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn60%25253D%22%2C%22userArea%22%3A%22-1%22%2C%22client%22%3A%22%22%2C%22clientVersion%22%3A%22%22%2C%22uuid%22%3A%22%22%2C%22osVersion%22%3A%22%22%2C%22brand%22%3A%22%22%2C%22model%22%3A%22%22%2C%22networkType%22%3A%22%22%2C%22jda%22%3A%22-1%22%7D%2C%22siteClient%22%3A%22apple%22%2C%22mitemAddrId%22%3A%22%22%2C%22geo%22%3A%7B%22lng%22%3A%220.000000%22%2C%22lat%22%3A%220.000000%22%7D%2C%22addressId%22%3A%22%22%2C%22posLng%22%3A%22123.61123%22%2C%22posLat%22%3A%2223.969192%22%2C%22un_area%22%3A%2216_1234_1314_44750%22%2C%22gps_area%22%3A%220_0_0_0%22%2C%22homeLng%22%3A%22123.61123%22%2C%22homeLat%22%3A%2223.969192%22%2C%22homeCityLng%22%3A%22%22%2C%22homeCityLat%22%3A%22%22%2C%22focus%22%3A%22%22%2C%22innerAnchor%22%3A%22%22%2C%22cv%22%3A%222.0%22%2C%22gLng1%22%3A%22%22%2C%22gLat1%22%3A%22%22%2C%22head_area%22%3A%22%22%2C%22fullUrl%22%3A%22https%3A%2F%2Fpro.m.jd.com%2Fmall%2Factive%2F34oVq6LqN9Yshb8Y841RXHG3Nzf7%2Findex.html%3Fstath%3D47%26navh%3D44%26tttparams%3DTMjLskeyJnTGF0IjoiMjMuOTM5MTkyIiwidW5fYXJlYSI6IjE2XzEzNDFfMTM0N180NDc1MCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6Ijc2NTc3NTQ4ODIiLCJsYXQiOiIwLjAwMDAwMCIsInBvc0xhdCI6IjIzLjkzOTE5MiIsInBvc0xuZyI6IjExNy42MTEyMyIsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IjAuMDAwMDAwIiwidWVtcHMiOiIwLTAtMCIsImdMbmciOiIxMTcuNjExMjMiLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn60%253D%22%7D&screen=1170*2259&client=wh5&clientVersion=15.1.1&appid=wh5&functionId=babelGetLottery`,
                    user,
                    algo: {
                        appId: '35fa0',
                        expire: {
                            "code": "3",
                        }
                    }
                }
            )
            let num = parseInt(this.haskey(lottery, 'chances') || 0)
            if (this.haskey(lottery, 'prizeType')) {
                p.msg(lottery.prizeName)
            }
            else {
                p.log(this.haskey(lottery, 'promptMsg') || lottery)
            }
            if (!num) {
                p.info.work = true
                break
            }
            await this.wait(2000)
        }
    }
}

