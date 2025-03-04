import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东签到领钱',
            crontab: 3,
            interval: 2000,
            headers: {
                referer: "https://h5platform.jd.com/swm-stable/BVersion-sign-in/index"
            }
        }
    }

    async prepare() {
        this.shareCode({
            linkId: 'Fl1LmxG_f0poD7w1ycZqnw'
        })
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let status = 1
        let sn = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=bSignInDo&body={"linkId":"${context.linkId}"}&appid=activities_platform&client=ios&clientVersion=11.6.6&cthr=1&build=168631&screen=375*667&networkType=wifi&d_brand=iPhone&d_model=iPhone8,1&lang=zh_CN&osVersion=13.7&partner=`,
                user,
                algo: {
                    expire: {
                        code: 1000
                    },
                    'appId': '61e2b'
                }
            }
        )
        if (this.haskey(sn, 'data.signInCoin')) {
            p.log('获得签到:', sn.data.signInCoin)
        }
        else if (this.haskey(sn, 'code', 16510)) {
            p.log("今日已签到")
        }
        else {
            status = 0
            p.log(this.haskey(sn, 'errMsg') || sn)
        }
        let apTask = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=apTaskList&body={"linkId":"${context.linkId}","channel":4}&t=1738479849113&appid=activities_platform&client=ios&clientVersion=15.0.11`,
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
                let detail = await this.curl({
                        'url': `https://api.m.jd.com/api`,
                        'form': `functionId=apTaskDetail&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"cityId":"","provinceId":"","countyId":"","linkId":"${context.linkId}"}&t=1741095787682&appid=activities_platform&client=ios&clientVersion=6.30.0`,
                        user
                    }
                )
                if (this.haskey(detail, 'data.taskItemList')) {
                    for (let j = 0; j<(i.taskLimitTimes - i.taskDoTimes); j++) {
                        let item = detail.data.taskItemList[j]
                        p.log(`正在浏览:`, item.itemName || i.taskShowTitle)
                        let start = await this.curl({
                                'url': `https://api.m.jd.com/api`,
                                'form': `functionId=apStartTaskTime&body={"linkId":"${context.linkId}","taskId":${i.id},"itemId":"${encodeURIComponent(item.itemId)}","taskInsert":true,"channel":4}&t=1741095788064&appid=activities_platform&client=ios&clientVersion=6.30.0`,
                                user
                            }
                        )
                        if (i.taskLimitTimes) {
                            p.log("等待:", i.timeLimitPeriod)
                            await this.wait(i.timeLimitPeriod * 1000)
                        }
                        let end = await this.curl({
                                'url': `https://api.m.jd.com/api`,
                                'form': `functionId=apDoLimitTimeTask&body={"linkId":"${context.linkId}"}&t=1741095810774&appid=activities_platform&client=ios&clientVersion=6.30.0&loginType=2&loginWQBiz=wegame`,
                                user,
                                algo: {
                                    appId: 'ebecc'
                                }
                            }
                        )
                        if (this.haskey(end, 'data')) {
                            p.log(`任务完成`)
                            isOk = 1
                            let award = await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"channel":4,"checkVersion":true,"cityId":"","provinceId":"","countyId":"","linkId":"${context.linkId}"}&t=1741097397233&appid=activities_platform&client=ios&clientVersion=6.30.0&loginType=2&loginWQBiz=wegame`,
                                    user,
                                    algo: {
                                        appId: '6f2b6'
                                    }
                                }
                            )
                        }
                        else {
                            p.log("出错了:", end)
                        }
                        await this.wait(1000)
                    }
                }
            }
        }
        if (status && isOk) {
            p.info.work = true
        }
        let balance = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=BSignInMyBalance&body={"linkId":"${context.linkId}"}&t=1681800811744&appid=activities_platform&client=ios&clientVersion=11.8.0&cthr=1&uuid=&build=&screen=375*667&networkType=&d_brand=&d_model=&lang=zh_CN&osVersion=&partner=`,
                user
            }
        )
        let totalAmount = this.haskey(balance, 'data.totalAmount')
        if (totalAmount) {
            totalAmount = parseFloat(totalAmount)
            p.log('现金:', totalAmount)
            let array = []
            for (let i of balance.data.wxExchange) {
                if (i.amount<=totalAmount && i.status == 1) {
                    array.push(i)
                }
            }
            for (let i of array.reverse()) {
                p.log("正在兑换:", i.amount)
                let reward = await this.curl({
                        'url': `https://api.m.jd.com/`,
                        'form': `functionId=bSignInExchange&body={"awardType":${i.exchangeType},"gear":${i.gear},"linkId":"${context.linkId}"}&t=1681800820879&appid=activities_platform&client=ios&clientVersion=11.8.0&cthr=1&uuid=&build=&screen=375*667&networkType=&d_brand=&d_model=&lang=zh_CN&osVersion=&partner=`,
                        user,
                        algo: {
                            appId: "ff179"
                        }
                    }
                )
                if (this.haskey(reward, 'success')) {
                    p.msg(`提现: ${i.amount} ${reward.data.msg}`)
                }
                else {
                    p.log(this.haskey(reward, 'data.msg') || reward)
                }
                await this.wait(2000)
            }
        }
    }
}

