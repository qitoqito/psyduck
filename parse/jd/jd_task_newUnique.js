import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东新奇集市',
            crontab: 3,
            headers: {
                referer: 'https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html'
            },
            help: 'main',
            verify: true,
            sync: 3,
            tempKey: 8640000000,
            turn: 2,
            temp: 't6',
            readme: "如果没有获取到数据,可能是前面几个号黑号无法获取,请自行设置temp为可运行账号pin",
        }
    }

    async middle() {
        if (this._shareCode.length) {
            this.tempContext = this.compact(this._shareCode[0], ['roundId', 'startTime',
                'endTime', 'title'])
        }
        if (this.turnCount == 1) {
            if (this.tempContext) {
                this.tempContext.task = this.profile.help
                this.shareCode(this.tempContext)
            }
            else {
                this.jump = true
            }
        }
    }

    async prepare() {
        for (let user of this.help) {
            let itemId = await this.getTemp(user)
            if (itemId) {
                this.inviter.push({
                    user,
                    itemId
                })
            }
        }
        for (let user of this.random(this.temp, 3)) {
            let html = await this.curl({
                    'url': `https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html?utm_medium=tuiguang&tttparams=zZ1qguleyJnTGF0IjozOS45NjEwNTQsInVuX2FyZWEiOiIxXzI4MDBfNTU4MzhfMCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6IjUzODg3NDg3NyIsImxhdCI6IiIsInBvc0xhdCI6MzkuOTYxMDU0LCJwb3NMbmciOjExNi4zMjIwNjEsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IiIsInVlbXBzIjoiMC0wLTAiLCJnTG5nIjoxMTYuMzIyMDYxLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn70=&utm_source=kong&cu=true`,
                    user
                }
            )
            let data = []
            for (let content of this.matchAll(/<script>([^\<]+)<\/script>/g, html)) {
                if (content && content.includes('__react_data__')) {
                    var window = {}
                    eval(content)
                    for (let i of this.haskey(window, '__react_data__.activityData.floorList')) {
                        if (i.template == "SsrCodeTemplate") {
                            data = i
                        }
                    }
                }
            }
            if (this.haskey(data, 'providerData.data.result')) {
                let result = data.providerData.data.result
                if (this.haskey(result, 'roundConfig.roundId')) {
                    this.code = result.skuList
                    let startTime = new Date(result.roundConfig.roundStartTime).getTime() / 1000;
                    let endTime = new Date(result.roundConfig.roundEndTime).getTime() / 1000;
                    this.shareCode({
                        "roundId": result.roundConfig.roundId,
                        startTime,
                        endTime,
                        title: result.roundConfig.currAwardReserve.title
                    })
                }
                break
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let html = await this.curl({
                'url': `https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html?utm_medium=tuiguang&tttparams=zZ1qguleyJnTGF0IjozOS45NjEwNTQsInVuX2FyZWEiOiIxXzI4MDBfNTU4MzhfMCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6IjUzODg3NDg3NyIsImxhdCI6IiIsInBvc0xhdCI6MzkuOTYxMDU0LCJwb3NMbmciOjExNi4zMjIwNjEsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IiIsInVlbXBzIjoiMC0wLTAiLCJnTG5nIjoxMTYuMzIyMDYxLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn70=&utm_source=kong&cu=true`,
                user
            }
        )
        let data = []
        for (let content of this.matchAll(/<script>([^\<]+)<\/script>/g, html)) {
            if (content && content.includes('__react_data__')) {
                var window = {}
                eval(content)
                for (let i of this.haskey(window, '__react_data__.activityData.floorList')) {
                    if (i.template == "SsrCodeTemplate") {
                        data = i
                    }
                }
            }
        }
        let code = []
        if (this.haskey(data, 'providerData.data.result')) {
            let result = data.providerData.data.result
            if (this.haskey(result, 'roundConfig.roundId')) {
                code = result.skuList
            }
        }
        let list = await this.curl({
                'form': `functionId=newunique_task_panel&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}"}&client=android&clientVersion=13.2.9`,
                user,
                algo: {
                    appId: 'ba62b'
                },
            }
        )
        if (this.haskey(list, "data.bizCode", -1001)) {
            p.log("活动太火爆")
            p.info.complete = true
            return
        }
        else if (this.haskey(list, "data.bizCode", -1002)) {
            p.log("活动已结束,等待开奖")
            let reward = await this.curl({
                    'form': `functionId=newunique_get_reward&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}"}&client=ios&clientVersion=15.0.80`,
                    user,
                    algo: {
                        appId: 'ba62b'
                    }
                }
            )
            if (this.haskey(reward, 'dasta.result.awwardInfo.beanNum')) {
                p.award(reward.data.result.awardInfo.beanNum, 'bean')
            }
            else {
                p.log(this.haskey(reward, 'data.bizMsg') || reward)
            }
        }
        else {
            let status = 1
            for (let i of this.haskey(list, 'data.result.taskList')) {
                if (i.completionFlag) {
                    p.log("任务完成:", i.assignmentName)
                    status = 1
                }
                else {
                    status = 0
                    let extraType = i.ext.extraType
                    if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                        let extra = i.ext[extraType]
                        if (extraType == 'sign1') {
                            status = 1
                        }
                        else if (extraType == 'assistTaskDetail') {
                            try {
                                if (this.help.includes(user)) {
                                    await this.setTemp(user, extra.itemId, 8640000)
                                }
                                if (this.inviter.length) {
                                    let cc = this.inviter[this.n % this.inviter.length]
                                    this.n++
                                    if (cc.user == user && this.inviter[this.n % this.inviter.length]) {
                                        cc = this.inviter[this.n % this.inviter.length]
                                    }
                                    p.log("正在助力:", cc.user)
                                    let doIt = await this.curl({
                                            'form': `functionId=newunique_do_task&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}","itemId":"${cc.itemId}","assignmentId":"${i.encryptAssignmentId}","tType":"1"}&eu=8366530373630343&fv=2346134393666303&client=ios&clientVersion=13.2.9`,
                                            user,
                                            algo: {
                                                appId: 'ba62b'
                                            }
                                        }
                                    )
                                    if (this.haskey(doIt, 'data.result.score')) {
                                        status = 1
                                        p.log("助力成功:", doIt.data.result.score)
                                    }
                                    else {
                                        p.log(this.haskey(doIt, 'data.bizMsg') || doIt)
                                    }
                                }
                            } catch (e) {
                            }
                            status = 1
                        }
                        else if (['shoppingActivity', 'productsInfo', 'browseShop', 'addCart', 'followShop', 'followChannel'].includes(extraType)) {
                            p.log("正在运行:", i.assignmentName)
                            for (let j of extra) {
                                let doIt = await this.curl({
                                        'form': `functionId=newunique_do_task&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}","itemId":"${j.itemId}","assignmentId":"${i.encryptAssignmentId}","actionType":1,"jumpUrl":"${encodeURIComponent(j.url)}"}&eu=8366530373630343&fv=2346134393666303&client=ios&clientVersion=13.2.9`,
                                        user,
                                        algo: {
                                            appId: 'ba62b'
                                        }
                                    }
                                )
                                if (this.haskey(doIt, 'data.result')) {
                                    if (i.ext.waitDuration) {
                                        p.log("正在等待:", i.ext.waitDuration)
                                        await this.wait(i.ext.waitDuration * 1000)
                                    }
                                    if (this.haskey(doIt, 'data.result.awardTimes')) {
                                        status = 1
                                        p.log("获取票数:", doIt.data.result.awardTimes)
                                    }
                                    else {
                                        let reward = await this.curl({
                                                'form': `functionId=newunique_do_task&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}","itemId":"${j.itemId}","assignmentId":"${i.encryptAssignmentId}","actionType":0,"jumpUrl":"${encodeURIComponent(j.url)}"}&eu=8366530373630343&fv=2346134393666303&client=ios&clientVersion=13.2.9`,
                                                user,
                                                algo: {
                                                    appId: 'ba62b'
                                                }
                                            }
                                        )
                                        if (this.haskey(reward, 'data.result')) {
                                            p.log("获取票数:", reward.data.result.awardTimes)
                                            status = 1
                                        }
                                        else {
                                            status = 0
                                            p.log(this.haskey(reward, 'bizMsg') || reward)
                                        }
                                    }
                                }
                                else {
                                    status = 0
                                    p.log(this.haskey(doIt, 'bizMsg') || doIt)
                                }
                            }
                        }
                        else {
                        }
                    }
                }
            }
            if (code) {
                let ary = []
                for (let i of code) {
                    if (i.voteInfo.status) {
                        ary.push(i)
                    }
                }
                if (ary.length<2) {
                    let ranCode = this.random(code, 2 - ary.length)
                    ary = [...ary, ...ranCode]
                }
                for (let _ of this.range(0, 1)) {
                    let i = code[_]
                    p.log("正在投票:", i.name)
                    let pop = await this.curl({
                            'form': `functionId=newunique_popup&appid=signed_wh5&body={"channelId":"3","skuId":"${i.skuId}","roundId":"${context.roundId}"}&client=ios&clientVersion=15.0.80`,
                            user,
                            algo: {
                                appId: 'ba62b'
                            }
                        }
                    )
                    let count = this.haskey(pop, 'data.result.myVotes')
                    if (_ == 0) {
                        count = parseInt(count / 2)
                    }
                    for (let _ of this.range(1, count)) {
                        let vote = await this.curl({
                                'form': `functionId=newunique_vote&appid=signed_wh5&body={"channelId":"3","roundId":"${context.roundId}","skuId":"${i.skuId}"}&client=ios&clientVersion=15.1.53`,
                                user,
                                algo: {
                                    appId: 'ba62b'
                                }
                            }
                        )
                        if (this.haskey(vote, 'data.bizCode', -1005)) {
                            p.log("投票商品数已达上限")
                            break
                        }
                        else if (this.haskey(vote, 'data.bizCode', -1018)) {
                            p.log("当前已无可用票数")
                            break
                        }
                        else if (this.haskey(vote, 'data.result')) {
                            p.log("投票成功")
                        }
                        else {
                            p.log(vote)
                            break
                        }
                        await this.wait(500)
                    }
                }
            }
            if (status) {
                p.info.work = true
            }
        }
    }
}

