import {Template} from '../../template.js'
import * as cheerio from 'cheerio';

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
            readme: '如果出现无数据,可能当前主号是黑号,无法获取到数据,请自行设置help为白号pin'
        }
    }

    async prepare() {
        for (let user of this.help.slice(0, 3)) {
            let html = await this.curl({
                    'url': `https://pro.m.jd.com/mall/active/4Va8jNzzHPqgTUhxwiTn9PHyVZCB/index.html?utm_medium=tuiguang&tttparams=zZ1qguleyJnTGF0IjozOS45NjEwNTQsInVuX2FyZWEiOiIxXzI4MDBfNTU4MzhfMCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6IjUzODg3NDg3NyIsImxhdCI6IiIsInBvc0xhdCI6MzkuOTYxMDU0LCJwb3NMbmciOjExNi4zMjIwNjEsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IiIsInVlbXBzIjoiMC0wLTAiLCJnTG5nIjoxMTYuMzIyMDYxLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn70=&utm_source=kong&cu=true`,
                    user
                }
            )
            let $ = cheerio.load(html);
            let scriptTags = $('script').toArray();
            let data = []
            for (let script of scriptTags) {
                let content = $(script).html();
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
        let list = await this.curl({
                'form': `functionId=newunique_task_panel&appid=signed_wh5&body={"channelId":"3","roundId":"NUE_9c438cbe"}&client=android&clientVersion=13.2.9`,
                user,
                algo: {
                    appId: 'ba62b'
                },
            }
        )
        if (this.haskey(list, "data.bizCode", -1001)) {
            p.log("活动太火爆")
            p.info.work = true
            return
        }
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
                        status = 1
                    }
                    else if (['shoppingActivity', 'productsInfo', 'browseShop', 'addCart', 'followShop', 'followChannel'].includes(extraType)) {
                        p.log("正在运行:", i.assignmentName)
                        for (let j of extra) {
                            let doIt = await this.curl({
                                    'form': `functionId=newunique_do_task&appid=signed_wh5&body={"channelId":"3","roundId":"NUE_9c438cbe","itemId":"${j.itemId}","assignmentId":"${i.encryptAssignmentId}","actionType":1,"jumpUrl":"${encodeURIComponent(j.url)}"}&eu=8366530373630343&fv=2346134393666303&client=ios&clientVersion=13.2.9`,
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
                                            'form': `functionId=newunique_do_task&appid=signed_wh5&body={"channelId":"3","roundId":"NUE_9c438cbe","itemId":"${j.itemId}","assignmentId":"${i.encryptAssignmentId}","actionType":0,"jumpUrl":"${encodeURIComponent(j.url)}"}&eu=8366530373630343&fv=2346134393666303&client=ios&clientVersion=13.2.9`,
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
        if (this.code) {
            let code = this.random(this.code, 2)
            for (let i of code) {
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
                let len = Math.min(count, 10)
                for (let _ of this.range(0, len)) {
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

