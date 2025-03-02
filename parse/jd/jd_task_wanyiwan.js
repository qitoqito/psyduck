import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东玩一玩',
            prompt: {
                turnNum: ' #翻倍奖票数,默认10',
                turnDouble: ' #翻倍奖票次数,默认1',
                turnJump: " #部分号翻倍一直失败,可以只做任务跳过翻倍,pin1|pin2"
            },
            model: 'shuffle',
            headers: {
                referer: 'https://pro.m.jd.com/mall/active/3fcyrvLZALNPWCEDRvaZJVrzek8v/index.html',
            },
            turn: 2,
            crontab: 8,
            tempKey: 8640000000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let home = await this.curl({
                'url': `https://api.m.jd.com/client.action`,
                'form': `functionId=wanyiwan_home&appid=signed_wh5&body={"outsite":0,"firstCall":0,"version":7,"babelChannel":"ttt10"}&rfs=0000&screen=390*844&build=169480&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&client=apple&clientVersion=13.2.2`,
                user,
                algo: {
                    appId: 'c81ad',
                    expire: {
                        'data.result.isLogin': false
                    }
                }
            }
        )
        let result = this.haskey(home, 'data.result')
        if (!result) {
            p.info.jump = true
            p.err("没有获取到数据...")
            return
        }
        let oldScore = this.haskey(home, 'data.result.score') || 0
        p.log("当前奖票:", oldScore)
        if (this.turnCount == 0) {
            let status = 1
            let taskList = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `functionId=wanyiwan_task_list&appid=signed_wh5&body={"showShortcut":true,"version":7,"lbsSwitch":true}&rfs=0000`,
                    user,
                }
            )
            for (let i of this.haskey(taskList, 'data.result.taskList')) {
                if (i.status == 3) {
                    status = 1
                    p.log("任务完成:", i.title)
                }
                else {
                    if (i.title.includes('下单')) {
                    }
                    else {
                        status = 0
                        p.log("正在运行:", i.title)
                        let d = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=wanyiwan_do_task&appid=signed_wh5&body={"itemId":"${this.haskey(i, 'taskDetail.0.itemId') || 0}","taskType":${i.taskType},"assignmentId":"${i.encryptAssignmentId}","actionType":1,"version":1}&rfs=0000&openudid=de21c6604748f97dd3977153e51a47f4efdb9a47&screen=390*844&build=168960&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&client=apple&clientVersion=13.2.2`,
                                user,
                                algo: {
                                    appId: '89db2'
                                }
                            }
                        )
                        if (i.limitTime) {
                            await this.wait(i.limitTime * 1000)
                        }
                        let r = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=wanyiwan_do_task&appid=signed_wh5&body={"itemId":"${this.haskey(i, 'taskDetail.0.itemId') || 0}","taskType":${i.taskType},"assignmentId":"${i.encryptAssignmentId}","actionType":0,"version":1}&rfs=0000&openudid=de21c6604748f97dd3977153e51a47f4efdb9a47&screen=390*844&build=168858&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&client=apple&clientVersion=13.2.2`,
                                user,
                                algo: {
                                    appId: '89db2'
                                }
                            }
                        )
                        // p.log(r.data)
                        let a = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=wanyiwan_task_receive_award&appid=signed_wh5&body={"taskType":${i.taskType},"assignmentId":"${i.encryptAssignmentId}","version":1}&rfs=0000&openudid=de21c6604748f97dd3977153e51a47f4efdb9a47&screen=390*844&build=168960&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&client=apple&clientVersion=13.2.2`,
                                user,
                                algo: {
                                    appId: 'd12dd'
                                },
                            }
                        )
                        p.log(a.data)
                        if (this.haskey(a, 'data.result')) {
                            status = 1
                        }
                    }
                }
            }
            if (status) {
                p.info.work = true
            }
        }
        else if (this.turnCount == 1) {
            if (this.profile.turnJump && this.profile.turnJump.includes(user)) {
                p.log("该账号跳过翻倍")
            }
            else {
                let turn = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `functionId=turnHappyHome&body={"linkId":"-EMTEb8A0id6HvUY2qV7xQ","turnNum":"10"}&t=1715954317613&appid=activities_platform&client=apple&clientVersion=13.2.2`,
                        user,
                        algo: {
                            appId: '614f1'
                        }
                    }
                )
                if (this.haskey(turn, 'data.leftTime')) {
                    p.log("剩余翻倍时间:", parseInt(turn.data.leftTime / 1000))
                }
                else if (this.haskey(turn, 'data.reachDayLimit')) {
                    p.log("翻倍次数上限")
                    p.info.complete = true
                }
                else {
                    let num = this.profile.turnNum || 10
                    if (oldScore && num>oldScore) {
                        num = oldScore
                    }
                    p.log("开始翻倍,使用奖票数量:", num)
                    let count = this.profile.turnDouble || 1
                    let ok = 1
                    for (let _ = 1; _<=count; _++) {
                        var turnNum = (_ == 1) ? num : "-1"
                        let double = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=turnHappyDouble&body={"linkId":"-EMTEb8A0id6HvUY2qV7xQ","turnNum":"${turnNum}"}&t=1715954317613&appid=activities_platform&client=apple&clientVersion=13.2.2`,
                                user,
                                algo: {
                                    appId: '614f1'
                                }
                            }
                        )
                        p.log("翻倍中...", this.haskey(double, 'data.rewardValue'))
                        if (this.haskey(double, 'data.rewardState', 3)) {
                            p.log("翻倍失败...")
                            ok = 0
                            break
                        }
                        else if (this.haskey(double, 'code', 220001)) {
                            p.log("今日参与已达上限...")
                            break
                        }
                        await this.wait(3000)
                    }
                    if (ok) {
                        let rec = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=turnHappyReceive&body={"linkId":"-EMTEb8A0id6HvUY2qV7xQ"}&t=1715954317613&appid=activities_platform&client=apple&clientVersion=13.2.2`,
                                user,
                                algo: {
                                    appId: '25fac'
                                }
                            }
                        )
                        p.log("结束翻倍...", this.haskey(rec, 'data.rewardValue'))
                    }
                }
            }
            for (let i of Array(3)) {
                home = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `functionId=wanyiwan_home&appid=signed_wh5&body={"outsite":0,"firstCall":0,"version":7,"babelChannel":"ttt10"}&rfs=0000&openudid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&screen=390*844&build=169480&osVersion=15.1.1&networkType=wifi&d_brand=iPhone&d_model=iPhone13%2C3&client=apple&clientVersion=13.2.2`,
                        user,
                        algo: {
                            appId: 'c81ad'
                        }
                    }
                )
                if (this.haskey(home, 'data.result')) {
                    break
                }
                else {
                    await this.wait(1000)
                }
            }
            let score = this.haskey(home, 'data.result.score') || 0
            if (score) {
                if (oldScore) {
                    let diff = score - oldScore
                    if (diff) {
                        p.msg(`本轮${diff>0 ? '增加' : "损失"}: ${diff}`)
                    }
                }
            }
            let record = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `functionId=wanyiwan_point_record&appid=signed_wh5&body={"pageNum":1,"version":1}&rfs=0000`,
                    user
                }
            )
            let now = new Date();
            let year = now.getFullYear();
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let day = now.getDate().toString().padStart(2, '0');
            let ymd = `${year}-${month}-${day}`;
            let ymd2 = `${year}.${month}.${day}`;
            let report = (this.haskey(record, 'data.result.pointsRecords') || []).filter(d => d.sendTime == ymd || d.sendTime == ymd2).filter(d => d.pointName == '1002')
            let use = report.filter(d => d.operateType == '3')
            let suc = report.filter(d => d.operateType == '1')
            let x = use.reduce((v, k) => {
                v += k.pointValue
                return v
            }, 0)
            let y = suc.reduce((v, k) => {
                v += k.pointValue
                return v
            }, 0)
            // console.log(x,y)
            let z = y - x
            p.msg(`当前奖票: ${score} \n翻倍次数: ${use.length}, 消耗奖票: ${x}, 获得奖票: ${y}, ${z>0 ? '增加' : "损失"}奖票: ${z} \n盈亏占比: ${suc.length}/${use.length - suc.length}`)
        }
    }
}

