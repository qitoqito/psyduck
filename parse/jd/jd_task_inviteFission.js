import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东转赚整合",
            public: "inviteFission",
            verify: 1,
            prompt: {
                'times': '40 #最多助力人数',
                'linkId': '活动linkId',
                'help': '助力主号',
                'inviter': '如不设置help,可自定义助力码'
            },
            turn: 2
        }
    }

    async prepare() {
        let linkId = this.profile.linkId || this.profile.custom
        let times = parseInt(this.profile.times || 40)
        if (linkId) {
            if (this.help.length) {
                for (let user of this.help) {
                    let inviter = await this.getPublic(user, 'inviter')
                    let count = 0
                    let total = 0
                    let amount = 0
                    let countDownTime = 0
                    let home = await this.curl({
                            form: `appid=activities_platform&body={"linkId":"${linkId}"}&client=ios&clientVersion=12.3.4&functionId=inviteFissionHome&t=1718017177605&osVersion=16.2.1&build=169143&rfs=0000`,
                            algo: {
                                appId: 'eb67b'
                            },
                            user
                        }
                    )
                    if (this.haskey(home, 'data.inviter')) {
                        inviter = home.data.inviter
                        count = home.data.drawPrizeNum
                        if (this.haskey(home, 'data.cashVo.totalAmount')) {
                            total = home.data.cashVo.totalAmount
                            amount = home.data.cashVo.amount
                        }
                        countDownTime = home.data.countDownTime
                        await this.setPublic(user, 'inviter', inviter)
                    }
                    if (inviter) {
                        this.shareCode({
                            inviter,
                            user,
                            linkId,
                            times,
                            count,
                            amount,
                            total,
                            minute: parseInt(countDownTime / 60000),
                            field: [
                                'linkId', 'inviter', 'times'
                            ],
                            category: 'inviteFission'
                        })
                        this.dict[linkId] = {
                            linkId,
                            total
                        }
                    }
                }
            }
            else if (this.profile.inviter) {
                for (let inviter of this.profile.inviter.split("|")) {
                    this.shareCode({
                        inviter,
                        linkId,
                        times,
                        field: [
                            'linkId', 'inviter', 'times'
                        ],
                        category: 'inviteFission'
                    })
                    this.dict[linkId] = {
                        linkId,
                    }
                }
            }
        }
    }

    async middle() {
        if (this.turnCount == 1) {
            for (let i in this.dict) {
                let dict = this.dict[i]
                dict.task = this.profile.help || this.profile.task
                this.shareCode(dict)
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (this.turnCount == 0) {
            if (context.user == user) {
                p.log("不能助力自己...")
            }
            else {
                let home = await this.curl({
                    form: `functionId=inviteFissionhelp&body={"linkId":"${context.linkId}","isJdApp":true,"inviter":"${context.inviter}"}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                    user,
                    algo: {
                        appId: 'c5389'
                    }
                })
                let helpResult = this.haskey(home, 'data.helpResult')
                if (helpResult == 1) {
                    p.info.help = true
                    p.log("助力成功...")
                }
                else if (helpResult == 6) {
                    p.log("已经助力过了...")
                    p.info.work = true
                }
                else if (helpResult == 3) {
                    p.log("没有助力次数了...")
                    p.info.complete = true
                }
                else if (helpResult == 4) {
                    p.log("助力次数用完了...")
                    p.info.complete = true
                }
                else if (helpResult == 2) {
                    p.log("活动火爆...")
                    p.info.complete = true
                }
                else {
                    p.log("助力错误...")
                }
            }
        }
        else {
            if (context.total) {
                await this.curl({
                        'url': "http://api.m.jd.com/",
                        'form': `functionId=inviteFissionReceive&body={"linkId":"${context.linkId}"}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                        user,
                        algo: {
                            "appId": "b8469",
                        }
                    }
                )
            }
            let home = await this.curl({
                'url': `https://api.m.jd.com/?functionId=inviteFissionHome&body={"linkId":"${context.linkId}","inviter":""}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                user,
                algo: {
                    appId: 'eb67b'
                }
            })
            let prizeNum = this.haskey(home, 'data.prizeNum') || 0
            p.log("当前可抽奖次数:", prizeNum)
            for (let __ = 0; __<prizeNum; __++) {
                let draw = await this.curl({
                    'url': `https://api.m.jd.com/?functionId=inviteFissionDrawPrize&body={"linkId":"${context.linkId}","inviter":""}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                    user,
                    algo: {
                        appId: 'c02c6'
                    }
                })
                let prizeType = this.haskey(draw, 'data.prizeType')
                let data = this.haskey(draw, 'data') || {}
                let amount = data.amount || data.rewardValue
                if (prizeType == 0) {
                    p.log('没抽到奖品')
                }
                else if (prizeType == 1) {
                    p.log('优惠券:', data.limitStr || data.codeDesc || data.prizeDesc || data.prizeName)
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
                if (context.total && __ % 3 == 0) {
                    let receive = await this.curl({
                            'form': `functionId=inviteFissionReceive&body={"linkId":"${context.linkId}"}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                            user,
                            algo: {
                                "appId": "b8469",
                            }
                        }
                    )
                    p.log(`获取奖励中: ${this.haskey(receive, 'data.amount')}`)
                    if (this.haskey(receive, 'data.cashRecord')) {
                        let cashRecord = receive.data.cashRecord
                        let cash = await this.curl({
                            'form': `functionId=apCashWithDraw&body={"linkId":"${context.linkId}","businessSource":"NONE","base":{"id":${cashRecord.id},"business":"fission","poolBaseId":${cashRecord.poolBaseId},"prizeGroupId":${cashRecord.prizeGroupId},"prizeBaseId":${cashRecord.prizeBaseId},"prizeType":${cashRecord.prizeType}}}&appid=activities_platform&client=ios&clientVersion=15.1.60`,
                            user,
                            algo: {
                                appId: '73bca'
                            }
                        })
                    }
                }
                await this.wait(1000)
            }
        }
    }
}

