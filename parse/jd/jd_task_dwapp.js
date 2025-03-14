import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东充值金",
            crontab: 3,
            libressl: true
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user
        let list = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=dwapp_task_dwList`,
                'form': `appid=h5-sep&body=${this.dumps(await this.cmd5x())}&client=m&clientVersion=6.0.0`,
                user,
                algo: {
                    expire: {
                        'code': 201
                    }
                }
            }
        )
        let cash = 0
        for (let i of this.haskey(list, 'data') || []) {
            if (i.viewStatus == 3 || i.viewStatus == 1) {
                p.log("任务完成:", i.name)
            }
            else {
                p.log("正在运行:", i.name)
                let record = await this.curl({
                        'url': `https://dwapp.jd.com/user/task/dwRecord`,
                        'json': await this.cmd5x({
                            "id": i.id,
                            "taskType": i.taskType,
                            "agentNum": "m",
                            "followChannelStatus": "",
                            taskFlowChannelId: i.taskFlowChannelId
                        }),
                        user
                    }
                )
                // p.log(record)
                await this.wait(2000)
                let receive = await this.curl({
                        'url': `https://dwapp.jd.com/user/task/dwReceive`,
                        'json': await this.cmd5x({
                            "id": i.id,
                        }),
                        user
                    }
                )
                if (this.haskey(receive, 'data.giveScoreNum')) {
                    p.log("获得充值金:", receive.data.giveScoreNum)
                    cash += receive.data.giveScoreNum
                }
                else {
                    p.log(receive)
                }
                await this.wait(1000)
            }
        }
        var sign = await this.curl({
                'url': `https://api.m.jd.com/api`,
                form: `appid=h5-sep&body=${this.dumps(await this.cmd5x())}&client=m&clientVersion=6.0.0&functionId=DATAWALLET_USER_SIGN`,
                user,
                algo: {
                    appId: '60d0e',
                    status: 200,
                },
                referer: 'https://mypoint.jd.com/'
            }
        )
        let totalNum = 0
        if (this.haskey(sign, 'data.signInfo.signNum')) {
            cash += sign.data.signInfo.signNum
            totalNum = sign.data.totalNum
            p.info.work = true
        }
        else {
            if (sign) {
                if (sign.code == 302) {
                    p.log('签到过了...')
                    p.info.work = true
                }
                else {
                    p.log(sign)
                }
            }
            else {
                p.err("没有获取到数据...")
            }
        }
        if (cash>0) {
            if (totalNum) {
                p.msg(`现有: ${totalNum} 获得: ${cash.toFixed(2)}`)
            }
            else {
                p.msg(`获得充值金: ${cash.toFixed(2)}`)
            }
        }
    }

    async cmd5x(params = {}) {
        let p = Object.assign(params, {
            t: new Date().getTime()
        })
        let str = p.id || ''
        if (p.taskType) {
            str = `${str}${p.taskType}`
        }
        p.encStr = this.md5(`${str}${p.t}e9c398ffcb2d4824b4d0a703e38yffdd`)
        return p
    }
}
