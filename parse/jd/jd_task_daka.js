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
                'url': `https://api.m.jd.com/?functionId=interact_game_sign&_=1740844423946`,
                'form': `appid=activities_platform&loginType=2&loginWQBiz=&functionId=interact_game_sign&body={"encryptAssignmentId":"${context.assignmentId}","itemId":"${context.itemId}"}`,
                user,
                algo: {
                    ...{
                        expire: {
                            code: 3
                        }
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

