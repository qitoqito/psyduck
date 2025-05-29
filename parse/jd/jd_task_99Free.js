import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东天天抽好运',
            crontab: 3
        }
    }

    async prepare() {
        this.shareCode({
            "encryptProjectId": "3j6mKDhTCoa8fnw97sTcR1i7wtMT", "sourceCode": "9.9FreeDelivery202505"
        })
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'form': `appid=SecKill2020&client=wh5&clientVersion=15.1.35&functionId=queryInteractiveInfo&body={"encryptProjectId":"${context.encryptProjectId}","sourceCode":"${context.sourceCode}","ext":{"queryReceiveTimes":1}}`,
                user,
                algo: {
                    appId: '39e8e',
                    expire: {
                        login: false,
                    }
                }
            }
        )
        let data = this.haskey(s, 'assignmentList')
        if (!data) {
            p.err("没有获取到数据")
            return
        }
        let lotteryId
        for (let i of data) {
            if (i.assignmentName == '抽奖') {
                lotteryId = i.encryptAssignmentId
            }
            else if (i.completionFlag) {
                p.log(`任务已经完成: ${i.assignmentName}`)
            }
            else {
                p.log("正在运行:", i.assignmentName)
                for (let j of Array(i.assignmentTimesLimit - i.completionCnt)) {
                    if (i.assignmentName.includes("首页")) {
                        await this.curl({
                                'form': `appid=SecKill2020&client=wh5&clientVersion=15.1.35&functionId=doInteractiveAssignment&body={"encryptProjectId":"${context.encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","sourceCode":"${context.sourceCode}","actionType":1,"itemId":"${i.ext.materialId}","ext":{}}`,
                                user,
                                algo: {
                                    appId: '39e8e'
                                }
                            }
                        )
                        var doTask = await this.curl({
                                'form': `appid=SecKill2020&client=wh5&clientVersion=15.1.35&functionId=doInteractiveAssignment&body={"encryptProjectId":"${context.encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","sourceCode":"${context.sourceCode}","actionType":0,"itemId":"${i.ext.materialId}","completionFlag":true,"ext":{}}`,
                                user,
                                algo: {
                                    appId: '39e8e'
                                }
                            }
                        )
                    }
                    else {
                        var doTask = await this.curl({
                                'form': `appid=SecKill2020&client=wh5&clientVersion=15.1.35&functionId=doInteractiveAssignment&body={"encryptProjectId":"${context.encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","sourceCode":"${context.sourceCode}","actionType":0,"completionFlag":true,"ext":{}}`,
                                user,
                                algo: {
                                    appId: '39e8e'
                                }
                            }
                        )
                    }
                    if (this.haskey(doTask, 'assignmentInfo.completionCnt')) {
                        p.log("success")
                    }
                    else {
                        p.log(doTask)
                    }
                    await this.wait(2000)
                }
            }
        }
        if (lotteryId) {
            p.log("抽奖中...")
            while (1) {
                let r = await this.curl({
                        'form': `appid=SecKill2020&client=wh5&clientVersion=15.1.35&functionId=doInteractiveAssignment&body={"encryptProjectId":"${context.encryptProjectId}","encryptAssignmentId":"${lotteryId}","sourceCode":"${context.sourceCode}","actionType":0,"ext":{"exchangeNum":1,"interactNum":1}}`,
                        user,
                        algo: {
                            appId: '39e8e'
                        }
                    }
                )
                if (this.haskey(r, 'rewardsInfo.successRewards')) {
                    for (let g in r.rewardsInfo.successRewards) {
                        let data = r.rewardsInfo.successRewards[g]
                        if (g == '4') {
                            for (let k of data) {
                                p.award(k.discount, 'redpacket')
                            }
                        }
                        else if (g == '8') {
                            for (let k of data) {
                                p.log(k.useRange, '优惠券')
                            }
                        }
                        else {
                            for (let k of data) {
                                p.log(k)
                            }
                        }
                    }
                }
                else {
                    p.log(`什么也没有抽到`)
                }
                if (!this.haskey(r, 'rewardsInfo')) {
                    break
                }
                await this.wait(2000)
                p.info.work = true
            }
        }
    }
}

