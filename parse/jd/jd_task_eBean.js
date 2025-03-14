import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东E卡天天抢京豆',
            interval: 1000,
            help: "main",
            verify: 1,
            crontab: 3
        }
    }

    async prepare() {
        for (let user of this.help) {
            let info = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=personalCenterBuyHolderInfo`,
                    'form': `cthr=1&client=h5&clientVersion=&t=1741107023236&loginWQBiz=&appid=mygiftcard&functionId=personalCenterBuyHolderInfo&body={"type":"2"}`,
                    algo: {
                        appId: 'aea58'
                    }, user
                }
            )
            if (this.haskey(info, 'data.holderInfo.equityInfo')) {
                for (let i of info.data.holderInfo.equityInfo) {
                    if (i.name.includes('京豆')) {
                        this.shareCode({
                            pid: i.pid.toString(),
                            ruleId: i.ruleId.toString(),
                        })
                        break
                    }
                }
                break
            }
            else {
                await this.wait(1000)
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let sign = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=personalCenterReceiveHolderEquity`,
                'form': `cthr=1&client=h5&clientVersion=&t=1741106496828&loginWQBiz=&appid=mygiftcard&functionId=personalCenterReceiveHolderEquity&body={"ruleId":"${context.ruleId}","pid":"${context.pid}","eid":"FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U"}`,
                user,
                algo: {
                    appId: 'aea58',
                    expire: {
                        "error": "NotLogin"
                    }
                }
            }
        )
        if (this.haskey(sign, 'data.success')) {
            p.msg(`京豆: 2`)
            p.info.work = true
        }
        else {
            p.log(this.haskey(sign, 'data.failReason') || sign)
        }
    }
}

