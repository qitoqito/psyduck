import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东天天推红包',
            crontab: 3
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
                if (lottery.data.prizeNum>3) {
                    p.info.work = true
                }
            }
            let data = lottery.data.pushPrizeVo
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

