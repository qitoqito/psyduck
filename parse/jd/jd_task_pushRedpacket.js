import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东天天推红包',
            crontab: 3,
            // keyExpire: 24000,
        }
    }

    async prepare() {
        this.shareCode({
            "linkId": "KyqYvBfVjPKalXtn5pnBlA"
        })
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let home = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=pushRedPocketHome`,
                'form': `functionId=pushRedPocketHome&body={"envType":1,"linkId":"${context.linkId}"}&t=1747750999931&appid=activities_platform&client=ios&clientVersion=15.1.25`,
                user,
                algo: {
                    expire: {
                        "code": 1000,
                    }
                }
            }
        )
        for (let i of this.haskey(home, 'data.cumulativeSessionInfo.awardLists')) {
            if (this.haskey(i, 'commonRewardInfo.clickType', 3)) {
                p.log("正在领取:", i.level)
                let reward = await this.curl({
                        'url': `https://api.m.jd.com/api?functionId=pushRedPocketAwardPrize`,
                        'form': `functionId=pushRedPocketAwardPrize&body={"envType":1,"linkId":"${context.linkId}","sourceKey":"${i.commonRewardInfo.encryptStr}"}&t=1748609238263&appid=activities_platform&client=android&clientVersion=15.1.35&platform=3`,
                        user,
                        algo: {
                            appId: 'f62ba'
                        }
                    }
                )
                if (this.haskey(reward, 'data.prizeConfigName')) {
                    p.log("领取成功....")
                    if (reward.data.prizeConfigName == '红包') {
                        p.award(reward.data.amount, 'redpacket')
                    }
                }
                else {
                    p.log("领取失败....")
                }
                await this.wait(2000)
            }
        }
        let beat = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=pushRedPocketHeartbeat`,
                'form': `functionId=pushRedPocketHeartbeat&body={"envType":1,"linkId":"${context.linkId}"}&t=1748609960123&appid=activities_platform&client=android&clientVersion=15.1.35&platform=3&loginType=2&loginWQBiz=wegame`,
                user,
                algo: {
                    appId: '2971f'
                }
            }
        )
        if (this.haskey(beat, 'data.piggyBankInfo.encryptStr')) {
            let draw = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=giftBombDrawPrize`,
                    'form': `functionId=giftBombDrawPrize&body={"linkId":"Y0bZtkOu-_Vr2nNHEReHuA","lotteryKey":"${beat.data.piggyBankInfo.encryptStr}","area":"0_0_0_0"}&t=1748609967386&appid=activities_platform&client=android&clientVersion=15.1.35&platform=3&loginType=2`,
                    user,
                    algo: {
                        appId: 'a9449'
                    }
                }
            )
            if (this.haskey(draw, 'data.prizeConfigName')) {
                p.log("领取成功....")
                if (draw.data.prizeConfigName == '红包') {
                    p.log(draw.data.amount, 'redpacket')
                }
            }
            else {
                p.log("领取失败....")
            }
        }
        let list = await this.curl({
            'url': `https://api.m.jd.com/`,
            'form': `functionId=apTaskList&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
            user
        })
        for (let i of this.haskey(list, 'data')) {
            if (i.taskDoTimes != i.taskLimitTimes) {
                let ok = 0
                for (let j = 0; j<i.taskLimitTimes - i.taskDoTimes; j++) {
                    if (ok) {
                        break
                    }
                    p.log(`正在做:`, i.subTitle, i.taskType)
                    switch (i.taskType) {
                        case 'ORDER_MARK':
                            break
                        case 'SHARE_INVITE':
                            break
                        case 'SIGN':
                            let ss = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apDoTask&body={"taskType":"SIGN","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user,
                                algo: {
                                    appId: 'cd949'
                                }
                            })
                            let dd = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user,
                                algo: {
                                    appId: "55276"
                                }
                            })
                            if (this.haskey(dd, 'success')) {
                                p.log('任务完成:', dd.success)
                            }
                            break
                        case 'BROWSE_CHANNEL':
                        case 'BROWSE_PRODUCT':
                        case 'BROWSE_RTB':
                        case 'ADD_PURCHASE':
                        case 'BROWSE_SHOP':
                        case 'FOLLOW_CHANNEL':
                        case 'FOLLOW_SHOP':
                        case 'XHS_SHARE':
                            let detail = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apTaskDetail&body={"taskType":"${i.taskType}","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","channel":4,"linkId":"${context.linkId}","pipeExt":${this.dumps(i.pipeExt)}}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user
                            })
                            let taskItemList = this.haskey(detail, 'data.taskItemList')
                            if (taskItemList) {
                                if (i.taskLimitTimes == 1) {
                                    let s = await this.curl({
                                            'url': `https://api.m.jd.com/api?functionId=apsDoTask`,
                                            'form': `functionId=apsDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"cityId":"","provinceId":"","countyId":"","linkId":"${context.linkId}","taskInsert":false,"itemId":"${encodeURIComponent(taskItemList[0].itemId)}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                            user,
                                            algo: {
                                                appId: '54ed7'
                                            }
                                        }
                                    )
                                }
                                for (let j in Array.from(Array(i.taskLimitTimes - i.taskDoTimes), (_val, index) => index)) {
                                    if (taskItemList[j] && taskItemList[j].itemId) {
                                        if (taskItemList[j].pipeExt) {
                                            var start = await this.curl({
                                                    'form': `functionId=apStartTaskTime&body={"linkId":"${context.linkId}","taskId":${i.id},"itemType":"${taskItemList[j].itemType}","itemId":"${encodeURIComponent(taskItemList[j].itemId)}","channel":4,"pipeExt":${this.dumps({
                                                        ...i.pipeExt, ...taskItemList[j].pipeExt
                                                    })}}&t=1738483884373&appid=activity_platform_se&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                                    user,
                                                    algo: {
                                                        appId: 'acb1e'
                                                    }
                                                }
                                            )
                                        }
                                        else {
                                            var start = await this.curl({
                                                    'form': `functionId=apStartTaskTime&body={"linkId":"${context.linkId}","taskId":${i.id},"itemId":"${encodeURIComponent(taskItemList[j].itemId)}","taskInsert":true,"channel":4}&t=1738483884373&appid=activity_platform_se&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                                    user,
                                                    algo: {
                                                        appId: 'acb1e'
                                                    }
                                                }
                                            )
                                        }
                                        if (this.haskey(start, 'code', 1)) {
                                            p.log("失败了")
                                            break
                                        }
                                        if (i.timeLimitPeriod) {
                                            await this.wait(i.timeLimitPeriod * 1000)
                                        }
                                        var doTask = await this.curl({
                                            'url': `https://api.m.jd.com/api?functionId=apDoLimitTimeTask`,
                                            'form': `functionId=apDoLimitTimeTask&body={"linkId":"${context.linkId}"}&t=1738483906048&appid=activities_platform&client=ios&clientVersion=15.0.11&platform=3&loginType=2&loginWQBiz=wegame`,
                                            user,
                                            algo: {
                                                appId: 'ebecc'
                                            }
                                        })
                                        if (this.haskey(doTask, 'success')) {
                                            p.log("任务完成", `[${parseInt(j) + 1}/${i.taskLimitTimes - i.taskDoTimes}]`)
                                            let d = await this.curl({
                                                'url': `https://api.m.jd.com/`,
                                                'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                                user,
                                                algo: {
                                                    appId: "55276"
                                                }
                                            })
                                        }
                                        else if (this.haskey(doTask, 'code', 2031)) {
                                            p.log("任务失败:", this.haskey(doTask, 'errMsg') || doTask)
                                            break
                                        }
                                        else {
                                            p.log("任务失败:", this.haskey(doTask, 'errMsg') || doTask)
                                        }
                                        await this.wait(3000)
                                    }
                                }
                            }
                            else {
                                let s = await this.curl({
                                    'url': `https://api.m.jd.com/`,
                                    form: `functionId=apDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","channel":4,"linkId":"${context.linkId}","taskInsert":true,"itemId":"${encodeURIComponent(i.taskSourceUrl)}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                    user,
                                    algo: {
                                        appId: 'cd949'
                                    }
                                })
                                if (this.haskey(s, 'success')) {
                                    let d = await this.curl({
                                        'url': `https://api.m.jd.com/`,
                                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                        user,
                                        algo: {
                                            appId: "55276"
                                        }
                                    })
                                    if (this.haskey(d, 'success')) {
                                        p.log('任务完成:', d.success)
                                    }
                                }
                                else {
                                    p.log(this.haskey(s, 'errMsg') || s)
                                    break
                                }
                            }
                            break
                    }
                }
            }
            else {
                p.log(`任务完成`, i.subTitle)
            }
        }
        let end = 0
        let area = this.profile.area || "1_2802_54751_0"
        for (let i of Array(3)) {
            if (end) {
                break
            }
            let lib = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=lbsHome`,
                    'form': `functionId=lbsHome&body={"envType":1,"linkId":"eC4evMxiFrTo0SiIE1GNlA","area":"${area}"}&t=1748611142069&appid=activities_platform&client=ios&clientVersion=15.1.35&platform=3&loginType=2`,
                    user,
                    alog: {
                        appId: "f3a26"
                    }
                }
            )
            if (this.haskey(lib, 'data.radarShowList')) {
                for (let i of lib.data.radarShowList) {
                    if (i.nickName) {
                        p.log("正在夺取:", i.nickName)
                        let seek = await this.curl({
                                'url': `https://api.m.jd.com/api?functionId=lbsSeek`,
                                'form': `functionId=lbsSeek&body={"envType":1,"linkId":"eC4evMxiFrTo0SiIE1GNlA","area":"${area}","seekType":${i.type},"encryptId":"${i.encryptId}"}&t=1748611415910&appid=activities_platform&client=ios&clientVersion=15.1.35&platform=3`,
                                user,
                                algo: {
                                    appId: 'f3a26'
                                }
                            }
                        )
                        if (this.haskey(seek, 'data.seekAwardInfo.prizeNum')) {
                            p.log("夺取红包个数:", seek.data.seekAwardInfo.prizeNum)
                        }
                        if (this.haskey(seek, "code", 109005)) {
                            p.log('今日夺宝次数已达上限')
                            end++
                            break
                        }
                    }
                }
            }
            else {
                end++
            }
        }
        while (1) {
            let lottery = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=pushRedPacketPush`,
                    'form': `functionId=pushRedPacketPush&body={"envType":1,"linkId":"${context.linkId}","ruleId":"1_2"}&t=1747750548822&appid=activities_platform&client=ios&clientVersion=15.1.25`,
                    user
                }
            )
            if (!this.haskey(lottery, 'data.prizeNum')) {
                p.log("没有抽奖次数")
                break
            }
            else {
                if (lottery.data.prizeNum>6) {
                    p.info.work = true
                }
            }
            let data = this.haskey(lottery, 'data.pushPrizeVo') || {}
            let prizeType = data.prizeType || data.rewardType
            let amount = data.amount || data.rewardValue || data.prizeDesc
            if (prizeType == 0) {
                p.log('没抽到奖品')
            }
            else if (prizeType == 1) {
                p.log('优惠券:', data.limitStr || data.codeDesc || data.prizeCode, data.prizeDesc || data.prizeName)
            }
            else if (prizeType == 2) {
                p.award(amount, 'redpacket')
            }
            else if (prizeType == 3) {
                p.award(amount, 'bean')
            }
            else if (prizeType == 5) {
                p.award(data.prizeDesc || data.prizeName || data.limitStr, 'reward')
            }
            else if (prizeType == 17) {
                p.log('谢谢参与')
            }
            else if (prizeType == 18) {
                p.log(`水滴: ${amount}`)
            }
            else if (prizeType == 22) {
                p.award(amount, 'card')
            }
            else if (prizeType) {
                p.draw(`抽到类型: ${prizeType} ${data.limitStr || data.codeDesc || data.prizeCode} ${data.prizeDesc || data.prizeName}`)
            }
            else {
                p.log("什么也没有")
            }
            await this.wait(2000)
        }
    }
}

