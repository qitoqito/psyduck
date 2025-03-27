import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东打卡领京豆',
            verify: 1,
            help: 'main',
            interval: 1000,
            crontab: 4,
            sync: 1
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let algo = context.algo || {}
        let sign = await this.curl({
                form: `appid=activities_platform&loginType=2&loginWQBiz=&functionId=interact_game_sign&body={"encryptAssignmentId":"${context.assignmentId}","itemId":"${context.itemId}"}&client=apple&osVersion=15.1.1&clientVersion=15.0.65&d_model=iPhone13,3&d_brand=iPhone&networkType=wifi&build=169770&partner=-1`,
                user,
                algo: {
                    ...{
                        expire: {
                            code: 3
                        },
                        appId: '2c4bd'
                    }, ...algo
                }
            }
        )
        if (this.haskey(sign, 'data.continueSignDay')) {
            p.log("签到成功")
            p.msg(`京豆: ${sign.data.quantity}`)
            p.info.work = true
        }
        else if (this.haskey(sign, 'code', -1)) {
            p.log(`已签到`)
            p.info.work = true
        }
        else {
            p.log(this.haskey(sign, 'message') || sign)
        }
    }
}

