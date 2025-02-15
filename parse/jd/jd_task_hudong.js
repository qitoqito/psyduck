import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东互动整合',
            crontab: 6,
            sync: 1,
            verify: 1,
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        p.lottery = function(lottery) {
            let data = lottery.data
            let prizeType = data.prizeType || data.rewardType
            let amount = data.amount || data.rewardValue
            if (prizeType == 1) {
                p.log('优惠券:', data.prizeDesc, data.amount)
            }
            else if (prizeType == 2) {
                p.draw(`红包: ${amount}`)
            }
            else if (prizeType == 3) {
                p.draw(`京豆: ${amount}`)
            }
            else if (prizeType == 22) {
                p.draw(`超市卡: ${amount}`)
            }
            else if (prizeType == 0) {
                p.log('没抽到奖品')
            }
            else if (prizeType == 17) {
                p.log('谢谢参与')
            }
            else if (prizeType) {
                p.draw(`抽到类型: ${prizeType} ${data.codeDesc || data.prizeCode} ${data.prizeDesc || data.prizeName}`)
            }
            else {
                p.log("什么也没有")
            }
        }
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
        let apTask = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=apTaskList&body={"linkId":"${context.linkId}","channel":4}&t=1738479849113&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                user
            }
        )
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
                            if (taskItemList) {
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
                        await this.wait(2000)
                    }
                }
                else {
                    switch (i.taskType) {
                        case'ORDER_MARK':
                        case 'SHARE_INVITE':
                        case 'SUBSCRIBE_WITH_RECEIVE':
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
                algo: {'appId': 'c06b7', status: true},
            }
        )
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
                    'form': `functionId=wheelsHome&body={"linkId":"wWGE5McZMFWkhTl-AN_TRQ","inviteActId":"","inviterEncryptPin":"","inviteCode":""}&t=1739590571889&appid=activities_platform&client=ios&clientVersion=15.0.15&cthr=1&loginType=&loginWQBiz=wegame`,
                    user,
                    algo: {'appId': 'c06b7', status: true},
                }
            )
            drawNum = this.haskey(home, 'data.lotteryChances')
        }
        if (doIt.finish && drawNum == 0) {
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
                    let data = lottery.data
                    let prizeType = data.prizeType
                    if (prizeType == 1) {
                        p.log('优惠券:', data.prizeDesc, data.amount)
                    }
                    else if (prizeType == 2) {
                        p.draw(`红包: ${data.amount}`)
                    }
                    else if (prizeType == 3) {
                        p.draw(`京豆: ${data.amount}`)
                    }
                    else if (prizeType == 22) {
                        p.draw(`超市卡: ${data.amount}`)
                    }
                    else if (prizeType == 0) {
                        p.log('没抽到奖品')
                    }
                    else if (prizeType == 17) {
                        p.log('谢谢参与')
                    }
                    else {
                        p.draw(`抽到类型: ${prizeType} ${data.codeDesc} ${data.prizeDesc}`)
                    }
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
        if (doIt.finish && drawNum == 0) {
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
        if (doIt.finish && drawNum == 0) {
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
        let drawNum = this.haskey(home, 'data.remainTimes') || 0
        p.log("可抽奖次数:", drawNum)
        for (let i of Array(drawNum)) {
            try {
                let lottery = await this.curl({
                    url: 'https://api.m.jd.com/api?functionId=lotteryMachineDraw',
                    form: `functionId=lotteryMachineDraw&body={"linkId":"${context.linkId}"}&t=1738481447131&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    algo: {
                        'appId': 'd7439',
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
                    'url': `https://api.m.jd.com/api?functionId=lotteryMachineHome`,
                    'form': `functionId=lotteryMachineHome&body={"linkId":"${context.linkId}","taskId":"","inviter":""}&t=1738481450815&appid=activities_platform&client=ios&clientVersion=15.0.11`,
                    user,
                    algo: {'appId': 'd7439'},
                }
            )
            drawNum = this.haskey(home, 'data.remainTimes')
        }
        if (doIt.finish && drawNum == 0) {
            p.info.work = true
        }
    }
}

