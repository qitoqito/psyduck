import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东幸运奖励',
            crontab: 3
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let show = await this.curl({
                'form': `functionId=secEntryBenefitShow&body={"channelId":"2","actSecTraffic":"1"}&appid=signed_wh5&client=ios&screen=390*844&networkType=wifi&clientVersion=15.0.25&d_model=iPhone13%2C3&osVersion=15.1.1`,
                user
            }
        )
        if (this.haskey(show, 'data.result.currentTime')) {
            let s = await this.curl({
                    'form': `functionId=secEntryBenefitReceive&body={"channelId":"2","actSecTraffic":"1"}&appid=signed_wh5&client=ios&screen=390*676&networkType=wifi&clientVersion=15.0.25&d_model=iPhone13%2C3&osVersion=15.1.1`,
                    user
                }
            )
            if (this.haskey(s, 'data.result.awardList')) {
                p.award(s.data.result.awardList[0].beanNum, 'bean')
            }
            p.info.work = true
        }
        else if (this.haskey(show, 'data')) {
            p.info.work = true
            p.log("没有幸运奖励")
        }
        else {
            p.log("没有幸运奖励")
        }
    }
}

