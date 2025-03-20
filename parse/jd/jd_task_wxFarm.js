import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东微信农场',
            crontab: 3,
            headers: {
                'user-agent': 'wechat',
                'referer': 'https://h5.m.jd.com/wq/dev/RFz7fuh1jc5mfj4speLLRjb1pEQ/index.html'
            },
            delay: 500
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let st = 1
        let signList = await this.curl({
                'url': `https://api.m.jd.com/miniTask_queryFarmSignList?g_ty=ls&g_tk=1084416199`,
                'form': `loginType=2&clientType=wxapp&client=apple&clientVersion=10.14.110&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&uuid=oCwKwuBoW0okKEIIDlT5FXxscxcM&functionId=miniTask_queryFarmSignList&t=1739944985868&body={}&appid=hot_channel`,
                user,
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/787/page-frame.html',
            }
        )
        let subCode = this.haskey(signList, 'subCode')
        if (subCode == 109) {
            p.log('活动太火爆了，请稍后再试')
            st = 0
        }
        if (!signList) {
            p.err("没获取到数据...")
            st = 0
        }
        if (this.haskey(signList, 'data.currentSignStatus', 1)) {
            p.log("已签到..")
        }
        else {
            status = 0
            let sign = await this.curl({
                    'url': `https://api.m.jd.com/miniTask_doFarmSign?g_ty=ls&g_tk=1084416199`,
                    'form': `loginType=2&clientType=wxapp&client=apple&clientVersion=10.14.110&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&uuid=oCwKwuBoW0okKEIIDlT5FXxscxcM&functionId=miniTask_doFarmSign&t=1739945007901&body={}&appid=hot_channel`,
                    user,
                    algo: {
                        appId: '3f5a6'
                    },
                    referer: 'https://servicewechat.com/wx91d27dbf599dff74/787/page-frame.html',
                }
            )
            if (this.haskey(sign, 'data.signStatus')) {
                p.log(`签到成功: 获得水滴: ${sign.data.awardNum}`)
                status = 1
            }
        }
        let taskList = await this.curl({
                'url': `https://api.m.jd.com/client.action`,
                'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739972758582&body={"version":9,"channelParam":"2","channel":0,"pushSwitch":false,"showSubscribe":false,"babelChannel":"ttt1"}&functionId=farm_task_list`,
                user
            }
        )
        let list = this.haskey(taskList, 'data.result.taskList')
        if (!list) {
            p.err("没有获取到任务列表...")
            return
        }
        let status = 1
        for (let i of list) {
            if (i.mainTitle.includes("下单")) {
            }
            else if (i.mainTitle.includes("进入")) {
            }
            else if (i.taskDoTimes != i.taskLimitTimes) {
                p.log("正在运行:", i.mainTitle)
                if (i.mainTitle.includes("浇水")) {
                    if (i.taskDoTimes != i.taskLimitTimes) {
                        status = 0
                        for (let j of Array(Math.ceil((i.taskLimitTimes - i.taskDoTimes) / 4))) {
                            let water = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739982505593&body={"version":9,"channelParam":"2","waterType":2,"babelChannel":"ttt1"}&functionId=farm_water`,
                                    user,
                                    algo: {
                                        appId: '28981'
                                    }
                                }
                            )
                            if (this.haskey(water, 'data.result.bottleWater')) {
                                status = 1
                                p.log("浇水成功....")
                            }
                            else {
                                status = 0
                                p.log("浇水失败...")
                                break
                            }
                            await this.wait(1000)
                        }
                        if (status) {
                            let award = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739981615997&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                                    user,
                                    algo: {
                                        appId: '33e0f'
                                    }
                                }
                            )
                            if (this.haskey(award, 'data.result.taskAward')) {
                                p.log(award.data.result.taskAward)
                            }
                            else {
                                p.log("领取奖励失败", award)
                            }
                        }
                    }
                }
                else {
                    if (i.taskSourceUrl) {
                        var doTask = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739973082105&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"taskInsert":false,"itemId":"${new Buffer.from(i.taskSourceUrl, 'utf-8').toString('base64')}","channel":0}&functionId=farm_do_task`,
                                user,
                                algo: {
                                    appId: '28981'
                                }
                            }
                        )
                    }
                    else if (i.pipeExt) {
                        let detail = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739978261715&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_detail`,
                                user
                            }
                        )
                        var doTask = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739978263580&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"taskInsert":false,"itemId":"${new Buffer.from(this.haskey(detail, 'data.result.taskDetaiList.0.itemId'), 'utf-8').toString('base64')}","channel":0}&functionId=farm_do_task`,
                                user,
                                algo: {
                                    appId: '28981'
                                }
                            }
                        )
                    }
                    if (this.haskey(doTask, 'data.success')) {
                        p.log("任务完成...")
                        status = 1
                        let award = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739981615997&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                                user,
                                algo: {
                                    appId: '33e0f'
                                }
                            }
                        )
                        if (this.haskey(award, 'data.result.taskAward')) {
                            p.log(award.data.result.taskAward)
                        }
                        else {
                            p.log("领取奖励失败", award)
                        }
                    }
                    else {
                        status = 0
                        p.log("任务失败", doTask)
                    }
                    await this.wait(1000)
                }
            }
            else if (i.taskStatus == 2) {
                let award = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `appid=signed_farm_mp&client=&clientVersion=1.0.0&screen=390*812&wqDefault=false&loginType=2&t=1739981615997&body={"version":9,"channelParam":"2","taskType":"${i.taskType}","taskId":${i.taskId},"channel":0}&functionId=farm_task_receive_award`,
                        user,
                        algo: {
                            appId: '33e0f'
                        }
                    }
                )
                if (this.haskey(award, 'data.result.taskAward')) {
                    p.log(award.data.result.taskAward)
                    status = 1
                }
                else {
                    p.log("领取奖励失败", award)
                    status = 0
                }
            }
            else {
                p.log("任务已完成:", i.mainTitle)
            }
        }
        if (status && st) {
            p.info.work = true
        }
    }
}

