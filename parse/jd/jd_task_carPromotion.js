import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东车管家签到',
            crontab: 4
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let sign = await this.curl({
                'url': `https://api.m.jd.com/carPromotion_doSign?functionId=carPromotion_doSign&body={"obtainOrUseScore":1,"encryptAssignmentId":"3zex5T6aHbQRCTfGuv1jruLCgnUX","itemId":"1"}&appid=M-CAR`,
                user,
                algo: {
                    appId: 'd2328',
                    expire: {
                        "errCode": 203
                    },
                }
            }
        )
        if (this.haskey(sign, 'data.bean')) {
            p.info.work = true
            p.msg("签到奖励: 1豆")
        }
        else if (this.haskey(sign, 'data.subCode', '103')) {
            p.info.work = true
            p.log('任务已完成')
        }
        else {
            p.log(sign)
        }
    }
}

