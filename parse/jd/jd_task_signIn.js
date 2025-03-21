import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东整合签到",
            crontab: 3,
            sync: 1,
            verify: 1,
            model: 'user',
            display: true,
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let algo = context.algo || {}
        p.log("正在签到:", p.context.name)
        let appid = this.config.appids[this.n % this.config.appids.length]
        let signIn = await this.curl({
                'url': `https://api.m.jd.com/client.action`,
                form: `functionId=doInteractiveAssignment&appid=${appid}&body=${this.dumps({
                    "sourceCode": context.sourceCode || 'acetttsign',
                    "encryptProjectId": context.encryptProjectId,
                    "encryptAssignmentId": context.encryptAssignmentId,
                    "completionFlag": true,
                    "itemId": "1",
                })}&sign=11&t=1710422476977`,
                user,
                algo: {
                    ...{
                        appId: 'e2224',
                        log: true,
                        expire: {
                            "subCode": "300"
                        }
                    }, ...algo
                },
            }
        )
        let subCode = this.haskey(signIn, 'subCode')
        if (subCode == '103') {
            p.log(signIn.msg)
            p.info.work = true
        }
        else if (subCode == '102') {
            p.context.finish = true
            p.log("项目已结束")
        }
        else if (subCode == '300') {
            p.log(signIn.msg)
            p.info.jump = true
        }
        else if (this.haskey(signIn, 'code', '31')) {
            p.err(signIn.msg)
        }
        if (this.haskey(signIn, 'rewardsInfo.successRewards')) {
            p.info.work = true
            for (let kk in signIn.rewardsInfo.successRewards) {
                for (let kkk of signIn.rewardsInfo.successRewards[kk]) {
                    let text = `${kkk.rewardName}: ${kkk.quantity}`
                    // p.msg(text)
                    p.award(kkk.quantity, 'bean')
                }
            }
        }
        this.n++
    }
}

